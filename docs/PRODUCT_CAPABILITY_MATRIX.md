# Product Capability Matrix

**Created:** 2026-06-17
**Status:** Planning — research compilation. All competitor claims are research leads; verification status is noted per claim.

---

## Methodology

Every external capability statement includes:
- **Source:** Public URL where the claim was observed
- **Date accessed:** When the source was last checked
- **Classification:**
  - **Verified:** Directly observed on the competitor's public website or official documentation
  - **Inferred:** Reasonably assumed from public product descriptions but not directly confirmed on-screen
  - **Unverified:** Found in secondary sources (review aggregators, third-party articles) — not confirmed against primary source
  - **Aspirational:** Desired in our product; no public evidence any listed competitor has it

**No claim is made about a competitor's private block catalogue, internal implementation, or undocumented features.**

---

## Sources

| # | Source | Type | URL | Last Accessed |
|---|--------|------|-----|---------------|
| 1 | Incontrol public homepage (EN) | Primary competitor — product marketing | `https://incontrol.app/en/` | 2026-06-17 |
| 2 | Incontrol product tour pages | Primary competitor — feature pages | `https://incontrol.app/en/tour` | 2026-06-17 |
| 3 | Spectora public features page | US competitor — product marketing | `https://www.spectora.com/features/` | 2026-06-17 |
| 4 | SafetyCulture platform page | General inspection platform — product marketing | `https://safetyculture.com/platform/` | 2026-06-17 |
| 5 | Capterra / GetApp / SoftwareAdvice | Review aggregators — listings | Various listing pages | 2026-06-16 |
| 6 | dnd-kit documentation | Drag-and-drop library — technical docs | `https://dndkit.com` | 2026-06-17 |
| 7 | Playwright documentation | Browser automation — technical docs | `https://playwright.dev` | 2026-06-17 |

---

## Capability Matrix

### A. Builder & Template Capabilities

| Capability | Incontrol | Spectora | SafetyCulture | Our Target | Phase | Data Model Impact | PDF/Report Impact | Security Impact | Test Requirements |
|-----------|----------|----------|--------------|------------|-------|-------------------|-------------------|-----------------|-------------------|
| Reusable templates | Verified — sector templates, template store | Verified — inspection templates | Verified — checklist templates, content library | Baseline | 3B | Template + Version models | Report template model uses same versioning | Ownership checks on templates | Template CRUD isolation, version immutability |
| Template folders/categories/tags | Verified — sector-based organization | Inferred | Verified — content library categories | Baseline | 3B | Category/tag fields on Template | N/A | None | Search/filter by category |
| Draft and published versions | Inferred — "fully customizable templates" | Inferred | Verified — template versioning | Baseline | 3A | Version model with Draft/Published status | Report template versions | Published versions immutable server-side | Version immutability tests |
| Duplicate template | Inferred | Inferred | Inferred | Baseline | 3B | Deep-copy operation | N/A | Ownership copy to current user | Duplicate preserves all blocks |
| Import/export template | Inferred — Excel import mentioned | Inferred | Verified — template upload, digitize checklist | Advanced | 3Q | JSON serialization format | Import/export includes report templates | Validate imported content | Round-trip export/import |
| Drag-and-drop form builder | Inferred — "custom template builder" mentioned | Not observed | Verified — drag-and-drop checklist builder | Baseline | 3C-3D | Block ordering model (strategy TBD by spike) | Report builder uses same DnD | N/A | DnD across containers, touch, keyboard, undo |
| Template validation | Inferred | Not observed | Verified — template validation checks | Baseline | 3A | Server-side full-template validation on publish | Report template validation | Config validated against registry schemas | Invalid config rejection |
| Conditional logic | Verified — "dynamic templates" mentioned | Verified — conditional fields | Verified — conditional logic | Baseline | 3G | Rules engine, dependency graph | Report visibility rules | Declarative rules only — no executable code | Cycle detection, rule evaluation |
| Reusable block/section presets | Not observed | Not observed | Not observed | Differentiator | 3Q | Preset models | Report block presets | Ownership on presets | Preset CRUD, apply preset |
| Form branding (colors, logo) | Inferred | Inferred | Verified | Baseline | 3K | BrandingProfile model | Direct report branding | N/A | Branding applies to preview |
| Template version history | Inferred | Inferred | Inferred | Baseline | 3B | Version list with timestamps | Report version history | Published versions preserved | History visibility |
| Mobile builder preview | Not observed | Not observed | Inferred | Advanced | 3C+ | N/A | N/A | N/A | Responsive preview toggle |

### B. Execution Capabilities

| Capability | Incontrol | Spectora | SafetyCulture | Our Target | Phase | Data Model Impact | PDF/Report Impact | Security Impact | Test Requirements |
|-----------|----------|----------|--------------|------------|-------|-------------------|-------------------|-----------------|-------------------|
| Mobile filling (native app) | Verified — iOS + Android app | Verified — mobile app | Verified — mobile app | Deferred | 3O+ | N/A | N/A | N/A | N/A |
| Mobile filling (responsive web) | Verified — browser web app | Inferred | Verified — web app | Baseline | 3H | N/A | N/A | N/A | Mobile viewport form usability |
| Offline mode | Verified — "works online and offline" | Verified — "offline reporting with auto syncing" | Verified — offline checklists | Deferred | 3O | Client-generated IDs, IndexedDB | N/A | Conflict detection | Offline fill, sync, conflict resolve |
| Save and resume | Inferred | Inferred | Verified | Baseline | 3H | Autosave persistence | N/A | Ownership check on resume | Save, close, reopen, continue |
| Progress indication | Inferred | Inferred | Inferred | Baseline | 3H | N/A | N/A | N/A | Progress bar accuracy |
| Required questions | Inferred | Inferred | Verified | Baseline | 3G | Required flag on blocks | N/A | Server-side required validation | Submit blocked until required filled |
| Photo capture in-app | Verified — "take photos directly" | Verified — "high quality photos" | Verified | Baseline | 3I | Media models, S3 keys | Photos in reports | Ownership-checked signed URLs | Upload, caption, reorder, delete |
| Photo annotation | Verified — "edit/annotate photos on device" | Not observed | Inferred | Advanced | Deferred | N/A | N/A | N/A | N/A |
| Digital signatures | Verified — "rechtsgeldige digitale handtekening" | Verified — "digital inspection agreements and signatures" | Inferred | Baseline | 3I | Signature model | Signature in reports | Signature integrity | Canvas draw, save, render |
| GPS/location | Not observed | Not observed | Verified — location capture | Advanced | 3H | GPS data field | N/A | User permission | Location accuracy |
| Timestamps | Inferred | Inferred | Verified | Baseline | 3H | Timestamp fields | N/A | N/A | Correct timestamps |
| Findings/deviations | Verified — defect management (FIX) | Verified — repair request builder | Verified — issue reporting | Baseline | 3J | Finding model + workflow | Findings in reports | Ownership chain verification | Finding CRUD, status workflow |
| Status workflow | Verified — status tracking | Inferred | Verified — task status | Baseline | 3J | Status enum + transitions | N/A | Audit trail | Valid state transitions |
| Assignments | Inferred | Inferred | Verified | Advanced | 3J | Assignee field | N/A | Permission check | Assignment CRUD |
| Completed-form locking | Inferred | Inferred | Verified | Baseline | 3H | Locked status | N/A | Lock enforced server-side | Locked instance not editable |
| Reopen workflow | Not observed | Not observed | Inferred | Advanced | 3J+ | Unlock with audit | N/A | Explicit unlock action | Unlock logged |

### C. Report Capabilities

| Capability | Incontrol | Spectora | SafetyCulture | Our Target | Phase | Data Model Impact | PDF/Report Impact | Security Impact | Test Requirements |
|-----------|----------|----------|--------------|------------|-------|-------------------|-------------------|-----------------|-------------------|
| PDF export | Verified — "export to PDF" | Verified — "PDF reports delivered instantly" | Verified | Baseline | 3M | ReportExport model | PDF generation engine | Ownership-checked download | PDF fixtures, download |
| Word export | Verified — "export to Word" | Not observed | Inferred | Advanced | Deferred | N/A | Word renderer | N/A | N/A |
| Excel/data export | Verified — "export to Excel" | Inferred | Verified | Advanced | Deferred | N/A | CSV/Excel renderer | N/A | N/A |
| Branded reports | Verified — "personalized reports with brand identity, colors, logo" | Verified — "clean, professional layouts" | Verified | Baseline | 3K-3L | BrandingProfile model | Branding applied to report | Logo/file access control | Branded report generation |
| Custom report layouts | Verified — "fully customizable reports" | Verified | Inferred | Baseline | 3L | ReportBlockDefinition model | Report designer canvas | N/A | Report block CRUD, preview |
| Auto-email delivery | Verified — "auto-send completed reports" | Verified | Inferred | Advanced | 3Q | N/A | Email with PDF attachment | Email auth | Email delivery test |
| Photo in reports | Verified | Verified | Verified | Baseline | 3K | Photo block binding | Photo grid rendering | Signed image URLs | Photos in report PDF |
| Page numbers | Inferred | Inferred | Inferred | Baseline | 3M | N/A | CSS counters | N/A | Sequential page numbers |
| Table of contents | Not observed | Not observed | Not observed | Differentiator | 3K | TOC report block | Auto-generated TOC | N/A | Correct page references |
| Signatures in reports | Verified | Verified | Verified | Baseline | 3K | Signature block binding | Signature rendering | Signature integrity | Signatures in PDF |
| Report watermarks | Not observed | Inferred | Inferred | Baseline | 3M | Watermark config | CSS overlay | N/A | Draft/final watermark |
| Historical report regeneration | Not observed | Not observed | Not observed | Differentiator | 3K | ExportSnapshot model | Deterministic regeneration | Snapshot integrity | Same inputs → same PDF |
| Custom report branding per client | Not observed | Not observed | Not observed | Differentiator | 3K+ | ExportPreset per client | Per-client branding | N/A | Client-specific reports |

### D. Workflow & Automation

| Capability | Incontrol | Spectora | SafetyCulture | Our Target | Phase |
|-----------|----------|----------|--------------|------------|-------|
| Notifications | Verified — "automatic alerts for deviations" | Inferred | Verified | Advanced | 3J |
| Conditional notifications | Inferred | Not observed | Inferred | Advanced | 3J |
| Task creation from findings | Verified — defect management | Verified — repair request builder | Verified — task management | Baseline | 3J |
| Case/ticket management | Verified — Incontrol.FIX | Inferred | Inferred | Advanced | 3J |
| Deadline tracking | Inferred | Verified — scheduling | Verified | Baseline | 3J |
| Approval workflow | Inferred | Verified — agreements | Verified | Advanced | 3J |
| Audit history | Inferred | Inferred | Verified | Advanced | 3J |
| External webhooks | Inferred | Inferred | Verified | Advanced | 3Q |
| Integration triggers | Verified — Exact Online, SignRequest | Inferred | Verified — thousands of integrations | Advanced | 3Q |

### E. Security & Compliance (Public Claims)

| Claim | Incontrol | Spectora | SafetyCulture |
|-------|----------|----------|--------------|
| ISO 27001 certified | Verified — badge on website | Not observed | Unverified |
| GDPR/AVG compliant | Verified — stated on website | Inferred (US-focused) | Verified — privacy portal |
| NIS2 aligned | Verified — stated on website | Not observed | Not observed |
| Regular penetration testing | Verified — stated on website | Not observed | Not observed |
| Customer count | Verified — "15,000+ businesses" | Unverified — "thousands of 5-star reviews" (927 reviews on aggregator) | Unverified — "used by teams driven to improve" (354 reviews on aggregator) |
| Notable customers | Verified — BAM, Colliers, Erasmus MC, Schindler, Stork, Voestalpine, Actemium (logos on site) | Unverified | Verified — Toyota Material Handling case study |

---

## Differentiated Capabilities (Aspirational)

These capabilities are not publicly observed in the listed competitors. They represent our product's intended differentiators.

| Capability | Justification | Phase |
|-----------|--------------|-------|
| Canonical intermediate ReportDocument | Deterministic regeneration, PDF engine independence, testability, audit snapshot. No competitor describes this architecture publicly. | 3K |
| Programmatic block splitting for oversized content | CSS alone insufficient for content taller than one page. Structured split at sub-block boundaries during document construction. | 3M |
| Comprehensive PDF fixture suite (27+ fixtures) | Verify pagination, anti-clipping, edge cases before claiming PDF correctness. No competitor publishes their test methodology. | 3M |
| Block registry with versioned config schemas | Type-safe extensibility without exploding table count. Each block type carries its own Zod schema and migration strategy. | 3A |
| Safe declarative formula engine (no eval) | User-defined calculations without code injection risk. Custom tokenizer/AST evaluator. | 3G |
| AI template generation (draft for review) | Describe inspection type → AI suggests blocks/sections. Paper form → draft template. All changes as reviewable drafts. | 3P |
| Open SaaS stack (no vendor lock-in) | Wasp/Prisma/React — transparent, self-hostable, maintainable. All competitors are closed-source SaaS. | All phases |
| Generic form platform (not inspection-only) | Any form/report workflow possible. Inspection is one use-case, not the only one. | All phases |

---

## Research Limitations

- Incontrol's detailed feature pages (`/en/features/`, `/en/inspection-software/`) returned 404 — information gathered from homepage, `/en/tour`, and sector solution pages only.
- Competitor review counts from Capterra/GetApp/SoftwareAdvice are snapshot figures and change over time.
- Claims about "AI" features are based on marketing language; actual implementation depth is unknown.
- No competitor's internal block catalogue, database schema, or rendering pipeline has been inspected.
- Spectora and SafetyCulture are US/international platforms; their Dutch-market relevance is unverified.
- Certification claims (ISO 27001, NIS2) are taken from competitor websites and not independently verified against certification body databases.
