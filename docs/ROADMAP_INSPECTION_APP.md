# Roadmap — Inspection App

**Created:** 2026-06-16
**Status:** Planning — phases 0 complete, phases 1-10 defined.

---

## Phase 0 — Foundation verification ✅ COMPLETE (2026-06-16)

**Goal:** Verify local setup, confirm app runs, smoke-test core functionality, create planning docs.

**Deliverables:**
- [x] Local setup verified (WSL/Linux path, Node, Wasp, Docker, DB)
- [x] Dependencies installed (`wasp install`, `npm install`)
- [x] `.env.server` created from example
- [x] Database started (`wasp db start`)
- [x] Migrations applied (init, add_clients, add_projects)
- [x] App starts (`wasp start` — client on :3000, server on :3001)
- [x] Signup, email verification, login tested
- [x] `/projects` page — CRUD tested (create, list, edit, delete)
- [x] `/demo-app` — loads
- [x] `/file-upload` — loads (S3 not configured, graceful)
- [x] `/admin` — correctly blocks non-admin (403)
- [x] `/clients` — server API returns 200, page renders
- [x] Git state clean except intentional template README/doc changes
- [x] Product research completed
- [x] Planning docs created

**Files changed:** `README.md`, `.env.server` (new), docs/*.md (new/updated)

**Self-check:** ✅ `make check` passes, `wasp start` runs, smoke tests pass.

**Commit message:** `docs: foundation pass — setup verification, product research, planning docs`

---

## Phase 1 — Product skeleton cleanup

**Goal:** Rename app branding from Open SaaS/demo to Inspection App. Keep auth, admin, Clients. Decide Project fate.

**Deliverables:**
- [ ] Change app name from "OpenSaaS" / "My Open SaaS App" to inspection app name
- [ ] Update page titles, header branding
- [ ] Remove/hide irrelevant demo navigation links (Blog, Documentation pointing to opensaas.sh)
- [ ] Decide: keep Projects as-is, repurpose as Property, or remove
- [ ] Clean up landing page content (remove Open SaaS placeholder text)
- [ ] Update nav bar constants (`app/src/client/components/NavBar/constants.ts`)
- [ ] No schema changes

**Files likely to change:**
- `app/main.wasp.ts` (app name, title)
- `app/src/client/components/NavBar/constants.ts`
- `app/src/landing-page/LandingPage.tsx`
- `app/src/landing-page/contentSections.tsx`
- `app/src/client/App.tsx`

**Commands:** `wasp start`, browser test all pages

**Self-check:** Landing page shows inspection branding, nav shows only relevant links, all existing pages still work.

**Commit message:** `feat: phase 1 — product skeleton cleanup, rename to inspection app`

---

## Phase 2 — Core domain data (Property + Inspection)

**Goal:** Add Property and Inspection resources with proper ownership chains.

**Deliverables:**
- [ ] Add `Property` model to `schema.prisma` (address, city, postalCode, propertyType, constructionYear, notes, clientId?, userId)
- [ ] Add `Inspection` model (inspectionDate, status enum, notes, propertyId, userId)
- [ ] Generate Property CRUD with `tools/make-resource.mjs`
- [ ] Build Inspection CRUD manually (complex ownership chain)
- [ ] Wire Client → Property relationship (optional)
- [ ] Property → Inspection relationship (required)
- [ ] List/detail pages for both
- [ ] Ownership checks: Property.userId, Inspection → Property.userId
- [ ] Run migration: `wasp db migrate-dev --name add_property_inspection`
- [ ] Browser CRUD tests for both

**Files likely to change:**
- `app/schema.prisma` (new models)
- `app/src/property/` (new directory)
- `app/src/inspection/` (new directory)
- `app/main.wasp.ts` (import new specs)
- Nav constants (add nav links)

**Commands:**
```bash
node tools/make-resource.mjs properties
wasp db migrate-dev --name add_property_inspection
```

**Self-check:** Can create Property → create Inspection for that Property → list both → edit → delete with ownership enforcement.

**Commit message:** `feat: phase 2 — add Property and Inspection resources with ownership chain`

---

## Phase 3 — Inspection findings

**Goal:** Add Finding resource with categories, severity, status, location, and recommendations.

**Deliverables:**
- [ ] Add `Finding` model (title, description, category, severity, status, location, recommendation, costEstimate?, sectionId, inspectionId)
- [ ] Add `InspectionSection` model (title, sortOrder, notes, inspectionId)
- [ ] Category enum (structural, electrical, plumbing, fire_safety, hvac, exterior, interior, other)
- [ ] Severity enum (low, medium, high, critical)
- [ ] Status enum (open, in_progress, resolved)
- [ ] Finding CRUD operations with ownership chain verification
- [ ] Fast-entry UI: add findings inline within inspection detail
- [ ] Finding list with filter by category/severity/status
- [ ] Run migration
- [ ] Browser tests

**Files likely to change:**
- `app/schema.prisma` (Finding, InspectionSection models, enums)
- `app/src/inspection/` (updated with sections + findings UI)
- `app/src/finding/` (new directory)

**Self-check:** Can create an inspection with sections, add findings to sections, filter by severity/category, verify ownership.

**Commit message:** `feat: phase 3 — add Finding and InspectionSection with categories, severity, status`

---

## Phase 4 — Photos for findings

**Goal:** Attach photos to findings using existing S3 file upload pattern with ownership-checked downloads.

**Deliverables:**
- [ ] Add `FindingPhoto` model (s3Key, fileName, contentType, caption, sortOrder, findingId, fileId?)
- [ ] Photo upload UI within finding detail/edit
- [ ] Thumbnail preview in finding list
- [ ] Full-size preview in finding detail
- [ ] Ownership-checked signed download URLs
- [ ] Reuse `app/src/file-upload/` patterns for upload
- [ ] Run migration
- [ ] Browser tests

**Files likely to change:**
- `app/schema.prisma` (FindingPhoto model)
- `app/src/file-upload/` (may reuse/extend)
- `app/src/finding/` (updated with photo UI)

**Self-check:** Can add photo to finding → photo appears in list → download requires auth → another user cannot access.

**Commit message:** `feat: phase 4 — add photo attachments to findings with secure downloads`

---

## Phase 5 — Report preview

**Goal:** Build report structure with sections, finding selection, and browser preview.

**Deliverables:**
- [ ] Add `ReportTemplate` model (name, logoUrl, primaryColor, companyName, headerFooterConfig JSON)
- [ ] Report builder UI: select inspection → select sections → select findings → preview
- [ ] Report preview page with structured layout
- [ ] Branding: company name, logo placeholder, color customization
- [ ] No PDF yet — browser preview only
- [ ] Run migration

**Files likely to change:**
- `app/schema.prisma` (ReportTemplate model)
- `app/src/report/` (new directory)

**Self-check:** Can create report template → select inspection → preview structured report in browser with findings and photos.

**Commit message:** `feat: phase 5 — report preview with template, sections, and finding selection`

---

## Phase 6 — PDF export

**Goal:** Generate professional PDF reports from the preview structure.

**Deliverables:**
- [ ] Research and select Wasp-compatible PDF library (Puppeteer, jsPDF, or PDFKit)
- [ ] Add `ReportExport` model (exportType, status, s3Key, generatedAt, inspectionId, userId)
- [ ] Server-side PDF generation action
- [ ] Download button in report preview
- [ ] PDF includes: header with branding, client/property info, findings with photos, footer
- [ ] Store generated PDF in S3 with signed download
- [ ] Run migration
- [ ] Browser/download test

**Files likely to change:**
- `app/schema.prisma` (ReportExport model)
- `app/src/report/` (PDF generation logic)
- `app/package.json` (new PDF dependency)

**Self-check:** Click export → PDF downloads → PDF contains all findings, photos, branding → file stored and re-downloadable.

**Commit message:** `feat: phase 6 — PDF report export with branding and photo inclusion`

---

## Phase 7 — Templates & checklists

**Goal:** Reusable inspection templates with section templates and finding presets.

**Deliverables:**
- [ ] Add `InspectionTemplate` model (name, description, sector, userId)
- [ ] Add `TemplateSection` model (title, sortOrder, templateId)
- [ ] Add `TemplateFindingPreset` model (title template, category, defaultSeverity, sectionId)
- [ ] "Create inspection from template" flow
- [ ] Template CRUD UI
- [ ] Dutch building inspection default templates (bouwkundige keuring, opleverinspectie, etc.)
- [ ] Run migration
- [ ] Browser tests

**Files likely to change:**
- `app/schema.prisma` (Template models)
- `app/src/template/` (new directory)
- `app/src/inspection/` (updated with template selection)

**Self-check:** Create template with sections → create inspection from template → sections pre-populated → add findings.

**Commit message:** `feat: phase 7 — reusable inspection templates with Dutch building inspection defaults`

---

## Phase 8 — AI-assisted text

**Goal:** DeepSeek-powered AI for finding descriptions, recommendations, and report narrative.

**Deliverables:**
- [ ] DeepSeek API wrapper (reuse/extend existing AI pattern)
- [ ] "AI Improve" button on finding description field
- [ ] "AI Recommend" button for generating recommendations from rough notes
- [ ] "AI Intro/Conclusion" for report sections
- [ ] Add `AiUsageLog` model for audit trail
- [ ] Privacy: store only previews, not full data
- [ ] User consent flow before first AI use
- [ ] Error handling for API failures
- [ ] No automatic legal claims
- [ ] Run migration
- [ ] Browser tests

**Files likely to change:**
- `app/schema.prisma` (AiUsageLog model)
- `app/src/ai/` (new directory, DeepSeek wrapper)
- `app/src/finding/` (AI buttons)
- `app/src/report/` (AI narrative)

**Self-check:** Type rough finding note → click "AI Improve" → text is rewritten professionally → usage logged.

**Commit message:** `feat: phase 8 — DeepSeek AI-assisted text for findings, recommendations, and reports`

---

## Phase 9 — Signatures & follow-up tasks

**Goal:** Digital signature capture and defect follow-up task management.

**Deliverables:**
- [ ] Add `Signature` model (signerName, signerRole, signatureData, signedAt, inspectionId)
- [ ] Add `FollowUpTask` model (title, description, assignedTo, dueDate, status, findingId)
- [ ] Signature pad/canvas component for browser
- [ ] Signature placement in report
- [ ] Task list per finding/inspection
- [ ] Task status workflow
- [ ] Run migration
- [ ] Browser tests

**Files likely to change:**
- `app/schema.prisma` (Signature, FollowUpTask models)
- `app/src/signature/` (new directory)
- `app/src/task/` (new directory)
- `app/src/report/` (signature placement)

**Self-check:** Draw signature → attached to inspection → appears in report → create follow-up task for finding → mark complete.

**Commit message:** `feat: phase 9 — digital signatures and defect follow-up task management`

---

## Phase 10 — Production readiness

**Goal:** Env validation cleanup, real email, provider guards, Railway dry-run, security review.

**Deliverables:**
- [ ] Fix `app/src/env.ts` — make unused provider schemas optional
- [ ] Update `.env.server.example` with clear required/optional labels
- [ ] Switch email from Dummy to Mailgun or SMTP
- [ ] Guard provider-touching routes (analytics, AI, file upload, payments)
- [ ] Remove or disable unused Lemon Squeezy and Polar code paths
- [ ] Railway deployment dry-run
- [ ] Security permissions review (use skill)
- [ ] Dependency audit
- [ ] Update all docs

**Files likely to change:**
- `app/src/env.ts`
- `app/src/server/emailSender.wasp.ts`
- Various provider files
- `docs/SECURITY_CHECKLIST.md`

**Self-check:** `wasp start` without unused env vars, email sends, Railway deploy succeeds, security review passes.

**Commit message:** `feat: phase 10 — production readiness, env cleanup, real email, Railway deploy`

---

## Phase summary

| Phase | Name | Entities Added | Effort | Status |
|-------|------|----------------|--------|--------|
| 0 | Foundation | — | Done | ✅ Complete |
| 1 | Skeleton cleanup | — | Small | 🔜 Next |
| 2 | Property + Inspection | Property, Inspection | Medium | ⏳ Planned |
| 3 | Findings | InspectionSection, Finding | Medium | ⏳ Planned |
| 4 | Photos | FindingPhoto | Small | ⏳ Planned |
| 5 | Report preview | ReportTemplate | Medium | ⏳ Planned |
| 6 | PDF export | ReportExport | Medium | ⏳ Planned |
| 7 | Templates | InspectionTemplate, TemplateSection | Medium | ⏳ Planned |
| 8 | AI text | AiUsageLog | Medium | ⏳ Planned |
| 9 | Signatures + Tasks | Signature, FollowUpTask | Medium | ⏳ Planned |
| 10 | Production readiness | — | Medium | ⏳ Planned |
