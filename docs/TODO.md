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

## Phase 1 — Product skeleton cleanup 🔜 NEXT

- [ ] Rename app from "OpenSaaS" / "My Open SaaS App" to "Inspection App"
- [ ] Remove/hide irrelevant demo nav links (Documentation, Blog pointing to opensaas.sh)
- [ ] Remove AI Scheduler from authenticated nav
- [ ] Update landing page content (remove Open SaaS placeholder text)
- [ ] Update nav bar constants
- [ ] Keep: auth, admin, clients, projects, file-upload, payment, demo-app pages functional
- [ ] Browser test all pages after cleanup
- [ ] Commit

## Phase 2 — Core domain data (Property + Inspection)

- [ ] Add Property model to schema.prisma
- [ ] Add Inspection model to schema.prisma
- [ ] Generate Property CRUD with make-resource.mjs
- [ ] Build Inspection CRUD manually
- [ ] Wire Client → Property relationship
- [ ] Wire Property → Inspection relationship
- [ ] Add ownership checks for nested resources
- [ ] Run migration
- [ ] Browser CRUD tests
- [ ] Update docs and next prompt

## Phase 3 — Inspection findings

- [ ] Add InspectionSection model
- [ ] Add Finding model
- [ ] Add category, severity, status enums
- [ ] Build Finding CRUD with ownership chain verification
- [ ] Fast-entry UI for findings within inspection detail
- [ ] Filter by category/severity/status
- [ ] Run migration
- [ ] Browser tests

## Phase 4 — Photos for findings

- [ ] Add FindingPhoto model
- [ ] Photo upload UI in finding detail
- [ ] Thumbnail preview
- [ ] Ownership-checked signed download URLs
- [ ] Reuse existing S3 file upload pattern
- [ ] Run migration
- [ ] Browser tests

## Phase 5 — Report preview

- [ ] Add ReportTemplate model
- [ ] Report builder UI
- [ ] Report preview page
- [ ] Branding support (logo, colors)
- [ ] No PDF yet
- [ ] Run migration

## Phase 6 — PDF export

- [ ] Research Wasp-compatible PDF library
- [ ] Add ReportExport model
- [ ] Server-side PDF generation
- [ ] PDF download with branding, photos, findings
- [ ] Run migration
- [ ] Browser/download test

## Phase 7 — Templates & checklists

- [ ] Add InspectionTemplate and TemplateSection models
- [ ] Template CRUD UI
- [ ] "Create inspection from template" flow
- [ ] Dutch building inspection defaults
- [ ] Run migration

## Phase 8 — AI-assisted text

- [ ] DeepSeek API wrapper
- [ ] "AI Improve" / "AI Recommend" buttons
- [ ] AI report intro/conclusion
- [ ] AiUsageLog model for audit trail
- [ ] Privacy safeguards
- [ ] Run migration

## Phase 9 — Signatures & follow-up tasks

- [ ] Add Signature model
- [ ] Add FollowUpTask model
- [ ] Signature pad component
- [ ] Task list and status workflow
- [ ] Run migration

## Phase 10 — Production readiness

- [ ] Fix env.ts — make unused provider schemas optional
- [ ] Switch email from Dummy to Mailgun/SMTP
- [ ] Guard provider-touching routes
- [ ] Remove/disable unused Lemon Squeezy and Polar paths
- [ ] Railway deployment dry-run
- [ ] Security permissions review
- [ ] Dependency audit
