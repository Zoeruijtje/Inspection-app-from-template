# Progress Log

## Current status

- Open SaaS project created.
- Local setup in WSL2.
- Git repository initialized.
- Baseline pushed/planned.
- Agent documentation being added and synchronized with the current codebase.
- Codebase audit completed from local files only on 2026-06-16.
- Master planning phase completed on 2026-06-17. Product redefined around generic form builder platform.
- Phase 3A0-A v5 Stage B nested group manual pointer validation passed; Stage B is MANUALLY VERIFIED PASS.
- Phase 3A0-B Gate 1 functional feasibility: MANUALLY VERIFIED PASS. Playwright/Chromium remains the preferred PDF engine candidate. Gate 2 and deployment suitability validation remain pending.
- Phase 3A-1 production form-template schema and migration are complete.
- Phase 3A-2 controlled source-owned form-builder registries are complete.
- Phase 3A-3 authenticated form-template ownership, metadata, and lifecycle server operations are implemented.
- Phase 3A-4A definition-level authorization, read-only normalized definition tree loading, page CRUD, and page ordering normalization are implemented.
- Phase 3A-4B authenticated root container CRUD, parent compatibility checks, cross-version prevention, generic cycle prevention helpers, and source/destination container ordering normalization are implemented.
- Phase 3A-4C1 authenticated baseline block CRUD, registry validation, immutable stable keys, block/container compatibility, and source/destination block ordering normalization are implemented.
- Phase 3A-4C2A option capability contract, registry declarations, pure capability helpers, and database-enforced per-block option-value uniqueness are implemented.
- Phase 3A-4C2B option CRUD, capability enforcement, duplicate-value handling, contiguous ordering, contextual default validation, and atomic default maintenance are implemented.
- Phase 3A-4D3 authenticated create-draft-from-version operation with source snapshot integrity verification and deep definition cloning is implemented.
- Phase 3A-4D3 repair completed: JSON cloning, cycle-safe container batching, and post-write draft confirmation hardened.
- Phase 3A-4E authoritative authenticated version-history read model, lifecycle affordance derivation, and integrity-state detection are implemented.
- Phase 3B-1A authenticated template list and create-template UI is implemented.
- Phase 3B-1B authenticated template detail, metadata editing, and read-only version history UI is implemented.

## Next milestone

Phase 3B-1C — Template Lifecycle and Version Workflow Actions. Add UI for draft validation, publishing valid drafts, validation feedback, create-draft-from-version, archive, restore, and draft-only safe delete. Do not add builder canvas, page/container/block editing, drag-and-drop, runtime forms, reports, or PDF behavior.

## In progress

- None.

## Completed

- Phase 3B-1B template detail and version history UI completed 2026-06-30.

- Added authenticated Wasp route `FormTemplateDetailRoute` at `/templates/:templateId` in the existing `formTemplatesSpec`; no second template spec was created and `app/main.wasp.ts` was not modified.
- Updated `/templates` list items so the template name is an accessible React Router link built with `routes.FormTemplateDetailRoute.build({ params: { templateId } })`, with visible focus styling and no whole-row click target.
- Implemented `TemplateDetailPage.tsx` using `useParams` for `templateId`; missing or empty params render a safe page error and do not mount either detail query. Valid params load only `getFormTemplateById({ templateId })` and `getFormTemplateVersionHistory({ templateId })`.
- Added coordinated detail/history query states: one loading state while either query is required, page-level retry for both queries, 404-oriented not-found state, defensive empty-history state, and safe error messaging without raw stack traces.
- Implemented metadata display for name, description, category, tags, created/updated dates, lifecycle badge, archived read-only notice, and summary values for draft version, current published version, latest version, and total versions.
- Implemented `TemplateMetadataDialog.tsx` using existing `updateFormTemplate` only. The dialog populates from loaded metadata on open, trims fields, reuses `parseTemplateTags`, validates required name client-side, prevents duplicate submit, keeps entered values on backend failure, closes only after mutation success, and separates post-success refresh warnings from mutation failure.
- Archived templates remain readable and do not show an enabled edit action. If an active template becomes archived while the dialog is open, the backend conflict remains visible, authoritative state is refetched, and the open dialog switches to read-only instead of silently claiming success.
- Implemented read-only version history from the authoritative `getFormTemplateVersionHistory` DTO, preserving backend order and using `versions[].isEditable`, `versions[].isReadOnly`, and `versions[].canCreateDraftFromThisVersion` for badges/informational labels. No per-version detail queries, snapshot contents, lifecycle mutations, or builder actions were added.
- Added responsive desktop table and mobile stacked version cards with contained long names, descriptions, tags, and snapshot hashes. Browser visual verification at 375/768/1440 remains manual because no browser automation connector was exposed and `agent-browser` is not installed.
- Added pure `templateDetailUi.ts` helpers and `templateDetailUi.test.ts` coverage for lifecycle/status/editability labels, defensive read-only handling, version summary formatting, optional metadata display, dates, and nullable snapshot metadata.
- React event safety audited for new and touched template inputs: event values are captured synchronously before functional state updates; no `event.target` or `event.currentTarget` is referenced inside a functional updater.
- Verification: form-template Vitest passed (`33` files, `531` tests); registry Vitest passed (`1` file, `38` tests); `git diff --check` passed before docs; `make check` passed; explicit `npx prisma validate` first failed because `DATABASE_URL` was unset, then passed with real local Wasp dev DB URL `postgresql://postgres:devpass@localhost:5432/postgres`; `npm run lint --if-present`, `npm run test --if-present`, and `npm run build --if-present` exited 0 with no script output.
- Wasp startup: escalated `timeout 180 wasp start` first failed on a typed dynamic Wasp `Link`; switching the dynamic template name link to React Router `Link` with the generated Wasp route URL fixed it. The rerun compiled the Wasp project, set up the database, built the SDK, started Vite on port 3000, started the backend on port 3001, started pg-boss, served `/templates` and `/templates/:templateId` operation requests with 200 responses, and stayed healthy until timeout exit `124`. Wasp still reports the existing schema-change warning suggesting `wasp db migrate-dev`; no schema or migration change was made in this checkpoint.
- Database status: sandboxed Docker inspection was denied by socket permissions; escalated Docker inspection initially showed no running containers. The existing `wasp-dev-db-InspectionApp-349b0351ab` volume was reused. An attached `wasp db start` run confirmed Postgres readiness but was interrupted and shut down its transient container; the volume was then started in a detached `postgres:18` container mounted at `/var/lib/postgresql`, and `pg_isready` reports accepting connections. No database reset, volume deletion, or test-data deletion was performed.
- Restricted scope preserved: no diff in `app/schema.prisma`, `app/migrations`, `app/package.json`, `app/package-lock.json`, `app/src/form-builder/registry`, `app/src/clients`, `app/src/properties`, `app/src/inspections`, `app/src/projects`, or `spikes`.
- Phase 3B-1C lifecycle actions, validate/publish/create-draft/archive/restore/delete UI, builder canvas, page/container/block editing, drag-and-drop, runtime forms, reports, and PDF behavior remain unimplemented.

- Phase 3B-1A template list and create-template UI completed 2026-06-30.

- Added authenticated Wasp route `FormTemplatesRoute` at `/templates` in the existing `formTemplatesSpec`; `formTemplatesSpec` was already registered in `app/main.wasp.ts`, so the main spec file was not modified.
- Added the authenticated Templates navigation entry to `demoNavigationitems`, pointing to `routes.FormTemplatesRoute.to`; public marketing navigation was left unchanged.
- Implemented `TemplatesPage.tsx` with a work-focused list page, reusable list/list-item/empty-state components, responsive search and lifecycle controls, result-count summary, lifecycle badges, draft/current-published version badges, version count, category, tags, descriptions, and updated dates from `getFormTemplates`.
- Implemented `TemplateFormDialog.tsx` for `createFormTemplate` with labelled fields, client-side required name validation, trimmed optional metadata, comma-separated tag parsing, duplicate-submit prevention, pending state, backend error display, success toast, query refetch, and success-only close/reset behavior.
- Added pure `templateListUi.ts` helpers for search normalization, combined search/lifecycle filtering, tag parsing, date formatting, and safe user-facing error extraction. Added `templateListUi.test.ts` and included it in the existing form-template Vitest config.
- Verification: form-template Vitest passed (`32` files, `517` tests); registry Vitest passed (`1` file, `38` tests); `git diff --check` passed; `make check` passed; explicit `npx prisma validate` first failed because `DATABASE_URL` was not exported, then passed using Wasp's generated local server env; `npm run lint --if-present`, `npm run test --if-present`, and `npm run build --if-present` exited 0 with no script output.
- Wasp startup: escalated `timeout 180 wasp start` compiled the Wasp project, set up the database, built the SDK, started Vite on port 3000, started the backend on port 3001, started pg-boss, served requests, and stayed healthy until timeout exit `124`. Wasp still reports the existing schema-change warning suggesting `wasp db migrate-dev`; no schema or migration change was made in this checkpoint.
- Docker status: sandboxed `docker ps` was denied by Docker socket permissions; escalated `docker ps` hung without output and was interrupted after about 60 seconds. Database connectivity was nevertheless verified through successful Wasp startup and explicit Prisma validation with Wasp's generated local DB env.
- Visual browser verification was not performed because no callable browser connector was exposed and the `agent-browser` CLI is not installed in this environment.
- Restricted scope preserved: no diff in `app/schema.prisma`, `app/migrations`, `app/package.json`, `app/src/form-builder/registry`, `app/src/clients`, `app/src/properties`, `app/src/inspections`, `app/src/projects`, or `spikes`.
- Template detail, version-history UI, validate/publish/create-draft actions, archive/restore/delete UI, builder canvas, runtime forms, reports, and PDF behavior remain deferred.

- Phase 3A-4E version history read model and lifecycle summary completed 2026-06-29.

- Implemented authenticated Wasp query `getFormTemplateVersionHistory` with strict Zod input (`templateId` UUID, unknown-property rejection), operation-level `auth: true`, and one ownership-scoped template read by `{ id, userId }`.
- Added pure `summarizeFormTemplateVersionHistory` helper that imports no Wasp server, Prisma client instance, or operation context. It deterministically sorts versions by `versionNumber DESC` and code-unit `id ASC`, identifies `draftVersionId`, `currentPublishedVersionId`, `latestVersionNumber`, and derives `canCreateDraft`.
- The safe history DTO exposes only template lifecycle, safe version metadata, `isEditable`, `isReadOnly`, and per-version draft-source affordances. It returns no user IDs, raw template relations, snapshots, serialized snapshots, raw Prisma rows, registry objects, or internal consistency objects.
- Lifecycle affordances are authoritative for the future UI: only an `ACTIVE` template's `DRAFT` version is editable; archived-template drafts are read-only; `PUBLISHED` and `SUPERSEDED` are always read-only; draft creation is allowed only for active templates with no draft and at least one published or superseded source.
- Integrity-state detection rejects zero versions, multiple drafts, multiple current published versions, duplicate version IDs, duplicate version numbers, non-positive version numbers, and malformed version statuses. Public query translation returns HTTP 409 with code `FORM_TEMPLATE_VERSION_HISTORY_INVALID`, `templateId`, and issues sorted by `code ASC`, `message ASC`.
- Existing immutability rules remain unchanged: definition authorization already rejects `PUBLISHED` and `SUPERSEDED` writes with 409; draft-only deletion policy rejects any published or superseded history; metadata update regression coverage verifies `updateFormTemplate` changes only template rows and does not touch version rows; no generic version mutation action was added.
- Added Wasp spec `versionHistoryOperations.wasp.ts`, registered it exactly once in `app/main.wasp.ts`, and kept the checkpoint backend-only with no routes, pages, UI, schema changes, migrations, registry changes, or package changes.
- Tests added for input/auth/read behavior, deterministic history, current published status, max version number, timestamps and safe metadata, active/archived affordances, draft-source affordances, only-draft history, lifecycle corruption, structured 409 sorting, safe DTO exclusion, metadata-update immutability, and absence of generic version mutation exports.
- Verification: form-template Vitest passed (`31` files, `490` tests); registry self-check passed (`1` file, `38` tests); `git diff --check` passed; `make check` passed; `npx prisma validate` failed without `DATABASE_URL` in the shell, then passed with the real local Wasp dev DB URL from container `wasp-dev-db-InspectionApp-349b0351ab`; `npm run lint --if-present`, `npm run test --if-present`, and `npm run build --if-present` exited 0 with no configured script output.
- Docker state: `wasp-dev-db-InspectionApp-349b0351ab` (`postgres:18`) is running on port 5432. Sandboxed `timeout 180 wasp start` compiled, set up the database, built the SDK, and then failed the DB connection check with "Can not connect to database"; an escalated rerun was blocked by the approval system before execution due usage limits. Wasp still reports its existing schema-change warning suggesting `wasp db migrate-dev`; no schema or migration change was made in this checkpoint.
- Restricted scope preserved: no diff in `app/schema.prisma`, `app/migrations`, `app/package.json`, `app/src/form-builder/registry`, `app/src/clients`, `app/src/properties`, `app/src/inspections`, or `spikes`.

- Phase 3A-4D3 repair completed 2026-06-29.

- Hardened `buildVersionClonePlan` so JSON fields (`container.config`, `block.config`, `block.conditionalVisibility`, `block.validation`) are recreated through the canonical JSON path instead of reusing source object/array references. Nulls and primitives are preserved, arrays/objects remain JSON values, and nested mutations of cloned values do not affect source rows.
- Hardened container depth batching with explicit visiting/visited states. Missing parents, self-parenting, two-node cycles, and longer cycles now throw `VersionClonePlanError` instead of risking recursion failure. Valid containers are emitted exactly once in contiguous root-to-descendant batches.
- Added post-write draft confirmation inside the same transaction after clone persistence: the new version is re-read by `{ id, templateId }`, checked for exact draft metadata and empty publication/snapshot metadata, then persisted pages/containers/blocks/options are counted and compared to the clone plan.
- Expanded create-draft tests for lifecycle, source integrity, version allocation, targeted `P2002`/`P2034` mapping, createMany count verification, insert order, no `skipDuplicates`, post-write metadata/count confirmation, and safe DTO shape. Expanded clone-plan tests for JSON reference independence and cycle-safe batching. Form-template Vitest now passes 464 tests; registry self-check passes 38 tests.
- PostgreSQL port diagnosis: port 5432 is owned by the project Wasp dev database container `wasp-dev-db-InspectionApp-349b0351ab` (`postgres:18`), not an unrelated process. The container has no Docker healthcheck but is running and `pg_isready` reports accepting connections.
- The dev database initially lacked tables (`public.Session` missing in logs). Applied the six existing migrations only with `prisma migrate deploy` against Wasp's generated schema; no new migration was created. Verified 22 public tables exist, including `Session` and all form-template tables.
- Verification: `git diff --check` passed; restricted diff for schema, migrations, package.json, registries, clients, properties, inspections, spikes, and `docs/NEXT_PROMPT.md` is empty; `make check` passed; `npx prisma validate` failed without `DATABASE_URL` in the shell, then passed with the verified local Wasp dev DB URL; `npm run lint --if-present`, `npm run test --if-present`, and `npm run build --if-present` exited 0 with no configured script output.
- Wasp startup: sandboxed `timeout 180 wasp start` compiled and set up the database but could not complete its DB connection check; elevated `timeout 180 wasp start` compiled, set up the database, built the SDK, started Vite on port 3000 and the backend on port 3001, started pg-boss, served auth requests, and stayed alive until the timeout exited 124. Wasp still reports its schema-change warning and suggests `wasp db migrate-dev`, but no missing-table or connection errors remain after applying existing migrations.
- Restricted scope preserved: no schema, migration, package, registry, client, property, inspection, spike, or `docs/NEXT_PROMPT.md` changes.

- Phase 3A-4D3 create draft from published or superseded version completed 2026-06-29.

- Implemented authenticated Wasp action `createDraftFromVersion` with strict Zod input (`sourceVersionId` UUID, unknown-property rejection) and operation-level `auth: true`.
- Ownership is resolved inside one `RepeatableRead` transaction through existing definition authorization helpers. Unauthenticated access returns 401 before transaction; missing/unowned source returns 404; archived template returns 409; only `PUBLISHED` and `SUPERSEDED` source versions are accepted via positive allowlist with stable code `FORM_TEMPLATE_SOURCE_VERSION_NOT_CLONABLE`.
- Before any clone writes, the source definition is loaded through `loadDefinitionRows(tx, sourceVersion.id)`, validated with `validateVersionDefinition`, converted to canonical snapshot V1, and hashed with SHA-256. The source must have non-null snapshot metadata, `snapshotSchemaVersion === 1`, non-null `snapshotHash`, and an exact match to the calculated hash. Invalid source structure or hash divergence returns HTTP 409 with code `FORM_TEMPLATE_SOURCE_VERSION_INTEGRITY_INVALID`, sorted validation issues, and counts; the full snapshot is never exposed.
- Enforced the one-draft-per-template invariant with a tx-scoped pre-check returning HTTP 409 code `FORM_TEMPLATE_DRAFT_ALREADY_EXISTS` and `existingDraftVersionId`, plus targeted Prisma `P2002` handling for the partial unique index `FormTemplateVersion_one_draft_per_template`.
- Allocates new draft version number from transaction-scoped `max(versionNumber) + 1`, treats null aggregate results or non-increasing version numbers as integrity conflicts, and maps targeted `templateId + versionNumber` `P2002` races to HTTP 409.
- Created pure `buildVersionClonePlan` helper that injects an ID generator for deterministic tests, generates fresh UUID mappings for pages, containers, blocks, and options, rejects source-ID reuse and duplicate generated IDs, preserves block stable keys, preserves intended row data, rewires old-ID to new-ID references, and batches containers by parent depth for self-referential FK-safe insertion.
- The action creates a fresh `DRAFT` version with no publication metadata, inserts cloned pages, container batches, blocks, and options in FK-safe order, verifies every `createMany.count`, and returns only a safe DTO (`versionId`, `templateId`, `versionNumber`, `status: DRAFT`, `sourceVersionId`, counts). No user IDs, raw Prisma relations, mappings, snapshots, or internal objects are returned.
- Added Wasp spec `createDraftOperations.wasp.ts` with all six form-template entities and registered it in `app/main.wasp.ts`.
- Added focused Vitest coverage for clone-plan mapping/fresh IDs/FK rewiring/data preservation and create-draft input/auth/lifecycle/source-integrity/existing-draft/version-number/deep-clone/result DTO/transaction/tx-only/P2034/P2002/error propagation behavior.
- Checks run: form-template Vitest passed (434 tests), registry Vitest passed (38 tests), `git diff --check` passed, `make check` passed, `npm run lint --if-present`, `npm run test --if-present`, and `npm run build --if-present` exited 0 with no scripts present, `npx prisma validate` initially failed because `DATABASE_URL` was unset in the shell, then passed with a placeholder local URL and also passed through `make check`.
- `wasp start` compiled the Wasp project and built the SDK successfully. Full database-connected startup remains blocked locally: Wasp cannot connect to a database, and `wasp db start`/`wasp start db` cannot launch the managed dev database because port 5432 is already in use. `ss -ltnp` confirms a listener on `*:5432`, but the process is not visible from this environment.
- Restricted diff remains empty for schema, migrations, package.json, registries, clients, properties, inspections, and spikes. No schema, migration, registry, UI, runtime, report, PDF, package, or provider changes were made.

- Phase 3A-4D2 publish transaction with snapshot persistence and superseding completed 2026-06-29.

- Implemented authenticated publish action `publishFormTemplateVersion` with strict Zod input (UUID, unknown-property rejection).
- Unauthenticated → 401; unowned version → 404; archived template → 409; non-draft target (published/superseded) → 409.
- The complete publish flow runs in one `RepeatableRead` Prisma transaction: ownership resolution, draft assertion, definition-row loading, whole-draft validation, canonical snapshot V1 construction, deterministic serialization, SHA-256 hashing, prior-published-version integrity inspection, conditional target publication, conditional superseding, and post-write confirmation.
- Validation failure throws structured HTTP 400 with code `FORM_TEMPLATE_VERSION_INVALID`, sorted issues, and counts. No snapshot persistence or writes occur before validation succeeds.
- Canonical snapshot is persisted as a Prisma `Json` object (not a string) via `JSON.parse(serializeCanonicalSnapshot(snapshot))`. The `snapshot` field receives the JSON object; the serialized string is used only for hashing.
- Snapshot hash is computed from the exact serialized bytes using `hashCanonicalSnapshot` (SHA-256, 64 lowercase hex chars). Hash is stored in `snapshotHash` alongside `snapshotSchemaVersion: 1`.
- One authoritative `publishedAt` timestamp is captured via `new Date()` and used for both persistence and the result DTO.
- Prior published version inspection loads candidates with `orderBy: [{ versionNumber: "desc" }, { id: "asc" }]` and `take: 2`. Zero candidates = first publication; one candidate = supersede if lower version number; two candidates = HTTP 409 `FORM_TEMPLATE_MULTIPLE_PUBLISHED_VERSIONS`; one candidate with >= target version number = HTTP 409 `FORM_TEMPLATE_PUBLISH_ORDER_INVALID`.
- Target publication uses conditional `updateMany` with where `{ id, templateId, status: DRAFT }` requiring `count === 1`. If count is zero or not exactly one, throws HTTP 409. This is the authoritative race guard.
- Superseding uses conditional `updateMany` with where `{ id: prior.id, templateId, status: PUBLISHED }` setting `status: SUPERSEDED` only. Prior `publishedAt`, snapshot, snapshot schema version, and snapshot hash are never overwritten. Requires `count === 1`; otherwise throws HTTP 409 and the entire transaction rolls back.
- Post-write confirmation re-reads the target version through `tx` selecting `id`, `versionNumber`, `status`, `publishedAt`, `snapshot`, `snapshotSchemaVersion`, and `snapshotHash`. Verifies exact `id`, `versionNumber`, `status === PUBLISHED`, `publishedAt` non-null with exact timestamp match (`getTime()`), `snapshot` non-null, `snapshotSchemaVersion === 1`, and exact `snapshotHash` equality. Failed confirmation throws HTTP 409 and rolls back the entire transaction.
- P2034 transaction conflict errors are mapped to HTTP 409 ("The form template version changed during publishing. Retry the operation."). Unrelated Prisma errors propagate unchanged. Existing `HttpError` instances are not remapped. No automatic retries are implemented.
- Safe result DTO (`PublishFormTemplateVersionResult`) includes `versionId`, `versionNumber`, `status: PUBLISHED`, `publishedAt`, `snapshotSchemaVersion: 1`, `snapshotHash`, `previousPublishedVersionSuperseded`, `previousPublishedVersionId`, and `validation` with `valid: true`, empty issues, and counts. No user IDs, raw template relations, raw Prisma records, the full snapshot, serialized snapshot, or internal error objects are exposed.
- Added Wasp spec (`publishOperations.wasp.ts`) declaring `publishFormTemplateVersion` as `action` with `auth: true` and all six form-template entities. Registered in `app/main.wasp.ts`.
- Added focused Vitest coverage: input validation and authorization (8 tests), transaction boundaries (5 tests), structured validation failure (4 tests), first publication (9 tests), superseding (5 tests), published-state corruption (2 tests), race and conflict handling (6 tests), snapshot integrity (5 tests), confirmation and safe result (6 tests), concurrency coverage note (1 test). Total new tests: 51.
- Real concurrent database integration testing was not performed. Unit tests use Prisma error-code mocking. P2034 and conditional `updateMany.count` zero checks are tested via mocking.
- All existing tests remain enabled and pass: form-template (419 tests total: 368 existing + 51 new), registry (38 tests).
- Post-write confirmation strengthened with `snapshot` selection, exact `id`/`versionNumber`/`publishedAt.getTime()`/`snapshotHash` equality verification, and `snapshot` non-null check. Redundant same-function hash verification removed.
- Structured validation-error test assertions made unconditional with exact stable issue code checks (`VERSION_HAS_NO_PAGES`).
- Independent snapshot hash verification test added: builds canonical snapshot from exact fixture rows, independently computes hash, and verifies both result and persisted hash match. Verifies persisted snapshot is deeply equal to canonical JSON.
- Exact confirmation tests added covering: `snapshot` select, null snapshot → 409, different hash → 409, different `publishedAt` → 409, different `versionNumber` → 409.
- Checks run: `git diff --check` passed, `make check` passed, `wasp start` compiled successfully and connected to PostgreSQL (Docker dev database running, server on ports 3000/3001). Real concurrent database integration testing was not performed.
- Restricted diff empty: no schema, migration, registry, client, property, inspection, or spike changes.
- Builder UI, drag-and-drop, runtime forms, version cloning, new-draft creation, reports, and PDF work remain deferred.

- Phase 3A-4D1 whole-draft validation and canonical snapshot foundation completed 2026-06-29.

- Implemented reusable transaction-scoped normalized definition-row loader (`definitionRows.ts`) that loads one authoritative version's pages, containers, blocks, and options through the supplied Prisma tx client with deterministic `sortOrder ASC, id ASC` ordering. No global Prisma reads. Returns raw rows, not an assembled tree.
- Implemented pure ordering validator (`versionOrdering.ts`) that detects gaps, duplicates, negative values, non-integer values, and inconsistent ordering in any scope. Used independently for pages, root containers, child containers, blocks, and options.
- Implemented pure whole-draft validation (`versionValidation.ts`) covering: version-level completeness (pages, blocks), page integrity (version mismatch, ordering, root container presence), container ownership and parent integrity (XOR, missing refs, self-parent, cycles, disconnected subgraphs, type registration, root placement, parent-child compatibility, config validation, ordering), block integrity (missing container, version mismatch, type registration, block/container compatibility, config validation, implementation/schema version, required policy, stable key presence/uniqueness, ordering), option integrity (missing block, option-on-non-backed-block, label/value/color/score validation, value uniqueness, ordering, publication minimum, maximum, options-on-non-option-block), contextual default integrity (default-option lookup via registry capability).
- Implemented recursive canonical JSON value handling (`canonicalizeJsonValue`): null/string/boolean/finite-number pass through; arrays preserve order and recursively canonicalize; object keys sorted lexicographically; non-finite numbers, undefined, dates, and class instances throw `CanonicalizationError`.
- Implemented canonical snapshot V1 builder (`buildCanonicalSnapshotV1`) with exact shape: `schemaVersion: 1`, `templateId`, `versionId`, `versionNumber`, `pages[]` with recursive `containers[]` → `blocks[]` → `options[]`. All arrays sorted by `sortOrder` then `id`. No userId, status, timestamps, or snapshot metadata fields included. Throws `SnapshotBuildError` on structural inconsistency.
- Implemented deterministic serialization (`serializeCanonicalSnapshot`) using `JSON.stringify` — safe because objects are constructed in explicit field order and nested JSON objects are recursively key-sorted.
- Implemented SHA-256 hashing (`hashCanonicalSnapshot`) using Node's `node:crypto` — produces exactly 64 lowercase hexadecimal characters. No new dependencies.
- Implemented authenticated public validation query `validateFormTemplateVersion` with strict Zod input (UUID, unknown-property rejection). Unauthenticated → 401; unowned version → 404; archived template/non-draft version → 409. Ownership resolution, row loading, validation, snapshot building, and hashing all run in one `RepeatableRead` transaction using tx.
- Safe result DTO (`FormTemplateVersionValidationResult`) includes `versionId`, `valid`, `issues[]` (sorted by `path`, `code`, `message`), `counts` (pages/containers/blocks/options), `snapshotSchemaVersion: 1`, and `snapshotHash` (null when invalid). No user IDs, template relations, raw Prisma records, registry definitions, or snapshot persistence fields.
- Added Wasp spec (`versionValidationOperations.wasp.ts`) declaring `validateFormTemplateVersion` as `query` with `auth: true` and all six form-template entities. Registered in `app/main.wasp.ts`.
- Added focused Vitest coverage: version ordering (11 tests), canonical snapshot + JSON + hashing (29 tests), whole-draft validation (46 tests), query input/result DTO (11 tests). Total new tests: 97.
- All existing tests remain enabled and pass: form-template (334 tests, unchanged count), registry (38 tests).
- Checks run: `git diff --check` passed, `make check` passed, `npx prisma validate` passed, `wasp start` compiled successfully (SDK built; DB connection not available locally).
- Restricted diff empty: no schema, migration, registry, client, property, inspection, or spike changes.
- Builder UI, drag-and-drop, runtime forms, publishing, version cloning, snapshot persistence, canonical snapshot creation inside publish, status transitions, superseding, reports, and PDF work remain deferred.

- Phase 3A-4C2B option CRUD, ordering, and contextual default integrity completed 2026-06-29.

- Implemented authenticated `createFormBlockOption`, `updateFormBlockOption`, `moveFormBlockOption`, and `deleteFormBlockOption` actions for active owned draft versions only.
- Added strict Zod schemas for option create/update/move/delete with UUID validation, label/value trimming and max-length, blank-to-null color normalization, null/clear semantics for color and score (with `hasOwn` checks for `score: 0`), and unknown-property rejection. Rejected raw `sortOrder`, `blockId` on update, timestamps, and persistence fields.
- Added safe result DTOs (`SafeFormBlockOption`, `CreateFormBlockOptionResult`, `UpdateFormBlockOptionResult`, `MoveFormBlockOptionResult`, `DeleteFormBlockOptionResult`) that never expose user IDs, template ownership data, or raw relation objects.
- Added ownership and lifecycle enforcement through `requireOwnedBlockForOptionWrite` and `requireOwnedOptionForWrite` resolving ownership via `block → templateVersion → template.userId` and `option → block → templateVersion → template.userId` inside the same Prisma transaction. Unauthenticated access returns 401; unowned resources return 404; archived templates and non-draft versions return 409.
- Added option-capability enforcement using `requireOptionBackedCapability` wrapped in `withOptionCapabilityHttpError` that translates `OptionCapabilityError` to HTTP 400. Option-disabled blocks (heading, paragraph, short_text) reject option operations with 400; unknown persisted block types return 409.
- Added `maximumOptions` and `minimumOptions` enforcement from the registry capability contract. Current `single_select` has `minimumOptions: 0` and `maximumOptions: null`, so these checks currently do not restrict normal editing but honor the registry contract generically.
- Added targeted Prisma `P2002` duplicate-value error handling: only `blockId + value` conflicts are mapped to HTTP 409 with "An option with this value already exists in the block." Unrelated `P2002` errors, foreign-key failures, and general database errors are rethrown without translation.
- Added block-scoped contiguous option ordering (0, 1, 2, ...) after every create, move, or delete. Reused `buildContiguousOrderUpdates`, `insertIdAt`, `moveIdToIndex`, `removeId`, and `orderBySortOrderThenId`. Normalization writes use `id + blockId` through `updateMany`; scoped update count failures return 409. Options are loaded deterministically by `sortOrder ASC, id ASC`.
- Implemented exact index semantics: create position `0..N` or append by omission; move index `0..N-1` (same-index moves still normalize the complete scope); delete compacts remaining siblings.
- Created focused default-integrity helpers: `parseStoredConfig` (validates stored config, returns 409 on malformation), `getCurrentDefaultValue` (reads from parsed config using registry capability's `defaultValueConfigKey`), `getDefaultValueConfigKey`, `buildConfigWithDefault`, `buildConfigWithoutDefault`, `validateAndBuildConfigWithDefault` (contextually verifies persisted option matches proposed default), and `createTxFindOptionByValue` (pure data-access factory for tx-scoped option lookup).
- Modified `parseBlockConfig` in `blockOperations.ts` to remove the hard-coded `single_select.defaultValue` rejection; it is now a pure registry schema parser.
- Modified `createFormBlock` to reject option-backed blocks with a defined default key at creation time (HTTP 400: "Persisted options must be created before assigning a default value."), because the block has no ID or persisted options yet. Nested option creation is not supported.
- Modified `updateFormBlock` to use `validateAndBuildConfigWithDefault` for option-backed blocks, which verifies a matching persisted option exists under the same block before accepting the config. Unmatched defaults return HTTP 400.
- Implemented atomic option/default consistency: updating the current default option's value atomically updates the block config inside the same transaction; updating a non-default option leaves config unchanged. Deleting the current default option atomically clears the default from block config and returns `clearedDefaultValue: true`; deleting a non-default option returns `false`. Creating and moving options never automatically assign or alter the default.
- All operations use `Prisma.TransactionIsolationLevel.RepeatableRead` with all ownership, lifecycle, block/option reads, config/contextual validation reads, mutations, duplicate-producing writes, block config updates, and ordering normalization performed through `tx`.
- Added Wasp declarations in `optionOperations.wasp.ts` for the four option actions with `auth: true` and entities `FormTemplate`, `FormTemplateVersion`, `FormBlockDefinition`, `FormBlockOption`. Registered the spec in `app/main.wasp.ts`.
- Added focused Vitest coverage: option validation (40 tests), default integrity (18 tests), and option operations (39 tests) covering input validation, ownership/lifecycle, capability enforcement, duplicate-value handling, ordering, default behavior, safe result DTOs, and update semantics (score 0, null clears, unchanged field preservation).
- Existing block operations test updated: `parseBlockConfig` no longer hard-rejects `single_select.defaultValue`; `createFormBlock` rejects option-backed defaults at creation; `updateFormBlock` contextually validates defaults. Block operations test `createTx()` extended with `formBlockOption.findFirst` for the contextual default lookup path.
- All 20 existing test files and 3 new test files pass (209 form-template tests, unchanged from checkpoint baseline count after adding new tests and adjusting one existing test assertion). Registry tests (38) pass unchanged.
- Checks run: `git diff --check` passed, `make check` passed, `npx prisma validate` passed, `wasp start` compiled successfully (SDK built; DB connection not available locally).
- Builder UI, drag-and-drop, runtime forms, publishing, version cloning, canonical snapshots, snapshot hashing, reports, and PDF work remain deferred.
- No schema, migration, registry, UI, runtime, report, or PDF code was changed. Restricted diff (schema/migrations/registries/clients/properties/inspections/spikes) is empty.

- Phase 3A-4C2A option capability contract and database value uniqueness completed 2026-06-29.

- Added an explicit controlled `BlockOptionCapability` discriminated union (`kind: "none"` | `kind: "options"` with `selectionMode`, `defaultValueConfigKey`, `minimumOptions`, `maximumOptions`) as a required field on `BlockTypeDefinition`.
- Configured `single_select` as option-backed (`selectionMode: "single"`, `defaultValueConfigKey: "defaultValue"`, `minimumOptions: 0`, `maximumOptions: null`). Draft minimum is 0 so the block is creatable before options are added.
- Configured `heading`, `paragraph`, and `short_text` as option-disabled (`kind: "none"`).
- Added pure capability helpers `isOptionBackedBlock` and `requireOptionBackedCapability` with a dedicated `OptionCapabilityError` domain error that does not depend on `HttpError`.
- Added database-level `@@unique([blockId, value])` on `FormBlockOption`. Within one block, each option value is unique; the same value may exist in a different block. No global uniqueness was introduced.
- Created migration `20260629120000_add_form_block_option_value_unique` with exactly one narrow SQL operation: `CREATE UNIQUE INDEX "FormBlockOption_blockId_value_key" ON "FormBlockOption"("blockId", "value")`.
- Added focused Vitest tests for registry contract completeness (every block has `optionCapability`, `blockTypeDefinitionKeys` contains the field, per-block declarations), capability helpers (synthetic definitions, positive/negative detection, assertion behavior, dedicated error type), and existing test compatibility.
- Checks run: form-template tests (107 passed), registry tests (38 passed), `git diff --check` passed, `make check` passed, `npx prisma validate` passed, `wasp start` compiled successfully.
- Option CRUD, contextual single-select default validation, `single_select.defaultValue` enablement, builder UI, drag-and-drop, runtime execution, publishing, reports, and PDF work remain unimplemented.
- No option actions, block-operation behavior changes, Wasp actions, UI, runtime, or publishing code was added.

- Phase 3A-4C1 block operations completed 2026-06-29.

- Implemented authenticated `createFormBlock`, `updateFormBlock`, `moveFormBlock`, and `deleteFormBlock` actions for active owned draft versions only.
- Added strict block operation input validation with UUID checks, label trimming/max length, unknown-property rejection, optional create position, exact move indexes, and no acceptance of client-owned persistence fields such as `stableKey`, raw `sortOrder`, registry version fields, options, conditional visibility, or validation rules.
- Added block/container compatibility checks requiring both `containerDefinition.acceptsBlocks === true` and `blockDefinition.allowedContainerTypes` to include the destination container type. The current production registry remains unchanged: `heading`, `paragraph`, `short_text`, and `single_select` are accepted only in `section`.
- Added registry-backed config validation/defaulting and registry-owned persistence of `blockImplementationVersion` and `configSchemaVersion`.
- Added immutable server-generated stable keys using cryptographically secure UUIDs in `blk_<32 lowercase hex>` form. Updates and moves preserve stable keys. Targeted `templateVersionId + stableKey` Prisma `P2002` conflicts retry with bounded attempts and return 409 after repeated collisions.
- Added display-block required policy for the current baseline: `heading` and `paragraph` cannot be required; `short_text` and `single_select` may be required or optional. A formal registry response-kind capability remains deferred until the baseline list is insufficient.
- Added the temporary Phase 3A-4C1 single-select boundary: `single_select.config.defaultValue` is rejected on create/update until option CRUD and contextual option validation exist.
- Create, move, and delete normalize affected block sibling scopes transactionally using `templateVersionId + containerId` for sibling reads and `id + templateVersionId` for normalization writes. Same-container moves use final zero-based indexes over `0..N-1`; cross-container moves remove first and insert into `0..M`; creates insert into `0..N` or append by omission; deletes compact the former source scope.
- Delete relies on the existing Prisma cascade from blocks to option rows; no option write operations were added.
- Added Wasp declarations for the four block actions with operation-level `auth: true`.
- Added focused Vitest coverage for validation, compatibility, required policy, single-select default rejection, registry validation, ownership/lifecycle, cross-version protection, stable-key generation/collisions/immutability, transaction-client usage, and ordering normalization.
- Checks run: focused Vitest suite passed (`100` tests); `git diff --check` passed; `make check` passed; `npm run lint --if-present`, `npm run test --if-present`, and `npm run build --if-present` exited 0 with no scripts present.
- `wasp start` successfully compiled the Wasp project and built the SDK, including generated block operation types, then stopped before dev-server startup because the local database was not running.
- Option CRUD remains unimplemented. `single_select.defaultValue` remains unavailable until contextual option validation exists. Builder UI, runtime execution, publishing, reports, and PDF work remain deferred.
- No schema, migration, registry, UI, runtime, report, or PDF code was changed.

- Phase 3A-4B container operations completed 2026-06-29.

- Implemented authenticated `createFormContainer`, `updateFormContainer`, `moveFormContainer`, and `deleteFormContainer` actions for active owned draft versions only.
- Added strict container operation input validation with a discriminated page/container parent target, UUID checks, unknown-property rejection, title normalization, JSON-serializable config payload types, and complete registry config validation.
- Added pure parent-compatibility helpers. For the current production registry, `section` is root-eligible under a page because `allowedParentTypes` is empty, but it cannot be nested and cannot parent child containers because both-sided compatibility fails.
- Added pure generic container-graph helpers for future nested types. The helpers reject self-parenting, direct/deep descendant moves, duplicate graph rows, missing parent references, and malformed existing ancestry cycles without relying on a fixed depth limit.
- Create and move operations prevent cross-version parent references by resolving destination pages/containers through the source or supplied version inside the same Prisma transaction.
- Container create, move, and delete normalize affected sibling scopes transactionally with contiguous integer `sortOrder` values. Same-scope moves use final zero-based indexes over `0..N-1`; cross-scope moves remove first and insert into `0..M`; creates insert into `0..N` or append by omission; deletes compact the former source scope.
- Delete relies on the existing Prisma cascade behavior for descendant containers, blocks, and options; no block or option write operations were added.
- Added Wasp declarations for the four container actions with operation-level `auth: true`.
- Added focused Vitest coverage for validation, compatibility, graph/cycle helpers, ownership/state handling, cross-version rejection, root `section` behavior, config validation/defaulting, mocked transaction-client usage, and ordering normalization.
- Checks run: focused Vitest suite passed (`75` tests); `git diff --check` passed; `make check` passed; `npm run lint --if-present`, `npm run test --if-present`, and `npm run build --if-present` exited 0 with no scripts present.
- `wasp start` successfully compiled the Wasp project and built the SDK, including generated container operation types, then stopped before dev-server startup because the local database was not running.
- Only the root `section` type is currently production-usable. Nested production container types remain unavailable. Block and option writes remain unimplemented.
- No schema, migration, registry, UI, runtime, report, or PDF code was changed.

- Phase 3A-4A definition tree and ordered page operations completed 2026-06-29.

- Added reusable definition-level authorization helpers for owned template-version reads, active-draft version writes, and page writes resolved through version/template ownership.
- Implemented strict definition input schemas for the read-only tree query and page create/update/move/delete actions.
- Implemented pure integer ordering helpers for deterministic ordering, insertion, final-index movement, deletion, and contiguous order-update generation.
- Implemented read-only normalized definition tree loading for one owned version. The query loads pages, containers, blocks, and options as flat version-scoped collections and assembles the nested tree in application code without writing or repairing data.
- Added tree integrity checks for malformed owned definition data, including invalid page/parent references, page-versus-parent violations, cycles, block/option missing-parent references, duplicate IDs, and duplicate/gapped sibling ordering. Integrity failures return generic 409 errors.
- Implemented authenticated page create, update, move, and delete actions. Writes recheck ownership, active template lifecycle, and draft version status inside the Prisma transaction before mutating data.
- Page create supports append by omission or insertion at `0..currentCount`; move uses final zero-based index semantics over `0..N-1`; delete relies on existing cascades and compacts remaining sibling order. Every committed page create/move/delete rewrites page `sortOrder` values contiguously to `0..n-1` inside the same transaction.
- Added Wasp declarations for `getFormTemplateVersionDefinitionTree`, `createFormPage`, `updateFormPage`, `moveFormPage`, and `deleteFormPage` with operation-level auth enabled via Wasp 0.24 `auth: true`.
- Added focused Vitest coverage for definition validation, authorization, ordering helpers, tree assembly/integrity, and mocked transaction page-operation behavior.
- Checks run: focused Vitest suite passed (`51` tests); `git diff --check` passed; `make check` passed; `npm run lint --if-present`, `npm run test --if-present`, and `npm run build --if-present` exited 0 with no scripts present.
- `wasp start` successfully compiled the Wasp project and built the SDK, including generated definition operation types, then stopped before dev-server startup because the local database was not running.
- Container, block, and option writes remain unimplemented. No schema, migration, registry, UI, runtime, report, or PDF code was changed.

- Phase 3A-3 template ownership/lifecycle operations completed 2026-06-29.

- Added `app/src/form-templates/` server foundation for authenticated user-owned template metadata and version metadata operations.
- Implemented strict Zod validation for create/update/archive/restore/version/template lookup and draft-only delete inputs. Tags are trimmed, empty tags are removed, omitted tags become `[]`, and duplicate normalized tags are rejected.
- Implemented reusable auth/ownership/lifecycle helpers for authenticated user id, owned template lookup, owned version lookup through parent template ownership, active-template assertion, and draft-version assertion.
- Implemented safe metadata queries: `getFormTemplates`, `getFormTemplateById`, and `getFormTemplateVersionById`. Snapshot JSON and normalized page/container/block/option trees are not returned.
- Implemented actions: `createFormTemplate`, `updateFormTemplate`, `archiveFormTemplate`, `restoreFormTemplate`, and `deleteDraftOnlyFormTemplate`.
- `createFormTemplate` creates the template and initial draft version #1 in one transaction. Metadata updates and lifecycle transitions use state-checked transactional updates. Draft-only delete revalidates confirmation name and draft-only history transactionally before deleting.
- Added Wasp declarations with `FormTemplate` and `FormTemplateVersion` entities only; no routes, pages, navigation, UI, definition CRUD, publishing, runtime, reports, or PDF integration were added.
- Added focused Vitest unit tests for validation, authorization helpers, and lifecycle/deletion policy.
- Checks run: focused Vitest suite passed (`23` tests); `git diff --check` passed; `make check` passed; `npm run lint --if-present`, `npm run test --if-present`, and `npm run build --if-present` exited 0 with no scripts present.
- `wasp start` successfully completed project compilation and SDK generation, including generated form-template operation types, then failed before dev-server startup because the database was not running. `wasp start db` could not start the managed database because Docker is not installed/available in this WSL distro.
- No Prisma schema, migration, registry, UI, runtime, report, or PDF code was changed.

- Phase 3A-2 controlled source-owned registries completed 2026-06-18.

- Added controlled form-builder registries under `app/src/form-builder/registry/`.
- Registered baseline container type `section`.
- Registered baseline block types `heading`, `paragraph`, `short_text`, and `single_select`.
- Registry contracts are strict, registry results are deeply immutable for plain objects and arrays, duplicate type IDs are rejected, and registry self-checks pass.
- No template CRUD, definition CRUD, publishing, runtime, UI, reports, or PDF work was completed in this checkpoint.

- Phase 3A-1 schema/migration completed 2026-06-18.

- Added production schema and migration for `FormTemplate`, `FormTemplateVersion`, `FormPageDefinition`, `FormContainerDefinition`, `FormBlockDefinition`, and `FormBlockOption`.
- Added template lifecycle and version status enums.
- Added page-versus-parent XOR database constraint for containers and one-draft-per-template partial unique index.
- No definition CRUD, registry validation, publishing, runtime, UI, reports, or PDF work was completed in this checkpoint.

- Phase 3A0-B Gate 1 manual review completed 2026-06-18.

- User manually reviewed all 12 regenerated core artifacts and confirmed `automatedStatus: PASS`, `manualStatus: PASS`, and `finalStatus: PASS`.
- Confirmed deterministic images render correctly, broken-image placeholders are gone, long text paginates correctly, the 50-row table repeats its header and remains readable, explicit page breaks avoid accidental blank pages, photo grids stay inside printable A4 width, image aspect ratios/captions are acceptable, the 52-photo stress fixture renders, the oversized unsplittable block is replaced by a bounded diagnostic, and preview/PDF output is materially consistent.
- Functional renderer feasibility conclusion: PASS. Playwright/Chromium successfully generated the 12 core feasibility fixtures in native WSL after Linux browser dependencies were installed.
- Engine decision: Playwright/Chromium is approved as the current PDF-rendering candidate for continued implementation and Gate 2 validation. The complete production renderer is not finished.
- Core 05 caveat recorded: Manual review passed for technical feasibility. The fixture intentionally renders both CSS/static and Playwright-template header/footer strategies, producing duplicate visual elements. Production must choose one strategy; the combined appearance is not an approved report design.
- Deployment suitability remains unresolved or partially measured because peak Chromium process-tree RSS remains unavailable, Railway/container execution has not been tested, real infrastructure cold-start behavior is unknown, concurrency/background-job behavior is untested, and local WSL timings are not guaranteed production timings.
- Gate 2 extended fixtures, production report styling, final header/footer implementation strategy, and real deployment/container validation remain pending.

- Phase 3A0-B Gate 1 fixture repair and native WSL rerender completed 2026-06-18.

- Verified existing generated image files with `file` and Node-side `pngjs`/`jpeg-js` decoding. The files had valid PNG/JPEG signatures and expected dimensions, so the broken-image PDFs were attributed to Chromium resource loading from `file://` sources rather than invalid generated bytes.
- Updated deterministic asset loading to embed generated PNG/JPEG bytes as `data:` URLs in fixture HTML while preserving stable `data-asset-id` attributes.
- Added asset validation evidence at `spikes/pdf-render/artifacts/metrics/asset-validation.json`.
- Repaired `core-09-photos-4col` with shrinkable four-column grid tracks and bounded figure/image/caption layout. DOM diagnostics now report no horizontal overflow.
- Repaired `core-05-header-footer-pages` to generate exactly 3 physical pages with extracted `Page 1 of 3`, `Page 2 of 3`, and `Page 3 of 3` text, repeated static header/footer evidence, and an embedded logo.
- Repaired `core-03-unsplittable-oversized` to render a bounded diagnostic placeholder instead of printing a split/clipped oversized block.
- Reran Gate 1 with real embedded image rendering: `generate:assets`, `render:core`, `measure:deployment`, and `check` all passed.
- All 12 core fixtures now have `automatedStatus: PASS`, `manualStatus: PENDING`, and `finalStatus: PENDING`.
- Native WSL launch succeeded with Playwright `1.61.0`, Chromium revision `1228`, browser version `149.0.7827.55`, executable `spikes/pdf-render/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome`.
- Latest measurements: install size `674450721` bytes, executable size `278568152` bytes, browser cold launch `65 ms`, first render `1060 ms`, warm render with browser reuse `368 ms`. RSS remains `null` because the best-effort process-tree sampler did not identify sampled RSS during PDF generation.
- No `app/` files were modified, no `docs/DECISIONS.md` approval was added, and Gate 2 was not started.

- Phase 3A0-B Gate 1 scaffold and blocked feasibility evidence completed 2026-06-18.

- Created isolated TypeScript spike package at `spikes/pdf-render/` with no `app/`, Wasp, schema, migration, auth, route, or production PDF integration changes.
- Added Gate 1-only core fixture implementation for the 12 required PDF feasibility cases; no Gate 2 extended fixture implementation file was created.
- Added deterministic local PNG/JPEG asset generation using `pngjs` and `jpeg-js`.
- Added Playwright rendering pipeline, network guard for unexpected HTTP/HTTPS requests, DOM/image readiness diagnostics, PDF analysis with `pdf-lib`, and PDF text extraction via `pdfjs-dist/legacy/build/pdf.mjs`.
- Added fixture evidence records with separate `automatedStatus`, `manualStatus`, and `finalStatus`; visual fixtures remain manual/final pending.
- Added best-effort Linux/WSL process-tree RSS measurement support with explicit null diagnostics when unavailable.
- Added generated manual review output at `spikes/pdf-render/artifacts/metrics/manual-review.md` and summaries under `spikes/pdf-render/artifacts/metrics/`.
- `npm install` passed after sandbox escalation.
- `PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright npx playwright install chromium` failed: `Playwright does not support chromium on ubuntu26.04-x64`.
- `PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright npm run generate:assets` passed after sandbox escalation.
- `PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright npm run render:core` is BLOCKED because the Chromium executable does not exist in `.cache/ms-playwright`.
- `PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright npm run measure:deployment` passed and recorded the missing executable/cache state.
- `PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright npm run check` passed after TypeScript fixes and artifact validation.
- All 12 core fixtures currently have `automatedStatus: BLOCKED`, `manualStatus: PENDING`, and `finalStatus: PENDING`.
- No Playwright engine approval decision was recorded, and Gate 2 was not started.

- Phase 3A0-B Gate 1 Playwright 1.61.0 retry completed 2026-06-18.

- Preserved the original Playwright 1.55.1 blocked run under `spikes/pdf-render/artifacts/metrics/runs/playwright-1.55.1-blocked/`.
- Corrected the old-run interpretation: Playwright 1.55.1 browser installation was blocked in this environment; this does not imply current Playwright generally lacks Ubuntu 26.04 support.
- Corrected blocked-run statuses to `automatedStatus: BLOCKED`, `manualStatus: NOT_REQUIRED`, and `finalStatus: BLOCKED`.
- Corrected unavailable blocked-run measurements to `null` with diagnostics instead of partial cache-size values.
- Upgraded isolated spike dependency from `playwright@1.55.1` to `playwright@1.61.0`; updated `package-lock.json`.
- Removed only `spikes/pdf-render/.cache/ms-playwright` before retrying the browser install.
- `PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright npx playwright install chromium` initially failed in the sandbox with DNS `ENOTFOUND cdn.playwright.dev`, then succeeded after network escalation.
- Playwright 1.61.0 installed Chromium revision `1228`, browser version `149.0.7827.55`.
- Resolved executable path: `spikes/pdf-render/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome`.
- Native WSL launch failed: `libnspr4.so: cannot open shared object file: No such file or directory`.
- All 12 core fixtures remain blocked: `automatedStatus: BLOCKED`, `manualStatus: NOT_REQUIRED`, `finalStatus: BLOCKED`.
- Native WSL measurements recorded: install size `674450721` bytes, executable size `278568152` bytes, launch/render/page-count/RSS/PDF metrics `null`.
- Prepared but did not execute Docker fallback proposal using `mcr.microsoft.com/playwright:v1.61.0-noble`.
- No `app/` files were modified, no `docs/DECISIONS.md` approval was added, and Gate 2 was not started.

- Phase 3A0-A v5 Stage B nested group implementation completed 2026-06-18.

- Added one fixed nested group, `group-a1`, inside Section A in `spikes/builder-dnd/`.
- Extended the sortable state from two section arrays to one controlled `Record<ContainerId, string[]>` with stable keys `section-a`, `section-b`, and `group-a1`.
- Preserved the Stage A `DragDropProvider` + `useSortable` + `useDroppable` + `move(items, event)` architecture.
- Blocks inside the group use the same compatible sortable architecture as section blocks.
- The group container itself was not made draggable or reorderable.
- Collision priority is item-first: section containers use priority `1`, the nested group container uses priority `2`, and sortable block items use priority `4`.
- Empty group state has a visible dashed drop area.
- Cancel handling still restores the exact pre-drag state snapshot when dnd-kit reports a canceled drag.
- Checks run: `npx tsc --noEmit` passed; `npm run build` passed; `git diff --check` passed; `make check` passed; `git diff -- app` produced no output.
- Browser interaction was not genuinely performed during the implementation pass; user manual validation was completed afterward and is recorded below.
- Touch remains UNVERIFIED.
- No `app/`, schema, migration, environment, deployment, or package files outside the spike were modified.

- Phase 3A0-A v5 Stage B manual pointer validation completed 2026-06-18.

- User manual testing completed 10 consecutive correct attempts for all Stage B operations and all Stage A regression operations.
- Verified Stage B operations: Section A → group, Section B → group, group → Section A, group → Section B, reorder within group, insert first/middle/last in group, drop into empty group, and cancel cross-container drag with exact pre-drag state restoration.
- Verified Stage A regressions still work: reorder within Section A, reorder within Section B, Section A → Section B, Section B → Section A, first/middle/final insertion, and empty-section drop.
- No wrong destinations, wrong insertion positions, duplicate blocks, disappearing blocks, bottom jumps, or preview/final-position mismatches were observed.
- Stage B status: MANUALLY VERIFIED PASS.
- Touch remains UNVERIFIED.
- Dragging or reordering the group container itself remains outside the Stage B validated scope.

- Phase 3A0-A v5 Stage A manual pointer validation completed 2026-06-17.

- User manual testing found Stage A pointer dragging smooth and predictable.
- Reordering within both sections worked reliably.
- Moving blocks between sections worked reliably.
- Dropping at first, middle, and final positions worked reliably.
- No inconsistent jumping to the bottom was observed in the v5 rewrite.
- No blocks disappeared or duplicated.
- Decision recorded: v5 sortable architecture is approved as the drag-and-drop foundation.
- Design caveat recorded: the standalone Vite visuals are not approved as final product design and must not be used as a production visual reference.
- Production builder UI must be rebuilt later using the existing app's Tailwind/shadcn patterns, `docs/UI_RULES.md`, and `docs/FORM_BUILDER_MASTER_SPEC.md`.

- Phase 3A0-A v5 Stage A sortable rewrite implemented 2026-06-17.

- Manual verdict for v4 pointer implementation recorded as FAIL: blocks sometimes dropped at the bottom or unintended locations, with inconsistent behavior between attempts.
- Preserved v4 reference implementation under `spikes/builder-dnd/archive/v4/` without intentionally archiving `node_modules` or generated build output.
- Rebuilt the pointer-drag core around current dnd-kit sortable primitives: `DragDropProvider`, `useSortable`, section-level `useDroppable`, and `move(items, event)` during `onDragOver`.
- Removed the active pointer core's custom drop-slot algorithm, manual `onDragEnd` insertion-index logic, native HTML5 drag for canvas blocks, and DOM-query style resolution.
- Stage A now exposes exactly two flat sections with 5 blocks in Section A and 3 blocks in Section B. Nested groups are intentionally not implemented until Stage A is manually stable.
- Checks run: `npx tsc --noEmit` passed; `npm run build` passed.
- Later manual testing verified reorder, A→B, B→A, first/middle/end insertion, and empty-section behavior as stable in Stage A.

- Phase 3A0-A v4 correction pass partially completed 2026-06-17.

- Fixed DragActiveContext placement so an outer `BuilderCanvas` owns `isDragActive`, the provider wraps `BuilderCanvasInner`, and `useAutoScroll()` runs inside the active provider.
- Moved `useDragOperation()` into a `CanvasDragOverlay` child under `DragDropProvider`, matching the same provider-consumer rule for dnd-kit overlay state.
- Removed the module-level `_lastPointerY` / `window.addEventListener('pointermove')` design. Pointer Y now lives in a React ref with effect cleanup while drag is active.
- Defined keyboard boundary navigation policy: Arrow boundary movement targets the previous/next visible compatible section/group in depth-first page order; non-adjacent moves use Move-to.
- Escape cancel now restores the pre-lift template, undo stack, redo stack, and save status. The JSON snapshot remains explicitly spike-only.
- `spikes/builder-dnd/README.md` updated with v4 results and clear VERIFIED PASS / PASS WITH LIMITATIONS / FAIL / UNVERIFIED categories.
- Checks run: `npx tsc --noEmit` passed; `npm run build` passed; fresh `npm run dev -- --host 0.0.0.0` started after sandbox escalation; `curl -I http://localhost:5173/` returned HTTP 200.
- Browser verification blocked: `agent-browser` command unavailable; Playwright Chromium install failed because Playwright does not support chromium on ubuntu26.04-x64; no Chrome/Chromium/Firefox binary found in PATH.
- Still unverified: Move-to browser flow, fresh-browser keyboard cross-container flow, genuine manual pointer drag, auto-scroll during active pointer drag, and touch.

- Phase 3A0-A — Builder feasibility spike initially completed 2026-06-17, later reopened for verification gaps.

- WSL/Open SaaS baseline setup.
- Initial AGENTS.md.
- Documentation structure.
- Inspected repo-local audit/Wasp/expert-advice skill instructions.
- Mapped the current Wasp app structure under `app/`.
- Identified `app/main.wasp.ts` as the main Wasp config.
- Identified `app/schema.prisma` as the Prisma schema/entity source.
- Identified existing routes, queries, actions, API, and job specs.
- Documented current payment/email/file/admin/analytics/AI feature locations.
- Documented package commands from `app`, `blog`, and `e2e-tests` package files.
- Documented likely files for a future user-owned Clients resource.
- Manually verified baseline local startup.
- Confirmed landing page opens.
- Confirmed signup works.
- Confirmed Dummy email verification appears in server logs.
- Confirmed login works.
- Confirmed `/demo-app` opens after login.
- Confirmed `/file-upload` route opens or clearly reports missing S3 configuration.
- Confirmed `/admin` redirects or blocks non-admin users.
- Fixed file download signed URL ownership: downloads now require auth, load an owned `File` row by id, and sign only the stored `s3Key`.
- Implemented first user-owned Clients resource at `/clients`.
- Added `Client` Prisma model with `userId` ownership, timestamps, contact fields, notes, and `@@index([userId])`.
- Added Clients Wasp spec, operations, page UI, and authenticated app navigation link.
- Created and applied migration `20260616154215_add_clients`.
- Replaced stock Open SaaS template README with Inspection App setup guide covering requirements, local setup, Makefile commands, removed directories, security rules, and docs index.

## Completed — Phase 1: Product skeleton cleanup (2026-06-16)

- Renamed app from "OpenSaaS" / "My Open SaaS App" to "InspectionApp" / "Inspection App" in `app/main.wasp.ts`.
- Removed "Documentation" and "Blog" nav links (pointed to opensaas.sh).
- Removed "AI Scheduler" from authenticated nav items (demo-app page still exists at /demo-app).
- Removed "Star Our Repo on Github" announcement banner from landing page nav.
- Updated landing page Hero with Dutch inspection-app headline: "Van klant tot rapport — één flow."
- Replaced placeholder features grid with 9 inspection-relevant features (Klantbeheer, Projecten, Inspecties, Foto's, Rapportages, AI, Handtekeningen, Templates, Teamwerk).
- Updated testimonials with Dutch inspector personas.
- Updated FAQ with 3 inspection-relevant Dutch Q&A items.
- Updated footer navigation (removed opensaas.sh/wasp.sh links).
- Updated highlighted feature section with 5-step workflow summary.
- Removed Open SaaS banner images from Hero.
- Updated nav bar branding text from "Your SaaS" to "Inspection App".
- Cleaned up unused `useIsLandingPage` import and `Announcement` reference in NavBar.
- `make check` passed (whitespace check + Prisma validate).
- No schema changes, no migrations, no new packages.
- All functional pages preserved: auth, clients, projects, file-upload, admin, demo-app, payment.

## Completed — Phase 3A0-A: Builder feasibility spike (2026-06-17)

- Standalone Vite+React+TS prototype created at `spikes/builder-dnd/`.
- @dnd-kit/react v0.5.0 and @dnd-kit/helpers v0.5.0 installed and tested.
- Block palette with 30 block types in 7 categories (Structure, Display, Basic Inputs, Choice Inputs, Data/Calculation, Media, Inspection/Workflow).
- Three-panel builder layout: palette (left), canvas (center), properties (right).
- Click-to-add blocks from palette to active section/selected container.
- Sections and nested groups implemented with visual borders and depth indentation.
- Move-up/down fallback buttons on every block and container.
- Undo/redo command stack (Ctrl+Z, Ctrl+Shift+Z) with 20-command depth.
- Save simulation with configurable failure toggle and rollback to lastSavedSnapshot.
- Responsive CSS: panels stack vertically below 1024px, mobile optimizations at 768px and 480px.
- dnd-kit integration: DragDropProvider, useDraggable on blocks, useDroppable on containers, PointerSensor, KeyboardSensor, DragOverlay.
- Auto-scroll hook (useAutoScroll) implemented but not tested without active pointer drag.
- Full cross-container pointer drag-and-drop requires deeper sortable-group wiring — dnd-kit recommended for Phase 3D with implementation refinements noted.
- Ordering strategies compared via benchmark: integer (O(N) writes), fractional/float (1 write per insert), LexoRank (1 write, growing string keys).
- **Recommendation: Fractional (Float) ordering** — best balance of write efficiency, debuggability, and query simplicity for single-user template editing.
- See `spikes/builder-dnd/README.md` for full findings and dnd-kit configuration notes.

## In progress

- Phase 3A0-B: PDF feasibility spike — NEXT.

## 2026-06-17 — Master planning phase completed

- Form builder, inspection runtime, and PDF report designer specification created.
- Product redefined around 9 separated subsystems.
- 18 phases planned: 2 feasibility spikes (3A0-A Builder, 3A0-B PDF) + 16 production phases (3A through 3R).
- Existing Phase 0-2 work preserved. Old Phase 3 (Findings) superseded by this plan.
- Documentation created: PRODUCT_CAPABILITY_MATRIX.md, FORM_BUILDER_MASTER_SPEC.md, FORM_BLOCK_CATALOG.md, FORM_BUILDER_DATA_MODEL.md, REPORT_DESIGNER_PDF_SPEC.md, FORM_PLATFORM_ROADMAP.md, NEN2767_IMPLEMENTATION_BOUNDARY.md.
- Ordering strategy (integer vs fractional vs LexoRank) deferred to Phase 3A0-A spike.
- Container reference approach (polymorphic containerType+containerId vs explicit FK to FormContainerDefinition) deferred to Phase 3A implementation analysis.
- PDF engine: Playwright/Chromium is preferred candidate — to be verified by Phase 3A0-B spike.
- DnD library: dnd-kit (@dnd-kit/react + @dnd-kit/helpers current API) is preferred candidate — to be verified by Phase 3A0-A spike.
- Chromium binary size, memory requirements, and cold-start time are unknown until Phase 3A0-B measures them.
- Phase 3A0-A is the next implementation step.

## Completed — Phase 2 fixes & improvements (2026-06-17)

### Route param fix

- Fixed all detail pages (ClientDetailPage, PropertyDetailPage, InspectionDetailPage) to use `useParams` from `react-router` instead of expecting props from Wasp. Wasp uses React Router under the hood and route params must be accessed via the `useParams()` hook.
- Fixed InspectionsPage to use `useSearchParams` from `react-router` for `?propertyId=` query string.
- Server logs confirm: `get-inspection-by-id` and `get-property-by-id` now return 200.

### Date picker

- Installed `react-day-picker` v10 and `date-fns` for calendar widget.
- Created `app/src/client/components/ui/calendar.tsx` — shadcn-style Calendar wrapping react-day-picker v10.
- Created `app/src/client/components/ui/date-picker.tsx` — popover DatePicker with Calendar + Clear button.
- Created `app/src/client/hooks/use-on-click-outside.ts` — click-outside detection hook.
- Replaced native `<input type="date">` with DatePicker in Inspection create/edit form.

## Completed — Phase 2: Core domain data (Property + Inspection) (2026-06-16)

### Schema

- Added `PropertyType` enum (Residential, Commercial, Industrial, Government, Other).
- Added `InspectionStatus` enum (Planned, InProgress, Completed, Cancelled).
- Added `Property` model: id, address, city, postalCode, type, notes, userId (FK), clientId (FK, optional, onDelete: SetNull), timestamps, @@index([userId]), @@index([clientId]).
- Added `Inspection` model: id, title, description, status (default Planned), scheduledDate, completedDate, userId (FK), propertyId (FK, onDelete: Restrict), clientId (FK, denormalized, onDelete: SetNull), timestamps, @@index([userId]), @@index([propertyId]).
- Added reverse relations on User (properties, inspections) and Client (properties, inspections).
- Migration `20260616220424_add_property_inspection` applied successfully.

### Property CRUD

- Created `app/src/properties/`: operations.ts (full CRUD with Zod, client ownership check, block delete if inspections exist), PropertiesPage.tsx (list with search, CRUD dialogs, type badges, Radix Select for client), PropertyDetailPage.tsx (property info + linked inspections), properties.wasp.ts (routes /properties and /properties/:id).

### Inspection CRUD

- Created `app/src/inspections/`: operations.ts (nested ownership: Inspection→Property→User, auto-denormalize clientId), InspectionsPage.tsx (list with status badges, Property selector, date inputs), InspectionDetailPage.tsx (read-only with Phase 3 placeholder), inspections.wasp.ts (routes /inspections and /inspections/:id).

### Wire relationships

- Created `app/src/clients/ClientDetailPage.tsx`: full detail with inline edit, linked Properties, route /clients/:id.
- Added getClientById query with Property include. Added "View" button to client list items.

### Integration

- Imported propertiesSpec + inspectionsSpec into main.wasp.ts. Added nav links. Specs include all needed entities (Property, Client).
- make check passed. Migration applied cleanly. wasp start compiles. No new packages.

## Completed — Foundation pass (2026-06-16)

- Full repo inspection and environment verification.
- Node v24.16.0, Wasp 0.24.0, Docker 28.3.2, PostgreSQL 18 confirmed working.
- `wasp install` and `npm install` completed successfully.
- `.env.server` created from `.env.server.example` with placeholder values.
- Database started (`wasp db start`), all 3 migrations applied successfully.
- App starts and runs: client on :3000, server on :3001.
- Browser smoke tests completed:
  - Landing page loads ✅
  - Signup with Dummy email provider works ✅
  - Email verification via server log link works ✅
  - Login works ✅
  - `/projects` — CRUD fully tested (create, list, edit, delete) ✅
  - `/clients` — server API returns 200 ✅
  - `/demo-app` — loads with pre-loaded tasks ✅
  - `/file-upload` — loads (S3 not configured, graceful degradation) ✅
  - `/admin` — correctly blocks non-admin users (403) ✅
- Competitor research completed:
  - Incontrol (incontrol.app) product tour analyzed — full feature map documented
  - 300+ inspection software listings reviewed via Capterra/GetApp/SoftwareAdvice
  - Key competitors identified: Spectora, ISN, GoAudits, SnapInspect, SafetyCulture
  - Feature patterns documented for templates, photos, AI, reports, signatures
- Planning documentation created/updated:
  - `docs/PRODUCT_RESEARCH_INSPECTION_APPS.md` — competitive analysis and feature inspiration
  - `docs/PROJECT_BRIEF.md` — replaced MVP factory brief with inspection app product brief
  - `docs/INSPECTION_APP_ARCHITECTURE.md` — entity model, permissions, phase dependencies
  - `docs/ROADMAP_INSPECTION_APP.md` — 11-phase build plan (Phase 0-10)
  - `docs/AI_AGENT_WORKFLOW.md` — agent rules, self-check blocks, phase-specific instructions
  - `docs/NEXT_PROMPT.md` — exact prompt for Phase 1 (skeleton cleanup)
- Git state: only `README.md` and docs files modified (expected).

## Notes from 2026-06-16 audit

- No application code was changed.
- No packages were installed.
- No migrations were run.
- No real `.env` or `.env.server` files were changed.
- `app/package.json` has no package scripts.
- `blog/package.json` has Astro scripts.
- `e2e-tests/package.json` has Playwright scripts.
- Stripe is selected in code, but Lemon Squeezy and Polar files remain.
- Email sender currently uses Wasp `Dummy`.
- File upload uses S3-compatible storage, with download signed URLs gated by server-side file ownership.
- `app/src/env.ts` validates many feature/provider schemas at once and needs runtime verification.
- The Wasp plugin init hook referenced by `.agents/skills/wasp-plugin-help/SKILL.md` was not found at `.agents/hooks/check-wasp-init.js`.
- Prisma Client generation for the Clients migration required running Prisma under Node 20 via `npx -p node@20 ...`; Prisma 5.19 generation was a silent no-op under the local Node 24 shell.
