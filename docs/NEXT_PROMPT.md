# Next Prompt — After Phase 3A0-A v5 Stage B Pass

Continue in:

```text
~/dev/inspection-app
```

Use Agent mode.

## Current validated baseline

Phase 3A0-A v5 Stage B is MANUALLY VERIFIED PASS.

User manual testing completed 10 consecutive correct attempts for all Stage B operations and all Stage A regression operations.

Observed result:

- No wrong destinations.
- No wrong insertion positions.
- No duplicated blocks.
- No disappearing blocks.
- No bottom jumps.
- No preview/final-position mismatches.

## Validated Stage B scope

The isolated spike at `spikes/builder-dnd/` validates:

- stable container ids `section-a`, `section-b`, and `group-a1`;
- one controlled `Record<ContainerId, string[]>` sortable state model;
- one fixed nested group, `group-a1`, inside Section A;
- Section A → group;
- Section B → group;
- group → Section A;
- group → Section B;
- reorder within group;
- insert first/middle/last in group;
- drop into empty group;
- cancel cross-container drag with exact pre-drag state restoration;
- all Stage A regression operations.

## Still outside validated scope

- Touch remains UNVERIFIED.
- Dragging or reordering the group container itself remains outside Stage B validated scope.
- Stage C support behavior remains deferred.
- Phase 3A0-B PDF has not started.
- The standalone Vite visuals remain spike-only and are not a production UI reference.

## Architecture note

The approved sortable foundation remains:

- `@dnd-kit/react`;
- `@dnd-kit/helpers`;
- `DragDropProvider`;
- `useSortable`;
- compatible sortable groups;
- container-level droppable targets with lower collision priority than sortable block targets;
- controlled React state updated with `move(items, event)` during `onDragOver`;
- restoration of the pre-drag state when a drag is cancelled.

For Stage B specifically, collision priority is:

- Section containers: `1`;
- nested group container: `2`;
- sortable block items: `4`.

Do not rewrite this architecture without a specific documented technical reason.

## Possible next steps

Pick the next phase explicitly before editing code:

- Stage C support behavior: drag overlay polish, accessible Move-to fallback, keyboard movement, undo/redo acceptance evidence, and auto-scroll during real active pointer drag.
- Touch validation: real touch device or genuine browser touch emulation that exercises touch events.
- Phase 3A0-B PDF spike, if the user chooses to move on from builder DnD validation.

Keep production builder UI work separate. Future production UI must use the existing app's Tailwind/shadcn patterns plus `docs/UI_RULES.md` and `docs/FORM_BUILDER_MASTER_SPEC.md`.
