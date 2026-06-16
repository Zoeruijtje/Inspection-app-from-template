# Provider Simplification Plan

Last planned: 2026-06-16

Scope: documentation plan only. Do not edit application code, env files, package files, migrations, or generated Wasp output in this phase.

## Goal

Make this Open SaaS / Wasp MVP factory use one default provider path per category without breaking the current app.

Default choices:

- Payments: Stripe only.
- Email local: Wasp `Dummy`.
- Email production: SendGrid first because Open SaaS/Wasp already documents it directly; Resend/SMTP remains a later option if we decide to add a custom SMTP path.
- File storage: S3-compatible storage.
- AI: direct DeepSeek first; OpenRouter optional.
- Analytics: disabled initially; Plausible is the first optional analytics provider.
- Deployment: Railway first.

## 1. Current provider selection points

Payments:

- Selected in `app/src/payment/paymentProcessor.ts`.
- Current selected provider is `stripePaymentProcessor`.
- Stripe files are under `app/src/payment/stripe/`.
- Lemon Squeezy files remain under `app/src/payment/lemonSqueezy/`.
- Polar files remain under `app/src/payment/polar/`.
- Payment routes, query, action, and webhook are declared in `app/src/payment/payment.wasp.ts`.

Email:

- Selected in `app/src/server/emailSender.wasp.ts`.
- Current provider is Wasp `Dummy`.
- Email auth content is in `app/src/auth/email-and-pass/emails.ts`.
- `app/.env.server.example` includes `SENDGRID_API_KEY`.

File storage:

- S3-compatible storage is implemented in `app/src/file-upload/s3Utils.ts`.
- File upload env schema is in `app/src/file-upload/env.ts`.
- File upload operations are in `app/src/file-upload/operations.ts`.
- File upload route/spec is in `app/src/file-upload/file-upload.wasp.ts`.

AI:

- Current demo app uses the `openai` package in `app/src/demo-ai-app/operations.ts`.
- Current AI env schema is `app/src/demo-ai-app/env.ts`, requiring `OPENAI_API_KEY`.
- Future default should be direct DeepSeek first, with OpenRouter optional.

Analytics:

- Server analytics job is declared in `app/src/analytics/analytics.wasp.ts`.
- `app/src/analytics/stats.ts` currently imports Plausible helpers from `app/src/analytics/providers/plausibleAnalyticsUtils.ts`.
- Google Analytics helper code exists in `app/src/analytics/providers/googleAnalyticsUtils.ts`.
- `app/src/client/head.wasp.ts` includes Plausible script placeholders.
- `app/src/client/components/cookie-consent/Config.ts` includes Google Analytics client-side consent code.

Deployment:

- Railway first is documented in `docs/DEPLOYMENT.md`.

## 2. Local startup env requirements

Baseline local startup has already been verified in `docs/ENVIRONMENT.md`.

Current practical local path:

- `wasp start db` can provide local Postgres without setting `DATABASE_URL`.
- Wasp `Dummy` email works locally and logs email verification links.
- Signup, login, `/demo-app`, `/file-upload`, and non-admin `/admin` behavior were smoke-tested.

Current code-level env validation:

- `app/src/env.ts` merges multiple provider schemas into `serverEnvValidationSchema`.
- It currently includes auth, Stripe, Lemon Squeezy, Polar, demo AI/OpenAI, S3, Plausible, and Google Analytics schemas.
- Many of those schemas use required `z.string()` values.

Target after simplification:

- Basic local startup should not require third-party provider secrets.
- `ADMIN_EMAILS` may stay optional/defaulted through `app/src/auth/env.ts`.
- Stripe env should be required only for payment flows.
- S3 env should be required only for file upload flows.
- AI env should be required only for AI flows.
- Analytics env should not be required while analytics is disabled.
- SendGrid env should be required only for production email configuration, not local Dummy email.

## 3. Alternatives that can remain but be ignored for now

Keep temporarily:

- Lemon Squeezy implementation files.
- Polar implementation files.
- Google Analytics helper and cookie-consent code.
- Existing OpenAI demo code while the DeepSeek-first wrapper is not implemented.
- Plausible helper code and script placeholders while analytics is disabled by default.

Reason:

- Removing implementation files and dependencies is riskier than first narrowing env validation and selected defaults.
- Current app works locally, so cleanup should be staged.

## 4. Alternatives to remove later

Remove after the app stays green with simplified defaults:

- Lemon Squeezy files under `app/src/payment/lemonSqueezy/`.
- Polar files under `app/src/payment/polar/`.
- Lemon Squeezy and Polar dependencies from `app/package.json` and `app/package-lock.json`.
- Lemon Squeezy and Polar env examples from `app/.env.server.example`.
- Google Analytics server helper if analytics remains disabled/Plausible-only.
- Google Analytics client consent code and `REACT_APP_GOOGLE_ANALYTICS_ID` if analytics remains disabled/Plausible-only.
- OpenAI-specific demo env/name/copy once a DeepSeek-first provider wrapper replaces it.

Do not remove:

- Stripe payment code.
- Wasp `Dummy` local email.
- SendGrid production email documentation/config path.
- S3-compatible storage code.
- Railway deployment documentation.

## 5. Env validation issue in `app/src/env.ts`

Yes, `app/src/env.ts` currently validates unused providers.

It imports and merges:

- `stripeEnvSchema`
- `lemonSqueezyEnvSchema`
- `polarEnvSchema`
- `demoAiAppEnvSchema`
- `fileUploadEnvSchema`
- `plausibleEnvSchema`
- `googleAnalyticsEnvSchema`
- `authEnvSchema`

This is the first app-code area to simplify later. The safest future change is to validate only defaults required at startup, then move feature-specific requirements into feature execution paths or make optional providers explicitly optional until enabled.

## 6. Safest sequence of changes

Step 1: Documentation only.

- Create this plan.
- Do not touch app code.

Step 2: Env validation pass.

- Update `app/src/env.ts` so unused providers are not required for local startup.
- Keep `ADMIN_EMAILS` optional/defaulted.
- Keep payment plan and Stripe env handling aligned with actual payment routes.
- Make analytics env optional or remove analytics validation while analytics is disabled.
- Do not remove provider files yet.

Step 3: Payment default pass.

- Keep Stripe selected in `app/src/payment/paymentProcessor.ts`.
- Remove Lemon Squeezy and Polar from active env validation.
- Keep their implementation files temporarily.
- Verify pricing and checkout behavior with Stripe test env before deleting alternatives.

Step 4: Email default pass.

- Keep `Dummy` locally in `app/src/server/emailSender.wasp.ts`.
- Document SendGrid as the first production email path.
- Keep Resend/SMTP as later custom SMTP path documentation only.

Step 5: Analytics default pass.

- Disable analytics by default.
- Prevent analytics env from blocking startup.
- Keep Plausible as the first optional analytics add-on.
- Ensure server job and client scripts do not require Plausible env unless analytics is enabled.

Step 6: AI default pass.

- Add or plan a DeepSeek-first AI provider wrapper.
- Keep OpenRouter optional.
- Replace OpenAI-specific env/copy only after the current demo flow has an equivalent DeepSeek path.

Step 7: Cleanup pass.

- Remove ignored provider implementations and dependencies only after startup and smoke tests pass.
- Update docs and examples in the same cleanup phase.

## 7. Exact files likely to change later

Env and examples:

- `app/src/env.ts`
- `app/.env.server.example`
- `app/.env.client.example`
- `docs/ENVIRONMENT.md`

Payments:

- `app/src/payment/paymentProcessor.ts`
- `app/src/payment/lemonSqueezy/`
- `app/src/payment/polar/`
- `app/package.json`
- `app/package-lock.json`

Email:

- `app/src/server/emailSender.wasp.ts`
- `app/src/auth/email-and-pass/emails.ts` if production copy/from fields need adjustment.
- `docs/DEPLOYMENT.md`
- `docs/ENVIRONMENT.md`

Storage:

- `app/src/file-upload/env.ts`
- `app/src/file-upload/s3Utils.ts`
- `app/src/file-upload/operations.ts`

AI:

- `app/src/demo-ai-app/env.ts`
- `app/src/demo-ai-app/operations.ts`
- possible new provider wrapper under `app/src/ai/` or `app/src/demo-ai-app/`

Analytics:

- `app/src/analytics/env.ts`
- `app/src/analytics/stats.ts`
- `app/src/analytics/analytics.wasp.ts`
- `app/src/analytics/providers/`
- `app/src/client/head.wasp.ts`
- `app/src/client/components/cookie-consent/Config.ts`
- `app/package.json`
- `app/package-lock.json`

Project docs:

- `docs/ENVIRONMENT.md`
- `docs/DEPLOYMENT.md`
- `docs/DECISIONS.md`
- `docs/TODO.md`
- `docs/PROGRESS_LOG.md`
- `docs/NEXT_PROMPT.md`

## 8. Risks

- Removing env validation too broadly can hide failures until a user clicks a feature.
- Keeping analytics job enabled while analytics env is absent can create runtime job errors.
- Removing provider dependencies before imports are removed will break TypeScript/build.
- Stripe checkout and webhook behavior depends on valid Stripe env and plan IDs.
- Email provider changes can break signup verification and password reset.
- SendGrid production email may require verified sender/domain setup outside the repo.
- Replacing OpenAI with DeepSeek may require API compatibility work even if both use OpenAI-style clients.
- File upload currently relies on S3 env and should fail clearly when S3 is unconfigured.
- `getDownloadFileSignedURL` now checks auth and file ownership before returning a signed URL; preserve that rule when simplifying providers.

## 9. Checks after each step

Always:

- `git diff --check`
- Review changed files with `git diff`

After env/provider changes:

- From `app/`: `wasp start db`
- From `app/`: `wasp start`
- Confirm landing page opens.
- Confirm signup works.
- Confirm Dummy email verification appears in server logs.
- Confirm login works.
- Confirm `/demo-app` opens.
- Confirm `/file-upload` opens or clearly reports missing S3 config.
- Confirm `/pricing` opens.
- Confirm `/admin` blocks or redirects non-admin users.

Payment-specific:

- With Stripe test env set, generate a checkout session.
- With Stripe CLI available, verify webhook route still accepts Stripe webhook events.

Email-specific:

- Local: verify Dummy email flow.
- Production/staging later: verify SendGrid sender/domain and real verification/password reset emails.

Analytics-specific:

- With analytics disabled, verify app starts with no Plausible or Google Analytics env.
- If Plausible is enabled later, verify analytics job and client script with Plausible env configured.

AI-specific:

- Verify AI demo handles missing provider config clearly.
- Verify DeepSeek path returns the expected structured schedule before removing the OpenAI path.

Cleanup-specific:

- After removing dependencies, run install/checks in a controlled phase.
- Confirm no remaining imports reference removed provider packages or folders.
