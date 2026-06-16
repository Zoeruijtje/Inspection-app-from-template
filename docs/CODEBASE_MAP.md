# Codebase Map

Last audited: 2026-06-16

Scope: current repository inspection only. No application code was changed, no packages were installed, no migrations were run, and real `.env` / `.env.server` files were not read or changed.

## Top-level structure

- `app/` - main Open SaaS / Wasp application.
- `blog/` - Astro/Starlight blog/docs site.
- `e2e-tests/` - Playwright end-to-end tests for the Wasp app.
- `docs/` - project planning, architecture, security, environment, and audit docs.
- `.agents/` - repo-local agent skills and instructions.
- `skills-lock.json` - skill lock metadata.

There is no root `package.json`. Package files exist in `app/package.json`, `blog/package.json`, and `e2e-tests/package.json`.

## Main Wasp app

Main app path:

- `app/`

Main Wasp config:

- `app/main.wasp.ts`

Important details from `app/main.wasp.ts`:

- Uses `app({ ... })` from `@wasp.sh/spec`.
- Wasp version is declared as `^0.24.0`.
- App name is `OpenSaaS`.
- Root client component is `app/src/client/App.tsx`.
- Server env validation is imported from `app/src/env.ts`.
- Database seed function is imported from `app/src/server/scripts/dbSeeds.ts`.
- Email sender config is imported from `app/src/server/emailSender.wasp.ts`.
- Feature specs are imported from:
  - `app/src/auth/auth.wasp.ts`
  - `app/src/user/user.wasp.ts`
  - `app/src/clients/clients.wasp.ts`
  - `app/src/demo-ai-app/demo-ai-app.wasp.ts`
  - `app/src/payment/payment.wasp.ts`
  - `app/src/file-upload/file-upload.wasp.ts`
  - `app/src/analytics/analytics.wasp.ts`
  - `app/src/admin/admin.wasp.ts`

## Prisma schema and entities

Prisma schema:

- `app/schema.prisma`

Current datasource:

- `postgresql`
- URL from `DATABASE_URL`

Current models/entities:

- `User`
- `GptResponse`
- `Task`
- `File`
- `Client`
- `DailyStats`
- `PageViewSource`
- `Logs`
- `ContactFormMessage`

Existing migration:

- `app/migrations/20260616121018_init/migration.sql`
- `app/migrations/20260616154215_add_clients/migration.sql`
- `app/migrations/migration_lock.toml`

Wasp entities are derived from the Prisma models in `app/schema.prisma` and referenced by name in the spec modules, for example `query(getAllTasksByUser, { entities: ["Task"] })`.

## Pages and routes

Root routes:

- `/` -> `LandingPageRoute`, page `app/src/landing-page/LandingPage.tsx`, declared in `app/main.wasp.ts`
- `*` -> `NotFoundRoute`, page `app/src/client/components/NotFoundPage.tsx`, declared in `app/main.wasp.ts`

Auth routes in `app/src/auth/auth.wasp.ts`:

- `/login` -> `app/src/auth/LoginPage.tsx`
- `/signup` -> `app/src/auth/SignupPage.tsx`
- `/request-password-reset` -> `app/src/auth/email-and-pass/RequestPasswordResetPage.tsx`
- `/password-reset` -> `app/src/auth/email-and-pass/PasswordResetPage.tsx`
- `/email-verification` -> `app/src/auth/email-and-pass/EmailVerificationPage.tsx`

User route in `app/src/user/user.wasp.ts`:

- `/account` -> `app/src/user/AccountPage.tsx`, `authRequired: true`

Demo app route in `app/src/demo-ai-app/demo-ai-app.wasp.ts`:

- `/demo-app` -> `app/src/demo-ai-app/DemoAppPage.tsx`, `authRequired: true`

Payment routes in `app/src/payment/payment.wasp.ts`:

- `/pricing` -> `app/src/payment/PricingPage.tsx`, prerendered
- `/checkout` -> `app/src/payment/CheckoutResultPage.tsx`, `authRequired: true`

File upload route in `app/src/file-upload/file-upload.wasp.ts`:

- `/file-upload` -> `app/src/file-upload/FileUploadPage.tsx`, `authRequired: true`

Clients route in `app/src/clients/clients.wasp.ts`:

- `/clients` -> `app/src/clients/ClientsPage.tsx`, `authRequired: true`

Admin routes in `app/src/admin/admin.wasp.ts`:

- `/admin` -> `app/src/admin/dashboards/analytics/AnalyticsDashboardPage.tsx`, `authRequired: true`
- `/admin/users` -> `app/src/admin/dashboards/users/UsersDashboardPage.tsx`, `authRequired: true`
- `/admin/settings` -> `app/src/admin/elements/settings/SettingsPage.tsx`, `authRequired: true`
- `/admin/calendar` -> `app/src/admin/elements/calendar/CalendarPage.tsx`, `authRequired: true`
- `/admin/ui/buttons` -> `app/src/admin/elements/ui-elements/ButtonsPage.tsx`, `authRequired: true`
- `/admin/messages` -> `app/src/admin/dashboards/messages/MessagesPage.tsx`, `authRequired: true`

## Queries, actions, APIs, and jobs

Demo AI app operations:

- Spec: `app/src/demo-ai-app/demo-ai-app.wasp.ts`
- Implementation: `app/src/demo-ai-app/operations.ts`
- Queries:
  - `getGptResponses`
  - `getAllTasksByUser`
- Actions:
  - `generateGptResponse`
  - `createTask`
  - `updateTask`
  - `deleteTask`

File upload operations:

- Spec: `app/src/file-upload/file-upload.wasp.ts`
- Implementation: `app/src/file-upload/operations.ts`
- Queries:
  - `getAllFilesByUser`
  - `getDownloadFileSignedURL`
- Actions:
  - `addFileToDb`
  - `createFileUploadUrl`
  - `deleteFile`

Clients operations:

- Spec: `app/src/clients/clients.wasp.ts`
- Implementation: `app/src/clients/operations.ts`
- Query:
  - `getClients`
- Actions:
  - `createClient`
  - `updateClient`
  - `deleteClient`

Payment operations:

- Spec: `app/src/payment/payment.wasp.ts`
- Implementation: `app/src/payment/operations.ts`
- Webhook entry: `app/src/payment/webhook.ts`
- Query:
  - `getCustomerPortalUrl`
- Action:
  - `generateCheckoutSession`
- API:
  - `POST /payments-webhook`

User/admin operations:

- Spec: `app/src/user/user.wasp.ts`
- Implementation: `app/src/user/operations.ts`
- Query:
  - `getPaginatedUsers`
- Action:
  - `updateIsUserAdminById`

Analytics operations:

- Spec: `app/src/analytics/analytics.wasp.ts`
- Query implementation: `app/src/analytics/operations.ts`
- Job implementation: `app/src/analytics/stats.ts`
- Query:
  - `getDailyStats`
- Job:
  - `calculateDailyStatsJob`, executor `PgBoss`, scheduled hourly with cron `0 * * * *`

## UI and component patterns

Root app wrapper:

- `app/src/client/App.tsx`

Shared UI components:

- `app/src/client/components/ui/`

Shared client utilities and hooks:

- `app/src/client/utils.ts`
- `app/src/client/hooks/`

Navigation:

- `app/src/client/components/NavBar/NavBar.tsx`
- `app/src/client/components/NavBar/constants.ts`
- `app/src/user/UserDropdown.tsx`
- `app/src/user/UserMenuItems.tsx`
- `app/src/user/constants.ts`

Admin layout:

- `app/src/admin/layout/DefaultLayout.tsx`
- `app/src/admin/layout/Header.tsx`
- `app/src/admin/layout/Sidebar.tsx`
- `app/src/admin/layout/SidebarLinkGroup.tsx`
- `app/src/admin/layout/Breadcrumb.tsx`

Notable UI conventions:

- React pages import operations from `wasp/client/operations`.
- Routing uses `wasp/client/router`.
- Auth state uses `wasp/client/auth`.
- Components use Tailwind CSS classes and shadcn/Radix-style components in `app/src/client/components/ui`.
- Icons use `lucide-react`.
- Toasts use `app/src/client/hooks/use-toast.ts`.

## Auth pattern

Auth config:

- `app/src/auth/auth.wasp.ts`

Current enabled auth method:

- Email auth via `email: emailAuthMethod`

Defined but commented auth methods:

- `usernameAndPassword`
- `google`
- `gitHub`
- `discord`

User signup field mapping:

- `app/src/auth/userSignupFields.ts`

Admin assignment:

- `ADMIN_EMAILS` is parsed in `app/src/auth/env.ts`.
- `app/src/auth/userSignupFields.ts` sets `isAdmin` based on `ADMIN_EMAILS`.

Server-side auth/permission examples:

- User-owned `Task` and `GptResponse` checks in `app/src/demo-ai-app/operations.ts`.
- User-owned `File` create/list/delete checks in `app/src/file-upload/operations.ts`.
- User-owned `Client` create/list/update/delete checks in `app/src/clients/operations.ts`.
- Admin checks in `app/src/user/operations.ts` and `app/src/analytics/operations.ts`.

Client-side admin redirect:

- `app/src/admin/layout/DefaultLayout.tsx` redirects non-admin users, but server-side checks in operations are still the security boundary.

## Existing payment, email, file, admin, AI, and analytics features

Payments:

- Main spec: `app/src/payment/payment.wasp.ts`
- Selected processor: Stripe via `app/src/payment/paymentProcessor.ts`
- Stripe implementation:
  - `app/src/payment/stripe/paymentProcessor.ts`
  - `app/src/payment/stripe/checkoutUtils.ts`
  - `app/src/payment/stripe/webhook.ts`
  - `app/src/payment/stripe/stripeClient.ts`
  - `app/src/payment/stripe/env.ts`
- Lemon Squeezy implementation still exists under `app/src/payment/lemonSqueezy/`.
- Polar implementation still exists under `app/src/payment/polar/`.
- Plans are defined in `app/src/payment/plans.ts`.
- Processor plan env mapping is in `app/src/payment/paymentProcessorPlans.ts`.
- Pricing UI is in `app/src/payment/PricingPage.tsx`.

Email:

- Email sender config is `app/src/server/emailSender.wasp.ts`.
- Current provider is `Dummy`.
- Email auth content is in `app/src/auth/email-and-pass/emails.ts`.
- `app/.env.server.example` includes `SENDGRID_API_KEY`, but the current sender config does not select SendGrid.

File upload/storage:

- Spec: `app/src/file-upload/file-upload.wasp.ts`
- Page: `app/src/file-upload/FileUploadPage.tsx`
- Operations: `app/src/file-upload/operations.ts`
- Browser upload helper: `app/src/file-upload/fileUploading.ts`
- Env schema: `app/src/file-upload/env.ts`
- S3 utilities: `app/src/file-upload/s3Utils.ts`
- Validation: `app/src/file-upload/validation.ts`
- Storage is S3-compatible through AWS SDK presigned post/download/delete helpers.

Admin dashboard:

- Spec: `app/src/admin/admin.wasp.ts`
- Layout: `app/src/admin/layout/`
- Analytics dashboard: `app/src/admin/dashboards/analytics/`
- Users dashboard: `app/src/admin/dashboards/users/`
- Messages page: `app/src/admin/dashboards/messages/MessagesPage.tsx`
- Settings/calendar/UI example pages: `app/src/admin/elements/`

AI demo:

- Spec: `app/src/demo-ai-app/demo-ai-app.wasp.ts`
- Operations: `app/src/demo-ai-app/operations.ts`
- Page: `app/src/demo-ai-app/DemoAppPage.tsx`
- Env schema: `app/src/demo-ai-app/env.ts`
- Uses `openai` package and `OPENAI_API_KEY`.

Analytics:

- Spec: `app/src/analytics/analytics.wasp.ts`
- Query: `app/src/analytics/operations.ts`
- Scheduled job: `app/src/analytics/stats.ts`
- Providers:
  - `app/src/analytics/providers/plausibleAnalyticsUtils.ts`
  - `app/src/analytics/providers/googleAnalyticsUtils.ts`
- Current stats job imports Plausible helpers; Google Analytics import is present as a commented alternative.

## Package commands

From package files only:

- Root: no `package.json`.
- `app/package.json`: no `scripts` section found.
- `blog/package.json`:
  - `npm run astro`
  - `npm run build` -> `astro check && astro build`
  - `npm run dev` -> `astro dev`
  - `npm run preview` -> `astro preview`
  - `npm run start` -> `astro dev`
- `e2e-tests/package.json`:
  - `npm run e2e:playwright` -> `DEBUG=pw:webserver npx playwright test`
  - `npm run local:e2e:cleanup-stripe`
  - `npm run local:e2e:playwright:ui`
  - `npm run local:e2e:start`
  - `npm run local:e2e:start-stripe`

No `lint`, `test`, or `build` script was found in `app/package.json`.
No `lint` script was found in the package files inspected.
The Wasp app still has Wasp CLI commands documented elsewhere, such as `wasp start db`, `wasp start`, and `wasp db migrate-dev`, but these are not package scripts.

## Tests

E2E tests:

- `e2e-tests/tests/authRedirectTests.spec.ts`
- `e2e-tests/tests/demoAppTests.spec.ts`
- `e2e-tests/tests/pricingPageTests.spec.ts`
- `e2e-tests/tests/landingPageTests.spec.ts`
- `e2e-tests/tests/utils.ts`
- `e2e-tests/playwright.config.ts`

No app unit test files were found during this audit.

## Files likely required to add a user-owned Clients resource

Minimum likely application files to change when implementation is approved:

- `app/schema.prisma` - add `Client` model and `User.clients` relation.
- `app/main.wasp.ts` - import and include a new `clientsSpec`.
- `app/src/clients/clients.wasp.ts` - new Wasp spec with route(s), queries, actions, and `entities: ["User", "Client"]`.
- `app/src/clients/operations.ts` - new server-side queries/actions with auth and ownership checks.
- `app/src/clients/ClientsPage.tsx` - new authenticated list/create/update/delete UI, or split into smaller components under `app/src/clients/`.
- `app/src/client/components/NavBar/constants.ts` - add a navigation item if Clients should be visible in the main app nav.
- `app/src/user/constants.ts` - optionally add a user dropdown item if Clients should appear in the user menu.
- `app/src/server/scripts/dbSeeds.ts` - optional seed data after the model exists.
- `e2e-tests/tests/clients.spec.ts` - optional but recommended e2e coverage after the feature exists.
- `docs/RESOURCE_PATTERN.md`, `docs/DATABASE.md`, `docs/PERMISSIONS.md`, `docs/PROGRESS_LOG.md`, `docs/TODO.md`, `docs/NEXT_PROMPT.md` - docs to update after implementation.
- `app/migrations/<timestamp>_add_clients/migration.sql` - generated later by `wasp db migrate-dev`; do not create manually during documentation-only audit.

Do not edit generated `.wasp/out/` files for this resource.

## Uncertainty and manual verification

- The Wasp plugin init check hook referenced by `.agents/skills/wasp-plugin-help/SKILL.md` points to `.agents/hooks/check-wasp-init.js`, but no `.agents/hooks/` directory exists in this repo. Plugin init state needs manual verification.
- External Open SaaS/Wasp docs were not fetched because this task explicitly said to inspect the current codebase only.
- The baseline app was not started, built, linted, tested, or migrated during this documentation-only audit.
- `app/src/env.ts` currently merges env schemas for Stripe, Lemon Squeezy, Polar, OpenAI, S3, Plausible, and Google Analytics. This may require all provider env vars even when only Stripe/Plausible are selected; verify before assuming the app starts with minimal env.
- `app/src/server/emailSender.wasp.ts` uses `Dummy`, while project docs mention a future Resend/SMTP preference and `.env.server.example` includes SendGrid. Email provider choice needs a later decision.
- `app/src/file-upload/operations.ts` checks auth/ownership for upload, add-to-db, list, download signed URL generation, and delete. `getDownloadFileSignedURL` accepts `File.id`, loads an owned `File` row for `context.user`, and signs the stored `s3Key` only after ownership is confirmed.
- Admin route pages are `authRequired`, and server operations enforce admin checks for user/analytics data. Some admin pages may be static UI examples and should be reviewed before treating them as secured data features.
