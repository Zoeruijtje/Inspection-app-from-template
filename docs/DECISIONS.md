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

## 2026-06-17 — Builder keyboard boundary movement uses visible container order

Decision:
In the builder spike, ArrowUp/ArrowDown boundary movement targets the previous or next visible compatible container in depth-first page order. Compatible containers are sections and groups. Non-adjacent moves should use the Move-to dialog.

Reason:
Depth-first visible order gives keyboard users access to adjacent section/group transitions, including entering and exiting nested groups, without implying sibling-only movement. It also keeps long-distance moves explicit through the Move-to action.

## 2026-06-17 — Rebuild builder pointer DnD around official sortable primitives

Decision:
Stop patching the v4 custom drop-slot pointer algorithm. For v5, rebuild the spike pointer core around current dnd-kit sortable primitives: each block is a `useSortable` item, compatible containers are section-level droppable targets, and React state is updated with `move(items, event)` during `onDragOver`.

Reason:
Manual testing showed v4 pointer destinations were unreliable. The official sortable architecture reduces custom drop-resolution logic and should be evaluated through a 10-attempt manual stability test before recommending dnd-kit for production.

## 2026-06-17 — Approve v5 sortable architecture as DnD foundation, not visual design

Decision:
Approve the Phase 3A0-A v5 sortable architecture as the drag-and-drop foundation after Stage A manual pointer validation passed. Do not approve the standalone Vite prototype visuals as final product design or as a production visual reference.

Reason:
Manual testing found reordering, cross-section movement, first/middle/final drops, and empty-section behavior smooth and reliable, with no bottom-jump behavior, missing blocks, or duplicated blocks. The visual layout differs substantially from the intended production builder, so production UI must be rebuilt later with the existing application's Tailwind/shadcn patterns and `docs/FORM_BUILDER_MASTER_SPEC.md`.

## 2026-06-18 — Approve Playwright/Chromium as PDF engine candidate after Gate 1

Decision:
Approve Playwright/Chromium as the current PDF-rendering candidate for continued implementation and Phase 3A0-B Gate 2 validation after Gate 1 functional feasibility was manually verified PASS.

Reason:
Playwright/Chromium generated all 12 Gate 1 core PDF feasibility fixtures in native WSL after Linux browser dependencies were installed. User manual review found no unresolved functional rendering failure across deterministic images, long text, table headers, explicit page breaks, photo grids, the 52-photo stress fixture, bounded oversized-block diagnostics, and preview/PDF material consistency.

Limits:
This does not approve the complete production renderer, final report design, Railway/container deployment suitability, memory requirements, concurrency behavior, or background-job behavior. Gate 2 extended fixtures and deployment validation remain pending. Production must choose one header/footer strategy; the Gate 1 Core 05 fixture intentionally combined CSS/static and Playwright-template header/footer approaches for technical feasibility and produced duplicate visual elements.
