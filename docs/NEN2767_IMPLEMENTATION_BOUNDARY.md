# NEN 2767 Implementation Boundary

**Created:** 2026-06-17
**Status:** Planning — defines boundaries. No implementation.

---

## Positioning

NEN 2767 is a **future specialized template pack** (Phase 3R), not the core data model of the Inspection App.

The platform is a **generic form-and-report builder**. "Building inspection" is one use-case. "NEN 2767 condition assessment" is a specialized sub-use-case that will eventually be served by an optional, user-installable template pack built with the generic platform's blocks.

---

## What the Generic Builder Provides

The generic builder's block catalogue provides sufficient building blocks to construct NEN 2767-style inspection templates once authorized verification is obtained:

- **Component/element selectors:** Choice blocks (`single_select`, `multi_select`, `radio_group`, `checkbox_group`) can list building elements organized by NEN 2767's element structure
- **Structured defect records:** Finding blocks (`finding`, `defect_assessment`) capture title, description, category, severity, priority, status, recommendation, and cost
- **Condition/severity inputs:** Rating blocks (`rating`, `condition_score`) support numerical scoring; `pass_fail_na` and `compliant_nc_ni` blocks support assessment triage
- **Calculations:** Formula blocks (`formula`, `calculated_value`) compute condition indices and aggregations
- **Photos:** Media blocks (`single_photo`, `multi_photo`) attach visual evidence to findings
- **Recommendations:** Text blocks for corrective action recommendations
- **Branded PDF output:** The report designer and PDF renderer produce professional, branded reports

---

## Hard Boundaries

### Boundary 1 — No normative calculations without authorized verification

Any calculation that produces a NEN 2767 condition score, aggregate index, or normative assessment MUST be verified by a qualified Dutch building standards body before being offered to users.

The platform may provide **generic calculation tools** (formulas, aggregations, scoring) that users can configure themselves. It may **not** ship pre-configured NEN 2767 normative formulas claiming standard compliance without verification.

### Boundary 2 — No compliance claims without certified review

The platform must not claim that using a NEN 2767 template produces a "NEN 2767-compliant" inspection. Compliance is determined by the inspector's methodology, qualifications, and adherence to the standard — not by software.

Template descriptions may state "designed to support NEN 2767 condition assessment workflows" but must not state "NEN 2767-certified" or "NEN 2767-compliant" without certified review.

### Boundary 3 — No NEN-specific terminology in the generic builder

The generic builder, block registry, and core platform must not hardcode NEN 2767-specific terminology such as:
- "Gebrek" (defect — use generic "finding" or "defect")
- "Intensiteit" (intensity — use generic "severity")
- "Omvang" (extent — use generic "extent" or "scope")
- "Conditiescore" (condition score — use generic "condition score" or "rating")
- NEN 2767-specific element classifications

These terms may appear **only** within the specialized NEN 2767 template pack, in user-configurable labels, or in template documentation.

### Boundary 4 — NEN templates are optional, user-installable packs

NEN 2767 templates must not be:
- Pre-installed as default templates
- Required for any core platform function
- Referenced in generic platform UI or documentation as the primary use case
- Hardcoded in any server operation or database migration

They are optional template packs that users choose to install from the template library (Phase 3Q).

### Boundary 5 — The generic builder must not assume inspection semantics

The form builder must treat every form as a generic data collection workflow. It must not:
- Assume every form is an inspection
- Assume every response is a defect or finding
- Assume a specific severity scale (1-6 or otherwise)
- Hardcode "pass/fail" as the only assessment model
- Assume photos are always evidence of defects

These semantics are configured by template authors through the block registry's configurable properties.

---

## What "Authorized Verification" Means

Authorized verification for NEN 2767 normative content means review by an entity qualified to assess compliance with NEN standards. Possible entities include:
- NEN (Stichting Koninklijk Nederlands Normalisatie Instituut)
- A recognized building standards certification body
- A licensed building engineer or inspection authority with NEN 2767 expertise
- An industry association with recognized standing in Dutch building inspection

Self-certification by the platform developer is not sufficient for normative calculations or compliance claims.

---

## Practical Path to NEN 2767 Template Pack

1. Complete the generic builder, form runtime, and report engine (Phases 3A-3M)
2. Build a NEN 2767 template using only generic builder blocks and user-configurable labels
3. Engage a qualified building standards expert to review the template structure and any pre-configured calculations
4. After authorized verification, offer the template as an optional pack in the template library
5. Document clearly: "This template is designed to support NEN 2767 workflows. Users are responsible for ensuring their inspections meet NEN 2767 requirements."
