# Database

## Database system

The app uses Postgres through Wasp/Prisma.

## Rules for schema changes

When adding or changing data models:

1. Update the Prisma/Wasp entity/schema files according to current Open SaaS/Wasp conventions.
2. Run:
   wasp db migrate-dev
3. Use a short descriptive migration name:
   add_clients
   add_projects
   add_organizations
   add_report_sections
4. Commit the migration files.
5. Test the app after migration.

## Ownership rule

Every user-created business resource must have an ownership rule.

Allowed ownership patterns:
- user-owned: resource has ownerId/userId
- organization-owned: resource has organizationId
- admin-only: resource only visible to admins

No resource may be globally readable unless it is intentionally public.

## Future standard resources

General MVP resources:
- Client
- Project
- Task
- FileAsset
- AuditLog
- Organization
- Membership

Building-inspection/report resources:
- Property
- Inspection
- Report
- ReportSection
- ReportBlock
- Photo
- Defect
- CostEstimate
