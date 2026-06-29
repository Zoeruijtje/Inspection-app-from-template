# TODO

## Phase 0 — Foundation verification ✅ COMPLETE

- [x] Verify local setup (Node, Wasp, Docker, DB)
- [x] Install dependencies
- [x] Start database
- [x] Apply migrations
- [x] Start app
- [x] Browser smoke test all pages
- [x] Competitor/product research
- [x] Create planning docs (product brief, architecture, roadmap, AI workflow)
- [x] Update NEXT_PROMPT.md for Phase 1
- [x] Update PROGRESS_LOG.md
- [ ] Commit docs

## Phase 1 — Product skeleton cleanup ✅ COMPLETE

- [x] Rename app from "OpenSaaS" / "My Open SaaS App" to "Inspection App"
- [x] Remove/hide irrelevant demo nav links (Documentation, Blog pointing to opensaas.sh)
- [x] Remove AI Scheduler from authenticated nav
- [x] Update landing page content (remove Open SaaS placeholder text)
- [x] Update nav bar constants
- [x] Keep: auth, admin, clients, projects, file-upload, payment, demo-app pages functional
- [x] Browser test all pages after cleanup
- [ ] Commit

## Phase 2 — Core domain data (Property + Inspection) ✅ COMPLETE

- [x] Add Property model to schema.prisma
- [x] Add Inspection model to schema.prisma
- [x] Generate Property CRUD with make-resource.mjs
- [x] Build Inspection CRUD manually
- [x] Wire Client → Property relationship
- [x] Wire Property → Inspection relationship
- [x] Add ownership checks for nested resources
- [x] Run migration
- [x] Browser CRUD tests (API verified; browser auth pending email verification config)
- [x] Update docs and next prompt

## Phase 3 — Inspection findings ⛔ SUPERSEDED

~This phase is superseded by the Form Platform Roadmap (see docs/FORM_PLATFORM_ROADMAP.md). The product has been redefined around a generic form builder platform. Inspection-specific features will be implemented as specialized template packs (Phase 3R) built on the generic platform.~

## Phase 3A0-A — Builder feasibility spike

- [x] Standalone Vite+React prototype created (spikes/builder-dnd/)
- [x] @dnd-kit/react + @dnd-kit/helpers tested (current API first; legacy packages as fallback)
- [x] DragActiveContext placement fixed for auto-scroll hook
- [x] Module-level pointer listener removed; pointer tracking now uses React ref/effect cleanup
- [x] Keyboard container-navigation policy documented: previous/next visible compatible container in depth-first order
- [x] v4 pointer implementation manually classified as FAIL due to inconsistent destinations
- [x] v4 implementation preserved under spikes/builder-dnd/archive/v4/
- [x] v5 Stage A clean sortable rewrite implemented with `useSortable`, section `useDroppable`, and `move(items, event)` in `onDragOver`
- [x] v5 Stage A manual pointer validation passed
- [x] v5 sortable architecture approved as drag-and-drop foundation
- [x] Standalone Vite visuals explicitly rejected as production design reference
- [x] Palette-to-canvas insertion implemented
- [x] Sections and nested groups implemented
- [x] Stage A reorder inside Section A and Section B passes manual attempts
- [x] Stage A move A → B passes manual attempts
- [x] Stage A move B → A passes manual attempts
- [x] Stage A insert at first/middle/last positions passes manual attempts
- [x] Stage A move into empty section passes manual attempts
- [x] Stage B nested group added only after Stage A is manually stable
- [x] Stage B state model uses stable ordered containers: `section-a`, `section-b`, `group-a1`
- [x] Stage B group container remains non-draggable/non-reorderable
- [x] Stage B empty group has a visibly clear drop area
- [x] Stage B manual pointer validation: Section A → group, 10 consecutive correct attempts
- [x] Stage B manual pointer validation: Section B → group, 10 consecutive correct attempts
- [x] Stage B manual pointer validation: group → Section A, 10 consecutive correct attempts
- [x] Stage B manual pointer validation: group → Section B, 10 consecutive correct attempts
- [x] Stage B manual pointer validation: reorder within group, 10 consecutive correct attempts
- [x] Stage B manual pointer validation: insert first/middle/last in group, 10 consecutive correct attempts each
- [x] Stage B manual pointer validation: drop into empty group, 10 consecutive correct attempts
- [x] Stage B manual pointer validation: cancel cross-container drag restores exact pre-drag state, 10 consecutive correct attempts
- [x] Stage B manual pointer validation: Stage A regression operations still pass 10 consecutive correct attempts each
- [x] Cross-container drag-and-drop works for Stage A and Stage B block moves
- [x] Mouse/pointer interaction works for Stage A and Stage B validated scope
- [ ] Touch interaction works (tablet viewport)
- [ ] Group-container dragging/reordering works — outside Stage B validated scope
- [ ] Keyboard interaction works (Tab/Arrow/Space/Enter) — cross-container browser verification after fresh restart still required
- [ ] Move-to operation verified in browser, including counts, exact position, undo, and redo
- [ ] Auto-scroll works near canvas edges during an actual active pointer drag
- [ ] Production builder UI rebuilt using app Tailwind/shadcn patterns and FORM_BUILDER_MASTER_SPEC.md, not the standalone Vite visuals
- [x] Move-up/down fallback buttons implemented
- [x] Undo/redo command stack implemented
- [x] Persistence rollback simulation implemented; whole-template JSON rollback marked spike-only
- [x] Ordering strategies compared: integer, fractional, LexoRank
- [x] Recommendation documented in spikes/builder-dnd/README.md

## Phase 3A0-B — PDF feasibility spike

- [x] Do not start until Phase 3A0-A pointer/manual browser verification is either completed or explicitly accepted as unresolved.
- [x] Standalone Node.js script created (spikes/pdf-render/)
- [x] Gate 1-only TypeScript spike scaffold created without `app/` changes
- [x] 12 core fixture definitions implemented
- [x] Deterministic local JPEG/PNG fixtures generated (no remote images)
- [x] Fixture evidence model uses separate automated/manual/final statuses
- [x] Manual review checklist generated at `spikes/pdf-render/artifacts/metrics/manual-review.md`
- [x] Unexpected external HTTP/HTTPS request guard implemented
- [x] PDF analysis split between `pdf-lib` page/dimension analysis and `pdfjs-dist` text extraction
- [x] Deployment measurement command records browser cache/executable state
- [x] Preserve Playwright 1.55.1 blocked run under `artifacts/metrics/runs/playwright-1.55.1-blocked/`
- [x] Upgrade isolated spike dependency to `playwright@1.61.0`
- [x] Clean failed spike-local browser cache before retry
- [x] Playwright 1.61.0 Chromium browser installation succeeds in native WSL
- [x] Chromium launch works in native WSL with Playwright 1.61.0
- [x] Docker fallback proposal documented without execution
- [x] Generated image files verified with filesystem/type inspection and Node-side `pngjs`/`jpeg-js` decoding
- [x] Chromium fixture images repaired by embedding deterministic generated assets as `data:` URLs with stable `data-asset-id` attributes
- [x] A4 report generated with correct automated PDF dimensions
- [x] 5000+ char paragraph generated with start/middle/end text extraction markers
- [x] Oversized unsplittable block handled with bounded diagnostic placeholder instead of silent clipping/spillover
- [x] 50-row table generated with all 50 unique row markers extracted
- [x] Headers and footers with page numbers generated across exactly 3 physical pages
- [x] Explicit page breaks generated with expected minimum page count
- [x] 1/2/4-column photo grids load embedded images with positive natural dimensions and successful `decode()`
- [x] 500+ char captions generated for mixed-orientation photo fixture
- [x] Portrait and landscape image source readiness verified before printing
- [x] 50+ photos in one report generated with updated image-heavy timing, PDF size, page count, and memory diagnostics
- [x] Preview-versus-PDF artifacts generated; DOM page estimate recorded only as heuristic
- [x] Deployment feasibility measurements recorded separately from renderer approval
- [x] Playwright header/footer behavior tested with extracted static header/footer and `Page 1 of 3`, `Page 2 of 3`, `Page 3 of 3`
- [x] Findings documented in spikes/pdf-render/README.md
- [x] User manually reviews Gate 1 core artifacts after browser rendering succeeds
- [x] User confirms visual correctness for margins, clipping, repeated headers, photo placement/cropping/distortion, captions, page breaks, and preview-versus-PDF fidelity
- [x] Phase 3A0-B Gate 1 functional feasibility marked MANUALLY VERIFIED PASS
- [x] Playwright/Chromium approved as current PDF-rendering candidate for continued implementation and Gate 2 validation
- [x] Core 05 duplicate header/footer caveat documented as technical feasibility only, not approved report design
- [ ] Peak Chromium process-tree RSS measured reliably
- [ ] Railway/container execution validated
- [ ] Real infrastructure cold-start behavior validated
- [ ] Concurrency and background-job behavior validated
- [ ] Production header/footer strategy chosen
- [ ] Production report styling designed and validated
- [ ] Gate 2 extended fixtures started only after user manual approval of Gate 1

## Phase 3A — Platform architecture & schema foundation

- [x] Phase 3A-1 migration created and applied: `wasp db migrate-dev --name add_template_models`
- [x] Phase 3A-1 production schema added for templates, versions, pages, containers, blocks, and block options
- [x] Phase 3A-1 lifecycle/version enums added
- [x] Phase 3A-1 page-versus-parent XOR constraint added
- [x] Phase 3A-1 one-draft-per-template partial unique index added
- [x] Phase 3A-2 controlled container registry added with baseline `section`
- [x] Phase 3A-2 controlled block registry added with baseline `heading`, `paragraph`, `short_text`, and `single_select`
- [x] Phase 3A-2 registry schemas and response contracts are strict
- [x] Phase 3A-2 registry self-checks pass
- [x] Phase 3A-3 authenticated template metadata queries implemented
- [x] Phase 3A-3 owned template version metadata query implemented
- [x] Phase 3A-3 create template with initial draft version implemented transactionally
- [x] Phase 3A-3 update template metadata implemented for active owned templates
- [x] Phase 3A-3 archive and restore lifecycle actions implemented with state-checked updates
- [x] Phase 3A-3 draft-only template delete implemented with exact name confirmation
- [x] Phase 3A-3 reusable ownership and lifecycle helpers implemented
- [x] Phase 3A-3 focused validation, authorization, and lifecycle policy tests pass
- [x] make check passes for Phase 3A-3
- [x] Wasp compile phase succeeds for Phase 3A-3; full dev-server startup remains blocked locally by unavailable Docker/dev database
- [ ] Template management UI pages
- [ ] Full template CRUD UI with ownership works
- [ ] Version draft/publish lifecycle works
- [ ] Published version is immutable
- [x] Phase 3A-4C1 block config validated against registry schemas for baseline block CRUD
- [ ] Another user cannot access template
- [ ] Registry can register new block types without schema changes
- [ ] Existing app functionality (clients, properties, inspections) preserved
- [x] Ordering strategy from Phase 3A0-A applied to page definition operations
- [x] Container reference approach resolved (explicit FK to `FormContainerDefinition`, not polymorphic block parents)
- [x] Phase 3A-4A reusable definition-level authorization for owned template versions
- [x] Phase 3A-4A authenticated page definition CRUD
- [x] Phase 3A-4A read-only normalized definition tree loading
- [x] Phase 3A-4A draft-only mutability checks for page writes
- [x] Phase 3A-4A page integer sort-order normalization
- [x] Phase 3A-4B authenticated container definition CRUD
- [x] Phase 3A-4B root `section` registry validation for container writes
- [x] Phase 3A-4B container parent compatibility, cross-version prevention, and generic cycle prevention helpers
- [x] Phase 3A-4B container integer sort-order normalization
- [x] Phase 3A-4C1 authenticated baseline block definition CRUD
- [x] Phase 3A-4D authenticated option definition CRUD
- [x] Phase 3A-4C1 block registry validation for definition writes
- [x] Phase 3A-4C1 block registry validation, stable-key generation, and block ordering normalization
- [x] Phase 3A-4C2A option capability contract (BlockOptionCapability discriminated union)
- [x] Phase 3A-4C2A registry declarations for all four baseline blocks
- [x] Phase 3A-4C2A pure option capability helpers (isOptionBackedBlock, requireOptionBackedCapability)
- [x] Phase 3A-4C2A database-enforced per-block option-value uniqueness (@@unique([blockId, value]))
- [x] Phase 3A-4C2B option create/update/move/delete operations
- [x] Phase 3A-4C2B option label/value validation and duplicate handling
- [x] Phase 3A-4C2B option contiguous ordering normalization
- [x] Phase 3A-4C2B contextual single-select defaultValue validation
- [x] Phase 3A-4C2B atomic default update/delete handling
- [x] Phase 3A-4D1 reusable transaction-scoped definition-row loader
- [x] Phase 3A-4D1 pure ordering validator (gaps, duplicates, negatives, non-integers)
- [x] Phase 3A-4D1 whole-draft definition validation (pages, containers, blocks, options, defaults)
- [x] Phase 3A-4D1 recursive canonical JSON value handling
- [x] Phase 3A-4D1 canonical snapshot V1 builder (deterministic field order, sorted arrays)
- [x] Phase 3A-4D1 SHA-256 snapshot hashing (node:crypto, no deps)
- [x] Phase 3A-4D1 authenticated public validation query (RepeatableRead, safe DTO)
- [x] Phase 3A-4D2 publish transaction with full validation, snapshot persistence, and superseding

## Phase 3B — Basic template management

- [ ] Template list page with search and status badges
- [ ] Create template dialog
- [ ] Duplicate template (deep copy all blocks)
- [ ] Archive / unarchive template
- [ ] Version list on template detail
- [ ] Publish with validation feedback
- [ ] Published version is read-only; "Create new draft" prompt on edit attempt

## Phase 3C — Builder shell

- [ ] Three-panel layout on desktop (palette | canvas | properties)
- [ ] Single-panel mode on mobile (< 1024px)
- [ ] Palette: categories accordion, search, click-to-add
- [ ] Canvas: page tabs, containers, block cards, selection highlight
- [ ] Properties: dynamic form per block type
- [ ] Top toolbar: title, save status, undo/redo, preview, validate, publish
- [ ] Autosave with debounce and dirty tracking
- [ ] Undo/redo command stack (add, delete, move, configure)
- [ ] Keyboard: Tab through blocks, Enter to select, Delete to remove

## Phase 3D — Drag-and-drop integration

- [ ] Drag block within section; drag between sections
- [ ] Reorder sections within page by dragging
- [ ] Reorder pages by dragging tabs
- [ ] Touch drag on tablet viewport
- [ ] Keyboard reorder without mouse (Space/Arrow/Enter)
- [ ] Move-up/down fallback buttons visible on hover/focus
- [ ] sortOrder persists after page reload
- [ ] Server save failure → UI reverts to last saved state
- [ ] Insertion indicator shows drop position during drag
- [ ] Drag overlay shows block type icon + label

## Phase 3E — Baseline block registry

- [ ] ~20 block types registered with complete entries (10 properties each)
- [ ] Dynamic properties panel renders correct form per block type
- [ ] Option list editor for choice blocks (add/remove/reorder)
- [ ] Invalid config shows validation error
- [ ] Block type icon and color-coded category indicator on canvas

## Phase 3F — Advanced structural & data blocks

- [ ] Column group: 2/3/4 columns, each accepts blocks independently
- [ ] Group container: visual card, blocks nest inside, collapsible
- [ ] Nested groups render correctly
- [ ] Repeating group defined in builder
- [ ] Table repeater with column definitions
- [ ] All ~25 new block types have complete registry entries

## Phase 3G — Rules & validation engine

- [ ] Conditional visibility: show/hide block based on rules (9 operators, AND/OR)
- [ ] Conditional required: make block required if condition met
- [ ] Conditional skip: skip entire section based on condition
- [ ] Formula: IF(condition, true_val, false_val), arithmetic, field references
- [ ] Calculated value: SUM, AVG, MIN, MAX, COUNT aggregations
- [ ] Cycle detection at publish time
- [ ] Preview mode: show/hide indicators, highlight affected blocks
- [ ] Server re-validates all rules on response save
- [ ] No eval() or Function() constructor used

## Phase 3H — Form runtime

- [ ] Create instance from published template version
- [ ] Render all block types as fillable form fields
- [ ] Autosave after 2s inactivity with status indicator
- [ ] Progress bar: completed required / total required
- [ ] Required fields block submit until filled
- [ ] Validation errors displayed inline per field
- [ ] Save and resume: close tab, reopen, continue
- [ ] Submit locks instance; locked instance not modifiable
- [ ] Conditional fields show/hide in real time
- [ ] Repeating groups: add/remove rows dynamically
- [ ] Mobile viewport (375px): all fields usable, no horizontal scroll
- [ ] Tablet viewport (768px): comfortable layout

## Phase 3I — Media system

- [ ] Upload photo within form runtime
- [ ] Thumbnail grid with reordering
- [ ] Caption editor
- [ ] Delete photo with confirmation
- [ ] Signature pad: draw with mouse/touch, clear, save
- [ ] File attachment: upload/download via signed URL
- [ ] Signed download URLs require auth + ownership check
- [ ] S3 keys scoped per user

## Phase 3J — Findings & workflow engine

- [ ] Add finding within form runtime (separate from regular field responses)
- [ ] Finding: title, description, category, severity, priority, status, recommendation, cost (integer cents)
- [ ] Attach photos to finding
- [ ] Create follow-up task with assignee and deadline
- [ ] Task status workflow: Open → In Progress → Resolved → Closed
- [ ] Audit trail: who created/changed findings
- [ ] Filter findings by category, severity, status

## Phase 3K — Report document model

- [ ] ReportTemplate, ReportTemplateVersion, ReportBlockDefinition models
- [ ] BrandingProfile model (colors, fonts, logo, company info)
- [ ] ExportPreset model (paper size, orientation, margins, quality, show/hide)
- [ ] ExportSnapshot model for deterministic regeneration
- [ ] buildReportDocument() pure function
- [ ] Data bindings: 7 binding statuses handled (resolved, no_response, not_applicable, hidden_by_rule, missing_binding, incompatible_type, render_error)
- [ ] Historical report regeneration: same inputs → same ReportDocument
- [ ] Report template versioning: draft/publish, immutable published

## Phase 3L — Report designer

- [ ] Report builder UI: palette, flow canvas, properties
- [ ] Add/remove/reorder report blocks
- [ ] Photo grid configuration: columns, aspect ratio, fit mode, spacing, captions
- [ ] Preview report with sample data in browser
- [ ] Page boundary visualization (A4 frames)
- [ ] Bind report block to form field via block key selector
- [ ] Warning when binding target doesn't exist in form template

## Phase 3M — PDF renderer

- [ ] Print HTML route (authenticated, ownership-checked)
- [ ] Playwright/Chromium background job for PDF generation
- [ ] PDF stored as FileAsset, served via signed URL
- [ ] All 27 fixtures generate successfully
- [ ] No text clipping in any fixture
- [ ] No horizontal overflow in any fixture
- [ ] Images not distorted; captions stay with photos
- [ ] Table headers repeat on continuation pages
- [ ] Page numbers sequential and correct
- [ ] Headers/footers on every page (except cover if configured)
- [ ] Draft watermark renders when configured
- [ ] Generation time and memory usage measured (not assumed)
- [ ] Playwright header/footer limitations documented
- [ ] SSRF prevention: no arbitrary external URLs loaded

## Phase 3N — Floor plans & pins

- [ ] Upload floor plan image/PDF
- [ ] Normalized coordinate system
- [ ] Place numbered pins on floor plan
- [ ] Associate pin with finding or block response
- [ ] Pin legend generated
- [ ] Floor plan with pins renders in PDF
- [ ] Coordinates independent of display size

## Phase 3O — Offline foundation

- [ ] IndexedDB store for local response drafts
- [ ] Media upload queue for offline
- [ ] Sync when connectivity restored
- [ ] Sync status indicator
- [ ] Conflict detection: server revision vs client revision
- [ ] Explicit conflict resolution UI (keep mine / keep server)

## Phase 3P — AI builder & writing assistance

- [ ] "Create template from description": AI suggests blocks/sections
- [ ] AI-generated structure presented as draft for user review
- [ ] "Improve finding text": rewrite rough notes professionally
- [ ] "Generate report summary": introduction/conclusion from findings
- [ ] AI never silently modifies published templates or completed reports
- [ ] No full form data sent to AI — only structured prompts
- [ ] Audit log for AI usage

## Phase 3Q — Template library, roles & integrations

- [ ] Publish template to library (public/private)
- [ ] Browse and install templates from library
- [ ] Organization model with roles (owner/admin/member/viewer)
- [ ] Template import/export as JSON
- [ ] Webhooks for form completion and report generation

## Phase 3R — Specialized template packs

- [ ] Handover inspection template pack
- [ ] Property inspection template pack
- [ ] Maintenance inspection template pack
- [ ] NEN 2767-aligned pack (after authorized verification)
- [ ] Templates use only generic builder blocks
- [ ] No NEN-specific terminology in generic platform
