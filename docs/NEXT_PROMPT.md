# Phase 3A0-A — Builder Drag-and-Drop & Ordering Strategy Spike

You are working in the Inspection App repository at `~/dev/inspection-app`.

You are in **Agent mode**. This is a **local, disposable feasibility spike**. No production code. No database. No Wasp integration. No commits to the main app.

---

## Step 0 — Verify repository state

Run and report the exact output of:

```bash
cd ~/dev/inspection-app && pwd
git status --short
git diff --stat
git diff --check
node -v
npm -v
cd app && wasp version
```

If `git status --short` shows changes to `app/schema.prisma`, `app/main.wasp.ts`, `app/package.json`, any `.wasp/` file, or any `app/src/` file outside `docs/`, STOP and report them.

---

## Step 1 — Read required documents

Read:
- `AGENTS.md`
- `docs/PROJECT_BRIEF.md`
- `docs/FORM_BUILDER_MASTER_SPEC.md`
- `docs/FORM_BUILDER_DATA_MODEL.md`
- `docs/FORM_PLATFORM_ROADMAP.md`

---

## Step 2 — Set up the spike

Create a standalone Vite + React + TypeScript prototype. Do NOT place it inside `app/`.

```bash
mkdir -p spikes
cd spikes
npm create vite@latest builder-dnd -- --template react-ts
cd builder-dnd
npm install @dnd-kit/react @dnd-kit/helpers
```

**The current dnd-kit API uses `@dnd-kit/react` and `@dnd-kit/helpers`.** These are the first-choice packages. The legacy `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` packages should only be tested as a comparison or fallback if the current API proves insufficient.

**Hard prohibitions:**
- Do NOT modify `app/schema.prisma`
- Do NOT modify `app/main.wasp.ts`
- Do NOT install packages in `app/`
- Do NOT run Wasp commands
- Do NOT create database tables
- Do NOT edit `.env` or `.env.server`
- Do NOT integrate with existing Property/Inspection records

---

## Step 3 — Test drag-and-drop (11 criteria)

Build a prototype with:
- A block palette (left panel) listing block types grouped by category
- A builder canvas (center panel) with pages, sections, and blocks
- In-memory state only (React context or useReducer — no API, no database)

For each criterion below, implement, test, and record pass/fail with notes:

### Criterion 1 — Palette-to-canvas insertion
Click a block type in the palette → adds it to the end of the active section. Drag a block type from the palette → drop at a specific position in a section (show an insertion indicator line between existing blocks).

### Criterion 2 — Sections and nested groups
Create multiple sections within a page. Create a group container within a section. Place blocks inside the group. Move the group up/down within its parent. Verify nested structure: page → sections → group → blocks.

### Criterion 3 — Cross-container drag-and-drop
Move a block from section A to section B by dragging. Move a block from inside a group to a section. Move a block from a section into a group. Verify the block appears in the correct position in the target container and is removed from the source.

### Criterion 4 — Mouse interaction
Standard drag: mousedown on block handle → drag overlay appears (showing block type icon + label) → mousemove with insertion indicator between blocks → mouseup to drop. Smooth visual feedback throughout. No jank or flicker.

### Criterion 5 — Touch interaction
Test on a tablet viewport (768×1024, simulated in browser DevTools). Touch-drag a block. No 300ms tap delay. Page scroll should be suppressed during drag. Drop should work on touch-end.

### Criterion 6 — Keyboard interaction
Tab to focus a block card. Press Space or Enter to pick it up (announce "Block [label] picked up"). Arrow keys move the block up/down within its container. Enter or Space drops it. Escape cancels. All reorder operations achievable without a mouse.

### Criterion 7 — Auto-scroll
Place enough blocks that the canvas overflows vertically. Drag a block near the top edge of the canvas → canvas scrolls up. Drag near the bottom edge → canvas scrolls down. Scroll speed should be proportional to proximity to edge.

### Criterion 8 — Move-up/down fallback buttons
Every block shows ↑ (move up) and ↓ (move down) buttons. Visible on hover and on focus (for keyboard users). Clicking ↑ moves the block one position up. Clicking ↓ moves it one position down. These must work completely independently of drag-and-drop. At the first position, ↑ is disabled. At the last position, ↓ is disabled.

### Criterion 9 — Undo/redo
Implement a command-pattern undo stack. Each mutation (add block, delete block, move block, update config, add section, delete section) is wrapped in a reversible command. Ctrl+Z undoes the last command. Ctrl+Shift+Z (or Ctrl+Y) redoes. Stack depth: at least 20 commands. Undo a move → block returns to original position. Undo a delete → block reappears. Undo an add → block is removed.

### Criterion 10 — Persistence rollback simulation
Add a "Save" button to the toolbar. On click, simulate a server save: `setTimeout` 500ms, then resolve or reject based on a toggle (add a "Simulate save failure" checkbox for testing). On success: mark state as "Saved". On failure: revert the entire local state to the last successfully saved snapshot. Show a toast or banner: "Save failed — changes reverted."

### Criterion 11 — No production database integration
Confirm: no Prisma imports, no Wasp entity references, no `context.entities`, no database tables created, no API calls to the Wasp server. All state is in-memory JavaScript objects. This spike can be deleted entirely with no effect on the main app.

---

## Step 4 — Compare ordering strategies

Implement and compare three strategies. Create a simple test harness: a container with 100 items, perform 50 random mid-point insertions, measure results.

### Strategy 1 — Integer positions with transactional normalization
sortOrder: Int. On every move, renumber ALL items in the affected container (0, 1, 2, ...). The "save" sends all renumbered items.

### Strategy 2 — Decimal/Fractional ranking
sortOrder: Float. On move between A (sortOrder=1.0) and B (sortOrder=2.0), compute (1.0 + 2.0) / 2 = 1.5. Only the moved item is updated. Add normalization logic: when minimum gap between any two adjacent items < 1e-10, renumber the container to integers.

### Strategy 3 — LexoRank-style string keys
sortKey: String. Alphabet: digits + lowercase letters (0-9, a-z). On move between A and B, generate a key lexicographically between them. Example: between "a" and "b" → "an" (append middle character). Between "an" and "b" → "aq". Implement periodic rebalancing to shorten keys when they exceed a threshold length.

### For each strategy, document:
- **Implementation complexity:** lines of code, number of edge cases handled, external dependencies
- **Write amplification:** for moving 1 item in a container of 10 items, how many items are updated? 100 items? 1000 items?
- **Precision/longevity:** how many consecutive mid-point insertions at the exact same position before the strategy fails (cannot insert between)? Measure empirically.
- **Query simplicity:** is `ORDER BY sortOrder` sufficient? Any special collation or casting needed for the database?
- **Debuggability:** can a developer look at the stored values and understand the order? Are values human-readable?
- **Collaborative editing suitability:** if two users simultaneously reorder items in the same container, how complex would conflict resolution be?

### Recommend ONE strategy with justification.
This recommendation will determine the sortOrder column type in the production schema (Phase 3A).

---

## Step 5 — Record findings

Write `spikes/builder-dnd/README.md` containing:

```markdown
# Phase 3A0-A — Builder DnD & Ordering Spike Findings

**Date:** [today]
**Library tested:** @dnd-kit/react [version], @dnd-kit/helpers [version]

## Drag-and-Drop Results

| # | Criterion | Result | Notes |
|---|-----------|--------|-------|
| 1 | Palette-to-canvas insertion | PASS/FAIL | ... |
| 2 | Sections and nested groups | PASS/FAIL | ... |
| 3 | Cross-container DnD | PASS/FAIL | ... |
| 4 | Mouse interaction | PASS/FAIL | ... |
| 5 | Touch interaction | PASS/FAIL | ... |
| 6 | Keyboard interaction | PASS/FAIL | ... |
| 7 | Auto-scroll | PASS/FAIL | ... |
| 8 | Move-up/down fallback | PASS/FAIL | ... |
| 9 | Undo/redo | PASS/FAIL | ... |
| 10 | Persistence rollback | PASS/FAIL | ... |
| 11 | No production DB integration | CONFIRMED | ... |

## Ordering Strategy Comparison

| Criterion | Integer | Fractional | LexoRank |
|-----------|---------|------------|----------|
| Implementation complexity | ... | ... | ... |
| Write amplification (10 items) | ... | ... | ... |
| Write amplification (100 items) | ... | ... | ... |
| Precision (consecutive inserts) | ... | ... | ... |
| Query simplicity | ... | ... | ... |
| Debuggability | ... | ... | ... |
| Collaborative suitability | ... | ... | ... |

## Recommendation

**Recommended strategy:** [Integer / Fractional / LexoRank]

**Justification:** [2-3 paragraphs]

## dnd-kit Assessment

**Verdict:** [Proceed with @dnd-kit/react / Switch to alternative / Custom-build]

**Configuration notes / workarounds:** [if any]

## Known Limitations

- [List any issues discovered]
```

---

## Step 6 — Update progress log

Append to `docs/PROGRESS_LOG.md`:

```
## Phase 3A0-A — Builder feasibility spike completed ([date])

- dnd-kit (@dnd-kit/react + @dnd-kit/helpers) tested against 11 criteria: [N] passed, [N] failed, [N] with workarounds
- Ordering strategies compared: integer, fractional, LexoRank
- Recommended strategy: [name]
- Recommended DnD approach: [proceed / switch / custom]
- Findings documented in spikes/builder-dnd/README.md
```

---

## Step 7 — Report

Report:
1. All 11 DnD criteria results (pass/fail + brief note for each)
2. Recommended ordering strategy with 2-3 sentence justification
3. Recommended DnD approach
4. Files created (full paths)
5. Whether documentation was updated
6. Proposed next step (Phase 3A0-B PDF spike, or Phase 3A production schema)
7. Proposed commit message for the spike
8. Whether any tool was unavailable

**The entire spike directory (spikes/builder-dnd/) may be committed in a dedicated commit including source, package.json, lockfile, and README. Never commit node_modules or large generated outputs.**

**DO NOT commit automatically.**
