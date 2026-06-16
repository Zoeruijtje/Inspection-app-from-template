# TODO

## Phase 1 - Documentation and audit

- [x] Fill core docs.
- [x] Run baseline app.
- [x] Ask AI to inspect codebase and create CODEBASE_MAP.md.
- [x] Ask AI to inspect existing resource patterns.
- [x] Document environment/package command reality.
- [x] Document likely Clients resource file list.
- [ ] Manually verify Wasp plugin init state; referenced hook path is missing.
- [x] Manually verify env requirements and baseline app startup.
- [x] Create root Makefile with quality-gate commands (status, dev-db, dev-app, migrate, studio, e2e, check).
- [ ] Commit docs.

## Phase 2 - Simplify defaults

- [x] Identify payment/email/storage/analytics options.
- [x] Choose one provider per category.
- [x] Decide production email provider: Mailgun or SMTP is the recommended first production path; SendGrid is the documented fallback for teams with a paid account.
- [x] Document production readiness plan (docs/PRODUCTION_READINESS_PLAN.md).
- [ ] Verify exact Zod schemas in each provider env.ts file before editing app/src/env.ts.
- [ ] Fix app/src/env.ts so unused provider vars are not required at server startup.
- [ ] Switch email provider from Dummy to Mailgun, SMTP, or SendGrid in app/src/server/emailSender.wasp.ts.
- [ ] Guard provider-touching jobs/routes (analytics cron, AI demo, file upload, payments) so missing env vars do not crash the app.
- [ ] Decide whether to remove or disable unused Lemon Squeezy and Polar paths.
- [ ] Decide whether analytics should stay Plausible or use Google Analytics.
- [ ] Remove or hide unused demo paths only after understanding them.
- [ ] Clean environment documentation.
- [ ] Commit simplification.

## Phase 3 - First real resource

- [x] Add Clients resource manually.
- [x] Add ownership checks.
- [x] Add pages/forms/table.
- [x] Run migration.
- [ ] Test manually.
- [ ] Add e2e coverage for user-owned Clients access.
- [x] Update RESOURCE_PATTERN.md from the completed Clients implementation.
- [ ] Commit.

## Phase 4 - Resource generator

- [ ] Document Clients resource pattern.
- [x] Create make:resource script.
- [x] Generate Projects resource as second test.
- [ ] Wire Projects resource into the app.
- [ ] Run migration for Projects.
- [ ] Commit.

## Phase 5 - Core modules

- [ ] File upload.
- [x] Review and fix file download signed URL ownership before reusing the current file pattern.
- [ ] AI provider wrapper.
- [ ] Audit log.
- [ ] Admin resource viewer.
- [ ] PDF export.
