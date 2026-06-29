Phase 3A-4C2 — Option Capability Contract, Option CRUD, and Contextual Choice Validation

The next checkpoint must cover:

- adding an explicit controlled option-capability contract to block definitions;
- configuring `single_select` as option-backed;
- keeping heading, paragraph, and short_text option-disabled;
- option create/update/move/delete;
- option label/value validation;
- unique option values per block;
- version-scoped ownership through block/container/version/template;
- contiguous option ordering;
- enabling `single_select.defaultValue` only when it matches a persisted option;
- preventing deletion or value changes that invalidate the current default unless the default is cleared or updated atomically.

Do not implement Phase 3A-4C2 until explicitly requested.
