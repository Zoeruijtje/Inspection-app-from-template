# Phase 3A-4D3 — Create Draft from Published or Superseded Version

Continue in:

```text
~/dev/inspection-app
```

Use:

```text
Mode: Agent / Go
Reasoning: highest available
```

Implement **Phase 3A checkpoint 3A-4D3 only**.

This checkpoint must be implemented on a temporary review branch, verified, committed, and pushed automatically. It must not be merged into `main`.

---

## Objective

Implement the authenticated mutation that creates a new draft version from an existing published or superseded version, respecting the one-draft-per-template invariant.

The new draft must:

1. resolve ownership of the source version;
2. require the source to be `PUBLISHED` or `SUPERSEDED`;
3. reject the operation if the template already has an existing `DRAFT` version;
4. create a new `FormTemplateVersion` with `versionNumber = max(versionNumber) + 1` and `status = DRAFT`;
5. deep-clone all pages, containers, blocks, and options from the source version into the new draft;
6. preserve all block `stableKey` values — stable keys are immutable across versions;
7. preserve container/block/page `sortOrder` values;
8. preserve all block config, validation, conditional visibility, required flags, and labels;
9. preserve all option labels, values, colors, scores, and ordering;
10. assign new UUIDs to all cloned rows (pages, containers, blocks, options);
11. set `templateVersionId` on all cloned rows to the new draft version ID;
12. run the entire operation in one `RepeatableRead` Prisma transaction;
13. return a safe DTO with the new version metadata (no raw Prisma rows, no user IDs, no snapshot);
14. include focused tests and documentation.

Do **not** implement UI, builder integration, runtime forms, reports, or PDF work.

---

## Current validated baseline

The following checkpoints are complete, committed, and pushed:

- Phase 3A0-A: nested sortable feasibility.
- Phase 3A0-B Gate 1: functional PDF feasibility.
- Phase 3A-1: form-template schema and migrations.
- Phase 3A-2: controlled container and block registries.
- Phase 3A-3: template ownership and lifecycle operations.
- Phase 3A-4A: normalized definition-tree query and page CRUD.
- Phase 3A-4B: container CRUD, compatibility, cycle prevention, and ordering.
- Phase 3A-4C1: block CRUD, immutable stable keys, registry validation, and block ordering.
- Phase 3A-4C2A: option-capability contract and per-block option-value uniqueness.
- Phase 3A-4C2B: option CRUD, capability enforcement, duplicate handling, contextual default, atomic default sync.
- Phase 3A-4D1: authenticated whole-draft validation query, deterministic row loader, canonical snapshot V1, SHA-256 hash.
- Phase 3A-4D2: authenticated publish action with snapshot persistence, hash persistence, conditional draft → published transition, prior-version superseding, race guards, P2034 conflict handling.

---

## Branch safety

Start from current `main`. Verify clean working tree and that Phase 3A-4D2 is present. Create `review/phase-3a-4d3` only if it does not already exist locally or remotely. Do not overwrite, reset, delete, or reuse an existing review branch.

---

## Required context inspection

Read completely before implementing:

```
AGENTS.md
docs/FORM_BUILDER_DATA_MODEL.md
docs/FORM_BUILDER_MASTER_SPEC.md
docs/PERMISSIONS.md
docs/SECURITY_CHECKLIST.md
docs/PROGRESS_LOG.md
docs/TODO.md
docs/NEXT_PROMPT.md

app/schema.prisma
app/main.wasp.ts

app/src/form-templates/authorization.ts
app/src/form-templates/definitionAuthorization.ts
app/src/form-templates/definitionRows.ts
app/src/form-templates/canonicalSnapshot.ts
app/src/form-templates/versionValidation.ts
app/src/form-templates/publishOperations.ts
app/src/form-templates/publishValidation.ts
app/src/form-templates/operations.ts
app/src/form-templates/formTemplates.wasp.ts
app/src/form-templates/publishOperations.wasp.ts
app/src/form-templates/*.test.ts
```

Reuse established conventions for DTOs, ownership checks, transaction patterns, error handling, and Prisma error detection.

---

## Explicit scope

### Allowed changes

```
app/main.wasp.ts
app/src/form-templates/
docs/PROGRESS_LOG.md
docs/TODO.md
docs/NEXT_PROMPT.md
```

### Forbidden changes

Do not modify:

```
app/schema.prisma
app/migrations/
app/package.json
app/src/form-builder/registry/
app/src/clients/
app/src/properties/
app/src/inspections/
spikes/
.env
.env.server
```

Do not install packages, add UI, add routes/navigation, implement runtime forms, reports, or PDF work.

---

## Required implementation

### 1. Create-draft action

Create `createDraftFromVersion` as an authenticated Wasp action.

**Input:**

```typescript
{
  sourceVersionId: string; // UUID — the published or superseded version to clone
}
```

Strict Zod validation, UUID check, unknown properties rejected.

### 2. Authorization and lifecycle

- unauthenticated → HTTP 401
- missing or unowned source version → HTTP 404
- archived template → HTTP 409
- source version is `DRAFT` → HTTP 409 (cannot clone a draft)

### 3. One-draft-per-template invariant

Before creating the new draft, query for existing `DRAFT` versions of the same template through `tx`. If any exist, throw HTTP 409:

```
A draft version already exists for this template.
```

This check must happen inside the transaction after ownership resolution.

### 4. Version number assignment

Compute the new version number as:

```
SELECT MAX(versionNumber) FROM FormTemplateVersion WHERE templateId = ?
```

Add 1. If no versions exist (should not happen since source exists), start at 1.

### 5. Deep clone

Clone all definition rows from the source version to the new draft:

- **FormPageDefinition**: clone `title`, `sortOrder`; assign new UUID; set `templateVersionId` to new draft ID.
- **FormContainerDefinition**: clone `containerType`, `title`, `config`, `sortOrder`; assign new UUID; set `templateVersionId` to new draft ID; rebuild `pageId` and `parentContainerId` using the new cloned IDs (maintains tree structure).
- **FormBlockDefinition**: clone all fields including `stableKey` (immutable across versions), `blockType`, `config`, `label`, `required`, `sortOrder`, `conditionalVisibility`, `validation`, `blockImplementationVersion`, `configSchemaVersion`; assign new UUID; set `templateVersionId` to new draft ID; set `containerId` to new cloned container ID.
- **FormBlockOption**: clone `label`, `value`, `sortOrder`, `color`, `score`; assign new UUID; set `blockId` to new cloned block ID.

### 6. ID mapping

Maintain a mapping from old IDs to new IDs during the clone to correctly reassign:
- `pageId` on containers (old page → new page)
- `parentContainerId` on containers (old container → new container)
- `containerId` on blocks (old container → new container)
- `blockId` on options (old block → new block)

### 7. Transaction

Use `Prisma.TransactionIsolationLevel.RepeatableRead`. All reads and writes use `tx`. Global Prisma only opens the transaction.

### 8. Result DTO

Use an explicit safe DTO:

```typescript
type CreateDraftFromVersionResult = {
  versionId: string;
  templateId: string;
  versionNumber: number;
  status: "DRAFT";
  sourceVersionId: string;
  counts: {
    pages: number;
    containers: number;
    blocks: number;
    options: number;
  };
};
```

Do not return user IDs, raw template relations, raw Prisma records, or internal objects.

### 9. Error handling

- Template-lookup/ownership errors: 401/404/409 as established.
- Existing-draft detection: 409.
- Prisma transaction conflict (P2034): 409 with retry message.
- Unrelated Prisma errors: propagate unchanged.
- Existing `HttpError`: not remapped.

### 10. Required tests

Use existing Vitest tooling. Test:

- valid input produces new draft with incremented version number;
- invalid UUID rejected;
- unauthenticated → 401;
- unowned source version → 404;
- archived template → 409;
- source version is DRAFT → 409;
- existing draft in template → 409;
- all definition rows are cloned (pages, containers, blocks, options);
- stable keys are preserved across clone;
- new UUIDs assigned to all cloned rows;
- tree structure preserved (page → container → block → option relationships);
- `templateVersionId` set to new draft on all cloned rows;
- sort orders preserved;
- block config, validation, conditional visibility preserved;
- option labels, values, colors, scores preserved;
- result DTO contains expected counts;
- result DTO does not expose user IDs or raw relations;
- exactly one transaction with RepeatableRead;
- all reads/writes use tx, not global Prisma;
- P2034 mapped to 409;
- unrelated Prisma errors propagate;
- existing HttpError not remapped;
- all existing form-template and registry tests remain enabled and pass.

---

## Verification

Run:

```
cd ~/dev/inspection-app/app

npx --no-install vitest run \
  --config src/form-templates/vitest.config.ts \
  --reporter=verbose

npx --no-install vitest run \
  --config src/form-builder/registry/vitest.config.ts \
  --reporter=verbose
```

Then:

```
cd ~/dev/inspection-app

git diff --check
make check

cd ~/dev/inspection-app/app
npx prisma validate
timeout 120 wasp start
```

Inspect restricted scope:

```
cd ~/dev/inspection-app

git diff -- \
  app/schema.prisma \
  app/migrations \
  app/package.json \
  app/src/form-builder/registry \
  app/src/clients \
  app/src/properties \
  app/src/inspections \
  spikes
```

The restricted diff must be empty.

---

## Documentation

After implementation and verification pass:

- `docs/PROGRESS_LOG.md`: record the create-draft action.
- `docs/TODO.md`: mark Phase 3A-4D3 complete.
- `docs/NEXT_PROMPT.md`: write a substantial implementation-ready prompt for Phase 3A-4E (template version history query, soft-delete considerations, or the next prioritized checkpoint per the roadmap).

---

## Commit and push

After all checks pass, commit on `review/phase-3a-4d3` and push to `origin/review/phase-3a-4d3`. Do not push to `main`, merge, amend, rebase, squash, reset, force-push, delete branches, or open/merge a pull request automatically.
