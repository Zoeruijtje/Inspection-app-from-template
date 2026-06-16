# Progress Log

## Current status

- Open SaaS project created.
- Local setup in WSL2.
- Git repository initialized.
- Baseline pushed/planned.
- Agent documentation being added and synchronized with the current codebase.
- Codebase audit completed from local files only on 2026-06-16.

## Next milestone

Create a clean documented MVP factory baseline before changing application code, then implement the first user-owned Clients resource in a small phase.

## Completed

- WSL/Open SaaS baseline setup.
- Initial AGENTS.md.
- Documentation structure.
- Inspected repo-local audit/Wasp/expert-advice skill instructions.
- Mapped the current Wasp app structure under `app/`.
- Identified `app/main.wasp.ts` as the main Wasp config.
- Identified `app/schema.prisma` as the Prisma schema/entity source.
- Identified existing routes, queries, actions, API, and job specs.
- Documented current payment/email/file/admin/analytics/AI feature locations.
- Documented package commands from `app`, `blog`, and `e2e-tests` package files.
- Documented likely files for a future user-owned Clients resource.
- Manually verified baseline local startup.
- Confirmed landing page opens.
- Confirmed signup works.
- Confirmed Dummy email verification appears in server logs.
- Confirmed login works.
- Confirmed `/demo-app` opens after login.
- Confirmed `/file-upload` route opens or clearly reports missing S3 configuration.
- Confirmed `/admin` redirects or blocks non-admin users.
- Fixed file download signed URL ownership: downloads now require auth, load an owned `File` row by id, and sign only the stored `s3Key`.
- Implemented first user-owned Clients resource at `/clients`.
- Added `Client` Prisma model with `userId` ownership, timestamps, contact fields, notes, and `@@index([userId])`.
- Added Clients Wasp spec, operations, page UI, and authenticated app navigation link.
- Created and applied migration `20260616154215_add_clients`.

## In progress

- Step 13 onward: turn the repo into a controlled MVP factory.
- Manual verification of Wasp plugin init state.
- Provider simplification planning.
- Manual browser verification and e2e coverage for the Clients resource.

## Notes from 2026-06-16 audit

- No application code was changed.
- No packages were installed.
- No migrations were run.
- No real `.env` or `.env.server` files were changed.
- `app/package.json` has no package scripts.
- `blog/package.json` has Astro scripts.
- `e2e-tests/package.json` has Playwright scripts.
- Stripe is selected in code, but Lemon Squeezy and Polar files remain.
- Email sender currently uses Wasp `Dummy`.
- File upload uses S3-compatible storage, with download signed URLs gated by server-side file ownership.
- `app/src/env.ts` validates many feature/provider schemas at once and needs runtime verification.
- The Wasp plugin init hook referenced by `.agents/skills/wasp-plugin-help/SKILL.md` was not found at `.agents/hooks/check-wasp-init.js`.
- Prisma Client generation for the Clients migration required running Prisma under Node 20 via `npx -p node@20 ...`; Prisma 5.19 generation was a silent no-op under the local Node 24 shell.
