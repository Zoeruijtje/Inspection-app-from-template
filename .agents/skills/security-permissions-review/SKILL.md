---
name: security-permissions-review
description: Use when reviewing auth, permissions, ownership checks, payments, file uploads, API routes, server actions, environment variables, or before deployment.
---

# Security and Permissions Review Skill

Use this skill before merging features that touch user data, payments, files, admin functions, or deployment.

## Required reading

Read:
- AGENTS.md
- docs/PERMISSIONS.md
- docs/SECURITY_CHECKLIST.md
- docs/DATABASE.md
- docs/CODEBASE_MAP.md

## Review checklist

Check:

1. Authentication is checked server-side.
2. Ownership is checked server-side.
3. Users cannot read another user's resources.
4. Users cannot modify another user's resources.
5. Admin-only functions check admin permission server-side.
6. No real secrets are committed.
7. Environment variables are documented.
8. Payment webhook logic verifies signatures.
9. File upload limits exist.
10. File upload MIME restrictions exist.
11. Uploaded files are linked to an owner or organization.
12. Client code does not import server-only secrets.
13. Errors do not leak secrets or sensitive internals.
14. Dangerous changes are documented.

## Output

Produce:
- pass/fail summary
- high-risk issues
- medium-risk issues
- low-risk issues
- exact files requiring fixes
- recommended next prompt
