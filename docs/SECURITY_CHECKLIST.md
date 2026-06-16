# Security Checklist

## Secrets

- Do not commit .env files with real secrets.
- Do not expose secret keys to client code.
- Use test keys locally.
- Use production keys only in deployment provider.

## Auth

- Server-side queries/actions must check auth.
- Frontend route protection is not enough.
- Admin routes must check admin status server-side.

## Data access

- User-owned resources must filter by ownerId/userId.
- Organization-owned resources must check membership.
- Never trust client-provided ownerId without verifying.

## Payments

- Stripe webhooks must verify signatures.
- Do not trust frontend payment status.
- Server/database should be source of truth.

## File uploads

- Limit file size.
- Limit allowed MIME types.
- Do not allow arbitrary executable uploads.
- Prefer presigned upload URLs for large files.
- Store ownerId/organizationId on uploaded file records.
- Generate download signed URLs only after server-side auth and ownership verification.
- Do not sign download URLs from raw client-provided storage keys.
