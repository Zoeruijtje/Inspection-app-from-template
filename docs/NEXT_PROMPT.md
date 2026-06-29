# Phase 3A-4C2B — Option CRUD, Ordering, and Contextual Default Integrity

**Prerequisite:** Phase 3A-4C2A is complete. The `BlockOptionCapability` discriminated union, registry declarations, pure capability helpers, and database-enforced `@@unique([blockId, value])` on `FormBlockOption` are all in place.

## Objective

Implement authenticated option create, update, move, and delete operations for `single_select` blocks within active owned draft template versions. Enable `single_select.config.defaultValue` only when it references a currently persisted option, and keep the default consistent when options are changed or removed.

## Required behavior

### Option CRUD

- **createOption:** Accept `blockId`, `label` (1-200 chars, trimmed), `value` (1-120 chars, trimmed), optional `color` (max 32 chars), optional `score` (float), and optional `position` (0-indexed insertion index; append if omitted). Resolve ownership through `blockId → containerId → templateVersionId → template.userId`. Reject if the block is not option-backed via `requireOptionBackedCapability`. Reject duplicate values at the database level and return a clear 409. Normalize sibling option ordering contiguously.
- **updateOption:** Accept `optionId`, at least one mutable field (`label`, `value`, `color`, `score`). Resolve ownership. Reject if the block is not option-backed. If `value` changes or duplicates an existing sibling, handle the `P2002` unique constraint. If the block's `config.defaultValue` references the updated option, keep it consistent (update the stored value in the config if the option's value field changed).
- **moveOption:** Accept `optionId` and `toIndex` (0-indexed). Resolve ownership. Reject if block is not option-backed. Renumber sibling options contiguously.
- **deleteOption:** Accept `optionId`. Resolve ownership. Reject if block is not option-backed. If the deleted option's value matches the block's `config.defaultValue`, clear the default from the block config in the same transaction. Compact remaining sibling ordering.

### Contextual defaultValue validation

When creating or updating a block with `config.defaultValue` set, verify the value references a persisted option belonging to that block within the same version. Use the database, not the registry, to validate this. Reject with a clear 400 if no matching option exists.

Remove the temporary Phase 3A-4C1 boundary in `parseBlockConfig` that unconditionally rejects `single_select.defaultValue`. Replace it with contextual validation that checks persisted options.

### Transaction and ownership

- All option mutations must use `prisma.$transaction` with `RepeatableRead` isolation.
- Use `requireAuthenticatedUserId`, `requireOwnedActiveDraftFormTemplateVersionForWrite`, and the existing ownership chain through block → container → version → template.
- Do not create global reads outside the transaction client.

### Validation

- Use strict Zod schemas for all option operation inputs.
- Reject unknown properties, client-owned persistence fields (`sortOrder`, `id`), and cross-version references.
- Option labels and values must be trimmed; empty strings rejected.

### Ordering

- Use the existing `buildContiguousOrderUpdates`, `insertIdAt`, `moveIdToIndex`, and `removeId` helpers from `definitionOrdering.ts`.
- After every committed create/move/delete, sibling options within the block scope must be contiguously ordered `0..n-1`.

## Explicitly out of scope

- Multi-select, ranking, matrix, or other future option-backed block types.
- Builder UI, palette, canvas, or properties panel.
- Drag-and-drop for options.
- Runtime form execution.
- Publishing, snapshots, hashing.
- Reports, PDF work.
- Option cloning or batch operations.
- Wasp actions beyond option CRUD.
- Schema changes beyond Phase 3A-4C2A.
- Package installation.

## Verification

- Run all form-template and registry tests.
- `git diff --check` must pass.
- `make check` must pass.
- `npx prisma validate` must pass.
- `wasp start` must compile successfully.

## Deliverables

- Four Wasp-declared option actions: `createFormBlockOption`, `updateFormBlockOption`, `moveFormBlockOption`, `deleteFormBlockOption`.
- Ownership, capability, and value-uniqueness enforcement on every write.
- Contextual `single_select.defaultValue` validation referencing persisted options.
- Contiguous option ordering normalization.
- Focused Vitest tests for validation, capability enforcement, ordering, ownership, duplicate handling, and default-value consistency.
