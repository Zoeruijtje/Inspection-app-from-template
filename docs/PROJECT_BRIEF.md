# Project Brief — Dutch Building Inspection SaaS

**Created:** 2026-06-16
**Status:** Foundation phase — planning only, no implementation.

---

## 1. Product identity

**App name (working):** Inspection App (final name TBD)

**One-liner:** A Dutch-first building inspection/report-builder SaaS for small inspection businesses and freelancers.

**Core value proposition:** "Van klant tot rapport — één flow." (From client to report — one flow.)

---

## 2. Target users

| User type                              | Description                                                                                                            |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Primary: Freelance building inspectors | Self-employed inspectors who need to capture clients, properties, inspections, findings, photos, and generate reports. |
| Primary: Small inspection firms        | 1-10 employees, multiple inspectors, shared client base.                                                               |
| Secondary: Construction professionals  | Project managers, contractors who do inspections as part of their work.                                                |
| Secondary: Property managers           | Building owners/managers tracking inspections over time.                                                               |
| Future: Large inspection companies     | Multi-inspector teams, organizational hierarchies, advanced permissions.                                               |

---

## 3. Primary workflows

### Core flow (MVP v1):

```
Create Client → Create Property → Create Inspection → Add Findings (with photos) → Generate Report
```

### Detailed steps:

1. **Client management:** Add/edit client contact info, company details, notes.
2. **Property management:** Add property address, type, characteristics linked to a client.
3. **Inspection creation:** Create inspection for a property, select template/checklist, schedule date.
4. **Finding capture:** During inspection, add findings with category, severity, location, description, photos, recommendations.
5. **Report generation:** Select findings, organize into report sections, preview, export as PDF.

### Secondary flows (v2+):

- Reusable inspection templates per sector
- AI-assisted finding descriptions and recommendations
- Digital signature capture
- Defect follow-up tasks
- Client-facing report sharing

---

## 4. MVP scope (Phase 1-5)

### In scope for MVP:

- ✅ User authentication (email/password) — already working
- ✅ Client CRUD — already implemented
- ✅ Project → repurpose or complement as Property
- ✅ Property CRUD (new)
- ✅ Inspection CRUD with sections (new)
- ✅ Finding CRUD with categories, severity, status, location, description, recommendations (new)
- ✅ Photo attachment to findings (new, using existing S3 file pattern)
- ✅ Report preview in browser (new)
- ✅ Basic PDF export (new)

### Out of scope for MVP:

- ❌ Native mobile apps (iOS/Android)
- ❌ Offline mode
- ❌ Client portal
- ❌ Floorplan/pin annotation
- ❌ Template marketplace
- ❌ Accounting integrations
- ❌ Bluetooth device integration
- ❌ Multi-organization/workspace
- ❌ Advanced scheduling/calendars

---

## 5. Non-goals (explicit)

- We are NOT building a generic checklist app — this is purpose-built for building/property inspections.
- We are NOT building a marketplace or two-sided platform.
- We are NOT competing on price with paper-based processes — we compete on workflow efficiency and report quality.
- We are NOT targeting enterprise procurement processes in v1.
- We are NOT copying Incontrol's UI, feature names, or branding.

---

## 6. Long-term vision

After MVP, expand toward:

1. **Sector templates:** Pre-built Dutch building inspection templates (electrical, mechanical, fire safety, structural, energy performance).
2. **AI-powered assistance:** DeepSeek-powered text correction, recommendation generation, report introduction/conclusion writing.
3. **Digital signatures:** Legally valid signature capture in-browser.
4. **Defect lifecycle:** Open → In Progress → Resolved workflow with task assignment.
5. **Branded reports:** Custom logo, colors, company profile per inspector/company.
6. **Client sharing:** Secure link-based report sharing with clients.
7. **Multi-inspector teams:** Organization concept with roles (owner, inspector, viewer).
8. **Template builder:** Drag-and-drop or form-based template creation.

---

## 7. Business assumptions

- **Market:** Dutch building inspection market is underserved by modern SaaS. Many inspectors still use Word/Excel or paper.
- **Pricing:** Freemium or low-cost entry tier for single inspectors; paid tiers for teams and advanced features.
- **Distribution:** Direct sales, Dutch trade organizations, inspection certification bodies.
- **Competition:** Incontrol is the dominant Dutch player but targets mid-to-large firms. Our niche is small/freelance inspectors.
- **Language:** Dutch-first UI, English code/internal naming.

---

## 8. Technical constraints

- **Stack:** Wasp 0.24.0 (Wasp Spec), React 19, Node.js, Prisma 5.19, PostgreSQL, Tailwind CSS 4.
- **Hosting:** Railway first (per AGENTS.md).
- **Email:** Mailgun or SMTP for production (Dummy for local dev).
- **Payments:** Stripe (already configured in template).
- **File storage:** S3-compatible (already configured in template).
- **AI:** Direct DeepSeek first, OpenRouter optional fallback.
- **PDF generation:** Research needed — must work in Wasp/Node.js server context.
- **No new third-party packages without explicit approval.**

---

## 9. Privacy & security assumptions

- All user-owned data must have server-side ownership checks.
- File download URLs must be signed with ownership verification.
- GDPR/AVG compliance required for Dutch market:
  - Data minimization
  - Right to access/deletion
  - Processing agreement considerations for inspection data (may contain personal data of property owners)
- No AI processing of inspection data without user consent.
- No automatic legal claims or certifications generated by AI.
- ISO 27001 certification is a future consideration, not MVP.

---

## 10. What makes this app different

| Aspect     | Generic checklist tools | Our inspection app                                                              |
| ---------- | ----------------------- | ------------------------------------------------------------------------------- |
| Purpose    | Any checklist           | Building/property inspections specifically                                      |
| Data model | Flat list of items      | Client → Property → Inspection → Finding → Report hierarchy                     |
| Photos     | General gallery         | Photos linked to specific findings with annotations                             |
| Reports    | Basic export            | Structured, branded, professional PDF reports                                   |
| AI         | Not present or generic  | Purpose-built for inspection text (findings, recommendations, report narrative) |
| Ownership  | Often team-first        | Inspector-owned data, clear permission boundaries                               |
| Stack      | Black-box SaaS          | Open SaaS / Wasp — transparent, maintainable, extensible                        |
