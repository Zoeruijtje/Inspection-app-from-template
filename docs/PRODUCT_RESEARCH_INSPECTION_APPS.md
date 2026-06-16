# Product Research — Inspection & Report-Builder Platforms

**Created:** 2026-06-16
**Scope:** Public source research only. No proprietary data, no copying of wording, UI, or branding.

---

## 1. Sources checked

| Source                                         | Type                       | What was found                                                           |
| ---------------------------------------------- | -------------------------- | ------------------------------------------------------------------------ |
| incontrol.app                                  | Primary competitor (Dutch) | Full product tour, feature pages, sector solutions, pricing              |
| capterra.com / getapp.com / softwareadvice.com | Review aggregators         | 300+ inspection software listings, feature comparison data, buyer guides |
| Spectora (spectora.com)                        | US home inspection SaaS    | 927 reviews, 4.9★, modern report writing, business automation            |
| Inspection Support Network (ISN)               | US home inspection SaaS    | 328 reviews, scheduling + billing + report delivery                      |
| GoAudits                                       | Mobile inspection/auditing | 145 reviews, offline checklists, automated reports                       |
| SnapInspect                                    | Property inspection        | 55 reviews, property inspection + maintenance                            |
| SafetyCulture (iAuditor)                       | General inspection         | 354 reviews, checklist-based, mobile-first                               |
| MaintainX                                      | Maintenance/inspection     | 1040 reviews, AI-driven, work orders, IoT                                |

---

## 2. Feature observations from Incontrol (incontrol.app)

Incontrol is a Dutch B2B SaaS platform positioned as "hét platform voor de volledige inspectieflow" (the platform for the complete inspection flow). Key observations:

### 2.1 Sector-specific ready-made templates

- E-installaties (electrical, SCIOS/Scope/NEN standards)
- W-installaties (mechanical/HVAC installations)
- Brandveiligheid (fire safety)
- Multiple additional sectors
- Template Store with free pre-built templates

### 2.2 Multi-platform with offline

- iOS app (App Store)
- Android app (Google Play)
- Browser web app (portal.getincontrol.eu)
- Full offline mode — fill templates without internet, syncs when online

### 2.3 Photo & media capture

- Take photos directly in-app
- Edit/annotate photos on device
- Add photos to inspection documents
- "Incontrol Pins" — import floorplans, pinpoint defects on floorplan images

### 2.4 AI-assisted text

- AI for fast text input and correction
- Reduces manual typing
- "Sneller én preciezer" (faster and more precise)

### 2.5 Digital signatures

- Legally valid digital signatures ("rechtsgeldige digitale handtekening")
- Sign documents directly on device

### 2.6 Report generation & collaboration

- Auto-generate PDF reports
- Auto-send completed reports to colleagues, clients, or third parties
- Branded/customizable reports (white-label)

### 2.7 Defect management (Incontrol FIX)

- Client portal for defect visibility
- Status tracking of findings
- Streamlined digital process from finding to resolution
- Clients (building owners, property managers) get a portal view

### 2.8 Notifications & automations

- Automatic alerts for deviations during inspections
- Priority assignment to responsible persons
- Conditional automations: dynamic templates, ticket/task creation
- Integration triggers with external software

### 2.9 Integrations

- Exact Online (Dutch accounting)
- SignRequest (digital signatures)
- Bluetooth device integration (Incontrol Sync — connects to measurement testers)
- Excel data import

### 2.10 Security & compliance

- ISO/IEC 27001 certified
- AVG (GDPR) compliant
- NIS2 directive alignment
- Regular independent penetration testing
- Hosted in ISO 27001 certified datacenter

### 2.11 Market position

- 15,000+ businesses as customers
- Dutch market first
- 14-day free trial
- Customers include: BAM, Colliers, Erasmus MC, Schindler, Stork, Voestalpine, Actemium
- Pricing page exists with tiered plans

### 2.12 Form Builder

- Custom template builder
- Fully customizable templates and reports
- Option to have Incontrol digitize your paper forms

---

## 3. Comparable feature patterns (from wider market)

| Feature Category                | Observed In Market                          | Our MVP Priority         |
| ------------------------------- | ------------------------------------------- | ------------------------ |
| Inspection templates/checklists | ✓ Universal                                 | Phase 7                  |
| Mobile app with offline         | ✓ Universal (SafetyCulture, GoAudits, etc.) | Post-MVP (web-first MVP) |
| Photo capture & annotation      | ✓ Common (GoFormz, Spectora)                | Phase 4                  |
| AI-assisted text                | ✓ Emerging (MaintainX, Incontrol)           | Phase 8                  |
| PDF/Word export                 | ✓ Universal                                 | Phase 6                  |
| Digital signatures              | ✓ Common (GoFormz, Whip Around)             | Phase 9                  |
| Defect/finding tracking         | ✓ Common (SnapInspect, Incontrol FIX)       | Phase 3                  |
| Client portal                   | ✓ Incontrol FIX, ISN                        | Post-MVP                 |
| Floorplan/pin defects           | ✓ Incontrol Pins (unique)                   | Post-MVP                 |
| Bluetooth device integration    | ✓ Incontrol Sync (niche)                    | Not planned              |
| Accounting integration          | ✓ Common (Exact, QuickBooks)                | Post-MVP                 |
| Scheduling/reminders            | ✓ Universal                                 | Post-MVP                 |
| Branded reports                 | ✓ Universal                                 | Phase 5                  |

---

## 4. What is useful for our MVP

1. **The core data flow:** Client → Property → Inspection → Finding → Report. This is the backbone of all inspection apps.
2. **Sector templates:** Pre-built inspection templates per sector (Dutch building inspection defaults). Low-hanging fruit for Phase 7.
3. **Photo + finding linkage:** Photos attached to specific findings, not just a general gallery. Incontrol does this well.
4. **Offline-first mindset:** Even in a web app, design forms that work with intermittent connectivity.
5. **PDF report with branding:** The end deliverable is always a professional report. This should be designed from the start.
6. **AI text assistance:** A differentiator we can build with DeepSeek (Phase 8).
7. **Defect status workflow:** Open → In Progress → Resolved, with follow-up tasks. Important for professional use.

---

## 5. What is too advanced for MVP

1. **Native mobile apps (iOS/Android):** Web-first with responsive design is sufficient for MVP.
2. **Bluetooth measurement device integration:** Niche hardware integration.
3. **Client portal (Incontrol FIX equivalent):** Valuable but adds significant scope. Defer.
4. **Floorplan/pin annotation (Incontrol Pins):** Technically complex image annotation. Defer.
5. **Template Store / marketplace:** Premature without a large user base.
6. **Accounting integrations (Exact Online):** Niche to Dutch market.
7. **Full ISO 27001 certification:** Overkill for MVP; just follow security best practices.

---

## 6. What should be avoided

1. **Copying Incontrol's exact feature names:** "Pins", "FIX", "Sync" are their branded terms. Use original names.
2. **Copying their UI layout:** The dark-themed dashboard, specific navigation patterns.
3. **Their sector categorization:** Create our own template categories based on Dutch building inspection norms.
4. **Their pricing model:** Research independently, don't copy tiers.
5. **Their exact report layout:** Design original report templates.

---

## 7. Original product direction for our app

**Positioning:** A Dutch-first building inspection/report-builder SaaS for small inspection businesses and freelancers.

**Differentiators:**

- **Open SaaS / Wasp stack:** Modern, maintainable, not a black-box platform
- **AI-first text:** DeepSeek-powered AI assistance for finding descriptions, recommendations, report introductions (Phase 8)
- **Owner-controlled data:** Inspectors own their data, templates, and reports — no vendor lock-in
- **Phased, transparent roadmap:** Built in public with AI-agent workflow

**Core value proposition:**
"Van klant tot rapport — één flow." (From client to report — one flow.)

**Initial target:** Dutch freelance building inspectors and small inspection firms (1-10 employees).
