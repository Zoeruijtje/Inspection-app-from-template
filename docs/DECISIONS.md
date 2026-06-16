# Decisions

## 2026-06-16 — Use Open SaaS/Wasp as MVP factory base

Decision:
Use Open SaaS/Wasp as the base for a reusable MVP factory.

Reason:
Open SaaS already includes many SaaS foundations and Wasp reduces full-stack boilerplate. The goal is to add generators, docs, and reusable modules instead of building from scratch.

## 2026-06-16 — Do not convert to Next.js/Supabase

Decision:
Keep this repo as Wasp/Open SaaS.

Reason:
Converting would remove the main advantage of Open SaaS. If Supabase-native is needed, create a separate template.

## 2026-06-16 — Use direct DeepSeek as main implementation model

Decision:
Use direct DeepSeek V4 Pro for most coding tasks.

Reason:
The user's token pattern has very high cache hit rate, making direct DeepSeek cost-effective.

## 2026-06-16 — Gate file download signed URLs by ownership

Decision:
Generate file download signed URLs only after the server authenticates the user and confirms ownership of the stored `File` row.

Reason:
S3 keys are storage identifiers, not authorization proof. User-owned resources must enforce ownership server-side before returning any read capability.

## 2026-06-16 — Use user-owned Clients as first resource pattern

Decision:
Implement `Client` as a user-owned resource with required `name`, optional contact fields, and server-side CRUD ownership checks.

Reason:
Clients are the first reusable business resource for the MVP factory. A simple `userId` ownership rule matches the current single-user resource pattern and avoids organization complexity until memberships are introduced.
