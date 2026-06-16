# Permissions

## Core rule

Every query and action must check ownership or authorization on the server side.

Frontend hiding is not security.

## Role model

Initial simple roles:
- owner
- admin
- member
- viewer

## Resource access rules

User-owned resource:
- Create: logged-in user only
- Read: owner only
- Update: owner only
- Delete: owner only

Organization-owned resource:
- Create: organization owner/admin/member depending on resource
- Read: organization members
- Update: owner/admin or resource-specific role
- Delete: owner/admin only

Admin-only resource:
- Admin users only

## Required tests

For every new resource, test:
- unauthenticated access fails
- another user's resource cannot be read
- another user's resource cannot be updated
- another user's resource cannot be deleted
