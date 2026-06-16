# MVP Factory

## Goal

Make new MVPs fast by reusing a fixed architecture, fixed UI patterns, fixed provider choices, and generators.

## Desired future commands

npm run make:resource clients
npm run make:resource projects
npm run make:resource inspections

npm run make:module file-upload
npm run make:module ai-wrapper
npm run make:module pdf-export
npm run make:module audit-log

## Resource generator should create

For each resource:

- database model
- Wasp entity registration
- query files
- action files
- validation schema
- list page
- detail page
- create/edit form
- table component
- permission checks
- seed/test data
- basic tests
- documentation entry

## Quality-gate commands (root Makefile)

From the repo root:

| Command                 | What it does                                                        |
| ----------------------- | ------------------------------------------------------------------- |
| `make status`           | Show git state + migration status                                   |
| `make dev-db`           | Start local Postgres (`wasp db start`)                              |
| `make dev-app`          | Start dev app server (`wasp start`)                                 |
| `make migrate NAME=...` | Run a named DB migration                                            |
| `make studio`           | Open Prisma Studio                                                  |
| `make e2e`              | Run Playwright E2E tests                                            |
| `make check`            | Fast quality gate: whitespace diff check + Prisma schema validation |

> **Note:** `app/package.json` has no useful scripts. Wasp CLI commands are the source of truth for app development.
> `make e2e` is separate because it requires the dev app/server to be running.

## MVP build flow

1. Fill PROJECT_BRIEF.md for the new MVP.
2. Define resources in DATABASE.md.
3. Generate resources.
4. Assemble UI pages from templates.
5. Add only required modules.
6. Run `make check`.
7. Deploy preview.
8. Review with stronger model.
