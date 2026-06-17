# Form Platform Roadmap

**Created:** 2026-06-17
**Status:** Planning — 18 phases defined. Phase 3A0-A Stage A completed and manually validated. DnD foundation is current dnd-kit sortable architecture. Ordering is `Int` with transactional renumbering. Stage B nested containers pending. Phase 3A0-B PDF spike pending.

---

## Phase Dependency Graph

```
Phase 3A0-A (Builder spike) ──┐
                               ├──▶ Phase 3A (Schema foundation)
Phase 3A0-B (PDF spike) ──────┘         │
                                         ▼
                                  Phase 3B (Template management)
                                         │
                                  Phase 3C (Builder shell)
                                  ┌──────┴──────┐
                                  ▼              ▼
                           Phase 3D (DnD)   Phase 3E (Baseline blocks)
                                  │              │
                                  └──────┬───────┘
                                         ▼
                                  Phase 3F (Advanced blocks)
                                         │
                                  Phase 3G (Rules & formulas)
                                         │
                                  Phase 3H (Form runtime)
                               ┌───────┼────────┐
                               ▼       ▼        ▼
                        Phase 3I   Phase 3J   Phase 3K
                        (Media)    (Findings)  (Report model)
                               │       │        │
                               └───────┼────────┘
                                       ▼
                                Phase 3L (Report designer)
                                       │
                                Phase 3M (PDF renderer)
                                       │
                                Phase 3N (Floor plans)
                                       │
                                Phase 3O (Offline)
                                       │
                                Phase 3P (AI)
                                       │
                                Phase 3Q (Library)
                                       │
                                Phase 3R (Specialized packs)
```

**Parallelism opportunities:** Phases 3D and 3E can run in parallel after 3C. Phases 3I, 3J, and 3K can run in parallel after 3H. Phase 3A0-B may run in parallel with early Phase 3A schema/template-management work once this architecture documentation is corrected.

**Critical path:** 3A0-A Stage A → 3A → 3B → 3C → 3E → 3F → 3G → 3H → 3K → 3L → 3M → 3N → 3O → 3P → 3Q → 3R

Stage B should complete before nested-container production DnD is implemented. Report schema/designer/renderer decisions in Phases 3K-3M cannot be finalized until the PDF spike passes.

---

## Phase 3A0-A — Builder Feasibility Spike

**Goal:** Verify dnd-kit as drag-and-drop candidate using the current `@dnd-kit/react` + `@dnd-kit/helpers` API. Choose ordering strategy. No production code.

**Prerequisites:** None.

### Completed Stage A

- Flat sections.
- Same-container sorting.
- Cross-section sorting.
- Empty-section drops.
- First/middle/last positions.
- Integer ordering comparison and decision.
- Manual Stage A pointer validation passed: no bottom-jumps, missing blocks, duplicates, or unintended destinations were observed.

### Pending Stage B

- Nested groups.
- Section → group movement.
- Group → section movement.
- Group → group movement.
- Empty nested groups.
- Sorting group containers if required.
- Regress flat-list behavior.

### Pending Stage C

- Touch.
- Production keyboard flow.
- Auto-scroll.
- Persistence integration.
- Responsive production behavior.

**Deliverables:**

- Standalone Vite+React prototype in `spikes/builder-dnd/`
- DnD criteria tested in staged passes: flat containers completed; nested containers and support behavior pending
- Ordering strategies compared with Phase 3A baseline chosen: `sortOrder: Int` with transactional source/destination renumbering
- README.md with findings and recommendation

**Exclusions:** No production schema, no Wasp integration, no database, no existing Property/Inspection records, no commits to app/.

**Dependencies:** `@dnd-kit/react`, `@dnd-kit/helpers` (new dnd-kit API). Legacy `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` only as intentional comparison/fallback.

**Complexity:** M

**Commit boundary:** The entire `spikes/builder-dnd/` directory (including source, package.json, lockfile, README — excluding node_modules and large generated outputs) may be committed as a dedicated spike commit.

---

## Phase 3A0-B — PDF Feasibility Spike

**Goal:** Verify Playwright/Chromium produces quality paginated PDFs. Test 12 mandatory core feasibility fixtures. Document deployment feasibility. No production code.

**Prerequisites:** Phase 3A0-A Stage A completed and reviewed. Stage B nested-container validation remains separate DnD work.

**Deliverables:**

- Standalone Node.js script in `spikes/pdf-render/`
- 12 mandatory core feasibility fixtures tested: A4 report, long text (5000+ chars), oversized blocks, 50-row tables with repeating headers, headers/footers/page numbers, explicit page breaks, 1/2/4-column photo grids, long captions, portrait+landscape images, 50+ photos, preview-vs-PDF comparison, deployment feasibility
- 15 extended fixtures retained for pre-release validation
- 27 total planned PDF cases
- Deterministic local JPEG/PNG fixtures (varied dimensions, aspect ratios, file sizes) — no remote images
- README.md with findings, performance measurements, and recommendation

**Exclusions:** No production schema, no Wasp integration, no database, no authentication.

**Dependencies:** `playwright`

**Complexity:** M

**Commit boundary:** The entire `spikes/pdf-render/` directory (including source, package.json, lockfile, README, fixture generation scripts — excluding node_modules and large generated PDFs by default) may be committed as a dedicated spike commit.

---

## Phase 3A — Platform Architecture & Schema Foundation

**Goal:** Production data model for templates, versions, pages, containers, and blocks. Block registry infrastructure. Template CRUD with ownership. Draft/publish lifecycle. Basic CRUD pages only.

**Prerequisites:** Phase 3A0-A Stage A completed with dnd-kit sortable foundation verified and integer ordering chosen. Stage B should complete before nested-container production DnD. Phase 3A0-B can run in parallel with early schema/template-management work, but PDF/report decisions are not finalized until it passes.

**Schema changes (in `app/schema.prisma`):**

- `FormTemplate`: id, name, description, category, tags, userId FK, lifecycleStatus (`ACTIVE | ARCHIVED`), timestamps. @@index([userId]).
- `FormTemplateVersion`: id, templateId FK, versionNumber Int, status (`DRAFT | PUBLISHED | SUPERSEDED`), publishedAt?, snapshot JSON?, snapshotSchemaVersion?, snapshotHash?, timestamps. @@index([templateId]), @@unique([templateId, versionNumber]).
- `FormPageDefinition`: id, templateVersionId FK, title, sortOrder Int, timestamps.
- `FormContainerDefinition`: id, templateVersionId FK, containerType String, pageId FK?, parentContainerId String?, title?, config JSON?, sortOrder Int, timestamps.
- `FormBlockDefinition`: id, templateVersionId FK, blockType, blockImplementationVersion Int, configSchemaVersion Int, config JSON, containerId FK, sortOrder Int, stableKey, label, required, conditionalVisibility JSON?, validation JSON?, timestamps. @@index([containerId]), @@unique([templateVersionId, stableKey]).
- `FormBlockOption`: id, blockId FK, label, value, sortOrder Int, color?, score?.
- Reverse relations on User.

**Routes:** `/templates`, `/templates/:id`, `/templates/:id/versions/:versionId`

**Operations:** Full CRUD for templates, versions, pages, containers, blocks. Validate config. Publish version.

**UI:** Template list page, template detail with version list, version detail (read-only tree view). NO builder canvas, NO drag-and-drop, NO properties panel.

**Security:** context.user on all ops. template.userId ownership. Published version immutability server-side. Config validated against registry schemas.

**Acceptance criteria:**

- [ ] Migration applied: `wasp db migrate-dev --name add_template_models`
- [ ] `make check` passes
- [ ] `wasp start` compiles
- [ ] Create template → draft → page → section container → heading block → short_text block
- [ ] Block config validated against registry schema (invalid config rejected)
- [ ] Publish version → immutable
- [ ] Edit published version returns error
- [ ] Another user cannot access template
- [ ] Registry can register new block types without schema changes
- [ ] Existing app functionality (clients, properties, inspections) preserved

**Exclusions:** Builder UI, drag-and-drop, form runtime, report code, new npm packages, env changes.

**Complexity:** XL

**Commit:** `feat: phase 3a — template, version, container, and block definition models with typed block registry`

---

## Phase 3B — Basic Template Management

**Goal:** Template list, create, rename, duplicate, archive, version list, draft/publish workflow UI.

**Prerequisites:** Phase 3A.

**Schema changes:** None (uses Phase 3A models).

**UI:** Template list with search/status badges. Template detail with version list and publish button. Duplicate action (deep copy). Archive/unarchive.

**Acceptance criteria:**

- [ ] Template list shows ACTIVE/ARCHIVED template lifecycle and DRAFT/PUBLISHED/SUPERSEDED version status with color badges
- [ ] Search filters by name/description/category
- [ ] Duplicate creates independent copy with all blocks preserved
- [ ] Archive hides from active list; can be unarchived
- [ ] Publish validates template; shows errors if validation fails
- [ ] Published version is read-only; "Create new draft" prompt on edit attempt

**Complexity:** M

**Commit:** `feat: phase 3b — template management pages with draft/publish workflow`

---

## Phase 3C — Builder Shell

**Goal:** Three-panel builder (palette | canvas | properties). Block selection, add/delete/duplicate. Dynamic properties per block type. Autosave foundation. Undo/redo (command pattern). No drag-and-drop.

**Prerequisites:** Phase 3B.

**Schema changes:** None.

**UI:** Left panel (palette with categories, search, click-to-add). Center (canvas with page tabs, containers, block cards, selection). Right panel (dynamic properties form per block type). Top toolbar (title, save status, undo/redo, preview, validate, publish).

**Acceptance criteria:**

- [ ] Three-panel layout on desktop (≥1024px); collapsed on tablet/mobile
- [ ] Click block type in palette → adds to active section on canvas
- [ ] Click block on canvas → selects it → shows properties in right panel
- [ ] Change property → canvas preview updates in real time
- [ ] Save status: Dirty → Saving → Saved / Error
- [ ] Undo/redo works for add, delete, config change, move (via buttons)
- [ ] Page tabs switch between pages; add/rename/delete pages
- [ ] Keyboard: Tab through blocks, Enter to select, Delete to remove

**Complexity:** XL

**Commit:** `feat: phase 3c — three-panel builder shell with palette, canvas, properties, undo/redo`

---

## Phase 3D — Drag-and-Drop Integration

**Goal:** Integrate chosen DnD library with sortable pages/sections/blocks. Cross-container movement. Touch + keyboard. Transactional persistence with chosen ordering strategy.

**Prerequisites:** Phase 3C. Phase 3A0-A spike confirmed DnD candidate.

**Dependencies:** DnD library (per spike recommendation).

**Acceptance criteria:**

- [ ] Drag block within section; drag between sections
- [ ] Reorder sections within page; reorder pages via tab drag
- [ ] Touch drag on tablet viewport
- [ ] Keyboard reorder without mouse (Space/Arrow/Enter)
- [ ] Move-up/down buttons as fallback
- [ ] sortOrder persists after reload
- [ ] Server save failure → UI reverts

**Complexity:** L

**Commit:** `feat: phase 3d — drag-and-drop builder with sortable pages, sections, and blocks`

---

## Phase 3E — Baseline Block Registry

**Goal:** Implement initial ~20 block types: heading, paragraph, short_text, long_text, number, currency, date, yes_no, single_select, multi_select, checkbox, static_image, divider, page_break, section, page, plus several more.

**Prerequisites:** Phase 3C (can run parallel with 3D).

**Acceptance criteria:**

- [ ] Each block type has complete registry entry (all 10 properties)
- [ ] Dynamic properties panel renders correct form per block type
- [ ] Option list editor for choice blocks (add/remove/reorder)
- [ ] Invalid config shows validation error
- [ ] Block type icon and color-coded category indicator on canvas
- [ ] Registry can add new block types without schema changes

**Complexity:** L

**Commit:** `feat: phase 3e — baseline block registry with 20 block types`

---

## Phase 3F — Advanced Structural & Data Blocks

**Goal:** ~25 additional block types: columns, groups, repeaters, tables, measurement, rich_text, instruction, email, phone, url, rating, radio_group, checkbox_group, pass_fail_na, compliant_nc_ni, priority, prefilled_field, auto_number, hidden_value, timestamp, decimal, percentage, time, date_time, address, client_details, property_details, inspection_metadata, inspector_details, disclaimer, terms_approval.

**Prerequisites:** Phase 3E.

**Acceptance criteria:**

- [ ] Column group: 2/3/4 columns, each accepts blocks independently
- [ ] Group: visual card container, blocks nest inside
- [ ] Nested groups: group within group renders correctly
- [ ] Repeating group: defined in builder
- [ ] All ~25 block types have complete registry entries

**Complexity:** L

**Commit:** `feat: phase 3f — advanced structural and data blocks including columns, groups, and repeaters`

---

## Phase 3G — Rules & Validation Engine

**Goal:** Conditional visibility, required conditions, validation rules, formula calculations, cycle detection.

**Prerequisites:** Phase 3E.

**Acceptance criteria:**

- [ ] Show/hide block based on another block's value (9 operators, AND/OR groups)
- [ ] Make block required conditionally
- [ ] Skip section based on condition
- [ ] Calculated field: sum, average, min, max of other fields
- [ ] Formula: IF(condition, true_val, false_val)
- [ ] Cycle detection rejects circular dependencies at publish time
- [ ] Preview mode: show/hide indicators on canvas
- [ ] Server re-validates all rules on response save

**Complexity:** L

**Commit:** `feat: phase 3g — conditional logic, validation rules, and safe formula engine`

---

## Phase 3H — Form Runtime

**Goal:** FormInstance creation, response capture, mobile-friendly filling, autosave, progress, completion/locking.

**Prerequisites:** Phase 3A, 3E.

**Schema changes:** FormInstance, BlockResponse, RepeatGroupInstance, RepeatGroupResponse models.

**Acceptance criteria:**

- [ ] Create instance from published template version
- [ ] Render all block types as fillable form fields
- [ ] Autosave after 2s inactivity; "Saving..." then "Saved" indicator
- [ ] Progress bar: completed required / total required
- [ ] Required fields blocked from submit until filled
- [ ] Validation errors displayed inline
- [ ] Save and resume: close tab, reopen, continue
- [ ] Submit locks instance; locked instance not modifiable
- [ ] Conditional fields show/hide in real time
- [ ] Repeating groups: add/remove rows dynamically
- [ ] Mobile viewport (375px): usable, no horizontal scroll

**Complexity:** XL

**Commit:** `feat: phase 3h — form runtime with instance creation, response capture, autosave, and locking`

---

## Phase 3I — Media System

**Goal:** Photos, files, signatures. Reuse S3 infrastructure.

**Prerequisites:** Phase 3H.

**Acceptance criteria:**

- [ ] Upload photo within form runtime; appears in thumbnail grid
- [ ] Add caption; caption persists
- [ ] Reorder photos
- [ ] Delete photo with confirmation
- [ ] Signature pad: draw with mouse/touch, clear, save
- [ ] Signed download URL requires auth
- [ ] File attachment: upload/download via signed URL

**Complexity:** L

**Commit:** `feat: phase 3i — media system with photos, files, signatures, and secure access`

---

## Phase 3J — Findings & Workflow Engine

**Goal:** Findings, tasks, cases, notifications, audit trail.

**Prerequisites:** Phase 3H.

**Acceptance criteria:**

- [ ] Add finding within form runtime (separate from regular fields)
- [ ] Finding: title, description, category, severity, priority, status, recommendation, cost (integer cents)
- [ ] Attach photos to finding
- [ ] Create follow-up task with assignee and deadline
- [ ] Task status workflow: Open → In Progress → Resolved → Closed
- [ ] Audit trail records who created/changed findings
- [ ] Filter findings by category, severity, status

**Complexity:** L

**Commit:** `feat: phase 3j — findings, tasks, cases, and workflow engine`

---

## Phase 3K — Report Document Model

**Goal:** Report templates, report blocks, data bindings, branding profiles, export presets, canonical ReportDocument builder.

**Prerequisites:** Phase 3H.

**Schema changes:** ReportTemplate, ReportTemplateVersion, ReportBlockDefinition, BrandingProfile, ExportPreset, ReportExport, ExportSnapshot.

**Acceptance criteria:**

- [ ] Create report template with report blocks
- [ ] Bind report block to form block via stableKey
- [ ] buildReportDocument() resolves all bindings correctly
- [ ] Missing binding renders placeholder (not crash)
- [ ] Branding profile applies: colors, fonts, logo
- [ ] Export preset: paper size, orientation, margins, show/hide options
- [ ] ReportDocument layout/content is deterministic for pinned inputs; byte-for-byte PDF determinism remains subject to Phase 3A0-B evidence

**Complexity:** L

**Commit:** `feat: phase 3k — report document model with templates, bindings, branding, and presets`

---

## Phase 3L — Report Designer

**Goal:** Report builder UI — palette, flow canvas, properties, photo layout settings, sample data preview, page preview.

**Prerequisites:** Phase 3K.

**Acceptance criteria:**

- [ ] Report builder with palette and flow canvas
- [ ] Add/remove/reorder report blocks
- [ ] Configure photo grid: columns, aspect ratio, fit mode
- [ ] Preview report with sample data in browser
- [ ] Page boundary visualization (A4 frames)
- [ ] Bind report block to form field via block key selector
- [ ] Warning when binding target doesn't exist

**Complexity:** L

**Commit:** `feat: phase 3l — report designer with block palette, flow canvas, and preview`

---

## Phase 3M — PDF Renderer

**Goal:** Print HTML route, Playwright/Chromium PDF generation, storage, download, 27-case fixture suite.

**Prerequisites:** Phase 3K, 3L. Phase 3A0-B spike confirmed PDF candidate.

**Dependencies:** `playwright`

**Acceptance criteria:**

- [ ] Generate PDF from completed instance + report template + branding + preset
- [ ] PDF downloads via signed URL
- [ ] All 12 core feasibility fixtures and 15 extended validation fixtures generate successfully before release-ready PDF claims
- [ ] No text clipping in any fixture
- [ ] No horizontal overflow in any fixture
- [ ] Images not distorted
- [ ] Captions stay with photos
- [ ] Table headers repeat
- [ ] Page numbers sequential
- [ ] Headers/footers on every page (except cover)
- [ ] Draft watermark renders
- [ ] Generation time acceptable (measured, not asserted)
- [ ] Memory usage acceptable (measured, not asserted)

**Complexity:** XL

**Commit:** `feat: phase 3m — PDF rendering engine with Playwright and 27-case fixture suite`

---

## Phase 3N — Floor Plans & Pins

**Goal:** Floor plan upload, normalized coordinates, pin placement, finding association, PDF rendering.

**Prerequisites:** Phase 3I, 3J, 3M.

**Acceptance criteria:**

- [ ] Upload floor plan image/PDF
- [ ] Place numbered pins on floor plan
- [ ] Associate pin with finding
- [ ] Pin legend generated
- [ ] Floor plan with pins renders in PDF
- [ ] Coordinates independent of display size

**Complexity:** M

**Commit:** `feat: phase 3n — floor plan and pin annotation system`

---

## Phase 3O — Offline Foundation

**Goal:** IndexedDB local drafts, media upload queue, sync status, conflict detection.

**Prerequisites:** Phase 3H, 3I.

**Acceptance criteria:**

- [ ] Form responses saved to IndexedDB when offline
- [ ] Media added to upload queue when offline
- [ ] Sync when connectivity restored
- [ ] Conflict detection: server vs client revision
- [ ] Explicit conflict resolution UI

**Complexity:** L

**Commit:** `feat: phase 3o — offline foundation with local drafts and sync queue`

---

## Phase 3P — AI Builder & Writing Assistance

**Goal:** Template generation from description, field suggestions, report text improvement.

**Prerequisites:** Phases 3A-3M stable.

**Acceptance criteria:**

- [ ] "Create template from description": AI suggests blocks/sections
- [ ] AI-generated structure presented as draft for review
- [ ] "Improve finding text": rewrite rough notes professionally
- [ ] "Generate report summary": introduction/conclusion from findings
- [ ] AI never silently modifies published templates or completed reports
- [ ] No full form data sent to AI

**Complexity:** M

**Commit:** `feat: phase 3p — AI-assisted template creation and text improvement`

---

## Phase 3Q — Template Library, Roles & Integrations

**Goal:** Template store, organizations, roles, import/export, webhooks.

**Prerequisites:** Phases 3A-3P stable.

**Acceptance criteria:**

- [ ] Publish template to library (public/private)
- [ ] Browse and install templates from library
- [ ] Organization: multi-user workspace with roles
- [ ] Template import/export as JSON
- [ ] Webhooks for form completion, report generation

**Complexity:** XL

**Commit:** `feat: phase 3q — template library, organizational roles, and integrations`

---

## Phase 3R — Specialized Template Packs

**Goal:** Pre-built templates for handover inspection, property inspection, maintenance inspection, NEN 2767-aligned pack after qualified independent domain review and, where applicable, review by NEN or an appropriate conformity-assessment or certification body.

**Prerequisites:** Phase 3Q.

**Acceptance criteria:**

- [ ] Handover inspection template pack
- [ ] Property inspection template pack
- [ ] Maintenance inspection template pack
- [ ] NEN 2767-aligned pack after qualified independent domain review and applicable conformity review
- [ ] Templates installable from library
- [ ] Templates use only generic builder blocks (no custom code)

**Complexity:** M

**Commit:** `feat: phase 3r — specialized inspection template packs`

---

## Complexity Summary

| Complexity | Phases                             |
| ---------- | ---------------------------------- |
| S          | —                                  |
| M          | 3A0-A, 3A0-B, 3B, 3N, 3P, 3R       |
| L          | 3D, 3E, 3F, 3G, 3I, 3J, 3K, 3L, 3O |
| XL         | 3A, 3C, 3H, 3M, 3Q                 |
