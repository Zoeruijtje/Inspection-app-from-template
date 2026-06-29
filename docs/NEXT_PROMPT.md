# Phase 3B-1 — Template List, Template Detail, and Version Workflow UI

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

Implement **Phase 3B-1 only**.

Work on an isolated review branch, verify fully, commit and push automatically. Do not merge into `main`.

---

## Objective

Build the first production template-management UI on top of the Phase 3A backend contracts.

The checkpoint must implement:

1. template list;
2. create-template flow;
3. template detail view;
4. version history display;
5. lifecycle/status badges;
6. editable/read-only state surfaced from the backend;
7. validate draft workflow;
8. publish draft workflow;
9. create draft from `PUBLISHED` or `SUPERSEDED` version workflow;
10. archive and restore workflow;
11. safe delete for draft-only templates;
12. clear loading, empty, and backend-error states.

Do not implement:

- builder canvas;
- drag-and-drop;
- dynamic properties panel;
- runtime forms;
- report designer;
- PDF behavior;
- template duplication;
- version deletion;
- rollback/restoration of a superseded version in place;
- schema changes;
- migrations;
- new production dependencies without explicit approval.

---

## Required Reading

Read completely before editing:

```text
AGENTS.md
docs/PROJECT_BRIEF.md
docs/PROGRESS_LOG.md
docs/TODO.md
docs/NEXT_PROMPT.md
docs/FORM_BUILDER_DATA_MODEL.md
docs/FORM_BUILDER_MASTER_SPEC.md
docs/FORM_PLATFORM_ROADMAP.md
docs/PERMISSIONS.md
docs/SECURITY_CHECKLIST.md
docs/UI_RULES.md

app/main.wasp.ts
app/schema.prisma
app/src/form-templates/operations.ts
app/src/form-templates/versionHistory.ts
app/src/form-templates/versionHistoryOperations.ts
app/src/form-templates/versionValidationOperations.ts
app/src/form-templates/publishOperations.ts
app/src/form-templates/createDraftOperations.ts
app/src/form-templates/formTemplates.wasp.ts
app/src/form-templates/versionHistoryOperations.wasp.ts
app/src/form-templates/versionValidationOperations.wasp.ts
app/src/form-templates/publishOperations.wasp.ts
app/src/form-templates/createDraftOperations.wasp.ts
app/src/client/components/ui/
app/src/client/components/NavBar/constants.ts
```

Run:

```bash
cd ~/dev/inspection-app/app
wasp version
```

Use official Wasp 0.24 docs only if Wasp UI/spec behavior is uncertain.

---

## Scope

Expected changes:

```text
app/main.wasp.ts
app/src/form-templates/
app/src/client/components/NavBar/constants.ts
docs/PROGRESS_LOG.md
docs/TODO.md
docs/NEXT_PROMPT.md
```

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

If a schema or migration change appears necessary, stop and report the blocker.

---

## Backend Contracts To Use

Use existing Wasp client operations from `wasp/client/operations`:

- `getFormTemplates`
- `getFormTemplateById`
- `getFormTemplateVersionById`
- `getFormTemplateVersionHistory`
- `createFormTemplate`
- `updateFormTemplate`
- `archiveFormTemplate`
- `restoreFormTemplate`
- `deleteDraftOnlyFormTemplate`
- `validateFormTemplateVersion`
- `publishFormTemplateVersion`
- `createDraftFromVersion`

Use `getFormTemplateVersionHistory` as the authoritative lifecycle summary for the detail/version workflow UI. Do not re-derive editability or draft-source eligibility from ad hoc client logic when the backend DTO already exposes:

```ts
draftVersionId
currentPublishedVersionId
latestVersionNumber
canCreateDraft
versions[].isEditable
versions[].isReadOnly
versions[].canCreateDraftFromThisVersion
```

Client-side hiding is not security. Treat backend errors as authoritative.

---

## UI Requirements

### Routes

Add backend-backed template-management routes:

```text
/templates
/templates/:templateId
```

Do not add `/templates/:templateId/versions/:versionId` unless it is a simple read-only link target with no builder UI. Prefer keeping Phase 3B-1 focused on list/detail.

### Navigation

Add an authenticated navigation entry for Templates using the app's existing nav conventions and lucide icons.

### Template List

The first screen at `/templates` must be the usable list, not a landing page.

Include:

- search/filter by name, description, category, and tags;
- active/archived filtering;
- template lifecycle badges;
- draft/current-published summary from existing metadata where available;
- create-template button/dialog;
- empty state for no templates;
- empty state for no search results;
- loading and backend-error states;
- links to detail pages.

Create-template flow:

- fields: name, description, category, tags;
- client-side trimming should match existing backend semantics where practical;
- submit through `createFormTemplate`;
- on success, navigate to `/templates/:templateId` or refresh list and highlight the new template;
- display backend validation errors clearly.

### Template Detail

At `/templates/:templateId`, load:

- template metadata/detail;
- authoritative version history via `getFormTemplateVersionHistory`.

Show:

- template name, description, category, tags;
- lifecycle badge (`ACTIVE` / `ARCHIVED`);
- draft badge when `draftVersionId` exists;
- current published badge using `currentPublishedVersionId`;
- latest version number;
- archive/restore action based on template lifecycle;
- safe delete action for draft-only templates;
- version history table/list.

Version rows must show:

- version number;
- status badge (`DRAFT`, `PUBLISHED`, `SUPERSEDED`);
- published timestamp when present;
- snapshot schema/hash metadata when present;
- editable/read-only badge from `isEditable` / `isReadOnly`;
- validate action for editable draft;
- publish action for editable draft;
- create-draft-from-this-version action only when `canCreateDraftFromThisVersion` is true.

Do not allow or render generic version update/delete/rollback controls.

### Workflows

Validate draft:

- call `validateFormTemplateVersion({ versionId })`;
- show valid/invalid state;
- show issue list and counts when invalid;
- do not publish automatically.

Publish draft:

- require confirmation that published versions become read-only;
- call `publishFormTemplateVersion({ versionId })`;
- show validation failure issues if backend returns `FORM_TEMPLATE_VERSION_INVALID`;
- refresh template detail and version history after success.

Create draft from history:

- only expose buttons for versions where `canCreateDraftFromThisVersion === true`;
- call `createDraftFromVersion({ sourceVersionId })`;
- refresh detail/history after success;
- clearly show conflict errors, especially existing draft or source integrity failures.

Archive/restore:

- call `archiveFormTemplate` or `restoreFormTemplate`;
- archived templates remain readable;
- archived templates show all versions read-only and draft creation disabled.

Safe delete:

- only provide delete UX for draft-only templates where deletion is plausible;
- require exact name confirmation;
- call `deleteDraftOnlyFormTemplate`;
- handle backend 409 if published/superseded history exists;
- navigate back to `/templates` after success.

---

## Design Requirements

Follow `docs/UI_RULES.md` and existing app conventions.

- Build a work-focused SaaS UI: dense, scannable, restrained.
- Use existing shared UI components where available.
- Use lucide icons in icon buttons and actions.
- Avoid marketing hero sections.
- Avoid nested cards and decorative gradient/orb backgrounds.
- Use stable dimensions for buttons, badges, tables, and action cells so loading/error text does not shift layouts.
- Ensure mobile layouts do not overlap or clip text.
- Use clear backend-error surfaces with retry actions.

---

## Tests

Add focused tests where the repo already supports UI/unit testing. If no established UI test harness exists for these pages, add lightweight pure/helper tests for:

- status/lifecycle badge mapping;
- action availability from `getFormTemplateVersionHistory` DTO;
- search/filter behavior;
- backend error normalization/display helpers.

Do not add placeholder tests.

All existing form-template and registry tests must remain enabled and pass.

---

## Verification

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

If `DATABASE_URL` is unset, rerun Prisma validation with the verified local Wasp dev DB URL if a Wasp DB container is running. Do not use a fake placeholder URL when the real local development database is available.

Start the app:

```bash
cd ~/dev/inspection-app/app
timeout 180 wasp start
```

Success requires Wasp compilation, PostgreSQL connection, backend startup, Vite startup, and the process remaining healthy until timeout exit `124`.

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
  spikes
```

The restricted diff must be empty.

---

## Documentation

After implementation and verification, update:

- `docs/PROGRESS_LOG.md`
- `docs/TODO.md`
- `docs/NEXT_PROMPT.md`

Update `docs/DECISIONS.md` only if a genuine architectural decision was made.

---

## Commit and Push

Commit on the review branch and push to `origin/<branch>`.

Do not push to `main`, merge, amend, rebase, squash, reset, force-push, delete branches, or open/merge a pull request automatically.
