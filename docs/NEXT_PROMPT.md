# Phase 3C-1A - Builder Route and Read-Only Three-Panel Shell

Continue in:

```text
~/dev/inspection-app
```

Implement **Phase 3C-1A only**.

This phase starts the actual builder experience without adding builder mutations. Add an authenticated builder route for the current editable draft, load the authoritative draft definition tree, and render a responsive read-only three-panel shell:

- left panel: controlled registry-backed palette;
- center panel: read-only canvas structure;
- right panel: read-only properties/selection panel;
- mobile: single-panel navigation between Canvas, Palette, and Properties.

Do **not** implement drag-and-drop, click-to-add blocks, page/container/block/option mutations, autosave, undo/redo, runtime form filling, reports, PDF rendering, duplicate-template deep copy, or marketplace behavior.

## Required Starting Point

Start from `main` after Phase 3B-1C is merged. Work on a new isolated review branch, for example:

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c review/phase-3c-1a
```

Stop and report if the branch already exists locally or remotely.

## Required Reading

Read before editing:

```text
AGENTS.md
docs/PROJECT_BRIEF.md
docs/PROGRESS_LOG.md
docs/TODO.md
docs/NEXT_PROMPT.md
docs/UI_RULES.md
docs/PERMISSIONS.md
docs/SECURITY_CHECKLIST.md
docs/FORM_PLATFORM_ROADMAP.md
docs/FORM_BUILDER_MASTER_SPEC.md
docs/FORM_BLOCK_CATALOG.md

app/main.wasp.ts
app/schema.prisma
app/src/form-templates/formTemplates.wasp.ts
app/src/form-templates/definitionOperations.wasp.ts
app/src/form-templates/versionHistoryOperations.wasp.ts
app/src/form-templates/TemplateDetailPage.tsx
app/src/form-templates/templateDetailUi.ts
app/src/form-templates/templateWorkflowUi.ts
app/src/form-templates/definitionOperations.ts
app/src/form-templates/definitionTree.ts
app/src/form-templates/definitionValidation.ts
app/src/form-templates/definitionAuthorization.ts
app/src/form-templates/versionHistory.ts
app/src/form-builder/registry/
app/src/client/App.tsx
app/src/client/components/ui/
app/src/client/hooks/use-toast.ts
```

Run:

```bash
cd ~/dev/inspection-app/app
wasp version
```

Use official Wasp 0.24 documentation only where route/action/query behavior is genuinely uncertain.

## Scope

Use existing backend operations and DTOs:

- `getFormTemplateById`
- `getFormTemplateVersionHistory`
- `getFormTemplateVersionDefinitionTree`

Do not add backend operations or alter backend DTOs unless a concrete blocker is found. If a backend/schema change appears necessary, stop and report the blocker.

## Required Behavior

Add a builder route for an editable draft, using the existing Wasp Spec conventions. A suggested route shape is:

```text
/templates/:templateId/builder
```

The builder page must:

- authenticate through route protection;
- load template detail and authoritative version history;
- select the current draft only when `history.lifecycleStatus === "ACTIVE"`, `draftVersionId` is non-null, and the draft version has `status === "DRAFT"`, `isEditable === true`, and `isReadOnly === false`;
- load `getFormTemplateVersionDefinitionTree({ versionId: draftVersionId })` only after a valid editable draft is known;
- show safe loading, not-found, archived/no-draft, lifecycle mismatch, integrity error, and retry states;
- never derive ownership on the client;
- never expose user IDs, raw snapshots, internal relations, stack traces, or `[object Object]`.

## Shell Layout

Desktop (`>= 1024px`):

- three-panel layout with stable responsive dimensions;
- left palette panel;
- center canvas panel;
- right properties panel;
- no cards nested inside cards;
- no page-level horizontal scrolling.

Mobile/tablet:

- single-panel mode with tabs or segmented controls for Canvas, Palette, and Properties;
- maintain usable touch targets and visible focus states;
- all text must wrap within its container.

## Palette

Render the controlled registry as read-only palette entries:

- group block types by registry category where available;
- show label/name, type ID, and concise description;
- show structural/container entries separately if the registry exposes them;
- include a search/filter input if it can be done without adding mutation behavior;
- do not implement click-to-add or drag-to-add.

## Canvas

Render the normalized definition tree read-only:

- pages in backend order;
- root containers and child containers in backend order;
- blocks and options in backend order;
- empty draft state when no pages/containers/blocks exist;
- clear placeholders for empty pages or containers;
- selection state for page/container/block rows is allowed, but selection must not mutate data;
- do not implement inline editing, add/delete/move controls, drag handles, autosave, dirty state, or undo/redo.

## Properties Panel

Render read-only details for the selected item:

- selected page: title, sort order, ID;
- selected container: type, title, config, sort order, ID;
- selected block: block type, label, required flag, stable key, config, validation/visibility metadata, options summary;
- no editable controls yet;
- wrap JSON/config values safely in contained monospace blocks.

## Navigation From Detail

Add an obvious builder/open-draft action from the template detail page only when the authoritative current draft is editable and lifecycle state is consistent.

Do not show the builder action for:

- archived templates;
- templates with no current draft;
- inconsistent lifecycle state;
- draft versions with contradictory editability flags.

## Tests

Add focused pure-helper tests for any new builder UI helpers:

- current editable draft selection;
- lifecycle mismatch handling;
- empty/no-draft/archived states;
- registry grouping/filtering helpers;
- tree summary/selection helpers;
- safe JSON/config display helpers, if extracted.

Keep all existing form-template and registry tests enabled.

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
```

Run available project scripts:

```bash
cd ~/dev/inspection-app/app
npm run lint --if-present
npm run test --if-present
npm run build --if-present
```

Validate Prisma using the actual local Wasp development environment. Start the app with:

```bash
timeout 180 wasp start
```

Success requires Wasp compilation, database connection, SDK build, backend on port 3001, Vite on port 3000, and healthy runtime until timeout exit `124`.

If browser tooling is available, verify `/templates`, `/templates/:templateId`, and the new builder route at approximately 375 px, 768 px, and 1440 px. Confirm no horizontal overflow, no console errors, and no mutation controls are present.

## Restricted Files

Do not modify:

```text
app/schema.prisma
app/migrations/
app/package.json
app/package-lock.json
app/src/clients/
app/src/properties/
app/src/inspections/
app/src/projects/
spikes/
.env
.env.server
```

Before committing, confirm restricted diff is empty.

## Documentation

Update:

```text
docs/PROGRESS_LOG.md
docs/TODO.md
docs/NEXT_PROMPT.md
```

Update `docs/DECISIONS.md` only if a real product or architecture decision is made.

## Commit and Push

Stage explicit intended files only. Do not use `git add .` or `git add -A`.

Commit:

```bash
git commit -m "feat(3c): add read-only builder shell"
```

Push the review branch. Do not merge into `main`.
