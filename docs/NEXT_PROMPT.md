# Phase 3A-4E — Version History and Draft Lifecycle Backend Readiness

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

Implement **Phase 3A checkpoint 3A-4E only**.

Work on a temporary review branch, verify fully, commit it, and push it automatically. Do not merge into `main`.

---

## Objective

Harden the backend version-history surface around the template lifecycle now that publishing and create-draft-from-version exist.

Implement authenticated, ownership-checked query/action behavior needed by the future template-management UI:

1. list template versions safely and deterministically;
2. expose whether a template currently has an editable draft;
3. identify the latest published version and latest version number;
4. clearly surface whether a user may create a new draft from a published/superseded source;
5. prevent accidental deletion or mutation of published/superseded versions through metadata operations;
6. keep all behavior backend-only.

Do **not** build UI, routes, navigation, builder screens, runtime forms, reports, PDF behavior, template duplication into a new template, or schema/migration changes unless an existing invariant is impossible without one.

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
docs/PERMISSIONS.md
docs/SECURITY_CHECKLIST.md

app/schema.prisma
app/main.wasp.ts
app/src/form-templates/authorization.ts
app/src/form-templates/definitionAuthorization.ts
app/src/form-templates/operations.ts
app/src/form-templates/createDraftOperations.ts
app/src/form-templates/publishOperations.ts
app/src/form-templates/formTemplates.wasp.ts
app/src/form-templates/createDraftOperations.wasp.ts
app/src/form-templates/publishOperations.wasp.ts
app/src/form-templates/*.test.ts
```

Also verify Wasp docs for the installed CLI version with:

```bash
wasp version
```

Use the official Wasp 0.24 docs map from `https://wasp.sh/llms.txt` and fetch only the relevant raw markdown docs.

---

## Scope

Expected changes:

```text
app/main.wasp.ts
app/src/form-templates/
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

If schema or migration changes appear necessary, stop and report why.

---

## Suggested Implementation

Add or harden a safe query such as:

```ts
getFormTemplateVersionHistory
```

Input:

```ts
{
  templateId: string;
}
```

Return a safe DTO, for example:

```ts
type FormTemplateVersionHistoryResult = {
  templateId: string;
  lifecycleStatus: "ACTIVE" | "ARCHIVED";
  versions: Array<{
    id: string;
    versionNumber: number;
    status: "DRAFT" | "PUBLISHED" | "SUPERSEDED";
    publishedAt: Date | null;
    snapshotSchemaVersion: number | null;
    snapshotHash: string | null;
    createdAt: Date;
    updatedAt: Date;
    canCreateDraftFromThisVersion: boolean;
  }>;
  draftVersionId: string | null;
  latestPublishedVersionId: string | null;
  latestVersionNumber: number | null;
  canCreateDraft: boolean;
};
```

Rules:

- unauthenticated -> HTTP 401;
- unowned template -> HTTP 404;
- archived templates may be read but `canCreateDraft` must be false;
- `canCreateDraftFromThisVersion` is true only for `PUBLISHED` or `SUPERSEDED` versions when the template is active and no draft exists;
- order versions by `versionNumber DESC`, then `id ASC`;
- do not expose user IDs, raw template relations, full snapshots, serialized snapshots, or internal objects.

If the existing `getFormTemplateById` or `getFormTemplateVersionById` DTOs need small compatible additions for this backend readiness checkpoint, keep them tightly scoped and fully tested.

---

## Tests

Use existing Vitest tooling. Add focused tests for:

- input validation and unknown-property rejection;
- unauthenticated -> 401;
- unowned template -> 404;
- owned active template version history sorted deterministically;
- owned archived template can be read but cannot create drafts;
- draft presence disables create-draft affordances;
- no draft plus published/superseded versions enables the correct source affordances;
- latest published version and latest version number are computed deterministically;
- result DTO excludes user IDs, raw relations, and snapshots;
- all existing form-template and registry tests remain enabled and pass.

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
timeout 120 wasp start
```

If `npx prisma validate` fails only because `DATABASE_URL` is unset, rerun it with a placeholder local URL and report both outcomes:

```bash
DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" npx prisma validate
```

If `wasp start` compiles but cannot connect to the database, report the exact database/startup failure and whether `wasp db start` is blocked by port 5432.

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

After implementation and verification:

- update `docs/PROGRESS_LOG.md`;
- update `docs/TODO.md`;
- update `docs/NEXT_PROMPT.md` for the next backend checkpoint;
- update `docs/DECISIONS.md` only if a real architectural/product decision was made.

---

## Commit and Push

Commit on the review branch and push to `origin/<branch>`.

Do not push to `main`, merge, amend, rebase, squash, reset, force-push, delete branches, or open/merge a pull request automatically.
