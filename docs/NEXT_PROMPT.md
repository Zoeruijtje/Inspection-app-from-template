# Next Prompt

Use this prompt in Agent mode for Phase 3 — Inspection findings (InspectionSection + Finding).

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
- `app/src/clients/operations.ts`
- `app/src/properties/operations.ts`
- `app/src/inspections/operations.ts`
- `app/src/inspections/InspectionsPage.tsx`
- `app/src/inspections/InspectionDetailPage.tsx`
- `app/main.wasp.ts`

## Task: Phase 3 — Inspection findings (InspectionSection + Finding)

Add InspectionSection and Finding models with categories, severity, and status. Build Finding CRUD with ownership chain verification through Inspection → Property → User. Add fast-entry UI within the Inspection detail page.

### Step 1: Schema changes

In `app/schema.prisma`:

- Add `FindingCategory` enum: Structural, Electrical, Plumbing, FireSafety, HVAC, Exterior, Interior, Other
- Add `Severity` enum: Low, Medium, High, Critical
- Add `FindingStatus` enum: Open, InProgress, Resolved
- Add `InspectionSection` model: id, title, sortOrder (Int), notes?, inspectionId (FK, onDelete: Cascade), timestamps, @@index([inspectionId])
- Add `Finding` model: id, title, description, category, severity, status (default Open), location?, recommendation?, costEstimate? (Float), sortOrder (Int, default 0), sectionId (FK to InspectionSection, onDelete: Cascade), inspectionId (FK to Inspection, onDelete: Cascade, denormalized for query convenience), userId (FK to User), timestamps, @@index([sectionId]), @@index([inspectionId])
- Add reverse relations on User (findings), Inspection (sections, findings), and InspectionSection (findings)

### Step 2: InspectionSection CRUD

Create `app/src/inspection/` sections sub-feature or inline in Inspection operations:

- Sections can be created inline during inspection creation or from the Inspection detail page
- Sections have a title, sortOrder, and optional notes
- Operations: createSection, updateSection, deleteSection, reorderSections
- Ownership chain: Section → Inspection → Property → User
- Add section CRUD UI within InspectionDetailPage

### Step 3: Finding CRUD

Create `app/src/findings/` directory:

- Finding operations with ownership chain: Finding → Section → Inspection → Property → User
- Finding list with filter by category, severity, status
- Fast-entry UI: add findings inline within the Inspection detail page (one form per finding, quick-add)
- Category and severity color-coded badges
- Finding form: title, description, category dropdown, severity dropdown, location, recommendation, costEstimate
- Finding list shows: title, category badge, severity badge, status badge, location

### Step 4: Update Inspection detail page

Replace the Phase 3 placeholder in `app/src/inspections/InspectionDetailPage.tsx`:

- Show InspectionSections with their Findings nested
- "Add section" button
- "Add finding" button per section
- Inline edit/delete for sections and findings
- Expandable/collapsible sections

### Step 5: Run migration and test

- Run `wasp db migrate-dev --name add_finding_section`
- Browser CRUD test: create section → add finding to section → edit finding → change severity/status → delete
- Verify ownership: user A cannot see user B's findings
- Verify cascade: deleting an InspectionSection cascades findings; deleting an Inspection cascades sections + findings

## Hard constraints:

- Every query/action MUST check `context.user` and ownership.
- Nested resources MUST verify the entire parent chain (Finding → Section → Inspection → Property → User).
- Finding.inspectionId is denormalized from the parent section's inspection at create time.
- Do NOT add new npm packages without explicit approval.
- Do NOT edit `.env.server` or `.env`.
- Do NOT edit generated `.wasp/out` files.
- Follow existing patterns from Clients/Properties/Inspections.

## After changes:

1. Run `wasp db migrate-dev --name add_finding_section`
2. Run `make check`
3. Start app with `wasp start`
4. Browser test: CRUD Sections, CRUD Findings, filter by category/severity/status, ownership isolation
5. Verify existing Clients/Properties/Inspections still work

## Required deliverables:

- Self-check block (see `docs/AI_AGENT_WORKFLOW.md` section 5)
- Git diff summary
- Proposed commit message
- Update `docs/PROGRESS_LOG.md`
- Update `docs/TODO.md`
- Update `docs/NEXT_PROMPT.md` for Phase 4
