# Architecture

## High-level architecture

This project uses Open SaaS / Wasp.

Wasp provides the full-stack structure:
- React client
- Node.js server
- Prisma/Postgres data layer
- Wasp entities
- Wasp queries and actions
- Auth
- Jobs/background tasks
- Deployment tooling

## Important Wasp concepts

- Entities are the data models.
- Entities are defined through Prisma schema.
- Queries read/fetch data.
- Actions create, update, or delete data.
- Pages/routes are declared through Wasp configuration.
- Migrations must be generated and committed when schema changes.

## Code ownership principle

This template should produce normal maintainable code, not black-box generated code.

## Development principle

All new functionality should be added in small phases:
1. Plan.
2. Implement.
3. Run checks.
4. Manually test.
5. Update docs.
6. Commit.
