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

## Evidence Register

| ID | Organization/product | URL or official path | Page title | Access date | Concise paraphrased evidence | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| IC-01 | Incontrol | `https://incontrol.app/en/` | Incontrol homepage | 2026-06-17 | Public product marketing describes inspection/reporting, templates, photos, exports, deviations, security/compliance badges, and customer logos. | Primary |
| IC-02 | Incontrol | `https://incontrol.app/en/tour` | Incontrol product tour | 2026-06-17 | Product tour describes configurable templates, mobile/web usage, reports, signatures, offline operation, workflows, integrations, and alerts. | Primary |
| SP-01 | Spectora | `https://www.spectora.com/features/` | Spectora features | 2026-06-17 | Public feature page describes inspection templates, mobile app, reporting, photos, agreements/signatures, repair requests, scheduling, and related workflows. | Primary |
| SC-01 | SafetyCulture | `https://safetyculture.com/platform/` | SafetyCulture platform | 2026-06-17 | Platform page describes checklist templates, drag-and-drop creation, mobile/web inspection, offline checklists, actions, media, exports, integrations, and security/privacy posture. | Primary |
| RR-01 | Capterra/GetApp/SoftwareAdvice | Various listing pages | Review aggregator listings | 2026-06-16 | Aggregator review counts and secondary product claims; useful only as secondary corroboration. | Secondary |
| DK-01 | dnd-kit | `https://dndkit.com` | dnd-kit documentation | 2026-06-17 | Technical documentation for drag-and-drop primitives; production decision is additionally based on the local Phase 3A0-A v5 Stage A spike. | Technical |
| PW-01 | Playwright | `https://playwright.dev` | Playwright documentation | 2026-06-17 | Technical documentation for browser automation and PDF generation APIs; production suitability pending Phase 3A0-B. | Technical |

---

## Capability Matrix

### A. Builder & Template Capabilities

| Capability                       | Incontrol                                      | Spectora                        | SafetyCulture                                   | Our Target     | Phase | Data Model Impact                               | PDF/Report Impact                          | Security Impact                             | Test Requirements                             |
| -------------------------------- | ---------------------------------------------- | ------------------------------- | ----------------------------------------------- | -------------- | ----- | ----------------------------------------------- | ------------------------------------------ | ------------------------------------------- | --------------------------------------------- |
| Reusable templates               | Verified [IC-02] — sector templates, template store    | Verified [SP-01] — inspection templates | Verified [SC-01] — checklist templates, content library | Baseline       | 3B    | Template + Version models                       | Report template model uses same versioning | Ownership checks on templates               | Template CRUD isolation, version immutability |
| Template folders/categories/tags | Verified [IC-01] — sector-based organization  | Inferred                        | Verified [SC-01] — content library categories           | Baseline       | 3B    | Category/tag fields on Template                 | N/A                                        | None                                        | Search/filter by category                     |
| Draft and published versions     | Inferred — "fully customizable templates"      | Inferred                        | Verified [SC-01] — template versioning                  | Baseline       | 3A    | Version model with template ACTIVE/ARCHIVED lifecycle and version DRAFT/PUBLISHED/SUPERSEDED status       | Report template versions                   | Published versions immutable server-side    | Version immutability tests                    |
| Duplicate template               | Inferred                                       | Inferred                        | Inferred                                        | Baseline       | 3B    | Deep-copy operation                             | N/A                                        | Ownership copy to current user              | Duplicate preserves all blocks                |
| Import/export template           | Inferred — Excel import mentioned              | Inferred                        | Verified [SC-01] — template upload, digitize checklist  | Advanced       | 3Q    | JSON serialization format                       | Import/export includes report templates    | Validate imported content                   | Round-trip export/import                      |
| Drag-and-drop form builder       | Inferred — "custom template builder" mentioned | Not observed                    | Verified [SC-01] — drag-and-drop checklist builder      | Baseline       | 3C-3D | Block ordering model (Int ordering with transactional source/destination renumbering; v5 sortable foundation approved, Stage B pending)    | Report builder uses same DnD               | N/A                                         | DnD across containers, touch, keyboard, undo  |
| Template validation              | Inferred                                       | Not observed                    | Verified [SC-01] — template validation checks           | Baseline       | 3A    | Server-side full-template validation on publish | Report template validation                 | Config validated against registry schemas   | Invalid config rejection                      |
| Conditional logic                | Verified [IC-02] — "dynamic templates" mentioned       | Verified [SP-01] — conditional fields   | Verified [SC-01] — conditional logic                    | Baseline       | 3G    | Rules engine, dependency graph                  | Report visibility rules                    | Declarative rules only — no executable code | Cycle detection, rule evaluation              |
| Reusable block/section presets   | Not observed                                   | Not observed                    | Not observed                                    | Differentiator | 3Q    | Preset models                                   | Report block presets                       | Ownership on presets                        | Preset CRUD, apply preset                     |
| Form branding (colors, logo)     | Inferred                                       | Inferred                        | Verified [SC-01]                                | Baseline       | 3K    | BrandingProfile model                           | Direct report branding                     | N/A                                         | Branding applies to preview                   |
| Template version history         | Inferred                                       | Inferred                        | Inferred                                        | Baseline       | 3B    | Version list with timestamps                    | Report version history                     | Published versions preserved                | History visibility                            |
| Mobile builder preview           | Not observed                                   | Not observed                    | Inferred                                        | Advanced       | 3C+   | N/A                                             | N/A                                        | N/A                                         | Responsive preview toggle                     |

### B. Execution Capabilities

| Capability                      | Incontrol                                        | Spectora                                                  | SafetyCulture                 | Our Target | Phase    | Data Model Impact               | PDF/Report Impact    | Security Impact                 | Test Requirements                    |
| ------------------------------- | ------------------------------------------------ | --------------------------------------------------------- | ----------------------------- | ---------- | -------- | ------------------------------- | -------------------- | ------------------------------- | ------------------------------------ |
| Mobile filling (native app)     | Verified [IC-01] — iOS + Android app                     | Verified [SP-01] — mobile app                                     | Verified [SC-01] — mobile app         | Deferred   | 3O+      | N/A                             | N/A                  | N/A                             | N/A                                  |
| Mobile filling (responsive web) | Verified [IC-01] — browser web app                       | Inferred                                                  | Verified [SC-01] — web app            | Baseline   | 3H       | N/A                             | N/A                  | N/A                             | Mobile viewport form usability       |
| Offline mode                    | Verified [IC-02] — "works online and offline"            | Verified [SP-01] — "offline reporting with auto syncing"          | Verified [SC-01] — offline checklists | Deferred   | 3O       | Client-generated IDs, IndexedDB | N/A                  | Conflict detection              | Offline fill, sync, conflict resolve |
| Save and resume                 | Inferred                                         | Inferred                                                  | Verified [SC-01]              | Baseline   | 3H       | Autosave persistence            | N/A                  | Ownership check on resume       | Save, close, reopen, continue        |
| Progress indication             | Inferred                                         | Inferred                                                  | Inferred                      | Baseline   | 3H       | N/A                             | N/A                  | N/A                             | Progress bar accuracy                |
| Required questions              | Inferred                                         | Inferred                                                  | Verified [SC-01]              | Baseline   | 3G       | Required flag on blocks         | N/A                  | Server-side required validation | Submit blocked until required filled |
| Photo capture in-app            | Verified [IC-02] — "take photos directly"                | Verified [SP-01] — "high quality photos"                          | Verified [SC-01]              | Baseline   | 3I       | Media models, S3 keys           | Photos in reports    | Ownership-checked signed URLs   | Upload, caption, reorder, delete     |
| Photo annotation                | Verified [IC-02] — "edit/annotate photos on device"      | Not observed                                              | Inferred                      | Advanced   | Deferred | N/A                             | N/A                  | N/A                             | N/A                                  |
| Digital signatures              | Verified [IC-02] — "rechtsgeldige digitale handtekening" | Verified [SP-01] — "digital inspection agreements and signatures" | Inferred                      | Baseline   | 3I       | Signature model                 | Signature in reports | Signature integrity             | Canvas draw, save, render            |
| GPS/location                    | Not observed                                     | Not observed                                              | Verified [SC-01] — location capture   | Advanced   | 3H       | GPS data field                  | N/A                  | User permission                 | Location accuracy                    |
| Timestamps                      | Inferred                                         | Inferred                                                  | Verified [SC-01]              | Baseline   | 3H       | Timestamp fields                | N/A                  | N/A                             | Correct timestamps                   |
| Findings/deviations             | Verified [IC-02] — defect management (FIX)               | Verified [SP-01] — repair request builder                         | Verified [SC-01] — issue reporting    | Baseline   | 3J       | Finding model + workflow        | Findings in reports  | Ownership chain verification    | Finding CRUD, status workflow        |
| Status workflow                 | Verified [IC-02] — status tracking                       | Inferred                                                  | Verified [SC-01] — task status        | Baseline   | 3J       | Status enum + transitions       | N/A                  | Audit trail                     | Valid state transitions              |
| Assignments                     | Inferred                                         | Inferred                                                  | Verified [SC-01]              | Advanced   | 3J       | Assignee field                  | N/A                  | Permission check                | Assignment CRUD                      |
| Completed-form locking          | Inferred                                         | Inferred                                                  | Verified [SC-01]              | Baseline   | 3H       | Locked status                   | N/A                  | Lock enforced server-side       | Locked instance not editable         |
| Reopen workflow                 | Not observed                                     | Not observed                                              | Inferred                      | Advanced   | 3J+      | Unlock with audit               | N/A                  | Explicit unlock action          | Unlock logged                        |

### C. Report Capabilities

| Capability                        | Incontrol                                                           | Spectora                                     | SafetyCulture | Our Target     | Phase    | Data Model Impact           | PDF/Report Impact          | Security Impact            | Test Requirements          |
| --------------------------------- | ------------------------------------------------------------------- | -------------------------------------------- | ------------- | -------------- | -------- | --------------------------- | -------------------------- | -------------------------- | -------------------------- |
| PDF export                        | Verified [IC-02] — "export to PDF"                                          | Verified [SP-01] — "PDF reports delivered instantly" | Verified [SC-01] | Baseline       | 3M       | ReportExport model          | PDF generation engine      | Ownership-checked download | PDF fixtures, download     |
| Word export                       | Verified [IC-02] — "export to Word"                                         | Not observed                                 | Inferred      | Advanced       | Deferred | N/A                         | Word renderer              | N/A                        | N/A                        |
| Excel/data export                 | Verified [IC-02] — "export to Excel"                                        | Inferred                                     | Verified [SC-01] | Advanced       | Deferred | N/A                         | CSV/Excel renderer         | N/A                        | N/A                        |
| Branded reports                   | Verified [IC-02] — "personalized reports with brand identity, colors, logo" | Verified [SP-01] — "clean, professional layouts"     | Verified [SC-01] | Baseline       | 3K-3L    | BrandingProfile model       | Branding applied to report | Logo/file access control   | Branded report generation  |
| Custom report layouts             | Verified [IC-02] — "fully customizable reports"                             | Verified [SP-01]                          | Inferred      | Baseline       | 3L       | ReportBlockDefinition model | Report designer canvas     | N/A                        | Report block CRUD, preview |
| Auto-email delivery               | Verified [IC-02] — "auto-send completed reports"                            | Verified [SP-01]                          | Inferred      | Advanced       | 3Q       | N/A                         | Email with PDF attachment  | Email auth                 | Email delivery test        |
| Photo in reports                  | Verified [IC-02]                                                   | Verified [SP-01]                          | Verified [SC-01] | Baseline       | 3K       | Photo block binding         | Photo grid rendering       | Signed image URLs          | Photos in report PDF       |
| Page numbers                      | Inferred                                                            | Inferred                                     | Inferred      | Baseline       | 3M       | N/A                         | CSS counters               | N/A                        | Sequential page numbers    |
| Table of contents                 | Not observed                                                        | Not observed                                 | Not observed  | Differentiator | 3K       | TOC report block            | Auto-generated TOC         | N/A                        | Correct page references    |
| Signatures in reports             | Verified [IC-02]                                                   | Verified [SP-01]                          | Verified [SC-01] | Baseline       | 3K       | Signature block binding     | Signature rendering        | Signature integrity        | Signatures in PDF          |
| Report watermarks                 | Not observed                                                        | Inferred                                     | Inferred      | Baseline       | 3M       | Watermark config            | CSS overlay                | N/A                        | Draft/final watermark      |
| Historical report regeneration    | Not observed                                                        | Not observed                                 | Not observed  | Differentiator | 3K       | ExportSnapshot model        | Deterministic regeneration | Snapshot integrity         | Layout/content deterministic for pinned inputs; byte-for-byte PDF identity pending 3A0-B     |
| Custom report branding per client | Not observed                                                        | Not observed                                 | Not observed  | Differentiator | 3K+      | ExportPreset per client     | Per-client branding        | N/A                        | Client-specific reports    |

### D. Workflow & Automation

| Capability                  | Incontrol                                    | Spectora                          | SafetyCulture                        | Our Target | Phase |
| --------------------------- | -------------------------------------------- | --------------------------------- | ------------------------------------ | ---------- | ----- |
| Notifications               | Verified [IC-02] — "automatic alerts for deviations" | Inferred                          | Verified [SC-01]                    | Advanced   | 3J    |
| Conditional notifications   | Inferred                                     | Not observed                      | Inferred                             | Advanced   | 3J    |
| Task creation from findings | Verified [IC-02] — defect management                 | Verified [SP-01] — repair request builder | Verified [SC-01] — task management           | Baseline   | 3J    |
| Case/ticket management      | Verified [IC-02] — Incontrol.FIX            | Inferred                          | Inferred                             | Advanced   | 3J    |
| Deadline tracking           | Inferred                                     | Verified [SP-01] — scheduling             | Verified [SC-01]                    | Baseline   | 3J    |
| Approval workflow           | Inferred                                     | Verified [SP-01] — agreements             | Verified [SC-01]                    | Advanced   | 3J    |
| Audit history               | Inferred                                     | Inferred                          | Verified [SC-01]                    | Advanced   | 3J    |
| External webhooks           | Inferred                                     | Inferred                          | Verified [SC-01]                    | Advanced   | 3Q    |
| Integration triggers        | Verified [IC-02] — Exact Online, SignRequest         | Inferred                          | Verified [SC-01] — thousands of integrations | Advanced   | 3Q    |

### E. Security & Compliance (Public Claims)

| Claim                       | Incontrol                                                                                     | Spectora                                                               | SafetyCulture                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| ISO 27001 certified         | Verified [IC-01] — badge on website                                                                   | Not observed                                                           | Unverified                                                                 |
| GDPR/AVG compliant          | Verified [IC-01] — stated on website                                                                  | Inferred (US-focused)                                                  | Verified [SC-01] — privacy portal                                                  |
| NIS2 aligned                | Verified [IC-01] — stated on website                                                                  | Not observed                                                           | Not observed                                                               |
| Regular penetration testing | Verified [IC-01] — stated on website                                                                  | Not observed                                                           | Not observed                                                               |
| Customer count              | Verified [IC-01] — "15,000+ businesses"                                                               | Unverified — "thousands of 5-star reviews" (927 reviews on aggregator) | Unverified — "used by teams driven to improve" (354 reviews on aggregator) |
| Notable customers           | Verified [IC-01] — BAM, Colliers, Erasmus MC, Schindler, Stork, Voestalpine, Actemium (logos on site) | Unverified                                                             | Verified [SC-01] — Toyota Material Handling case study                             |

---

## Differentiated Capabilities (Aspirational)

These capabilities are not publicly observed in the listed competitors. They represent our product's intended differentiators.

| Capability                                         | Justification                                                                                                                         | Phase      |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Canonical intermediate ReportDocument              | Deterministic regeneration, PDF engine independence, testability, audit snapshot. No competitor describes this architecture publicly. | 3K         |
| Programmatic block splitting for oversized content | CSS alone insufficient for content taller than one page. Structured split at sub-block boundaries during document construction.       | 3M         |
| Comprehensive PDF fixture suite (27+ fixtures)     | Verify pagination, anti-clipping, edge cases before claiming PDF correctness. No competitor publishes their test methodology.         | 3M         |
| Block registry with versioned config schemas       | Type-safe extensibility without exploding table count. Each block type carries its own Zod schema and migration strategy.             | 3A         |
| Safe declarative formula engine (no eval)          | User-defined calculations without code injection risk. Custom tokenizer/AST evaluator.                                                | 3G         |
| AI template generation (draft for review)          | Describe inspection type → AI suggests blocks/sections. Paper form → draft template. All changes as reviewable drafts.                | 3P         |
| Open SaaS stack (no vendor lock-in)                | Wasp/Prisma/React — transparent, self-hostable, maintainable. No public open-source distribution was observed for the reviewed products as of the recorded access date.                                 | All phases |
| Generic form platform (not inspection-only)        | Any form/report workflow possible. Inspection is one use-case, not the only one.                                                      | All phases |

---

## Research Limitations

- Incontrol's detailed feature pages (`/en/features/`, `/en/inspection-software/`) returned 404 — information gathered from homepage, `/en/tour`, and sector solution pages only.
- Competitor review counts from Capterra/GetApp/SoftwareAdvice are snapshot figures and change over time.
- Claims about "AI" features are based on marketing language; actual implementation depth is unknown.
- No competitor's internal block catalogue, database schema, or rendering pipeline has been inspected.
- Spectora and SafetyCulture are US/international platforms; their Dutch-market relevance is unverified.
- Certification claims (ISO 27001, NIS2) are taken from competitor websites and not independently verified against certification body databases.
