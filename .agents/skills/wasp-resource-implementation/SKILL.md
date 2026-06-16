---
name: wasp-resource-implementation
description: Use when adding or changing a Wasp/Open SaaS business resource such as clients, projects, inspections, files, or reports. This skill enforces database, server actions, queries, UI, validation, ownership checks, migration, testing, and documentation updates.
---

# Wasp Resource Implementation Skill

Use this skill when adding a new resource or modifying an existing resource.

## Required reading

Read:
- AGENTS.md
- docs/CODEBASE_MAP.md
- docs/DATABASE.md
- docs/PERMISSIONS.md
- docs/UI_RULES.md
- docs/RESOURCE_PATTERN.md
- docs/TESTING.md
- docs/TODO.md

## Non-negotiable rules

- Do not change unrelated features.
- Do not convert this repo to Next.js/Supabase.
- Follow current Open SaaS/Wasp conventions.
- Every user-created resource needs server-side ownership checks.
- Frontend hiding is not security.
- Do not commit real secrets.
- If schema changes, run `wasp db migrate-dev`.
- Migration names must be short and descriptive, e.g. `add_clients`.

## Implementation checklist

For a new resource, handle:

1. Data model/entity.
2. Ownership field, e.g. userId/ownerId or organizationId.
3. Validation schema.
4. Queries for listing and reading.
5. Actions for create/update/delete.
6. Server-side auth and ownership checks.
7. List page.
8. Detail page.
9. Create/edit form.
10. Table/list component.
11. Empty state.
12. Loading/error states.
13. Manual test checklist.
14. Documentation updates.

## Required docs update

After implementation, update:
- docs/RESOURCE_PATTERN.md
- docs/PROGRESS_LOG.md
- docs/DECISIONS.md
- docs/TODO.md
- docs/NEXT_PROMPT.md

## Before final response

Report:
- files changed
- migration name
- checks run
- checks failed
- manual testing still needed
