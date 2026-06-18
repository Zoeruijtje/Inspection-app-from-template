# Phase 3A0-A — Builder DnD & Ordering Spike Findings

**Date:** 2026-06-18
**Library tested:** @dnd-kit/react v0.5.0, @dnd-kit/helpers v0.5.0
**Current revision:** v5 Stage B nested group — MANUALLY VERIFIED PASS for pointer validation. PDF spike not started.

## Status Legend

- **IMPLEMENTED**: Code exists in the spike.
- **AUTOMATED CHECKS PASSED**: Static/build/repo checks passed in this pass.
- **AWAITING USER MANUAL VALIDATION**: Ready for the required real browser/manual pointer checklist, but not accepted yet.
- **MANUALLY VERIFIED PASS**: User supplied real/manual test results that passed.
- **FAILED**: Required behavior failed.
- **UNVERIFIED**: Not tested in the required path.

## v4 Manual Verdict

**FAILED — inconsistent pointer destination.**

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
- Uses section/group-level `useDroppable` targets so empty compatible containers can receive drops.
- Gives sortable block targets higher collision priority than group containers, and group containers higher priority than the parent section container.
- Uses controlled React state keyed by stable container id.
- Saves a pre-drag snapshot and restores it when dnd-kit reports a canceled drag.
- Uses pointer activation distance to reduce accidental drags.

Removed from the pointer core:

- Custom drop-slot elements between every block.
- Manual `onDragEnd` insertion-index calculation.
- Native HTML5 drag for existing canvas blocks.
- DOM-query based drop resolution.
- Overlapping custom block/slot zones.

## v5 Stage A Scope

Stage A was intentionally flat-list only and is now preserved as the regression baseline:

- Exactly two sections.
- Section A starts with 5 blocks.
- Section B starts with 3 blocks.
- No nested groups.
- No palette insertion.
- No production persistence.
- No Wasp/app integration.

The user can test an empty section by moving all blocks out of either section, then dropping a block back into it.

## v5 Stage B Scope

Stage B adds exactly one nested group inside Section A:

- Stable container ids are `section-a`, `section-b`, and `group-a1`.
- The sortable state is `Record<ContainerId, string[]>`, where each key stores the ordered block ids directly owned by that container.
- `group-a1` starts empty so empty-group drop behavior can be tested immediately.
- Blocks inside `group-a1` use the same `useSortable` architecture as blocks in the two sections.
- `group-a1` has a lower-priority container droppable for empty-space drops.
- Sortable block targets have higher collision priority for exact first/middle/final insertion.
- The group container itself is not draggable or reorderable in Stage B.
- No columns, repeaters, tabs, conditional containers, PDF work, Wasp app changes, package changes, or migrations were added.

## v5 Results

| Item | Result | Notes |
| --- | --- | --- |
| v4 implementation archived | IMPLEMENTED | Archived under `spikes/builder-dnd/archive/v4/`. |
| Stage A sortable rewrite implemented | MANUALLY VERIFIED PASS | `BuilderCanvas.tsx` uses `useSortable`, `useDroppable`, `DragDropProvider`, and `move(items, event)`. User previously validated Stage A pointer movement. |
| Stage B nested group implemented | IMPLEMENTED | `group-a1` is a fixed nested sortable destination inside Section A. |
| TypeScript check | AUTOMATED CHECKS PASSED | `npx tsc --noEmit` passed. |
| Production build | AUTOMATED CHECKS PASSED | `npm run build` passed. |
| Repo quality gate | AUTOMATED CHECKS PASSED | `git diff --check`, `make check`, and `git diff -- app` passed with no app diff. |
| Stage B manual pointer stability | MANUALLY VERIFIED PASS | User completed 10 consecutive correct attempts for all Stage B operations and all Stage A regression operations. |
| Stage C supporting behavior | UNVERIFIED | Move-to fallback, keyboard movement, undo/redo, cancel UX evidence, and auto-scroll remain pending after Stage A stability. |

## Manual Acceptance Checklist

The user must perform each operation 10 consecutive times without an incorrect destination. One incorrect destination means that criterion fails.

| Criterion | Result | Notes |
| --- | --- | --- |
| Reorder inside Section A | MANUALLY VERIFIED PASS | 10 consecutive correct attempts passed after Stage B. |
| Reorder inside Section B | MANUALLY VERIFIED PASS | 10 consecutive correct attempts passed after Stage B. |
| Move A to B | MANUALLY VERIFIED PASS | 10 consecutive correct attempts passed after Stage B. |
| Move B to A | MANUALLY VERIFIED PASS | 10 consecutive correct attempts passed after Stage B. |
| Insert at first position in a section | MANUALLY VERIFIED PASS | 10 consecutive correct attempts passed after Stage B. |
| Insert in the middle of a section | MANUALLY VERIFIED PASS | 10 consecutive correct attempts passed after Stage B. |
| Append at the end of a section | MANUALLY VERIFIED PASS | 10 consecutive correct attempts passed after Stage B. |
| Move into empty section | MANUALLY VERIFIED PASS | 10 consecutive correct attempts passed after Stage B. |
| Section A to group | MANUALLY VERIFIED PASS | 10 consecutive correct attempts passed. |
| Section B to group | MANUALLY VERIFIED PASS | 10 consecutive correct attempts passed. |
| Group to Section A | MANUALLY VERIFIED PASS | 10 consecutive correct attempts passed. |
| Group to Section B | MANUALLY VERIFIED PASS | 10 consecutive correct attempts passed. |
| Reorder within group | MANUALLY VERIFIED PASS | 10 consecutive correct attempts passed. |
| Insert first in group | MANUALLY VERIFIED PASS | 10 consecutive correct attempts passed. |
| Insert middle in group | MANUALLY VERIFIED PASS | 10 consecutive correct attempts passed. |
| Insert last in group | MANUALLY VERIFIED PASS | 10 consecutive correct attempts passed. |
| Drop into empty group | MANUALLY VERIFIED PASS | 10 consecutive correct attempts passed. |
| Cancel cross-container drag | MANUALLY VERIFIED PASS | 10 consecutive correct attempts passed; exact pre-drag state restored. |

## Stage B Implementation

Stage B is implemented in the isolated spike:

- One fixed group inside Section A.
- The group participates as a compatible sortable container.
- Section/group block ownership is represented by ordered block-id arrays in one React state object.
- Item-level sortable targets drive exact insertion positions.
- Section containers use collision priority `1`, the nested group container uses `2`, and sortable block targets use `4`.
- The group container itself remains non-draggable and non-reorderable.
- Manual pointer validation passed for Stage B and Stage A regression operations.
- No wrong destinations, wrong insertion positions, duplicate blocks, disappearing blocks, bottom jumps, or preview/final-position mismatches were observed.

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

The v5 sortable architecture remains approved as the drag-and-drop foundation from Stage A.

This approval is limited to the pointer drag-and-drop foundation: `DragDropProvider`, `useSortable`, section/group container droppables, and `move(items, event)` for controlled state updates. Stage B nested block movement is manually verified. Dragging or reordering the group container itself remains outside the validated scope.

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
- `git status --short`: only permitted spike and documentation files changed.
- `find spikes/builder-dnd \( -type d -name node_modules -o -type d -name dist \) -print`: generated local directories exist but are ignored/generated and must not be committed.

## Remaining Limitations

- Stage A pointer behavior is manually accepted.
- Stage B nested group pointer behavior is manually verified.
- Stage C support behaviors are intentionally deferred.
- Touch remains unverified.
- Dragging or reordering the group container itself remains outside this validated scope.
- No app/database/Wasp production code was touched.

## Next Step

Proceed to the next explicitly requested phase. Stage C support behavior remains deferred, touch remains unverified, and the PDF spike has not started.
