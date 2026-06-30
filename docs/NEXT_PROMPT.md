# Phase 3B-1B — Template Detail and Version History UI

Continue in:

```text
~/dev/inspection-app
```

Use:

```text
Agent: Codex
Mode: Agent
Reasoning: highest available
```

Implement **Phase 3B-1B only**.

This checkpoint extends the new template-management UI with a read-focused detail screen and metadata editing:

- authenticated `/templates/:templateId` route;
- links from `/templates` rows to the detail page;
- template metadata display;
- template metadata editing;
- lifecycle badge;
- authoritative version-history query display;
- current published version, draft version, and latest version number summary;
- editable/read-only badges from backend DTO fields;
- responsive version table/list;
- loading, empty, and error states.

Do **not** implement validate, publish, create-draft-from-version, archive, restore, delete, builder canvas, drag-and-drop, runtime forms, reports, or PDF behavior in this checkpoint. Those lifecycle/version mutations belong to Phase 3B-1C.

Work on an isolated review branch, verify everything, commit and push automatically. Do not merge into `main`.

---

## 1. Branch Safety

Run:

```bash
cd ~/dev/inspection-app

git fetch origin
git switch main
git pull --ff-only origin main

git branch --show-current
git status --short
git log -8 --oneline
git diff --check
```

Required:

```text
branch: main
working tree: clean
```

Confirm Phase 3B-1A is present on `main`:

- `FormTemplatesRoute` exists at `/templates`;
- Templates nav entry exists;
- `TemplatesPage.tsx`, `TemplateFormDialog.tsx`, and `templateListUi.ts` exist;
- `docs/TODO.md` marks only Phase 3B-1A complete under Phase 3B.

Check that the new review branch does not already exist:

```bash
git show-ref --verify --quiet refs/heads/review/phase-3b-1b
local_status=$?

git ls-remote --exit-code --heads origin review/phase-3b-1b
remote_status=$?

printf 'local=%s remote=%s\n' "$local_status" "$remote_status"
```

If it exists locally or remotely, stop and report it.

Create:

```bash
git switch -c review/phase-3b-1b
```

Do not switch back to `main` during implementation.

---

## 2. Required Reading

Read completely before editing:

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
app/src/form-templates/operations.ts
app/src/form-templates/validation.ts
app/src/form-templates/versionHistory.ts
app/src/form-templates/versionHistoryOperations.ts
app/src/form-templates/versionHistoryValidation.ts
app/src/form-templates/TemplatesPage.tsx
app/src/form-templates/TemplateFormDialog.tsx
app/src/form-templates/templateListUi.ts
app/src/form-templates/templateListUi.test.ts

app/src/client/components/NavBar/constants.ts
app/src/client/components/ui/
app/src/client/hooks/use-toast.ts

app/src/properties/PropertyDetailPage.tsx
app/src/clients/ClientDetailPage.tsx
app/src/inspections/InspectionDetailPage.tsx
```

Run:

```bash
cd ~/dev/inspection-app/app
wasp version
```

Use official Wasp documentation matching the installed version only where behavior is uncertain. Do not browse unrelated documentation.

---

## 3. Scope

Expected changes:

```text
app/src/form-templates/formTemplates.wasp.ts
app/src/form-templates/TemplatesPage.tsx
app/src/form-templates/TemplateDetailPage.tsx
app/src/form-templates/TemplateMetadataDialog.tsx
app/src/form-templates/templateDetailUi.ts
app/src/form-templates/templateDetailUi.test.ts
app/src/form-templates/vitest.config.ts
docs/PROGRESS_LOG.md
docs/TODO.md
docs/NEXT_PROMPT.md
```

A slightly different component split is acceptable if it stays maintainable.

Do not modify:

```text
app/schema.prisma
app/migrations/
app/package.json
app/src/form-builder/registry/
app/src/clients/
app/src/properties/
app/src/inspections/
app/src/projects/
spikes/
.env
.env.server
```

Do not add backend operations, modify existing backend DTOs, create migrations, install packages, or add production dependencies. If a backend/schema requirement appears necessary, stop and report it.

---

## 4. Route and Navigation

Add an authenticated route to the existing `formTemplatesSpec`:

```text
Route name: FormTemplateDetailRoute
Path: /templates/:templateId
Page: TemplateDetailPage
Authentication: required
```

Use the installed Wasp 0.24 spec syntax already used in the project.

Update template rows/cards on `/templates` so the template name or row links to:

```ts
routes.FormTemplateDetailRoute.build({ params: { templateId: template.id } })
```

Use the generated route helper shape actually produced by Wasp 0.24 in this project. Do not add `/templates/:templateId/versions/:versionId` in this checkpoint.

---

## 5. Detail Page Data

Load:

```ts
useQuery(getFormTemplateById, { templateId })
useQuery(getFormTemplateVersionHistory, { templateId })
```

Use `getFormTemplateVersionHistory` as the authoritative lifecycle/version state source. Do not re-derive editability or draft-source eligibility when the backend DTO already exposes:

```text
draftVersionId
currentPublishedVersionId
latestVersionNumber
canCreateDraft
versions[].isEditable
versions[].isReadOnly
versions[].canCreateDraftFromThisVersion
```

Do not query per-version details per row.

---

## 6. Detail Page UI

Implement:

- back link to `/templates`;
- header with template name;
- description when present;
- category when present;
- tags;
- lifecycle badge with visible text `Active` or `Archived`;
- created and updated dates;
- summary badges/cards for draft version, current published version, latest version number, and total version count;
- edit metadata button/dialog;
- version history section.

The metadata edit dialog should use existing `updateFormTemplate`:

- fields: name, description, category, tags;
- same trimming and comma-separated tag parsing behavior as create;
- client-side required name error;
- backend remains authoritative for length and validation;
- disable submit while pending;
- keep dialog open on error;
- close only on success;
- refetch both detail and list-relevant data where applicable;
- show success toast.

Archived templates may still be readable. If `updateFormTemplate` returns backend conflict for archived templates, show the backend error clearly.

---

## 7. Version History UI

Display each version with:

- version number;
- status badge: `Draft`, `Published`, `Superseded`;
- published timestamp when present;
- snapshot schema/hash metadata when present;
- editable/read-only badge from `isEditable` / `isReadOnly`;
- indicator for `canCreateDraftFromThisVersion` only as read-only affordance text or badge, not a button yet.

Do not render validate, publish, create draft, rollback, delete, archive, restore, or destructive lifecycle buttons.

Responsive requirements:

- desktop can use a compact table;
- mobile should switch to stacked rows/cards or a horizontally safe layout;
- no horizontal page overflow at 375 px;
- long template names, descriptions, tags, and hashes wrap safely;
- action/status cells must not overlap.

---

## 8. States and Errors

Implement:

- initial loading state for detail/history;
- backend error state with safe user-facing message and retry action;
- not found state through backend error handling;
- empty version-history state, even though current backend should normally reject zero-version histories;
- metadata update pending/error/success states.

Reuse or extend the safe error helper from Phase 3B-1A. Never display raw objects, stack traces, or `[object Object]`.

---

## 9. Pure Helper Tests

Add tests without adding dependencies for:

- status badge mapping for `DRAFT`, `PUBLISHED`, `SUPERSEDED`;
- lifecycle badge mapping;
- editable/read-only badge mapping;
- summary derivation from `getFormTemplateVersionHistory` DTO fields;
- route/detail-safe empty history fallback formatting if helper exists;
- metadata tag parsing reuse or adapter behavior if changed;
- safe error handling for detail/history/update errors if helper is extended.

Do not add placeholder tests. Keep existing form-template and registry tests enabled.

---

## 10. Verification

Run:

```bash
cd ~/dev/inspection-app/app

npx --no-install vitest run \
  --config src/form-templates/vitest.config.ts \
  --reporter=verbose

npx --no-install vitest run \
  --config src/form-builder/registry/vitest.config.ts \
  --reporter=verbose
```

Then:

```bash
cd ~/dev/inspection-app
git diff --check
make check

cd ~/dev/inspection-app/app
npx prisma validate
```

If `DATABASE_URL` is unavailable in the shell, use Wasp's verified local development database env. Do not use a fake placeholder URL if the real local database is running.

Start the app:

```bash
cd ~/dev/inspection-app/app
timeout 180 wasp start
```

Success requires Wasp compilation, PostgreSQL connection, backend on port 3001, Vite on port 3000, and the process remaining healthy until timeout exit `124`.

If browser tooling is available, inspect `/templates` and `/templates/:templateId` at approximately 375 px, 768 px, and 1440 px. Verify navigation, detail loading, metadata editing, version history rendering, loading/error/empty states where practical, and no horizontal overflow. Do not create persistent junk data solely for screenshots; clean up test data where safe.

Inspect restricted scope:

```bash
cd ~/dev/inspection-app

git diff -- \
  app/schema.prisma \
  app/migrations \
  app/package.json \
  app/src/form-builder/registry \
  app/src/clients \
  app/src/properties \
  app/src/inspections \
  app/src/projects \
  spikes
```

The restricted diff must be empty.

---

## 11. Documentation

Update:

```text
docs/PROGRESS_LOG.md
docs/TODO.md
docs/NEXT_PROMPT.md
```

Progress log must record route, row links, metadata display/editing, version history display, tests, Wasp startup, visual verification result, and restricted-scope result.

TODO must mark only Phase 3B-1B complete. Do not mark Phase 3B-1C or full Phase 3B complete.

NEXT_PROMPT should become Phase 3B-1C and cover validate, publish, create-draft-from-version, archive, restore, and safe delete UI only.

---

## 12. Commit and Push

Confirm:

```bash
cd ~/dev/inspection-app
git branch --show-current
```

It must return:

```text
review/phase-3b-1b
```

Stage explicit intended files only. Do not use `git add .` or `git add -A`.

Run:

```bash
git diff --cached --check
git diff --cached --name-status
git diff --cached --stat
git branch --show-current
```

Commit:

```bash
git commit -m "feat(3b): add template detail version history UI"
```

Push:

```bash
git push -u origin review/phase-3b-1b
```

Do not push to `main`, merge, amend, rebase, squash, reset, force-push, delete branches, or open/merge a pull request automatically.
