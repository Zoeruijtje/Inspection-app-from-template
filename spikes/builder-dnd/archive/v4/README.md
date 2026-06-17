# Phase 3A0-A — Builder DnD & Ordering Spike Findings

**Date:** 2026-06-17
**Library tested:** @dnd-kit/react v0.5.0, @dnd-kit/helpers v0.5.0
**Spike revision:** v4 final correction pass for Phase 3A0-A. PDF spike not started.

## Status Legend

- **VERIFIED PASS**: Re-run successfully in this pass.
- **PASS WITH LIMITATIONS**: Implemented and/or previously observed, but not fully re-run through the required manual browser path in this environment.
- **FAIL**: A required verification path or behavior failed.
- **UNVERIFIED**: Not truthfully verified in this pass.

## v3/v4 Correction Results

| Item | Result | Notes |
| --- | --- | --- |
| DragActiveContext placement | VERIFIED PASS | `BuilderCanvas` now owns `isDragActive`; `DragActiveContext.Provider` wraps `BuilderCanvasInner`; `BuilderCanvasInner` calls `useAutoScroll(canvasRef)` and receives the active provider value. |
| DragOverlay provider placement | VERIFIED PASS | `useDragOperation()` now runs in `CanvasDragOverlay`, a child rendered under `DragDropProvider`, so overlay state reads the active dnd-kit provider. |
| Module-level pointer listener removed | VERIFIED PASS | Removed `_lastPointerY` and the module-scope `window.addEventListener`. `useAutoScroll` now stores pointer Y in a React ref and registers `pointermove` in an effect with cleanup only while drag is active. |
| TypeScript check | VERIFIED PASS | `npx tsc --noEmit` passed on 2026-06-17. |
| Production build | VERIFIED PASS | `npm run build` passed on 2026-06-17. |
| Fresh Vite restart | VERIFIED PASS | `npm run dev -- --host 0.0.0.0` started from a clean process and served `http://localhost:5173/`; HTTP 200 confirmed. |
| Browser tooling availability | FAIL | `agent-browser` command was not available. Playwright Chromium install failed: `Playwright does not support chromium on ubuntu26.04-x64`. No Chrome/Chromium/Firefox binary was available in PATH. |
| Move-to operation browser verification | UNVERIFIED | Implementation exists, but the required built-in-browser flow (create two sections, select target section/position, move, verify counts/position, undo, redo) could not be executed without a working browser tool. |
| Keyboard cross-container verification after fresh restart | UNVERIFIED | Fresh Vite restart completed, but required browser keyboard flow could not be executed without a working browser tool. |
| Manual pointer drag using mouse | UNVERIFIED | Genuine manual mouse attempts in the VS Code built-in browser were not possible from this session. Do not mark pointer DnD PASS yet. |
| Auto-scroll during active pointer drag | UNVERIFIED | The context bug is fixed, but actual active pointer-drag auto-scroll was not verified because pointer drag itself was not manually verified. |
| Touch drag | UNVERIFIED | No genuine touch emulation or real touch device was available. |

## Drag-and-Drop Criteria

| # | Criterion | Final Result | Notes |
| --- | --- | --- | --- |
| 1 | Palette-to-canvas insertion | PASS WITH LIMITATIONS | Click-to-add and native HTML5 palette drag wiring remain in place. Not re-run in browser during v4 because browser tooling was unavailable. |
| 2 | Sections and nested groups | PASS WITH LIMITATIONS | Multiple sections and nested groups are implemented. Not re-run in browser during v4. |
| 3 | Cross-container DnD | UNVERIFIED | dnd-kit drop-slots and container targets are wired, but manual pointer movement remains unverified. |
| 4 | Mouse interaction | UNVERIFIED | Drag handles, overlay component, and insertion indicators exist, but genuine mouse drag was not performed in a browser. |
| 5 | Touch interaction | UNVERIFIED | Keep touch unverified until genuine touch emulation or a real touch device is available. |
| 6 | Keyboard interaction | PASS WITH LIMITATIONS | Space/Enter lift, Arrow movement, Enter/Space drop, and Escape cancel are implemented. Cross-container boundary policy is explicit, but the required fresh-browser verification could not be executed in v4. |
| 7 | Auto-scroll | UNVERIFIED | Hook is now correctly wired to active drag context and HMR-safe pointer tracking; actual active pointer drag auto-scroll remains unverified. |
| 8 | Move-up/down fallback | PASS WITH LIMITATIONS | Button fallback remains implemented for blocks and containers. Not re-run in browser during v4. |
| 9 | Undo/redo | PASS WITH LIMITATIONS | Command stack remains implemented. Escape cancel now restores pre-lift template, undo stack, redo stack, and save status. Browser undo/redo for Move-to remains unverified. |
| 10 | Persistence rollback | PASS WITH LIMITATIONS | Save failure rollback remains implemented. The whole-template JSON snapshot is spike-only. Production should use a drag transaction or command rollback, not whole-template restore. |
| 11 | No production DB integration | VERIFIED PASS | Spike remains standalone in `spikes/builder-dnd/`; no Prisma/Wasp imports, entities, database tables, or Wasp API calls. |

## Keyboard Container-Navigation Policy

Boundary Arrow movement targets the previous or next **visible compatible container** in depth-first page order.

Compatible containers are sections and groups. This intentionally allows adjacent parent/child transitions:

- ArrowUp at the first block in a container moves the block to the end of the previous visible compatible container.
- ArrowDown at the last block in a container moves the block to the start of the next visible compatible container.
- If a group is the next visible compatible container after a section, ArrowDown enters the group.
- If a section is the next visible compatible container after a group, ArrowDown exits the group into that section.
- Non-adjacent moves should use the Move-to dialog.

This policy is documented in code near `findPreviousVisibleCompatibleContainer` and `findNextVisibleCompatibleContainer`.

## Move-to Operation

The Move-to modal lets the user choose a destination container and destination position, then dispatches `MOVE_BLOCK`.

Required browser verification remains open:

1. Create two sections.
2. Place blocks in both.
3. Open Move to... on a block.
4. Select the other section.
5. Select a destination position.
6. Execute Move.
7. Verify source count decreases.
8. Verify destination count increases.
9. Verify exact block position.
10. Undo and verify original position.
11. Redo and verify movement repeats.

This is intentionally **UNVERIFIED** until it is performed in a working built-in browser or equivalent real browser session.

## Ordering Strategy Comparison

| Criterion | Integer | Fractional | LexoRank |
| --- | --- | --- | --- |
| Implementation complexity | Low | Medium | High |
| Write amplification, 10 items | 10 writes | 1 write | 1 write |
| Write amplification, 100 items | 100 writes | 1 write | 1 write |
| Write amplification, 1000 items | 1000 writes | 1 write | 1 write |
| Precision/longevity | Unlimited with renumbering | Needs gap monitoring/renormalization | Needs key growth monitoring/rebalancing |
| Query simplicity | `ORDER BY sortOrder` | `ORDER BY sortOrder` | `ORDER BY sortKey`, collation must be considered |
| Debuggability | Excellent | Good until dense decimals | Moderate/poor |
| Collaborative suitability | Basic | Better | Better but complex |

## Recommendation

**Recommended strategy:** Integer ordering with transactional renumbering.

For v1 single-user template editing, containers are expected to be small enough that renumbering all items in the affected container is simpler, safer, and easier to debug than fractional or string ranking. Use `sortOrder: Int` and persist the complete affected-container order after moves.

If collaborative editing or very large containers become real requirements later, revisit fractional ordering with explicit normalization. LexoRank-style strings are not recommended for v1 because they add complexity and reduce operational clarity.

## dnd-kit Assessment

**Verdict:** Continue evaluating @dnd-kit/react, but do not advance pointer DnD to production on this spike alone.

@dnd-kit/react v0.5 provides the expected primitives (`DragDropProvider`, `useDraggable`, `useDroppable`, sensors, and `DragOverlay`), and the spike wiring compiles. However, the critical manual pointer-drag and auto-scroll behaviors remain unverified. Production Phase 3D should include a real-browser acceptance test before committing to this library for the builder.

## Spike-Only Rollback Note

The whole-template JSON snapshot used for save failure and keyboard Escape restore is acceptable only for this disposable spike. Production builder code should use explicit drag transactions, command rollback, or server-backed draft revision recovery instead of restoring the entire template object from JSON.

## Checks Run

```bash
cd ~/dev/inspection-app/spikes/builder-dnd
npx tsc --noEmit
npm run build
npm run dev -- --host 0.0.0.0
curl -I http://localhost:5173/
```

Results:

- TypeScript check passed.
- Build passed.
- First Vite start in sandbox failed with `listen EPERM`; rerun outside sandbox succeeded.
- Fresh Vite restart succeeded.
- HTTP 200 confirmed from the fresh server.

## Known Limitations

- Manual pointer dragging is still unverified.
- Auto-scroll during actual active pointer drag is still unverified.
- Move-to UI flow is still unverified in a browser.
- Keyboard cross-container movement is implemented but not browser-verified after the fresh restart.
- Touch remains unverified.
- Browser verification was blocked by missing local browser tooling.

## Next Step

Do not start Phase 3A0-B PDF yet if pointer movement remains important to close Phase 3A0-A. The next best step is to run the manual built-in-browser verification checklist above with working browser access, then update this README with genuine pass/fail results.
