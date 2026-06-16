# Testing

## Quick quality gate

From the repo root:

```bash
make check
```

Runs Prisma validation + E2E tests. See the root `Makefile` for all commands.

## Required checks before commit

Run available checks from the relevant folder.

From app folder:
cd ~/dev/opensaas-mvp-factory/app

Useful commands:
wasp db migrate-dev --name your_migration
wasp start
npm run lint --if-present
npm run test --if-present
npm run build --if-present

> **Note:** `app/package.json` has no useful scripts. Wasp CLI commands are the source of truth for app development.
> Use the root `Makefile` for standard workflows: `make status`, `make dev-db`, `make dev-app`, `make migrate NAME=...`, `make studio`, `make e2e`, `make check`.

## Manual test checklist

For every resource:

- Can create record.
- Can list own records.
- Can view detail page.
- Can edit record.
- Can delete record.
- Validation errors are visible.
- Unauthorized access is blocked.
- Page refresh does not break state.
