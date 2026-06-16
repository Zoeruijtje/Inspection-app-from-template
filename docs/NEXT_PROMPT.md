# Next Prompt

Use this prompt in Codex/DeepSeek Plan Mode for the next safe phase:

You are working in my Open SaaS / Wasp MVP factory repository.

First read:

- AGENTS.md
- Makefile
- docs/PROJECT_BRIEF.md
- docs/CODEBASE_MAP.md
- docs/PRODUCTION_READINESS_PLAN.md
- docs/PROVIDER_SIMPLIFICATION_PLAN.md
- docs/ENVIRONMENT.md
- docs/TODO.md
- docs/PROGRESS_LOG.md

Task:
Verify the exact Zod schemas in each provider env.ts file and fix app/src/env.ts so unused provider env vars are not required at server startup.

Context:

- `app/src/env.ts` currently imports and merges env schemas from auth, Stripe, LemonSqueezy, Polar, OpenAI, S3, Plausible, and Google Analytics. Many of these use `z.string()` which is required by default.
- This is a repo-specific issue: it appears to require unused provider vars because all provider schemas are merged unconditionally.
- The next implementation phase must read each provider env.ts file, verify which Zod validators are used (required vs optional), and determine which schemas can be made optional or removed from the merge.

Provider env files to check:

- `app/src/auth/env.ts`
- `app/src/payment/env.ts` (shared paymentPlansSchema)
- `app/src/payment/stripe/env.ts`
- `app/src/payment/lemonSqueezy/env.ts`
- `app/src/payment/polar/env.ts`
- `app/src/demo-ai-app/env.ts`
- `app/src/file-upload/env.ts`
- `app/src/analytics/env.ts`

Steps:

1. Read each provider env.ts file and note exactly which Zod validators are used.
2. Determine which schemas are truly required for the current selected defaults (auth, email provider, optionally Stripe).
3. Update `app/src/env.ts` so only required schemas use `z.string()` in the merged validation. Make all other schemas optional with `.optional()` or remove them from the merge.
4. Update `app/.env.server.example` to clearly mark optional vs required vars.
5. Start the dev server with `wasp start` and confirm it starts without env validation errors when only auth + email provider vars are set.
6. Smoke test: landing page loads, signup works, login works.

Notes:

- Do not change the email provider from Dummy yet — that is a separate follow-up phase.
- Do not delete unused provider implementation files (LemonSqueezy, Polar, Google Analytics) yet.
- Do not change providers, stack, or unrelated demo features.
- Do not commit real secrets or `.env` files.

After verification, update docs/TODO.md, docs/PROGRESS_LOG.md, and docs/NEXT_PROMPT.md.
