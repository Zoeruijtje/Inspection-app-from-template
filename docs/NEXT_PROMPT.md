# Next Prompt

Use this prompt in Agent mode for Phase 2 — Core domain data (Property + Inspection).

---

You are working in the Inspection App repository at `~/dev/inspection-app`.

If you discover this requires schema changes, migrations, package changes, provider/env changes, or a broad refactor, stop and produce a plan instead of implementing.

## First read these files:

- `AGENTS.md`
- `docs/PROJECT_BRIEF.md`
- `docs/INSPECTION_APP_ARCHITECTURE.md`
- `docs/ROADMAP_INSPECTION_APP.md`
- `docs/DATABASE.md`
- `docs/RESOURCE_PATTERN.md`
- `docs/PERMISSIONS.md`
- `docs/TODO.md`
- `docs/PROGRESS_LOG.md`
- `app/schema.prisma`
- `app/src/clients/clients.wasp.ts`
- `app/src/clients/operations.ts`
- `app/src/projects/projects.wasp.ts` (if exists)
- `app/main.wasp.ts`
- `tools/make-resource.mjs`

## Task: Phase 2 — Core domain data (Property + Inspection)

Add Property and Inspection models to the database schema, build CRUD operations with ownership checks, wire up Client → Property → Inspection relationships, and add navigation.

### Step 1: Add Property model

In `app/schema.prisma`:

- Add `Property` model with fields: id, address, city, postalCode, type (enum), notes, userId (FK to User), clientId (FK to Client), createdAt, updatedAt
- Add `PropertyType` enum: Residential, Commercial, Industrial, Government, Other
- Add `@@index([userId])` and `@@index([clientId])`

### Step 2: Add Inspection model

In `app/schema.prisma`:

- Add `Inspection` model with fields: id, title, description, status (enum), scheduledDate, completedDate, userId (FK to User), propertyId (FK to Property), clientId (FK to Client, denormalized for query convenience), createdAt, updatedAt
- Add `InspectionStatus` enum: Planned, InProgress, Completed, Cancelled
- Add `@@index([userId])` and `@@index([propertyId])`

### Step 3: Generate Property CRUD

Use `tools/make-resource.mjs` to scaffold Property CRUD:

- Property Wasp spec (queries + actions)
- Property operations (create, read, update, delete with ownership checks)
- Property page UI (list, create, edit)
- Add Property route and nav link

### Step 4: Build Inspection CRUD manually

Create Inspection CRUD following the Clients/Property pattern:

- Inspection Wasp spec
- Inspection operations with ownership chain verification (user → property → inspection)
- Inspection page UI
- Add Inspection route and nav link

### Step 5: Wire relationships

- Client detail page shows linked Properties
- Property detail page shows linked Inspections
- Inspection form includes Property and Client selectors

### Step 6: Run migration and test

- Run `wasp db migrate-dev --name add_property_inspection`
- Browser CRUD test: create/list/edit/delete Property, create/list/edit/delete Inspection
- Verify ownership: user A cannot see user B's Properties or Inspections
- Verify cascade: deleting a Client warns about linked Properties

## Hard constraints:

- Every query/action MUST check `context.user` and ownership.
- Nested resources MUST verify the parent chain (Inspection → Property → User).
- Do NOT add new npm packages without explicit approval.
- Do NOT edit `.env.server` or `.env`.
- Do NOT edit generated `.wasp/out` files.
- Follow existing patterns from Clients/Projects.

## After changes:

1. Run `wasp db migrate-dev --name add_property_inspection`
2. Run `make check`
3. Start app with `wasp start`
4. Browser test: CRUD Property, CRUD Inspection, ownership isolation
5. Verify existing Clients/Projects still work

## Required deliverables:

- Self-check block (see `docs/AI_AGENT_WORKFLOW.md` section 5)
- Git diff summary
- Proposed commit message
- Update `docs/PROGRESS_LOG.md`
- Update `docs/TODO.md`
- Update `docs/NEXT_PROMPT.md` for Phase 3
