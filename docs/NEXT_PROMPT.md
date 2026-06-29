# Phase 3A-4D — Version Cloning, Publish, Snapshot, and Immutability

Continue in:

```text
~/dev/inspection-app
```

Use:

```text
Mode: Agent / Go
Reasoning: highest available
```

Implement **Phase 3A checkpoint 3A-4D only**.

Do not stage or commit automatically.

## Current validated baseline

The following checkpoints are complete, committed, and pushed:

- Phase 3A0-A: nested sortable feasibility.
- Phase 3A0-B Gate 1: functional PDF feasibility.
- Phase 3A-1: production form-template schema.
- Phase 3A-2: controlled registries.
- Phase 3A-3: template ownership and lifecycle operations.
- Phase 3A-4A: definition-tree read model and page CRUD.
- Phase 3A-4B: container CRUD, compatibility, cycle prevention, and ordering.
- Phase 3A-4C1: block CRUD, immutable stable keys, registry validation, block/container compatibility, version-scoped ordering.
- Phase 3A-4C2A: `BlockOptionCapability` discriminated registry contract, pure option-capability helpers, database-enforced `@@unique([blockId, value])`.
- Phase 3A-4C2B: authenticated option CRUD, capability enforcement, duplicate-value handling, contiguous option ordering, contextual `single_select.defaultValue` validation, atomic default maintenance.

Still deferred:

- builder UI;
- drag-and-drop integration;
- runtime forms;
- reports;
- PDF Gate 2.

Do not represent deferred work as complete.

## Objective

Implement only:

1. authenticated deep-clone of a draft version (duplicate all pages, containers, blocks, and options with new IDs while preserving stable keys, block/container types, configs, labels, and ordering);
2. authenticated publish action that transitions a draft version to `PUBLISHED`, marks the previous latest published version `SUPERSEDED`, and creates a canonical JSON snapshot of the complete definition tree;
3. canonical snapshot creation as a deterministic JSON serialization of the entire version tree (pages, containers, blocks, options) with stable field ordering;
4. SHA-256 snapshot hashing using Node.js `crypto`;
5. read-model enforcement that published and superseded versions are immutable (all existing write operations already reject non-draft versions via `assertActiveDraftVersion`);
6. whole-draft definition validation before publishing (structural completeness, no orphaned references, valid ordering, registry integrity, config integrity);
7. focused tests and documentation.

## Explicitly out of scope

Do not implement:

- version history UI;
- version comparison / diff;
- rollback to a previous version;
- partial version branching;
- automatic publish-on-save;
- scheduled publishing;
- builder UI;
- drag-and-drop;
- runtime forms;
- reports;
- PDF work;
- package installation;
- schema changes;
- migrations;
- new registry capabilities;
- new block or container types.

## Allowed changes

Expected areas:

```text
app/src/form-templates/
app/main.wasp.ts
docs/PROGRESS_LOG.md
docs/TODO.md
docs/NEXT_PROMPT.md
```

Minimal changes to existing operation files are expected for publish-triggered validation.

Do not modify:

```text
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

## Step 0 — Repository inspection

```bash
cd ~/dev/inspection-app
pwd
git status --short
git log -5 --oneline
git diff --check
```

Confirm Phase 3A-4C2B is committed and the working tree is clean.

## Step 1 — Read required context

Read completely all files listed in AGENTS.md plus:

```text
app/src/form-templates/version*.ts (if any exist)
app/src/form-templates/snapshot*.ts (if any exist)
app/src/form-templates/definitionOperations.ts
app/src/form-templates/definitionTree.ts (if any exist)
app/src/form-templates/containerGraph.ts
app/src/form-templates/containerCompatibility.ts
app/src/form-templates/blockCompatibility.ts
app/src/form-templates/blockOptionCapability.ts
app/src/form-templates/blockOperations.ts
app/src/form-templates/optionOperations.ts
app/src/form-templates/containerOperations.ts
app/src/form-templates/definitionOperations.wasp.ts
app/src/form-templates/*.test.ts
```

## Step 2 — Suggested files

```text
app/src/form-templates/
  versionOperations.ts
  versionOperations.wasp.ts
  snapshotHelpers.ts
  versionValidation.ts
  versionOperations.test.ts
  snapshotHelpers.test.ts
```

## Step 3 — Clone version

**Input:** `{ sourceVersionId: string; newDraftLabel?: string }`

**Behavior:**
1. Resolve owned source version (any non-archived status is clonable).
2. Inside one `RepeatableRead` transaction:
   - Create new version with `versionNumber = max + 1`, `status = DRAFT`.
   - Deep-copy all pages, containers, blocks, options with new UUIDs.
   - Preserve `stableKey` values on copied blocks.
   - Preserve all types, configs, labels, registry versions, and ordering.
   - Rewire all internal FKs (page→new version; container→new version+new page/parent; block→new version+new container; option→new block).

**Result:** `{ version: { id, versionNumber, status }, pageCount, containerCount, blockCount, optionCount }`

## Step 4 — Publish version

**Input:** `{ versionId: string }`

**Pre-publish validation (pure read):**
1. Load complete version tree.
2. Verify every FK resolves to the same version (no orphans).
3. Verify container parent integrity (XOR page/parent, no cycles).
4. Verify block-container compatibility.
5. Verify option-block integrity.
6. Verify contiguous sortOrder in every sibling scope.
7. Verify all stored types are registered.
8. Verify all configs pass registry schema validation.

**Validation result:** `{ valid: boolean; errors: Array<{ path: string; message: string }>; counts }`

**Publish transaction (RepeatableRead):**
1. Recheck ownership + active template + draft status.
2. Find current PUBLISHED version → mark SUPERSEDED.
3. Build canonical snapshot.
4. SHA-256 hash the snapshot.
5. Update version: `status = PUBLISHED`, `publishedAt`, `snapshot`, `snapshotSchemaVersion = 1`, `snapshotHash`.

**Result:** `{ version: { id, versionNumber, status, publishedAt }, snapshotHash, counts }`

## Step 5 — Canonical snapshot

Deterministic JSON tree shape with pages→containers (recursive)→blocks→options. Keys in fixed order. Arrays sorted by `sortOrder ASC, id ASC`. Dates as ISO 8601.

## Step 6 — SHA-256 hashing

`crypto.createHash("sha256")` over UTF-8 bytes of `JSON.stringify(snapshot)`. Hex digest (64 lowercase chars). Store in `snapshotHash`.

## Step 7 — Immutability

Existing `assertActiveDraftVersion` in `definitionAuthorization.ts` already rejects PUBLISHED/SUPERSEDED versions with 409. Verify coverage across all write operations. Add guards only if missing.

## Step 8 — Wasp declarations

```text
cloneFormTemplateVersion   (action, auth: true)
publishFormTemplateVersion (action, auth: true)
validateFormTemplateVersion (query, auth: true)
```

Entities: `FormTemplate`, `FormTemplateVersion`, `FormPageDefinition`, `FormContainerDefinition`, `FormBlockDefinition`, `FormBlockOption`.

## Step 9-14 — Input schemas, DTOs, transaction rules, tests, verification

Follow the pattern established in Phase 3A-4C2B:
- Strict Zod schemas with `.strict()` and UUID validation.
- Safe result DTOs with no user IDs or raw relations.
- `RepeatableRead` transactions with all operations through `tx`.
- Mocked Prisma transaction tests covering clone, publish, validate, snapshot hashing, immutability, and regression.
- Run form-template and registry test suites.
- `git diff --check`, `make check`, `npx prisma validate`, `wasp start`.
- Verify restricted scope diff is empty.

## Documentation

Update `docs/PROGRESS_LOG.md`, `docs/TODO.md`, and `docs/NEXT_PROMPT.md`.

## Do not do

- Do not change schema or migrations.
- Do not modify registries.
- Do not add new block or container types.
- Do not add UI.
- Do not implement runtime forms, reports, or PDF work.
- Do not install packages.
- Do not stage or commit.
