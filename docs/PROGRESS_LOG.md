# Progress Log

## Current status

- Open SaaS project created.
- Local setup in WSL2.
- Git repository initialized.
- Baseline pushed/planned.
- Agent documentation being added and synchronized with the current codebase.
- Codebase audit completed from local files only on 2026-06-16.
- Master planning phase completed on 2026-06-17. Product redefined around generic form builder platform.
- Phase 3A0-A v5 Stage A manual pointer validation passed; sortable architecture approved as DnD foundation.

## Next milestone

Phase 3A0-A v5 Stage B — validate nested group sortable behavior in the isolated spike.

## In progress

- Phase 3A0-A v5: Stage A pointer behavior verified; Stage B nested group validation is next. Do not start the PDF spike yet.

## Completed

- Phase 3A0-A v5 Stage A manual pointer validation completed 2026-06-17.

- User manual testing found Stage A pointer dragging smooth and predictable.
- Reordering within both sections worked reliably.
- Moving blocks between sections worked reliably.
- Dropping at first, middle, and final positions worked reliably.
- No inconsistent jumping to the bottom was observed in the v5 rewrite.
- No blocks disappeared or duplicated.
- Decision recorded: v5 sortable architecture is approved as the drag-and-drop foundation.
- Design caveat recorded: the standalone Vite visuals are not approved as final product design and must not be used as a production visual reference.
- Production builder UI must be rebuilt later using the existing app's Tailwind/shadcn patterns, `docs/UI_RULES.md`, and `docs/FORM_BUILDER_MASTER_SPEC.md`.

- Phase 3A0-A v5 Stage A sortable rewrite implemented 2026-06-17.

- Manual verdict for v4 pointer implementation recorded as FAIL: blocks sometimes dropped at the bottom or unintended locations, with inconsistent behavior between attempts.
- Preserved v4 reference implementation under `spikes/builder-dnd/archive/v4/` without intentionally archiving `node_modules` or generated build output.
- Rebuilt the pointer-drag core around current dnd-kit sortable primitives: `DragDropProvider`, `useSortable`, section-level `useDroppable`, and `move(items, event)` during `onDragOver`.
- Removed the active pointer core's custom drop-slot algorithm, manual `onDragEnd` insertion-index logic, native HTML5 drag for canvas blocks, and DOM-query style resolution.
- Stage A now exposes exactly two flat sections with 5 blocks in Section A and 3 blocks in Section B. Nested groups are intentionally not implemented until Stage A is manually stable.
- Checks run: `npx tsc --noEmit` passed; `npm run build` passed.
- Later manual testing verified reorder, A→B, B→A, first/middle/end insertion, and empty-section behavior as stable in Stage A.

- Phase 3A0-A v4 correction pass partially completed 2026-06-17.

- Fixed DragActiveContext placement so an outer `BuilderCanvas` owns `isDragActive`, the provider wraps `BuilderCanvasInner`, and `useAutoScroll()` runs inside the active provider.
- Moved `useDragOperation()` into a `CanvasDragOverlay` child under `DragDropProvider`, matching the same provider-consumer rule for dnd-kit overlay state.
- Removed the module-level `_lastPointerY` / `window.addEventListener('pointermove')` design. Pointer Y now lives in a React ref with effect cleanup while drag is active.
- Defined keyboard boundary navigation policy: Arrow boundary movement targets the previous/next visible compatible section/group in depth-first page order; non-adjacent moves use Move-to.
- Escape cancel now restores the pre-lift template, undo stack, redo stack, and save status. The JSON snapshot remains explicitly spike-only.
- `spikes/builder-dnd/README.md` updated with v4 results and clear VERIFIED PASS / PASS WITH LIMITATIONS / FAIL / UNVERIFIED categories.
- Checks run: `npx tsc --noEmit` passed; `npm run build` passed; fresh `npm run dev -- --host 0.0.0.0` started after sandbox escalation; `curl -I http://localhost:5173/` returned HTTP 200.
- Browser verification blocked: `agent-browser` command unavailable; Playwright Chromium install failed because Playwright does not support chromium on ubuntu26.04-x64; no Chrome/Chromium/Firefox binary found in PATH.
- Still unverified: Move-to browser flow, fresh-browser keyboard cross-container flow, genuine manual pointer drag, auto-scroll during active pointer drag, and touch.

- Phase 3A0-A — Builder feasibility spike initially completed 2026-06-17, later reopened for verification gaps.

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
- Replaced stock Open SaaS template README with Inspection App setup guide covering requirements, local setup, Makefile commands, removed directories, security rules, and docs index.

## Completed — Phase 1: Product skeleton cleanup (2026-06-16)

- Renamed app from "OpenSaaS" / "My Open SaaS App" to "InspectionApp" / "Inspection App" in `app/main.wasp.ts`.
- Removed "Documentation" and "Blog" nav links (pointed to opensaas.sh).
- Removed "AI Scheduler" from authenticated nav items (demo-app page still exists at /demo-app).
- Removed "Star Our Repo on Github" announcement banner from landing page nav.
- Updated landing page Hero with Dutch inspection-app headline: "Van klant tot rapport — één flow."
- Replaced placeholder features grid with 9 inspection-relevant features (Klantbeheer, Projecten, Inspecties, Foto's, Rapportages, AI, Handtekeningen, Templates, Teamwerk).
- Updated testimonials with Dutch inspector personas.
- Updated FAQ with 3 inspection-relevant Dutch Q&A items.
- Updated footer navigation (removed opensaas.sh/wasp.sh links).
- Updated highlighted feature section with 5-step workflow summary.
- Removed Open SaaS banner images from Hero.
- Updated nav bar branding text from "Your SaaS" to "Inspection App".
- Cleaned up unused `useIsLandingPage` import and `Announcement` reference in NavBar.
- `make check` passed (whitespace check + Prisma validate).
- No schema changes, no migrations, no new packages.
- All functional pages preserved: auth, clients, projects, file-upload, admin, demo-app, payment.

## Completed — Phase 3A0-A: Builder feasibility spike (2026-06-17)

- Standalone Vite+React+TS prototype created at `spikes/builder-dnd/`.
- @dnd-kit/react v0.5.0 and @dnd-kit/helpers v0.5.0 installed and tested.
- Block palette with 30 block types in 7 categories (Structure, Display, Basic Inputs, Choice Inputs, Data/Calculation, Media, Inspection/Workflow).
- Three-panel builder layout: palette (left), canvas (center), properties (right).
- Click-to-add blocks from palette to active section/selected container.
- Sections and nested groups implemented with visual borders and depth indentation.
- Move-up/down fallback buttons on every block and container.
- Undo/redo command stack (Ctrl+Z, Ctrl+Shift+Z) with 20-command depth.
- Save simulation with configurable failure toggle and rollback to lastSavedSnapshot.
- Responsive CSS: panels stack vertically below 1024px, mobile optimizations at 768px and 480px.
- dnd-kit integration: DragDropProvider, useDraggable on blocks, useDroppable on containers, PointerSensor, KeyboardSensor, DragOverlay.
- Auto-scroll hook (useAutoScroll) implemented but not tested without active pointer drag.
- Full cross-container pointer drag-and-drop requires deeper sortable-group wiring — dnd-kit recommended for Phase 3D with implementation refinements noted.
- Ordering strategies compared via benchmark: integer (O(N) writes), fractional/float (1 write per insert), LexoRank (1 write, growing string keys).
- **Recommendation: Fractional (Float) ordering** — best balance of write efficiency, debuggability, and query simplicity for single-user template editing.
- See `spikes/builder-dnd/README.md` for full findings and dnd-kit configuration notes.

## In progress

- Phase 3A0-B: PDF feasibility spike — NEXT.

## 2026-06-17 — Master planning phase completed

- Form builder, inspection runtime, and PDF report designer specification created.
- Product redefined around 9 separated subsystems.
- 18 phases planned: 2 feasibility spikes (3A0-A Builder, 3A0-B PDF) + 16 production phases (3A through 3R).
- Existing Phase 0-2 work preserved. Old Phase 3 (Findings) superseded by this plan.
- Documentation created: PRODUCT_CAPABILITY_MATRIX.md, FORM_BUILDER_MASTER_SPEC.md, FORM_BLOCK_CATALOG.md, FORM_BUILDER_DATA_MODEL.md, REPORT_DESIGNER_PDF_SPEC.md, FORM_PLATFORM_ROADMAP.md, NEN2767_IMPLEMENTATION_BOUNDARY.md.
- Ordering strategy (integer vs fractional vs LexoRank) deferred to Phase 3A0-A spike.
- Container reference approach (polymorphic containerType+containerId vs explicit FK to FormContainerDefinition) deferred to Phase 3A implementation analysis.
- PDF engine: Playwright/Chromium is preferred candidate — to be verified by Phase 3A0-B spike.
- DnD library: dnd-kit (@dnd-kit/react + @dnd-kit/helpers current API) is preferred candidate — to be verified by Phase 3A0-A spike.
- Chromium binary size, memory requirements, and cold-start time are unknown until Phase 3A0-B measures them.
- Phase 3A0-A is the next implementation step.

## Completed — Phase 2 fixes & improvements (2026-06-17)

### Route param fix

- Fixed all detail pages (ClientDetailPage, PropertyDetailPage, InspectionDetailPage) to use `useParams` from `react-router` instead of expecting props from Wasp. Wasp uses React Router under the hood and route params must be accessed via the `useParams()` hook.
- Fixed InspectionsPage to use `useSearchParams` from `react-router` for `?propertyId=` query string.
- Server logs confirm: `get-inspection-by-id` and `get-property-by-id` now return 200.

### Date picker

- Installed `react-day-picker` v10 and `date-fns` for calendar widget.
- Created `app/src/client/components/ui/calendar.tsx` — shadcn-style Calendar wrapping react-day-picker v10.
- Created `app/src/client/components/ui/date-picker.tsx` — popover DatePicker with Calendar + Clear button.
- Created `app/src/client/hooks/use-on-click-outside.ts` — click-outside detection hook.
- Replaced native `<input type="date">` with DatePicker in Inspection create/edit form.

## Completed — Phase 2: Core domain data (Property + Inspection) (2026-06-16)

### Schema

- Added `PropertyType` enum (Residential, Commercial, Industrial, Government, Other).
- Added `InspectionStatus` enum (Planned, InProgress, Completed, Cancelled).
- Added `Property` model: id, address, city, postalCode, type, notes, userId (FK), clientId (FK, optional, onDelete: SetNull), timestamps, @@index([userId]), @@index([clientId]).
- Added `Inspection` model: id, title, description, status (default Planned), scheduledDate, completedDate, userId (FK), propertyId (FK, onDelete: Restrict), clientId (FK, denormalized, onDelete: SetNull), timestamps, @@index([userId]), @@index([propertyId]).
- Added reverse relations on User (properties, inspections) and Client (properties, inspections).
- Migration `20260616220424_add_property_inspection` applied successfully.

### Property CRUD

- Created `app/src/properties/`: operations.ts (full CRUD with Zod, client ownership check, block delete if inspections exist), PropertiesPage.tsx (list with search, CRUD dialogs, type badges, Radix Select for client), PropertyDetailPage.tsx (property info + linked inspections), properties.wasp.ts (routes /properties and /properties/:id).

### Inspection CRUD

- Created `app/src/inspections/`: operations.ts (nested ownership: Inspection→Property→User, auto-denormalize clientId), InspectionsPage.tsx (list with status badges, Property selector, date inputs), InspectionDetailPage.tsx (read-only with Phase 3 placeholder), inspections.wasp.ts (routes /inspections and /inspections/:id).

### Wire relationships

- Created `app/src/clients/ClientDetailPage.tsx`: full detail with inline edit, linked Properties, route /clients/:id.
- Added getClientById query with Property include. Added "View" button to client list items.

### Integration

- Imported propertiesSpec + inspectionsSpec into main.wasp.ts. Added nav links. Specs include all needed entities (Property, Client).
- make check passed. Migration applied cleanly. wasp start compiles. No new packages.

## Completed — Foundation pass (2026-06-16)

- Full repo inspection and environment verification.
- Node v24.16.0, Wasp 0.24.0, Docker 28.3.2, PostgreSQL 18 confirmed working.
- `wasp install` and `npm install` completed successfully.
- `.env.server` created from `.env.server.example` with placeholder values.
- Database started (`wasp db start`), all 3 migrations applied successfully.
- App starts and runs: client on :3000, server on :3001.
- Browser smoke tests completed:
  - Landing page loads ✅
  - Signup with Dummy email provider works ✅
  - Email verification via server log link works ✅
  - Login works ✅
  - `/projects` — CRUD fully tested (create, list, edit, delete) ✅
  - `/clients` — server API returns 200 ✅
  - `/demo-app` — loads with pre-loaded tasks ✅
  - `/file-upload` — loads (S3 not configured, graceful degradation) ✅
  - `/admin` — correctly blocks non-admin users (403) ✅
- Competitor research completed:
  - Incontrol (incontrol.app) product tour analyzed — full feature map documented
  - 300+ inspection software listings reviewed via Capterra/GetApp/SoftwareAdvice
  - Key competitors identified: Spectora, ISN, GoAudits, SnapInspect, SafetyCulture
  - Feature patterns documented for templates, photos, AI, reports, signatures
- Planning documentation created/updated:
  - `docs/PRODUCT_RESEARCH_INSPECTION_APPS.md` — competitive analysis and feature inspiration
  - `docs/PROJECT_BRIEF.md` — replaced MVP factory brief with inspection app product brief
  - `docs/INSPECTION_APP_ARCHITECTURE.md` — entity model, permissions, phase dependencies
  - `docs/ROADMAP_INSPECTION_APP.md` — 11-phase build plan (Phase 0-10)
  - `docs/AI_AGENT_WORKFLOW.md` — agent rules, self-check blocks, phase-specific instructions
  - `docs/NEXT_PROMPT.md` — exact prompt for Phase 1 (skeleton cleanup)
- Git state: only `README.md` and docs files modified (expected).

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
