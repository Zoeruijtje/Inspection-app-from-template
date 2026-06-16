# Environment

Last audited: 2026-06-16

## Local development

Development runs inside WSL2 Ubuntu.

Project path:
~/dev/opensaas-mvp-factory

Main app path:
~/dev/opensaas-mvp-factory/app

Main Wasp config:
~/dev/opensaas-mvp-factory/app/main.wasp.ts

Wasp version declared in the app:
^0.24.0

Database:
Postgres through Wasp/Prisma. `app/schema.prisma` reads `DATABASE_URL`, but `app/.env.server.example` notes that `wasp start db` can manage local Postgres without adding `DATABASE_URL` manually.

## Local Wasp commands

Terminal 1:
cd ~/dev/opensaas-mvp-factory/app
wasp start db

Terminal 2:
cd ~/dev/opensaas-mvp-factory/app
wasp start

Schema changes, when explicitly approved:
cd ~/dev/opensaas-mvp-factory/app
wasp db migrate-dev

## Verified local startup status

Verified on 2026-06-16:

- `wasp start db` works from `~/dev/opensaas-mvp-factory/app`.
- `wasp start` works from `~/dev/opensaas-mvp-factory/app`.
- Landing page opens.
- Signup works.
- Dummy email verification appears in server logs.
- Login works.
- `/demo-app` opens after login.
- `/file-upload` route opens or clearly reports missing S3 configuration.
- `/admin` redirects or blocks non-admin users.

This means the current local env setup is good enough for the next phase. Provider simplification is still useful later, but it is not blocking local startup.

## Environment-file rules

Never commit real secrets.

Allowed:

- .env.example
- .env.server.example
- documentation showing variable names

Not allowed:

- .env
- .env.server with real keys
- API keys
- Stripe secret keys
- database passwords
- JWT secrets
- production credentials

Example env files currently present:

- `app/.env.server.example`
- `app/.env.client.example`

Do not edit real `.env` or `.env.server` files during documentation/audit work.

## Server env validation

Server env validation is configured in:

- `app/src/env.ts`

It currently merges schemas from:

- `app/src/auth/env.ts`
- `app/src/payment/stripe/env.ts`
- `app/src/payment/lemonSqueezy/env.ts`
- `app/src/payment/polar/env.ts`
- `app/src/demo-ai-app/env.ts`
- `app/src/file-upload/env.ts`
- `app/src/analytics/env.ts`

This means the current code may validate env vars for providers that are present but not selected, such as Lemon Squeezy and Polar. Needs manual runtime verification.

## Server env variables shown in examples/schemas

Database:

- `DATABASE_URL`

Payments:

- `STRIPE_API_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `LEMONSQUEEZY_API_KEY`
- `LEMONSQUEEZY_STORE_ID`
- `LEMONSQUEEZY_WEBHOOK_SECRET`
- `POLAR_ORGANIZATION_ACCESS_TOKEN`
- `POLAR_WEBHOOK_SECRET`
- `POLAR_SANDBOX_MODE`
- `PAYMENTS_HOBBY_SUBSCRIPTION_PLAN_ID`
- `PAYMENTS_PRO_SUBSCRIPTION_PLAN_ID`
- `PAYMENTS_CREDITS_10_PLAN_ID`

Auth/admin:

- `ADMIN_EMAILS`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Email:

- `SENDGRID_API_KEY`

AI:

- `OPENAI_API_KEY`

Analytics:

- `PLAUSIBLE_API_KEY`
- `PLAUSIBLE_SITE_ID`
- `PLAUSIBLE_BASE_URL`
- `GOOGLE_ANALYTICS_CLIENT_EMAIL`
- `GOOGLE_ANALYTICS_PRIVATE_KEY`
- `GOOGLE_ANALYTICS_PROPERTY_ID`

File upload/storage:

- `AWS_S3_IAM_ACCESS_KEY`
- `AWS_S3_IAM_SECRET_KEY`
- `AWS_S3_FILES_BUCKET`
- `AWS_S3_REGION`

Client env:

- `REACT_APP_GOOGLE_ANALYTICS_ID`

## Provider defaults

Desired provider defaults from project docs:

- Payments: Stripe
- Email: Resend/SMTP, final choice to be documented after implementation
- Storage: S3-compatible storage
- AI: Direct DeepSeek API first, OpenRouter optional for testing many models

Current provider reality in code:

- Payments: Stripe is selected in `app/src/payment/paymentProcessor.ts`.
- Payment alternatives: Lemon Squeezy and Polar code still exists under `app/src/payment/`.
- Email: Wasp `Dummy` provider is selected in `app/src/server/emailSender.wasp.ts`.
- File storage: S3-compatible storage through AWS SDK in `app/src/file-upload/s3Utils.ts`.
- AI demo: OpenAI SDK is used in `app/src/demo-ai-app/operations.ts`.
- Analytics: Plausible helpers are imported in `app/src/analytics/stats.ts`; Google Analytics helper exists as a commented alternative.

## Package commands from package files

There is no root `package.json`.

`app/package.json`:

- No `scripts` section found.

`blog/package.json`:

- `npm run astro`
- `npm run build`
- `npm run dev`
- `npm run preview`
- `npm run start`

`e2e-tests/package.json`:

- `npm run e2e:playwright`
- `npm run local:e2e:cleanup-stripe`
- `npm run local:e2e:playwright:ui`
- `npm run local:e2e:start`
- `npm run local:e2e:start-stripe`

No `lint` script was found in package files.
No app `test` or `build` script was found in `app/package.json`.

## Manual verification needed

- Confirm whether `app/src/env.ts` should keep validating all included providers or only selected providers.
- Confirm the intended production email provider. Current code uses `Dummy`; project docs prefer Resend/SMTP; example env mentions SendGrid.
- Baseline app startup is verified locally. Re-check after provider simplification or env validation changes.
- Confirm whether future AI provider work should replace the OpenAI demo with direct DeepSeek or add a provider wrapper.
