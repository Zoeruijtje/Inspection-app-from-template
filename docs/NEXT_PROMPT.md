# Phase 3A-4D2 — Publish Transaction, Snapshot Persistence, and Superseding

Continue in:

```text
~/dev/inspection-app
```

Use:

```text
Mode: Agent / Go
Reasoning: highest available
```

Implement **Phase 3A checkpoint 3A-4D2 only**.

This checkpoint must be implemented on a temporary review branch, verified, committed, and pushed automatically. It must not be merged into `main`.

---

## Objective

Implement the authenticated publish mutation that:

1. validates the complete draft definition inside the publish transaction;
2. builds a canonical V1 snapshot from transaction-scoped rows;
3. computes the exact SHA-256 hash;
4. persists `snapshot`, `snapshotSchemaVersion = 1`, and `snapshotHash`;
5. transitions the version status from `DRAFT` to `PUBLISHED`;
6. sets `publishedAt`;
7. marks the previous latest published version `SUPERSEDED` if one exists;
8. handles concurrency;
9. includes focused tests.

Do **not** implement cloning, new draft creation, UI, runtime forms, reports, or PDF work.

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
- Phase 3A-4C2B: authenticated option CRUD, capability enforcement, duplicate handling, contiguous option ordering, contextual `single_select.defaultValue`, and atomic default synchronization.
- Phase 3A-4D1: authenticated whole-draft validation query, deterministic definition-row loader, canonical snapshot V1 builder, recursive JSON canonicalization, SHA-256 snapshot preview hash.

---

## Branch safety

Start from current `main`. Verify clean working tree and that Phase 3A-4D1 is present. Create `review/phase-3a-4d2` only if it does not already exist locally or remotely. Do not overwrite, reset, delete, or reuse an existing review branch. Never switch back to `main` during implementation.

---

## Required context inspection

Read completely before implementing:

```
AGENTS.md
docs/FORM_BUILDER_DATA_MODEL.md
docs/FORM_BUILDER_MASTER_SPEC.md
docs/FORM_BLOCK_CATALOG.md
docs/PERMISSIONS.md
docs/SECURITY_CHECKLIST.md
docs/PROGRESS_LOG.md
docs/TODO.md
docs/NEXT_PROMPT.md

app/schema.prisma
app/main.wasp.ts

app/src/form-templates/definitionRows.ts
app/src/form-templates/versionValidation.ts
app/src/form-templates/versionValidationSchemas.ts
app/src/form-templates/versionValidationOperations.ts
app/src/form-templates/versionValidationOperations.wasp.ts
app/src/form-templates/canonicalSnapshot.ts
app/src/form-templates/definitionAuthorization.ts
app/src/form-templates/authorization.ts
app/src/form-templates/lifecycle.ts
app/src/form-templates/definitionOrdering.ts

app/src/form-templates/*.test.ts
```

Reuse established conventions for DTOs, ownership checks, transaction patterns, and error handling.

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

### 1. Publish action

Create `publishFormTemplateVersion` as an authenticated Wasp action.

**Input:**

```typescript
{
  versionId: string; // UUID
}
```

Strict Zod validation, UUID check, unknown properties rejected.

**Authorization and lifecycle:**

- unauthenticated → HTTP 401
- missing or unowned version → HTTP 404
- archived template → HTTP 409
- non-draft version → HTTP 409 (cannot publish a PUBLISHED or SUPERSEDED version)

**Transaction — all of the following in one `RepeatableRead` transaction using tx:**

1. Resolve ownership of the target version.
2. Assert active draft (template ACTIVE, version DRAFT).
3. Load all definition rows through `loadDefinitionRows(tx, versionId)`.
4. Run `validateVersionDefinition(rows)` — if validation fails, return HTTP 400 with the validation issues. Do not partially publish.
5. Build canonical snapshot with `buildCanonicalSnapshotV1(rows)`.
6. Compute hash with `hashCanonicalSnapshot(snapshot)`.
7. Serialize snapshot with `serializeCanonicalSnapshot(snapshot)`.
8. Persist to version row:
   - `snapshot = serializedSnapshot`
   - `snapshotSchemaVersion = 1`
   - `snapshotHash = hash`
   - `status = PUBLISHED`
   - `publishedAt = new Date()`
9. Within the same transaction, find the previous latest published version for the same template (status `PUBLISHED`, different id, ordered by `versionNumber DESC`) and update it to `SUPERSEDED`.
10. Return the publish result DTO.

**No time-of-check/time-of-use gap.** Validation, snapshot creation, hashing, and persistence all happen inside the same Prisma transaction.

### 2. Result DTO

Use an explicit safe DTO:

```typescript
type PublishFormTemplateVersionResult = {
  versionId: string;
  versionNumber: number;
  status: "PUBLISHED";
  publishedAt: Date;
  snapshotSchemaVersion: 1;
  snapshotHash: string;
  previousPublishedVersionSuperseded: boolean;
  validation: {
    valid: true;
    issues: [];
    counts: { pages: number; containers: number; blocks: number; options: number };
  };
};
```

Do not return user IDs, raw template relations, raw Prisma records, the full snapshot, or internal exception objects.

### 3. Concurrency

Two concurrent publishes of the same draft should not both succeed. Use the Prisma transaction isolation level `RepeatableRead` and check the version status inside the transaction. If the version is no longer `DRAFT` by the time the transaction reads it, throw 409.

### 4. Previous version superseding

- Find exactly one previous `PUBLISHED` version for the same template (status = `PUBLISHED`, id != current version id, order by `versionNumber DESC`, take 1).
- If found, update its status to `SUPERSEDED`.
- If no previous published version exists, `previousPublishedVersionSuperseded = false`.

Do not mark `SUPERSEDED` versions as `PUBLISHED` or vice versa.

### 5. Wasp declaration

Create a focused Wasp spec file (e.g., `publishOperations.wasp.ts`) containing:

```
publishFormTemplateVersion
action
auth: true
entities: FormTemplate, FormTemplateVersion, FormPageDefinition, FormContainerDefinition, FormBlockDefinition, FormBlockOption
```

Register the spec exactly once in `app/main.wasp.ts`. Do not add pages, routes, or navigation.

### 6. Do NOT implement

- Cloning a draft into another draft.
- Creating a new draft from a historical published version.
- Partial publishing.
- Automatic draft creation after publish.
- Draft label fields (none exist on the model).
- UI, runtime forms, reports, PDF, drag-and-drop.

---

## Required tests

Use existing Vitest tooling only.

### Input and authorization

- valid UUID input accepted; invalid UUID rejected; unknown property rejected.
- unauthenticated rejected before transaction.
- unowned version returns 404.
- archived template returns 409.
- published version returns 409.
- superseded version returns 409.
- all database reads/mutations use `tx`, never global Prisma.

### Valid publish

- minimal valid draft publishes successfully.
- version status becomes `PUBLISHED`.
- `publishedAt` is set to a recent timestamp.
- `snapshotSchemaVersion = 1`.
- `snapshotHash` is exactly 64 lowercase hex characters.
- `previousPublishedVersionSuperseded` is `false` for first publish.
- result DTO contains no user IDs, raw relations, or snapshot data.

### Superseding

- publishing a second draft (version 2) after version 1 was published.
- version 1 status becomes `SUPERSEDED`.
- version 2 status becomes `PUBLISHED`.
- `previousPublishedVersionSuperseded` is `true`.
- only one version is `PUBLISHED` at a time per template.
- publishing a third draft supersedes version 2, not version 1.

### Validation during publish

- draft with no pages fails with validation issues returned.
- draft with no blocks fails.
- draft with validation issues does not transition status.
- snapshot fields remain null/unset after failed publish.

### Concurrency

- concurrent publish of same draft: one succeeds, one returns 409.

### Snapshot integrity

- same logical draft always produces the same snapshot hash.
- changed definition changes the hash.
- snapshot persisted matches snapshot returned by `buildCanonicalSnapshotV1` for the same rows.
- `serializeCanonicalSnapshot` of persisted snapshot produces output matching the stored serialized form.

### Regression

All existing tests must remain enabled and pass. Do not weaken existing tests.

---

## Verification

Run:

```bash
cd ~/dev/inspection-app/app
npx --no-install vitest run --config src/form-templates/vitest.config.ts --reporter=verbose
npx --no-install vitest run --config src/form-builder/registry/vitest.config.ts --reporter=verbose
```

Then:

```bash
cd ~/dev/inspection-app
git diff --check
make check
cd app && npx prisma validate
timeout 120 wasp start
```

Inspect restricted scope:

```bash
git diff -- app/schema.prisma app/migrations app/package.json app/src/form-builder/registry app/src/clients app/src/properties app/src/inspections spikes
```

Must be empty.

---

## Documentation

After implementation and verification pass, update:

- `docs/PROGRESS_LOG.md` — record completion of publish action, snapshot persistence, and superseding.
- `docs/TODO.md` — mark Phase 3A-4D2 work complete.
- `docs/NEXT_PROMPT.md` — write the next prompt for Phase 3A-4E (or equivalent next checkpoint).

---

## Commit and push

Only after all required checks pass:

1. Confirm branch is `review/phase-3a-4d2`.
2. Stage explicit intended files only. Do not use `git add .` or `git add -A`.
3. Inspect `git diff --cached` for unrelated or restricted files.
4. Commit: `git commit -m "feat(3a): add publish transaction with snapshot persistence and superseding"`
5. Push: `git push -u origin review/phase-3a-4d2`

Do not push to `main`, merge, open/merge a PR, amend, rebase, squash, reset, or force-push.

---

## Final state

The final state must be:

```
branch: review/phase-3a-4d2
working tree: clean
changes: committed and pushed only to the review branch
main: untouched
```

Do not implement Phase 3A-4D2 now. This prompt is for the next checkpoint.
