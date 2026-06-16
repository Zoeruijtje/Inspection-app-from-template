# Production Readiness Plan

**Last updated:** 2026-06-16
**Status:** Planning — no implementation yet. This document is a plan only.

---

## 1. Why Dummy Email Is Good for Local Dev but Blocks Production

**Current state** (`app/src/server/emailSender.wasp.ts`):

```ts
provider: "Dummy",
defaultFrom: { name: "Open SaaS App", email: "me@example.com" }
```

**Why it is good for local development:**

- Wasp's `Dummy` provider writes all email content (verification links, password reset links) to the **server console logs** instead of trying to reach a real SMTP server.
- Zero configuration is needed — no API keys, no SMTP credentials.
- The developer copies the verification link from the terminal and pastes it into a browser to complete the signup flow.
- The email content functions in `app/src/auth/email-and-pass/emails.ts` (verification email body, password reset email body) still render correctly — only the transport is stubbed.

**Why it blocks production:**

- The `Dummy` provider **does not send real emails**. Real users will never receive verification or password reset emails.
- Signup appears to succeed (the user row is created in the database) but the user never gets the verification link, so they cannot complete email verification.
- The password reset flow is completely broken — users cannot receive reset links.
- The `defaultFrom.email` of `"me@example.com"` is a placeholder. Real email providers require a **verified sender domain or address**.
- Without a working email transport, the app is effectively unusable for real users.

**What must change:** The provider must switch from `"Dummy"` to a real provider, and `defaultFrom.email` must match a verified sender address for that provider.

---

## 2. Recommended Production Email Path

### Tier 1: Mailgun or SMTP (recommended for MVP launch)

**Mailgun:**

- Free tier includes a sandbox domain for testing; paid plans scale upward from a low starting cost.
- Wasp supports Mailgun natively as an email provider.
- Reliable deliverability and straightforward domain verification.
- Set `provider: "Mailgun"` in `emailSender.wasp.ts`, provide `MAILGUN_API_KEY` and `MAILGUN_DOMAIN` env vars.

**SMTP (generic):**

- Wasp supports a generic SMTP provider.
- Works with any SMTP service (Mailgun SMTP, SendGrid SMTP, AWS SES SMTP, a transactional email relay, etc.).
- Most flexible — you own the SMTP credentials and can switch backend services without code changes.
- Set `provider: "SMTP"` in `emailSender.wasp.ts`, provide `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, and `SMTP_PASSWORD` env vars.

### Tier 2: SendGrid (fallback, only if you have a paid account)

- SendGrid is the provider already documented in the upstream Open SaaS docs and referenced in `app/.env.server.example` (`SENDGRID_API_KEY`).
- However, SendGrid's free tier has become increasingly restrictive. New free accounts may face deliverability issues or account suspension.
- Use SendGrid only if you already have a paid and proven account.
- Set `provider: "SendGrid"` in `emailSender.wasp.ts`, provide `SENDGRID_API_KEY` env var.

### Decision for this project

**Mailgun or SMTP is the recommended first production email path.** SendGrid remains a documented fallback for teams that already have a paid SendGrid account.

---

## 3. Railway Deployment Requirements

Railway is the preferred deployment target (per `docs/DEPLOYMENT.md` and `AGENTS.md`).

### Prerequisites

1. **Railway account** — sign up at [railway.app](https://railway.app).
2. **Railway CLI** — install and authenticate:
   ```bash
   npm i -g @railway/cli
   railway login
   ```
3. **Wasp CLI** — already installed (project declares `^0.24.0`).
4. **Git** — strongly recommended. The project should be committed to a Git repository so the production state is recoverable and can be re-deployed from a known commit.

### Wasp deploy command

From the `app/` folder:

```bash
wasp deploy railway launch <project-name>
```

This single command:

- Builds the Wasp app for production.
- Provisions a Railway project with a Postgres database.
- Deploys the server and client.
- Automatically configures `WASP_WEB_CLIENT_URL`, `WASP_SERVER_URL`, `DATABASE_URL`, and `JWT_SECRET` on the Railway project.

### What Railway provides automatically

- **Postgres database** — Railway provisions one; `DATABASE_URL` is set automatically.
- **`WASP_WEB_CLIENT_URL`** — the URL where the client is served.
- **`WASP_SERVER_URL`** — the URL where the server listens.
- **`JWT_SECRET`** — generated automatically for auth token signing.
- **Custom domain + SSL** — Railway can serve on a `*.up.railway.app` subdomain with HTTPS out of the box.
- **Logs and monitoring** — accessible via the Railway dashboard.

### What you must configure manually

Even after `wasp deploy railway launch`, the following env vars must be set in the Railway dashboard (or via `railway vars set`):

- **`ADMIN_EMAILS`** — comma-separated list of admin email addresses.
- **Chosen email provider vars** — Mailgun (`MAILGUN_API_KEY`, `MAILGUN_DOMAIN`), SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`), or SendGrid (`SENDGRID_API_KEY`).
- **Any enabled optional provider vars** — e.g., `STRIPE_API_KEY` + `STRIPE_WEBHOOK_SECRET` if payments are enabled; `AWS_S3_*` vars if file uploads are enabled; `OPENAI_API_KEY` (or future `DEEPSEEK_API_KEY`) if the AI demo app is enabled; `PLAUSIBLE_*` vars if analytics are enabled.
- **Custom domain** — configure via Cloudflare DNS pointing to the Railway app (per project convention).

---

## 4. Required Server Env Vars for Minimal Production

### Set automatically by Railway

| Variable | Purpose | Set by |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | `wasp deploy railway launch` |
| `WASP_WEB_CLIENT_URL` | Client base URL | `wasp deploy railway launch` |
| `WASP_SERVER_URL` | Server base URL | `wasp deploy railway launch` |
| `JWT_SECRET` | Auth token signing secret | `wasp deploy railway launch` |

### Must set manually (minimal production)

| Variable | Purpose | Notes |
|---|---|---|
| `ADMIN_EMAILS` | Comma-separated admin emails | Schema default is `""`; set explicitly for production |
| Email provider vars | Depends on chosen provider | See subsection below |

### Email provider vars (choose exactly one path)

**Mailgun path:**

| Variable | Purpose |
|---|---|
| `MAILGUN_API_KEY` | Mailgun API key |
| `MAILGUN_DOMAIN` | Verified sending domain |

**SMTP path:**

| Variable | Purpose |
|---|---|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (587 for TLS, 465 for SSL) |
| `SMTP_USERNAME` | SMTP username |
| `SMTP_PASSWORD` | SMTP password |

**SendGrid path (fallback):**

| Variable | Purpose |
|---|---|
| `SENDGRID_API_KEY` | SendGrid API key |

### Env vars NOT needed at minimal production

The following env vars are **not required** for a basic working deployment. They should not block the app from starting:

- `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET` — only needed when the Stripe payment flow is enabled.
- `LEMONSQUEEZY_*` — an unused payment provider; its implementation files remain but it is not selected.
- `POLAR_*` — an unused payment provider; its implementation files remain but it is not selected.
- `PAYMENTS_HOBBY_SUBSCRIPTION_PLAN_ID`, `PAYMENTS_PRO_SUBSCRIPTION_PLAN_ID`, `PAYMENTS_CREDITS_10_PLAN_ID` — only needed when payments are enabled.
- `OPENAI_API_KEY` — only needed when the AI demo app is enabled.
- `AWS_S3_IAM_ACCESS_KEY`, `AWS_S3_IAM_SECRET_KEY`, `AWS_S3_FILES_BUCKET`, `AWS_S3_REGION` — only needed when S3 file uploads are enabled.
- `PLAUSIBLE_API_KEY`, `PLAUSIBLE_SITE_ID`, `PLAUSIBLE_BASE_URL` — only needed when Plausible analytics are enabled.
- `GOOGLE_ANALYTICS_CLIENT_EMAIL`, `GOOGLE_ANALYTICS_PRIVATE_KEY`, `GOOGLE_ANALYTICS_PROPERTY_ID` — only needed when Google Analytics are enabled.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — only needed when Google social auth is enabled.

---

## 5. Optional Features: Not Production-Configured Initially

### The following features are present in the codebase but are not production-configured by default.

They are **not fully disabled** in the sense that the code, routes, pages, and cron jobs for them still exist and will attempt to execute. Until they are explicitly configured, any provider-touching jobs or routes must be guarded so they do not crash the app.

| Feature | Current state | Risk if not guarded | When to enable |
|---|---|---|---|
| **Payments (Stripe)** | Stripe is selected in `paymentProcessor.ts`. Routes `/pricing` and `/checkout` exist. Webhook endpoint `POST /payments-webhook` exists. | Checkout attempts will fail without Stripe keys. Webhook endpoint may error. Pricing page renders but the flow breaks. | When ready to accept payments; provide Stripe test keys first. |
| **S3 File Upload** | S3 utils, operations, and `/file-upload` route exist. Requires `AWS_S3_*` env vars. | Upload and download operations will fail at runtime. The `/file-upload` page renders but operations error. | When file storage is needed. |
| **AI Demo App** | Uses OpenAI SDK in `app/src/demo-ai-app/operations.ts`. Requires `OPENAI_API_KEY`. | GPT generation action fails at runtime. `/demo-app` page renders but the AI feature does not work. | When AI features are ready; switch to DeepSeek-first wrapper before enabling. |
| **Analytics (Plausible)** | Hourly cron job `calculateDailyStatsJob` in `app/src/analytics/stats.ts` imports Plausible helpers. Plausible script placeholders exist in `app/src/client/head.wasp.ts`. | The cron job may error if Plausible env vars are missing. The admin dashboard may show zeros or errors. | When analytics are needed. |
| **Google Social Auth** | Google OAuth config exists in auth. Requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. | Email/password auth still works. Google login button may error if pressed. | When Google OAuth is configured. |

### How to guard them safely

- **Env validation guard:** The `app/src/env.ts` validation schema must not require provider vars for features that are not yet enabled. Each feature should validate its own env at the point of use or on its own route, not at global server startup.
- **Runtime guard:** Feature operations and jobs should check for required env vars at execution time and throw a clear, descriptive error instead of crashing with an opaque failure.
- **Route guard:** Feature pages should handle missing configuration gracefully (e.g., display a "not configured" message) rather than breaking the page.

---

## 6. What Must Change Before First Real Deployment

### Critical (blocks a working production deployment)

1. **Fix `app/src/env.ts` env validation** — This file currently imports and merges every provider env schema (Stripe, LemonSqueezy, Polar, OpenAI/DeepSeek, S3, Plausible, Google Analytics, and auth). Many of those schemas use `z.string()` which is required by default. **This is a repo-specific issue:** it appears to require unused provider vars because all provider schemas are merged unconditionally. The next implementation phase must verify the exact schemas and their Zod requirements before editing this file. Once verified, unused provider schemas should be made optional or removed from the merged validation, keeping only auth (`ADMIN_EMAILS`) and the chosen email provider schema as required.

2. **Switch email provider from Dummy** — Update `app/src/server/emailSender.wasp.ts`:
   - Change `provider: "Dummy"` to `"Mailgun"`, `"SMTP"`, or `"SendGrid"`.
   - Change `defaultFrom.email` from `"me@example.com"` to a real verified sender address.

3. **Set `ADMIN_EMAILS`** — Set to a real comma-separated list of admin emails in Railway env vars. The schema defaults to `""` but at least one admin email should be set for production.

### Important (should do before launch)

4. **Verify Railway sets `DATABASE_URL`, `WASP_WEB_CLIENT_URL`, `WASP_SERVER_URL`, and `JWT_SECRET`** — These are configured automatically by `wasp deploy railway launch`.

5. **Configure a custom domain on Cloudflare** — Point DNS to the Railway app, set up SSL.

6. **Run database migrations** — `wasp db migrate-dev` generates migration files locally. Railway applies them on deploy.

7. **Guard provider-touching jobs and routes** — The analytics cron job (`calculateDailyStatsJob`) and any provider-touching routes should handle missing env vars gracefully rather than crashing.

### Nice to have (can defer)

8. **Set up Stripe test keys** — If you want to test the payment flow before launch.
9. **Set up an S3 bucket** — If you need file uploads at launch.
10. **Enable monitoring/error tracking** — Railway logs are basic; consider an external service for production error tracking.

---

## 7. Exact Files Likely to Change

### Phase 1: Env validation (first thing to touch)

| File | Likely change |
|---|---|
| `app/src/env.ts` | Remove unused provider schema imports and merges; keep only auth + email + optionally Stripe. Verify exact Zod schemas before editing. |
| `app/.env.server.example` | Remove or comment out unused provider examples; clearly mark optional vars. |
| `app/.env.client.example` | Remove or mark `REACT_APP_GOOGLE_ANALYTICS_ID` as optional. |
| `docs/ENVIRONMENT.md` | Update to reflect simplified env requirements. |

### Phase 2: Email production config

| File | Likely change |
|---|---|
| `app/src/server/emailSender.wasp.ts` | Switch `provider` from `"Dummy"` to `"Mailgun"`, `"SMTP"`, or `"SendGrid"`; update `defaultFrom.email`. |
| `app/.env.server.example` | Update email section with chosen provider vars. |
| `docs/ENVIRONMENT.md` | Document the email provider choice and setup steps. |

### Phase 3: Payment default (if enabling payments)

| File | Likely change |
|---|---|
| `app/src/payment/paymentProcessor.ts` | Already set to Stripe; no change expected. |
| `app/.env.server.example` | Keep Stripe section; delete or comment LemonSqueezy and Polar sections. |

### Phase 4: Analytics guarding (if keeping analytics disabled)

| File | Likely change |
|---|---|
| `app/src/analytics/stats.ts` | Add guard for missing Plausible env; prevent the cron job from crashing. |
| `app/src/client/head.wasp.ts` | Remove or comment Plausible script placeholders until analytics is enabled. |
| `app/src/client/components/cookie-consent/Config.ts` | Remove or comment Google Analytics consent code until analytics is enabled. |

### Phase 5: AI path (if enabling AI)

| File | Likely change |
|---|---|
| `app/src/demo-ai-app/operations.ts` | Replace OpenAI SDK with a DeepSeek-compatible client. |
| `app/src/demo-ai-app/env.ts` | Replace `OPENAI_API_KEY` schema with `DEEPSEEK_API_KEY`. |

### Phase 6: Cleanup (after everything works in production)

| File | Likely change |
|---|---|
| `app/src/payment/lemonSqueezy/**` | Delete unused payment provider implementation. |
| `app/src/payment/polar/**` | Delete unused payment provider implementation. |
| `app/src/analytics/providers/googleAnalyticsUtils.ts` | Delete or archive. |
| `app/package.json` | Remove unused provider dependencies. |

---

## 8. Step-by-Step Deployment Dry-Run Checklist

### Pre-flight (local)

- [ ] 1. `cd ~/dev/opensaas-mvp-factory/app`
- [ ] 2. `wasp start db` — confirm local Postgres starts.
- [ ] 3. `wasp start` — confirm the app builds and runs locally with Dummy email.
- [ ] 4. Smoke test: landing page loads, signup works, login works, `/demo-app` loads.
- [ ] 5. Verify the exact Zod schemas in each provider `env.ts` file before editing `app/src/env.ts`.
- [ ] 6. Fix `app/src/env.ts` — remove unused provider schemas from the merged validation or make them optional. Keep auth + chosen email provider as required.
- [ ] 7. Switch email provider in `app/src/server/emailSender.wasp.ts` from `"Dummy"` to `"Mailgun"`, `"SMTP"`, or `"SendGrid"`.
- [ ] 8. Set `defaultFrom.email` to a verified sender address.
- [ ] 9. Create `.env.server` (gitignored) with real test values for the chosen email provider.
- [ ] 10. `wasp start` — confirm the app starts without env validation errors.
- [ ] 11. Test signup flow — confirm a real email arrives in the inbox.
- [ ] 12. Test email verification — click the link, confirm verification works.
- [ ] 13. Test password reset flow — confirm the reset email arrives.
- [ ] 14. Test login with verified credentials.

### Git

- [ ] 15. `git status` — review all changed files.
- [ ] 16. Ensure `.env.server` and `.env` are in `.gitignore` (never commit real secrets).
- [ ] 17. Commit changes with a clear message: `git commit -m "production readiness: fix env validation, switch email provider"`.
- [ ] 18. Push to the main branch.

### Railway setup

- [ ] 19. `railway login` — authenticate the Railway CLI.
- [ ] 20. `cd ~/dev/opensaas-mvp-factory/app`.
- [ ] 21. `wasp deploy railway launch <project-name>` — deploy to Railway.
- [ ] 22. Wait for the build and deploy to complete.
- [ ] 23. Note the Railway-provided URL (e.g., `https://<project-name>.up.railway.app`).
- [ ] 24. Verify that `WASP_WEB_CLIENT_URL`, `WASP_SERVER_URL`, `DATABASE_URL`, and `JWT_SECRET` are set in the Railway dashboard.

### Railway env vars (must set manually)

- [ ] 25. Open the Railway dashboard → select the project → Variables.
- [ ] 26. Set `ADMIN_EMAILS` = your email(s).
- [ ] 27. Set the chosen email provider vars:
  - Mailgun: `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`.
  - SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`.
  - SendGrid: `SENDGRID_API_KEY`.
- [ ] 28. Do NOT set: Stripe, S3, Plausible, OpenAI, or Google Analytics vars (unless those features are explicitly enabled and guarded).
- [ ] 29. Redeploy after setting vars (Railway auto-redeploys on variable change).

### Production smoke test

- [ ] 30. Open the Railway app URL in a browser.
- [ ] 31. Landing page loads with HTTPS.
- [ ] 32. Signup with a real email — confirm the verification email arrives.
- [ ] 33. Click the verification link — confirm it redirects to the login page.
- [ ] 34. Login with verified credentials — confirm success.
- [ ] 35. Visit `/demo-app` — the page loads (AI features may fail without an API key; that is expected).
- [ ] 36. Visit `/file-upload` — the page loads (uploads may fail without S3 config; that is expected).
- [ ] 37. Visit `/pricing` — the page loads (checkout may fail without Stripe keys; that is expected).
- [ ] 38. Visit `/admin` — confirm non-admin users are blocked or redirected.
- [ ] 39. Check Railway logs for any startup errors or crashes.

### DNS (when ready for a custom domain)

- [ ] 40. In Cloudflare, add a CNAME record pointing to the Railway app URL.
- [ ] 41. In the Railway dashboard → Settings → Custom Domain, add your domain.
- [ ] 42. Verify the SSL certificate is provisioned.
- [ ] 43. Test the app on the custom domain.

### Post-launch

- [ ] 44. Monitor Railway logs for 24 hours — check for email delivery issues, cron job errors, or unexpected crashes.
- [ ] 45. Set up Stripe test keys and test the checkout flow (if payments are needed).
- [ ] 46. Set up an S3 bucket and test file uploads (if storage is needed).
- [ ] 47. Update `docs/ENVIRONMENT.md` with the final production env var list.
- [ ] 48. Update `docs/DEPLOYMENT.md` with actual deploy notes and any gotchas encountered.

---

**End of plan.** This document is a plan only — no application code, env files, package files, migrations, or deployment settings have been changed. The next step per `PROVIDER_SIMPLIFICATION_PLAN.md` is Step 2: verify and fix env validation in `app/src/env.ts`.
