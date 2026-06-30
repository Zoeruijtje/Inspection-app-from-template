# Phase 3B-1C - Template Lifecycle and Version Workflow Actions

Continue in:

```text
~/dev/inspection-app
```

Implement **Phase 3B-1C only**.

This phase extends the existing template detail UI with lifecycle and version workflow actions:

- validate the current draft;
- publish a valid draft;
- display validation feedback;
- create a new draft from a published or superseded version;
- archive an active template;
- restore an archived template;
- safely delete a draft-only template with exact-name confirmation.

Do **not** implement builder canvas, page/container/block editing, drag-and-drop, runtime form filling, reports, PDF rendering, duplicate-template deep copy, or template marketplace behavior.

## Required starting point

Start from `main` after Phase 3B-1B is merged. Work on a new isolated review branch, for example:

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c review/phase-3b-1c
```

Stop and report if the branch already exists locally or remotely.

## Required reading

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

app/main.wasp.ts
app/schema.prisma
app/src/form-templates/formTemplates.wasp.ts
app/src/form-templates/versionValidationOperations.ts
app/src/form-templates/publishOperations.ts
app/src/form-templates/createDraftOperations.ts
app/src/form-templates/operations.ts
app/src/form-templates/versionHistory.ts
app/src/form-templates/TemplateDetailPage.tsx
app/src/form-templates/TemplateMetadataDialog.tsx
app/src/form-templates/templateDetailUi.ts
app/src/form-templates/templateListUi.ts
app/src/client/components/ui/
app/src/client/hooks/use-toast.ts
```

Run `cd app && wasp version`. Use official Wasp 0.24 docs only if route/action/query behavior is uncertain.

## Scope

Use existing backend operations and DTOs wherever possible:

- `validateFormTemplateVersion`
- `publishFormTemplateVersion`
- `createDraftFromVersion`
- `archiveFormTemplate`
- `restoreFormTemplate`
- `deleteDraftOnlyFormTemplate`
- `getFormTemplateById`
- `getFormTemplateVersionHistory`

Do not add backend operations or alter backend DTOs unless a concrete blocker is found. If a backend/schema change appears necessary, stop and report the blocker.

Expected UI behavior:

- Action availability must use authoritative backend DTOs and lifecycle/version state, not client-only guesses.
- Draft validation should show clear issue lists and counts.
- Publish should be available only for the current editable draft where appropriate and should surface validation/publish failures safely.
- Create-draft-from-version should be shown as an action only where `canCreateDraftFromThisVersion` is true; it must remain disabled or absent otherwise.
- Archive, restore, and safe delete should use confirmation dialogs and clear pending/success/error states.
- Draft-only delete must require exact template name confirmation and should never be offered for published/superseded histories.
- After any successful mutation, refetch detail and version-history data and keep success separate from refresh failure.
- Use toasts consistently with existing template UI.
- Keep responsive layouts usable on mobile and desktop.

## Safety rules

- Server-side ownership checks remain the authority; frontend hiding is not security.
- Do not expose raw snapshots, user IDs, internal relations, stack traces, or `[object Object]`.
- Do not add destructive buttons without confirmation.
- Prevent duplicate submissions while actions are pending.
- Capture primitive input values synchronously in React event handlers; never reference event objects inside functional state updaters.

## Tests

Add focused pure-helper tests for any new UI state helpers:

- action availability labels;
- validation issue formatting;
- confirmation-name matching helpers, if client-side helper is added;
- safe action result/error display helpers;
- summary refresh behavior helpers, if extracted.

Keep all existing form-template and registry tests enabled.

## Verification

Run:

```bash
cd app
npx --no-install vitest run --config src/form-templates/vitest.config.ts --reporter=verbose
npx --no-install vitest run --config src/form-builder/registry/vitest.config.ts --reporter=verbose
```

Then:

```bash
cd ..
git diff --check
make check
```

Validate Prisma with the real local Wasp dev DB URL if `DATABASE_URL` is not exported.

Start the app:

```bash
cd app
timeout 180 wasp start
```

Success requires Wasp compilation, database connection, SDK build, backend on port 3001, Vite on port 3000, and healthy runtime until timeout exit `124`.

If browser tooling is available, verify `/templates` and `/templates/:templateId` at approximately 375 px, 768 px, and 1440 px. Confirm action visibility, dialogs, pending states, validation feedback, success/error toasts, refetch behavior, and no horizontal overflow.

## Restricted files

Do not modify:

```text
app/schema.prisma
app/migrations/
app/package.json
app/package-lock.json
app/src/form-builder/registry/
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

## Commit and push

Stage explicit intended files only. Do not use `git add .` or `git add -A`.

Commit:

```bash
git commit -m "feat(3b): add template lifecycle workflow UI"
```

Push the review branch. Do not merge into `main`.
