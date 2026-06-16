# Project Brief

## Purpose

This repository is a private Open SaaS / Wasp MVP factory.

The goal is to create a reusable base that allows fast, high-quality MVPs with real code ownership. It should become a practical alternative to tools like Lovable/Base44 for repeatable SaaS/internal-tool builds, while remaining maintainable and deployable as a normal codebase.

## Primary goals

- Keep Open SaaS/Wasp as the base.
- Avoid unnecessary provider choices.
- Standardize auth, payments, email, storage, admin, AI provider access, deployment, and UI patterns.
- Add reusable resource/module generators.
- Make Codex/DeepSeek able to build features reliably in small phases.
- Keep code quality high enough for real users, not just demos.

## Default stack

- Framework: Open SaaS / Wasp
- Frontend: React
- Backend: Node.js via Wasp
- Database: Postgres via Prisma/Wasp
- Auth: Wasp/Open SaaS auth
- Payments: Stripe
- Email: one selected provider, preferably Resend/SMTP
- File storage: S3-compatible storage
- AI provider: direct DeepSeek first, OpenRouter optional
- Deployment: Railway first
- DNS/domain: Cloudflare

## Important constraint

Do not convert this repository to Next.js/Supabase. If a project requires Supabase-native architecture later, create a separate template. This repo is specifically for Open SaaS/Wasp.
