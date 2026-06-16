# Resource Pattern

Last audited: 2026-06-16

Scope: current repository inspection plus the first two implemented user-owned `Clients` and `Projects` resources.

## Current resource conventions

Database models live in:

- `app/schema.prisma`

Wasp feature specs live beside feature code:

- `app/src/demo-ai-app/demo-ai-app.wasp.ts`
- `app/src/file-upload/file-upload.wasp.ts`
- `app/src/clients/clients.wasp.ts`
- `app/src/user/user.wasp.ts`
- `app/src/payment/payment.wasp.ts`
- `app/src/analytics/analytics.wasp.ts`
- `app/src/admin/admin.wasp.ts`

Feature specs are imported into:

- `app/main.wasp.ts`

Server operations live in feature folders:

- `app/src/demo-ai-app/operations.ts`
- `app/src/file-upload/operations.ts`
- `app/src/clients/operations.ts`
- `app/src/user/operations.ts`
- `app/src/payment/operations.ts`
- `app/src/analytics/operations.ts`

Shared operation argument validation helper:

- `app/src/server/validation.ts`

Client pages import generated Wasp client operations from:

- `wasp/client/operations`

Server operations type generated Wasp operations from:

- `wasp/server/operations`

Entity types are imported from:

- `wasp/entities`

## Best existing CRUD/resource example: Task

Schema:

- `app/schema.prisma`
- `Task` has `id`, `createdAt`, `user`, `userId`, `description`, `time`, and `isDone`.
- `User` has `tasks Task[]`.

Spec:

- `app/src/demo-ai-app/demo-ai-app.wasp.ts`
- Declares:
  - `query(getAllTasksByUser, { entities: ["Task"] })`
  - `action(createTask, { entities: ["Task"] })`
  - `action(updateTask, { entities: ["Task"] })`
  - `action(deleteTask, { entities: ["Task"] })`

Operations:

- `app/src/demo-ai-app/operations.ts`
- Checks `context.user` for every Task operation.
- Creates records with `user: { connect: { id: context.user.id } }`.
- Lists records with `where: { user: { id: context.user.id } }`.
- Updates/deletes records with `where` filters that include both `id` and `user.id`.
- Uses local Zod schemas for operation inputs.
- Uses `ensureArgsSchemaOrThrowHttpError` for validation failures.

Page/UI:

- `app/src/demo-ai-app/DemoAppPage.tsx`
- Uses `useQuery(getAllTasksByUser)`.
- Calls `createTask`, `updateTask`, and `deleteTask` directly from UI handlers.
- Uses shared UI components from `app/src/client/components/ui`.
- Uses `lucide-react` icons and Wasp routes.

This was the strongest starting pattern for the first user-owned `Clients` resource.

## First implemented user-owned resource: Client

Schema:

- `app/schema.prisma`
- `Client` has `id`, `createdAt`, `updatedAt`, `user`, `userId`, `name`, `email`, `phone`, `companyName`, and `notes`.
- `User` has `clients Client[]`.
- `Client` uses `@@index([userId])`.

Spec:

- `app/src/clients/clients.wasp.ts`
- Declares:
  - `route("ClientsRoute", "/clients", page(ClientsPage, { authRequired: true }))`
  - `query(getClients, { entities: ["Client"] })`
  - `action(createClient, { entities: ["Client"] })`
  - `action(updateClient, { entities: ["Client"] })`
  - `action(deleteClient, { entities: ["Client"] })`

Operations:

- `app/src/clients/operations.ts`
- Checks `context.user` for every Client operation.
- Creates records with `user: { connect: { id: context.user.id } }`.
- Lists records with `where: { userId: context.user.id }`.
- Updates/deletes only after loading an owned record by `id` and `userId`.
- Uses local Zod schemas and `ensureArgsSchemaOrThrowHttpError`.
- Returns `404` for missing or not-owned update/delete targets.

Page/UI:

- `app/src/clients/ClientsPage.tsx`
- Uses `useQuery(getClients)`.
- Calls `createClient`, `updateClient`, and `deleteClient` directly from UI handlers.
- Includes search, create/edit dialog, delete confirmation dialog, loading states, empty state, and toast feedback.
- `Clients` is linked from the authenticated app navigation in `app/src/client/components/NavBar/constants.ts`.

## Existing file resource pattern: File

Schema:

- `app/schema.prisma`
- `File` has `id`, `createdAt`, `user`, `userId`, `name`, `type`, and `s3Key`.
- `User` has `files File[]`.

Spec:

- `app/src/file-upload/file-upload.wasp.ts`

Operations:

- `app/src/file-upload/operations.ts`
- Auth checks exist for:
  - `createFileUploadUrl`
  - `addFileToDb`
  - `getAllFilesByUser`
  - `getDownloadFileSignedURL`
  - `deleteFile`
- Create/list/download/delete are user-owned.
- S3 keys are generated as `${userId}/${randomUUID()}.${ext}` in `app/src/file-upload/s3Utils.ts`.
- Download signed URLs are generated from a server-loaded `File` record after checking `context.user` and ownership by `File.id`.

UI:

- `app/src/file-upload/FileUploadPage.tsx`
- Uses a form, upload progress, toast notifications, a file list, and a delete confirmation dialog.

Important security rule:

- Do not generate file download signed URLs directly from client-provided storage keys. The server operation must authenticate the user, load the file record by id, confirm ownership, and only then sign the stored `s3Key`.

## Existing admin resource pattern: Users

Schema:

- `User` model in `app/schema.prisma`.

Spec:

- `app/src/user/user.wasp.ts`

Operations:

- `app/src/user/operations.ts`
- `getPaginatedUsers` requires `context.user` and `context.user.isAdmin`.
- `updateIsUserAdminById` requires `context.user` and `context.user.isAdmin`.
- Uses Zod input validation.
- Uses Prisma transaction for paginated list plus total count.

UI:

- `app/src/admin/dashboards/users/UsersDashboardPage.tsx`
- `app/src/admin/dashboards/users/UsersTable.tsx`
- Includes filters, pagination, a switch, and a dropdown menu.

This is useful for later admin tooling, but the first `Clients` resource should probably start with the simpler Task pattern.

## Database model pattern

For user-owned resources:

- Add the model to `app/schema.prisma`.
- Add a relation field on `User`.
- Add `userId String`.
- Add `user User @relation(fields: [userId], references: [id])`.
- Include timestamps where useful.
- Prefer explicit ownership via `userId` for the first resource.

Current `Client` model shape:

```prisma
model User {
  // existing fields...
  clients Client[]
}

model Client {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id])
  userId    String

  name      String
  email     String?
  phone     String?
  companyName String?
  notes     String?

  @@index([userId])
}
```

## Wasp entity/spec pattern

Create a feature folder:

- `app/src/clients/`

Create a spec file:

- `app/src/clients/clients.wasp.ts`

Likely spec:

```ts
import { action, page, query, route, type Spec } from "@wasp.sh/spec";

import { ClientsPage } from "./ClientsPage" with { type: "ref" };
import {
  createClient,
  deleteClient,
  getClients,
  updateClient,
} from "./operations" with { type: "ref" };

export const clientsSpec: Spec = [
  route("ClientsRoute", "/clients", page(ClientsPage, { authRequired: true })),
  query(getClients, { entities: ["User", "Client"] }),
  action(createClient, { entities: ["User", "Client"] }),
  action(updateClient, { entities: ["User", "Client"] }),
  action(deleteClient, { entities: ["User", "Client"] }),
];
```

Then update `app/main.wasp.ts`:

- Import `clientsSpec`.
- Add `clientsSpec` to the `spec` array.

## Query pattern

Use the Task pattern:

- Validate auth with `if (!context.user) throw new HttpError(401)`.
- For list queries, filter by `context.user.id`.
- For detail queries, filter by both record id and `context.user.id`.
- Return only records owned by the current user.

Likely queries:

- `getClients`
- Optional `getClientById` if a detail route is added.

## Action pattern

Use the Task pattern:

- Validate auth first.
- Validate args with Zod.
- On create, connect the new record to `context.user.id`.
- On update/delete, include ownership in the Prisma `where` filter.
- Return the created/updated/deleted record or a small DTO.

Likely actions:

- `createClient`
- `updateClient`
- `deleteClient`

## Validation pattern

Current local pattern:

- Define Zod schemas near the operation in `operations.ts`.
- Use `ensureArgsSchemaOrThrowHttpError` from `app/src/server/validation.ts`.

For `Client`, start local to `app/src/clients/operations.ts`.
If schemas are needed by both client and server later, split them into:

- `app/src/clients/validation.ts`

## UI page pattern

Simple first version:

- `app/src/clients/ClientsPage.tsx`
- Use `useQuery(getClients)`.
- Add a create/edit form.
- Show loading, empty, and error states.
- Show owned clients in a table or compact list.
- Use existing UI components from `app/src/client/components/ui`.
- Use `toast` from `app/src/client/hooks/use-toast.ts` for success/error feedback.

Potential later split:

- `app/src/clients/ClientsPage.tsx`
- `app/src/clients/ClientForm.tsx`
- `app/src/clients/ClientsTable.tsx`
- `app/src/clients/DeleteClientDialog.tsx`

## Navigation pattern

If Clients should appear in the main authenticated nav:

- Update `app/src/client/components/NavBar/constants.ts`.

If Clients should appear in the user dropdown:

- Update `app/src/user/constants.ts`.

## Permission pattern

Required for user-owned resources:

- Create: logged-in user only.
- Read list: logged-in user only, filter by `userId`.
- Read detail: logged-in owner only.
- Update: logged-in owner only.
- Delete: logged-in owner only.

Never rely on hiding frontend links as security.

The server operation must enforce ownership.

## Test pattern

Existing e2e tests live in:

- `e2e-tests/tests/`

Recommended future Clients tests:

- `e2e-tests/tests/clients.spec.ts`

Minimum coverage:

- Unauthenticated user is redirected or blocked.
- User can create a client.
- User can list only their own clients.
- User can update their own client.
- User can delete their own client.
- Another user's client cannot be read, updated, or deleted.

No app unit test pattern was found during this audit.

## Exact likely files for Clients implementation

Likely required:

- `app/schema.prisma`
- `app/main.wasp.ts`
- `app/src/clients/clients.wasp.ts`
- `app/src/clients/operations.ts`
- `app/src/clients/ClientsPage.tsx`
- `app/src/client/components/NavBar/constants.ts`

Likely optional depending on scope:

- `app/src/clients/validation.ts`
- `app/src/clients/ClientForm.tsx`
- `app/src/clients/ClientsTable.tsx`
- `app/src/clients/DeleteClientDialog.tsx`
- `app/src/user/constants.ts`
- `app/src/server/scripts/dbSeeds.ts`
- `e2e-tests/tests/clients.spec.ts`

Generated later by migration command, not manually:

- `app/migrations/<timestamp>_add_clients/migration.sql`

Docs to update after implementation:

- `docs/DATABASE.md`
- `docs/PERMISSIONS.md`
- `docs/RESOURCE_PATTERN.md`
- `docs/SECURITY_CHECKLIST.md`
- `docs/PROGRESS_LOG.md`
- `docs/TODO.md`
- `docs/NEXT_PROMPT.md`

## Manual verification before copying patterns

- Verify current Wasp docs for `main.wasp.ts` / `@wasp.sh/spec` syntax before implementing.
- Verify whether `Client` should have only `userId` ownership or future organization ownership.
- Verify environment startup, because `app/src/env.ts` validates many provider schemas at once.
- Use the fixed file download pattern: sign URLs only after server-side auth and ownership verification.
