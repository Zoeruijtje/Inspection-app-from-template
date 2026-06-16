# Inspection App

A full-stack SaaS inspection management application built with [Wasp](https://wasp.sh) and [Open SaaS](https://opensaas.sh), cloned from the MVP factory.

## Requirements

- **WSL2 or Linux** — do not use the Windows filesystem. The project must live inside the WSL/Linux filesystem (e.g. `/home/...`).
- **Node 20 via nvm** — the project requires Node 20. Prisma 5.19 and Wasp tooling do not work correctly under newer Node versions.

## Project structure

```
.
├── app/           # Main Wasp application (all app code lives here)
├── docs/          # Architecture, planning, and reference documentation
├── e2e-tests/     # Optional Playwright end-to-end tests
├── tools/         # Resource generator scripts
└── Makefile       # Quality-gate commands for common tasks
```

## Local setup

```bash
# 1. Use Node 20
nvm use 20          # or: nvm install 20

# 2. Enter the app directory
cd app

# 3. Install dependencies
npm install         # or: npm ci (if package-lock.json is already valid)

# 4. Copy the example env file (edit as needed)
cp -n .env.server.example .env.server

# 5. Start the database
wasp db start

# 6. Apply database migrations
wasp db migrate-dev

# 7. Start the dev server
wasp start
```

The app will be available at `http://localhost:3000`.

## Makefile commands

From the project root:

| Command | Description |
| --- | --- |
| `make dev-db` | Start the PostgreSQL database (`cd app && wasp db start`) |
| `make dev-app` | Start the Wasp dev server (`cd app && wasp start`) |
| `make migrate NAME=...` | Create and apply a new migration (`cd app && wasp db migrate-dev --name $NAME`) |
| `make studio` | Open Prisma Studio to browse the database |
| `make e2e` | Run Playwright end-to-end tests |
| `make check` | Quality gate: whitespace check + Prisma schema validation |
| `make status` | Show Git status and project info |

## Removed directories

### `blog/`

The Astro/Starlight blog was removed because it is optional and not needed for this product. If you want a blog later, you can scaffold a fresh Astro project separately.

### `e2e-tests/` (optional)

End-to-end tests with Playwright are included but entirely optional. You only need them when you want to write or run Playwright tests. The app works fine without them.

## Security

**Never commit these files:**

- `.env.server` — contains database passwords, API keys, email credentials
- `.env` — client-side environment variables
- Any file containing API keys, database passwords, or secrets

The `.env.server.example` file is safe to commit — it contains placeholder values only.

## Documentation

Detailed architecture, planning, and reference docs live in [`docs/`](docs/):

| Document | Purpose |
| --- | --- |
| [`PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md) | Project goals and stack decisions |
| [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture overview |
| [`CODEBASE_MAP.md`](docs/CODEBASE_MAP.md) | File and directory map |
| [`DATABASE.md`](docs/DATABASE.md) | Database schema and patterns |
| [`RESOURCE_PATTERN.md`](docs/RESOURCE_PATTERN.md) | How to add a new owned resource |
| [`PERMISSIONS.md`](docs/PERMISSIONS.md) | Auth and permission rules |
| [`ENVIRONMENT.md`](docs/ENVIRONMENT.md) | Environment variables and providers |
| [`DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Deployment guide (Railway) |
| [`PROGRESS_LOG.md`](docs/PROGRESS_LOG.md) | Development progress log |
| [`TODO.md`](docs/TODO.md) | Current task list |
| [`SECURITY_CHECKLIST.md`](docs/SECURITY_CHECKLIST.md) | Security review checklist |

## License

Private — this is a proprietary application built on the Open SaaS template.
