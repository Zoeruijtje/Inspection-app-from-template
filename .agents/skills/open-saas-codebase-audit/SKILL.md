---
name: open-saas-codebase-audit
description: Use when inspecting this Open SaaS / Wasp repository before making changes. This skill maps the codebase, identifies Wasp entities/actions/queries/pages, and updates documentation without modifying application code.
---

# Open SaaS Codebase Audit Skill

Use this skill before feature work, refactors, or generator work.

## Purpose

Create or update documentation that accurately reflects the current repository structure.

## Required reading

Read:
- AGENTS.md
- docs/PROJECT_BRIEF.md
- docs/ARCHITECTURE.md
- docs/MVP_FACTORY.md
- docs/TODO.md
- docs/PROGRESS_LOG.md

## Allowed changes

Only update documentation files:
- docs/CODEBASE_MAP.md
- docs/RESOURCE_PATTERN.md
- docs/ENVIRONMENT.md
- docs/PROGRESS_LOG.md
- docs/TODO.md
- docs/NEXT_PROMPT.md

Do not modify app code.

## Audit checklist

Document:

1. Repository structure.
2. Main app folder.
3. Wasp config location.
4. Prisma/schema/entity location.
5. Existing Wasp entities.
6. Existing queries.
7. Existing actions.
8. Existing pages/routes.
9. Existing UI/component patterns.
10. Existing auth pattern.
11. Existing payment providers.
12. Existing email providers.
13. Existing file-upload/storage patterns.
14. Existing admin dashboard pattern.
15. Existing testing/lint/build commands.
16. Files likely required to add a new resource such as Clients.

## Output rules

- Be specific.
- Use actual file paths from this repo.
- Do not guess if the repo does not contain something.
- Mark uncertain items as "needs verification".
- Update docs/NEXT_PROMPT.md with the next best task.
