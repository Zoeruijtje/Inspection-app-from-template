# Inspection App Architecture Plan

**Created:** 2026-06-16
**Status:** Planning — no implementation.

---

## 1. Design principles

1. **User-owned data:** Every business resource is owned by a User. Ownership checked server-side on every query/action.
2. **Nested ownership:** Child resources must verify parent ownership before access.
3. **Follow existing patterns:** Use the Clients/Projects pattern for new CRUD resources. Use `tools/make-resource.mjs` where appropriate.
4. **Phased delivery:** Each phase adds one or two related entities with full CRUD, ownership, UI, and tests.
5. **No generated black boxes:** All code is human-readable and maintainable.
6. **Web-first:** Responsive web app. Native mobile is post-MVP.

---

## 2. Entity model

### Phase 0-1: Existing (already implemented)

| Entity | Purpose | Key Fields | Owner |
|--------|---------|------------|-------|
| User | Auth, profile | email, username, isAdmin, subscriptionStatus | self |
| Client | Contact/company record | name, email, phone, companyName, notes | userId |
| Project | Simple project tracker | name, notes | userId |

### Phase 2: Property

| Entity | Purpose | Key Fields | Relations | Owner | Phase |
|--------|---------|------------|-----------|-------|-------|
| Property | Building/property being inspected | address, city, postalCode, propertyType, constructionYear, notes | clientId → Client, userId → User | userId | 2 |

**Ownership check:** Verify `userId` matches context user. If `clientId` is set, verify that Client belongs to same user.

### Phase 2-3: Inspection & Sections

| Entity | Purpose | Key Fields | Relations | Owner | Phase |
|--------|---------|------------|-----------|-------|-------|
| Inspection | An inspection event | inspectionDate, status (draft/in_progress/completed), notes | propertyId → Property, userId → User, templateId → InspectionTemplate (nullable) | userId (via Property) | 2 |
| InspectionSection | A section within an inspection | title, sortOrder, notes | inspectionId → Inspection | userId (via Inspection → Property) | 2 |
| InspectionTemplate | Reusable template | name, description, sector | userId → User | userId | 7 |
| TemplateSection | Section within a template | title, sortOrder | templateId → InspectionTemplate | userId (via Template) | 7 |

**Ownership check (Inspection):** Load Property by `propertyId`, verify `property.userId === context.user.id`.

### Phase 3: Finding

| Entity | Purpose | Key Fields | Relations | Owner | Phase |
|--------|---------|------------|-----------|-------|-------|
| Finding | A defect/observation found during inspection | title, description, category, severity (low/medium/high/critical), status (open/in_progress/resolved), location, recommendation, costEstimate (optional) | sectionId → InspectionSection, inspectionId → Inspection | userId (via Section → Inspection → Property) | 3 |

**Ownership check:** Load InspectionSection by `sectionId`, then verify inspection ownership chain.

### Phase 4: FindingPhoto

| Entity | Purpose | Key Fields | Relations | Owner | Phase |
|--------|---------|------------|-----------|-------|-------|
| FindingPhoto | Photo attached to a finding | s3Key, fileName, contentType, caption, sortOrder | findingId → Finding, fileId → File (optional) | userId (via Finding chain) | 4 |

**Ownership check:** Load Finding, then verify inspection ownership chain. Use existing S3 secure download pattern.

### Phase 5: ReportTemplate & ReportExport

| Entity | Purpose | Key Fields | Relations | Owner | Phase |
|--------|---------|------------|-----------|-------|-------|
| ReportTemplate | Report layout/branding config | name, logoUrl, primaryColor, companyName, showCompanyInfo, headerFooterConfig (JSON) | userId → User | userId | 5 |
| ReportExport | Record of a generated report | exportType (pdf/word), status, s3Key, generatedAt | inspectionId → Inspection, userId → User | userId | 6 |

### Phase 8: AI Usage Log

| Entity | Purpose | Key Fields | Relations | Owner | Phase |
|--------|---------|------------|-----------|-------|-------|
| AiUsageLog | Record of AI-assisted text generation | promptType, inputPreview, outputPreview, modelUsed, createdAt | userId → User, findingId → Finding (nullable) | userId | 8 |

**Privacy note:** Store only previews (first 200 chars), not full inspection data. Log for audit, not training.

### Phase 9: Signature & FollowUpTask

| Entity | Purpose | Key Fields | Relations | Owner | Phase |
|--------|---------|------------|-----------|-------|-------|
| Signature | Digital signature capture | signerName, signerRole, signatureData (base64 or S3 key), signedAt | inspectionId → Inspection | userId | 9 |
| FollowUpTask | Task to address a finding | title, description, assignedTo, dueDate, status | findingId → Finding | userId | 9 |

### Future: Organization/Workspace (v3+)

| Entity | Purpose | Key Fields | Relations | Owner | Phase |
|--------|---------|------------|-----------|-------|-------|
| Organization | Multi-user workspace | name, slug | — | ownerId | Future |
| Membership | User membership in org | role (owner/admin/member/viewer) | userId → User, organizationId → Organization | — | Future |

**Deferred:** Keep single-user ownership for MVP. Organization adds significant complexity.

---

## 3. Permission rules

### General rule:
- **Every query/action** touching user-owned data must check `context.user` exists.
- **Every read** must filter by `userId` or verify parent ownership chain.
- **Every create** must set `userId` from `context.user.id`.
- **Every update/delete** must verify ownership before mutating.

### Nested resource ownership verification pattern:
```typescript
// Example: creating a Finding for an InspectionSection
async (args, context) => {
  if (!context.user) throw new HttpError(401);

  // Verify section exists and belongs to user's inspection
  const section = await context.entities.InspectionSection.findFirst({
    where: { id: args.sectionId },
    include: {
      inspection: {
        include: { property: true }
      }
    }
  });
  if (!section || section.inspection.property.userId !== context.user.id) {
    throw new HttpError(404);
  }
  // ... create finding
}
```

### File/photo access:
- Download URLs must be signed only after verifying ownership of the parent entity.
- Never expose raw S3 keys to the client.
- Use the existing secure download pattern from `app/src/file-upload/operations.ts`.

---

## 4. Database index strategy

For every user-owned entity, add:
```prisma
@@index([userId])
```

For frequently queried nested lookups:
```prisma
@@index([inspectionId])
@@index([sectionId])
@@index([findingId])
```

---

## 5. How to build each entity

| Entity | Build method | Rationale |
|--------|-------------|-----------|
| Property | `tools/make-resource.mjs` + manual clientId wiring | Follows Clients pattern + adds foreign key |
| Inspection | Manual (custom) | Complex ownership chain, multiple relations |
| InspectionSection | Manual (custom) | Nested under Inspection, sort ordering |
| Finding | `tools/make-resource.mjs` + manual wiring | Follows pattern + category/severity enums |
| FindingPhoto | Manual (custom) | S3 integration, ownership chain verification |
| ReportTemplate | `tools/make-resource.mjs` | Simple config entity |
| ReportExport | Manual (custom) | PDF generation logic |
| InspectionTemplate | `tools/make-resource.mjs` | Simple CRUD |
| TemplateSection | Manual (custom) | Nested under Template |

---

## 6. Phase dependency graph

```
Phase 0: Foundation (done)
  └─ Phase 1: Skeleton cleanup
      └─ Phase 2: Property + Inspection
          ├─ Phase 3: Finding
          │   └─ Phase 4: FindingPhoto
          ├─ Phase 5: Report preview
          │   └─ Phase 6: PDF export
          ├─ Phase 7: Templates
          ├─ Phase 8: AI text
          └─ Phase 9: Signatures + Tasks
```

Phases 5-9 can be done in parallel after Phase 3 is complete.
