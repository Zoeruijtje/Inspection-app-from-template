# Next Prompt — Phase 3A-4 Definition CRUD, Tree Integrity, and Integer Ordering

Continue in:

```text
~/dev/inspection-app
```

Use Agent mode.

## Current validated baseline

The following checkpoints are complete and committed or ready for review:

- Phase 3A0-A: dnd-kit v5 sortable architecture passed manual pointer validation through nested-group Stage B.
- Phase 3A0-B Gate 1: Playwright/Chromium passed functional PDF feasibility for all 12 core fixtures.
- Phase 3A-1: production form-template schema and migration are implemented.
- Phase 3A-2: controlled source-owned registries are implemented under `app/src/form-builder/registry/`.
- Phase 3A-3: authenticated form-template ownership, metadata queries, lifecycle actions, and draft-only deletion are implemented.

Still deferred from builder/PDF work:

- touch validation;
- drag-overlay polish;
- production keyboard interaction;
- accessible Move-to fallback;
- production auto-scroll;
- dragging and reordering container nodes;
- PDF Gate 2;
- Railway/container PDF validation;
- process memory validation;
- PDF concurrency/background jobs;
- final report styling;
- final PDF header/footer strategy.

Do not claim these deferred items are complete.

## Objective

Implement **Phase 3A-4 only: authenticated server operations for normalized form-definition CRUD, tree integrity, and integer ordering**.

Target only pages, containers, blocks, and block options for owned draft template versions.

## Implement

- Reusable ownership checks through template version ownership.
- Draft-only mutability for all definition writes.
- Read-only normalized tree loading for one owned template version.
- Page CRUD with integer `sortOrder` normalization.
- Container CRUD with page-versus-parent XOR enforcement.
- Block CRUD using the existing registry for block type, config schema, implementation version, and config schema version.
- Option CRUD for choice blocks where the registry allows options.
- Cross-version prevention for all parent/child references.
- Cycle prevention for nested containers.
- Transactional sort-order normalization to contiguous `0..n` values within each parent scope.

## Do not implement

- publishing;
- snapshot creation;
- hashing;
- builder UI;
- routes;
- navigation;
- drag-and-drop;
- runtime form execution;
- reports;
- PDF work;
- creating a new draft from a published version;
- version cloning.

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

Do not modify schema or migrations unless Phase 3A-4 discovers a real schema blocker and the user explicitly approves the schema change first.

## Verification

Run focused tests for validation, authorization, tree integrity, draft-only mutability, registry validation, cycle prevention, cross-version prevention, and ordering normalization.

Then run:

```bash
git diff --check
make check
cd app && wasp start
```

If `wasp start` compiles but cannot start the dev server because the local database/Docker is unavailable, report that precisely and do not claim full runtime validation.
