# Next Prompt

Use this prompt in Agent mode for Phase 1 — Product skeleton cleanup.

---

You are working in the Inspection App repository at `~/dev/inspection-app`.

## First read these files:

- `AGENTS.md`
- `Makefile`
- `docs/PROJECT_BRIEF.md`
- `docs/CODEBASE_MAP.md`
- `docs/INSPECTION_APP_ARCHITECTURE.md`
- `docs/ROADMAP_INSPECTION_APP.md`
- `docs/AI_AGENT_WORKFLOW.md`
- `docs/RESOURCE_PATTERN.md`
- `docs/PERMISSIONS.md`
- `docs/TODO.md`
- `docs/PROGRESS_LOG.md`
- `app/main.wasp.ts`
- `app/src/client/components/NavBar/constants.ts`
- `app/src/landing-page/LandingPage.tsx`
- `app/src/landing-page/contentSections.tsx`
- `app/src/client/App.tsx`

## Task: Phase 1 — Product skeleton cleanup

Rename visible app branding from Open SaaS/demo to Inspection App. Keep auth, admin, Clients. Keep Projects as-is for now. Remove or hide irrelevant demo navigation.

### Step 1: Rename app

In `app/main.wasp.ts`:
- Change `name: "OpenSaaS"` to `name: "InspectionApp"`
- Change `title: "My Open SaaS App"` to `title: "Inspection App"`

### Step 2: Update navigation

In `app/src/client/components/NavBar/constants.ts`:
- Remove "Documentation" link pointing to `https://docs.opensaas.sh`
- Remove "Blog" link pointing to `https://docs.opensaas.sh/blog`
- Remove "AI Scheduler" (demo-app) from the authenticated nav items
- Keep: Clients, Projects, File Upload
- Remove the `marketingNavigationItems` export's external links

### Step 3: Update landing page

In `app/src/landing-page/LandingPage.tsx` and `app/src/landing-page/contentSections.tsx`:
- Replace Open SaaS placeholder text with inspection-app-relevant Dutch/English text
- Keep it simple: "Inspection App — Bouwkundige inspecties, rapporten, en meer"
- Remove "Star Our Repo on Github" banner
- Replace example logos/companies with generic placeholders or remove

### Step 4: Update App.tsx if needed

Check `app/src/client/App.tsx` for any Open SaaS-specific branding and update.

## Hard constraints:

- Do NOT change the database schema.
- Do NOT run migrations.
- Do NOT add new npm packages.
- Do NOT edit `.env.server` or `.env`.
- Do NOT edit generated `.wasp/out` files.
- Do NOT remove functional pages (auth, clients, projects, file-upload, admin, demo-app, payment).
- Only hide irrelevant navigation links — do not delete the page components.
- Do NOT make broad formatting-only changes.

## After changes:

1. Run `make check`
2. Start app with `wasp start`
3. Browser test: landing page, signup, login, /clients, /projects, /file-upload
4. Verify all existing functionality still works

## Required deliverables:

- Self-check block (see `docs/AI_AGENT_WORKFLOW.md` section 5)
- Git diff summary
- Proposed commit message
- Update `docs/PROGRESS_LOG.md`
- Update `docs/TODO.md`
- Update `docs/NEXT_PROMPT.md` for Phase 2
