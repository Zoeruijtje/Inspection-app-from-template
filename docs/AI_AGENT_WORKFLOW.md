# AI Agent Workflow — Inspection App

**Created:** 2026-06-16
**Status:** Active — this document governs how AI agents work on this project.

---

## 1. Agent modes

| Mode | When to use | Characteristics |
|------|------------|-----------------|
| **Plan mode** | Before large architectural/database changes, before adding new entities, before schema changes | Research-heavy, read-only exploration, produces plans |
| **Agent mode** | Tightly scoped implementation phases, single-resource CRUD, bug fixes | Edits code, runs commands, tests in browser |

**Rule:** Use Plan mode for phases 2+ architecture decisions. Use Agent mode for Phase 1 (skeleton cleanup) and individual CRUD operations.

---

## 2. Pre-task checklist (EVERY task)

Before making ANY changes, the agent MUST:

1. **Read required docs:**
   - `AGENTS.md`
   - `docs/PROJECT_BRIEF.md`
   - `docs/CODEBASE_MAP.md`
   - `docs/ARCHITECTURE.md` (if exists)
   - `docs/INSPECTION_APP_ARCHITECTURE.md`
   - `docs/ROADMAP_INSPECTION_APP.md`
   - `docs/RESOURCE_PATTERN.md`
   - `docs/PERMISSIONS.md`
   - `docs/TODO.md`
   - `docs/NEXT_PROMPT.md`

2. **Check git status:**
   ```bash
   git status --short
   git diff --stat
   ```
   If there are unexpected changes, STOP and explain. Do not continue blindly.

3. **Identify the phase:** Which phase from `docs/ROADMAP_INSPECTION_APP.md` does this task belong to?

4. **Identify allowed files:** Which files can be edited? (See phase definition in roadmap.)

---

## 3. During-task rules

1. **One phase at a time.** Do not implement Phase 3 while working on Phase 2.
2. **Small commits.** One phase = one commit (or one logical group of changes).
3. **Never edit generated files:** `.wasp/out/**` is off-limits.
4. **Never commit secrets:** Check `.env.server` and `.env` are not staged.
5. **Always add ownership checks:** Every new query/action must verify `context.user` and ownership.
6. **Follow existing patterns:** Use `tools/make-resource.mjs` for standard CRUD. Copy the Clients/Projects pattern.
7. **Run `make check` before considering work done.**

---

## 4. Post-task self-check (EVERY task)

After completing implementation, the agent MUST:

1. **Git status:**
   ```bash
   git status --short
   git diff --stat
   ```

2. **Inspect changed files:** Read each changed file to verify correctness.

3. **Quality gate:**
   ```bash
   make check
   ```

4. **Browser test:** If UI changed, open the relevant pages in browser and test CRUD operations.

5. **Auth/ownership verification:** For every new operation:
   - Is `context.user` checked?
   - Is ownership verified before read/update/delete?
   - Are nested resources checked through their parent chain?

6. **Database:** If schema changed, is migration applied?

7. **Update docs:**
   - `docs/PROGRESS_LOG.md` — add entry
   - `docs/TODO.md` — mark completed items
   - `docs/NEXT_PROMPT.md` — write the next prompt

8. **Summarize changed files:** List every file changed and why.

9. **Propose commit message:** Follow conventional commits:
   - `feat: phase N — short description`
   - `fix: short description`
   - `docs: short description`

10. **Write next prompt:** Update `docs/NEXT_PROMPT.md` with the exact prompt for the next Agent-mode step.

---

## 5. Standard self-check block

Copy-paste this block at the end of every coding phase:

```
## Self-check

1. `git status --short` → [clean / N files]
2. `git diff --stat` → [summary]
3. Changed files inspected → [yes/no]
4. `make check` → [pass/fail + error if fail]
5. Browser test → [pages tested, results]
6. Auth/ownership verified → [yes/no + details]
7. Docs updated → [files updated]
8. Commit message → `[type]: [description]`
9. Next prompt → [location]
```

---

## 6. Phase-specific agent instructions

### For Phase 1 (Skeleton cleanup):
- **Allowed files:** `app/main.wasp.ts`, nav constants, landing page components, `App.tsx`
- **Forbidden:** Schema changes, migrations, new packages, env files
- **Verify:** All existing pages still work after renaming

### For Phase 2+ (New resources):
- **Allowed files:** `app/schema.prisma`, new feature directory, `app/main.wasp.ts`, nav constants
- **Must:** Run `wasp db migrate-dev --name <name>` after schema change
- **Must:** Use `tools/make-resource.mjs` for standard CRUD resources
- **Must:** Add ownership checks to ALL operations

### For Phase 4+ (Photos/files):
- **Allowed files:** As above + `app/src/file-upload/` (reuse patterns)
- **Must:** Download URLs must be ownership-checked
- **Must:** Never expose raw S3 keys to client

### For Phase 8 (AI):
- **Must:** No automatic legal claims
- **Must:** Log AI usage
- **Must:** Store only previews, not full data
- **Must:** User consent before first AI use

---

## 7. Common mistakes to avoid

| Mistake | Prevention |
|---------|------------|
| Forgetting ownership check on nested resource | Always verify the full parent chain: Finding → Section → Inspection → Property → User |
| Editing `.wasp/out` files | Never touch generated files |
| Committing `.env.server` with real secrets | Check `git status` before every commit |
| Running migration without `--name` flag | Always use `wasp db migrate-dev --name <name>` |
| Adding new npm packages without approval | Check `AGENTS.md` constraint |
| Broad formatting-only changes | Only change lines related to the task |
| Assuming the app can start without env vars | The env validation issue is documented; fix is in Phase 10 |

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `context.entities.X undefined` | Entity not in Wasp spec | Add entity to `entities: [...]` in the `.wasp.ts` spec file |
| Schema changes not applying | Migration not run | `wasp db migrate-dev --name <name>` |
| Server won't start | Missing env vars for unused providers | Known issue — Phase 10 will fix. For now, provide placeholder values. |
| Types stale after changes | TypeScript server cache | Restart TS server (Cmd+Shift+P → "TypeScript: Restart TS server") |
| Wasp not recognizing changes | Wasp recompiling | Wait patiently. If stuck, `wasp clean && wasp start` |
| Prisma Client generation fails under Node 24 | Node version mismatch | Use `npx -p node@20 npx prisma generate` or switch to Node 20 |
