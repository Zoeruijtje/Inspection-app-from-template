# Next Prompt — Phase 3A0-A v5 Stage B Nested Group Test

Continue Phase 3A0-A. Do not start the PDF spike yet.

Stage A manual pointer validation has passed. The v5 sortable architecture is approved as the drag-and-drop foundation, but the standalone Vite prototype visuals are not approved as final product design.

Important design rule:

- Do not treat the standalone Vite layout, styling, spacing, colors, or panel structure as a production visual reference.
- Production builder UI must later be rebuilt using the existing application's Tailwind/shadcn patterns, `docs/UI_RULES.md`, and `docs/FORM_BUILDER_MASTER_SPEC.md`.

Next isolated spike step: Stage B nested group.

Implement and manually verify:

- Add one group inside Section A.
- The group participates as a compatible sortable container.
- Move section → group.
- Move group → section.
- Move group → other section.
- Verify exact position after each drop.

Rules:

- Keep this inside `spikes/builder-dnd/`.
- Do not modify `app/`.
- Do not create migrations.
- Do not start Phase 3A0-B PDF.
- Keep touch `UNVERIFIED` unless genuine touch emulation or a real touch device is available.
- Keep visual caveats explicit: DnD architecture can pass while prototype design remains spike-only.

After Stage B testing, update:

- `spikes/builder-dnd/README.md`
- `docs/PROGRESS_LOG.md`
- `docs/TODO.md`
- `docs/DECISIONS.md`, if a new decision is made
- `docs/NEXT_PROMPT.md`

Run relevant checks and do not commit automatically.
