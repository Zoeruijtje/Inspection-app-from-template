# Phase 3A0-A — Builder DnD & Ordering Spike Findings

**Date:** 2026-06-17
**Library tested:** @dnd-kit/react v0.5.0, @dnd-kit/helpers v0.5.0
**Current revision:** v5 Stage A sortable rewrite — manual pointer validation passed. PDF spike not started.

## Status Legend

- **VERIFIED PASS**: Re-run successfully in this pass.
- **PASS WITH LIMITATIONS**: Implemented, but not manually proven stable enough for production recommendation.
- **FAIL**: Required behavior failed.
- **UNVERIFIED**: Not tested in the required real/manual path.

## v4 Manual Verdict

**FAIL — inconsistent pointer destination.**

Manual user testing found the v4 custom pointer algorithm unreliable:

- Blocks sometimes dropped at the bottom.
- Blocks sometimes moved to unintended locations.
- Behavior was inconsistent between attempts.

The v4 implementation is preserved for reference at:

```text
spikes/builder-dnd/archive/v4/
```

No `node_modules` or generated build files were intentionally archived.

## v5 Architecture Change

v5 stops patching the custom drop-slot implementation and rebuilds the pointer-drag core around the current official dnd-kit sortable architecture:

- Uses `DragDropProvider` from `@dnd-kit/react`.
- Uses `useSortable` from `@dnd-kit/react/sortable` for each block item.
- Uses `move(items, event)` from `@dnd-kit/helpers` during `onDragOver`.
- Uses section-level `useDroppable` targets so empty sections can receive drops.
- Gives sortable block targets higher collision priority than section containers.
- Uses controlled React state keyed by section id.
- Saves a pre-drag snapshot and restores it when dnd-kit reports a canceled drag.
- Uses pointer activation distance to reduce accidental drags.

Removed from the pointer core:

- Custom drop-slot elements between every block.
- Manual `onDragEnd` insertion-index calculation.
- Native HTML5 drag for existing canvas blocks.
- DOM-query based drop resolution.
- Overlapping custom block/slot zones.

## v5 Stage A Scope

Stage A is intentionally flat-list only:

- Exactly two sections.
- Section A starts with 5 blocks.
- Section B starts with 3 blocks.
- No nested groups.
- No palette insertion.
- No production persistence.
- No Wasp/app integration.

The user can test an empty section by moving all blocks out of either section, then dropping a block back into it.

## v5 Results

| Item | Result | Notes |
| --- | --- | --- |
| v4 implementation archived | VERIFIED PASS | Archived under `spikes/builder-dnd/archive/v4/`. |
| Stage A sortable rewrite implemented | VERIFIED PASS | `BuilderCanvas.tsx` now uses `useSortable`, `useDroppable`, `DragDropProvider`, and `move(items, event)`. |
| TypeScript check | VERIFIED PASS | `npx tsc --noEmit` passed. |
| Production build | VERIFIED PASS | `npm run build` passed. |
| Manual pointer stability | VERIFIED PASS | User manually validated Stage A pointer movement. Reordering, cross-section moves, first/middle/final drops, and empty-section drops behaved smoothly and predictably. No bottom-jumps, missing blocks, or duplicated blocks were observed. |
| Stage B nested group | UNVERIFIED | Not implemented yet, by design. Do not add until Stage A is manually stable for 10 consecutive attempts per criterion. |
| Stage C supporting behavior | UNVERIFIED | Move-to fallback, keyboard movement, undo/redo, cancel UX evidence, and auto-scroll remain pending after Stage A stability. |

## Manual Acceptance Checklist

The user must perform each operation 10 consecutive times without an incorrect destination. One incorrect destination means that criterion fails.

| Criterion | Result | Notes |
| --- | --- | --- |
| Reorder inside one section | VERIFIED PASS | Reordering within both sections worked smoothly and predictably. |
| Move A to B | VERIFIED PASS | Moving blocks from Section A to Section B worked reliably. |
| Move B to A | VERIFIED PASS | Moving blocks from Section B to Section A worked reliably. |
| Insert at first position | VERIFIED PASS | Dropping at the first position worked reliably. |
| Insert in the middle | VERIFIED PASS | Dropping in the middle worked reliably. |
| Append at the end | VERIFIED PASS | Dropping at the final position worked reliably; no bottom-jump bug was observed. |
| Move into empty section | VERIFIED PASS | No disappearing or duplicated blocks were observed during Stage A manual testing. |
| Move into nested group | UNVERIFIED | Stage B only; not available yet. |
| Move out of nested group | UNVERIFIED | Stage B only; not available yet. |

## Stage B Plan

Stage A passed the manual pointer checklist. Stage B can now be attempted in this isolated spike:

- Add one group inside Section A.
- Make the group a compatible sortable container.
- Verify section to group, group to section, and group to other section movement.
- Verify exact position after every drop.

## Stage C Plan

Only after Stage B is stable:

- Drag overlay polish.
- Accessible Move-to fallback.
- Keyboard movement.
- Undo/redo.
- Canceled drag restore acceptance evidence.
- Auto-scroll during real active pointer drag.

## Ordering Strategy Recommendation

**Recommended strategy remains:** Integer ordering with transactional renumbering.

For v1 single-user template editing, containers are expected to be small enough that renumbering all items in the affected container is simpler, safer, and easier to debug than fractional or string ranking. Use `sortOrder: Int` and persist the complete affected-container order after moves.

## Current dnd-kit Recommendation

The v5 sortable architecture is approved as the drag-and-drop foundation.

This approval is limited to the pointer drag-and-drop foundation: `DragDropProvider`, `useSortable`, section/container droppables, and `move(items, event)` for controlled state updates. Stage B nested containers and Stage C support behavior still need validation before production implementation is complete.

## Product Design Caveat

The standalone Vite prototype visuals are **not approved** as the final product design.

The v5 UI exists only to isolate and validate drag-and-drop behavior. Production builder UI must be rebuilt later using the existing application's Tailwind/shadcn patterns, `docs/UI_RULES.md`, and `docs/FORM_BUILDER_MASTER_SPEC.md`. Do not treat the standalone Vite layout, styling, spacing, colors, or panel structure as a visual reference for the production builder.

## Checks Run

```bash
cd ~/dev/inspection-app/spikes/builder-dnd
npx tsc --noEmit
npm run build
cd ~/dev/inspection-app
git diff --check
make check
git diff -- app
```

Results are recorded in the repo progress docs after this phase.

Current results:

- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.
- `make check`: passed.
- `git diff -- app`: empty.

## Remaining Limitations

- Stage A pointer behavior is manually accepted.
- Stage B nested groups are intentionally not implemented.
- Stage C support behaviors are intentionally deferred.
- Touch remains unverified.
- No app/database/Wasp production code was touched.

## Next Step

Proceed to Stage B nested group validation in the isolated spike before starting Phase 3A0-B PDF.
