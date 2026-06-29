# Next Prompt — Phase 3A-4B Container CRUD, Parent Compatibility, and Cycle Prevention

Continue in:

```text
~/dev/inspection-app
```

Use Agent mode.

## Current validated baseline

The following checkpoints are complete and committed or ready for review:

- Phase 3A0-A: dnd-kit sortable feasibility through nested-group Stage B.
- Phase 3A0-B Gate 1: Playwright/Chromium functional PDF feasibility for all 12 core fixtures.
- Phase 3A-1: production form-template schema and migration.
- Phase 3A-2: controlled container and block registries.
- Phase 3A-3: authenticated form-template ownership, metadata, lifecycle, and protected draft-only deletion operations.
- Phase 3A-4A: definition-level authorization, read-only normalized definition tree query, page create/update/move/delete actions, and page ordering normalization.

Still deferred:

- block and option writes;
- production builder UI;
- drag-and-drop integration;
- touch validation;
- keyboard and accessible Move-to workflows;
- container-node dragging;
- version cloning;
- publishing;
- canonical snapshots and hashing;
- runtime form execution;
- reports and PDF Gate 2;
- deployment, concurrency, and memory validation for PDF generation.

Do not represent deferred work as complete.

## Objective

Implement **Phase 3A checkpoint 3A-4B only**:

1. root and nested container create, update, move, and delete actions;
2. registry-controlled parent compatibility;
3. page-versus-parent XOR validation;
4. cross-version prevention for page/parent references;
5. active-draft-only writes with ownership rechecked inside each transaction;
6. transactional source/destination ordering normalization;
7. generic cycle-prevention helpers and tests.

Do not implement block or option mutations in this checkpoint.

## Important registry boundary

The current production container registry has only the `section` container type, and it is root-only:

```text
allowedParentTypes: []
allowedChildContainerTypes: []
```

Therefore, current production operations must reject placing a `section` under another container. Generic cycle-detection helpers may still be implemented and tested for future container types.

## Do not implement

- block create/update/move/delete;
- option create/update/move/delete;
- registry capability changes;
- stable-key generation;
- publishing;
- snapshots;
- hashing;
- version cloning;
- UI, routes, or navigation;
- drag-and-drop;
- runtime forms;
- reports or PDF work;
- schema changes;
- migrations;
- package installation.

## Expected areas

```text
app/src/form-templates/
app/main.wasp.ts
docs/PROGRESS_LOG.md
docs/TODO.md
docs/NEXT_PROMPT.md
```

Registry reads are allowed, but do not modify:

```text
app/src/form-builder/registry/
```

Do not modify schema or migrations unless Phase 3A-4B discovers a real schema blocker and the user explicitly approves the schema change first.

## Verification

Run focused tests for validation, authorization, parent compatibility, page-versus-parent XOR, cross-version prevention, cycle prevention, and source/destination ordering normalization.

Then run:

```bash
git diff --check
make check
cd app && wasp start
```

If `wasp start` compiles but cannot start the dev server because the local database/Docker is unavailable, report that precisely and do not claim full runtime validation.
