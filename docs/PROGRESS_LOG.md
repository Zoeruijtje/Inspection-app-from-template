# Progress Log

## Current status

- Open SaaS project created.
- Local setup in WSL2.
- Git repository initialized.
- Baseline pushed/planned.
- Agent documentation being added and synchronized with the current codebase.
- Codebase audit completed from local files only on 2026-06-16.

## Next milestone

Phase 3: Inspection Findings — Add InspectionSection and Finding models with categories, severity, status, and CRUD operations with ownership chain verification.

## Completed

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

## In progress

- Phase 3: Inspection findings — NEXT.

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
