# Phase 3A-4C2B — Option CRUD, Ordering, and Contextual Default Integrity

Continue in:

```text
~/dev/inspection-app
```

Use:

```text
Mode: Agent / Go
Reasoning: highest available
```

Implement **Phase 3A checkpoint 3A-4C2B only**.

Do not stage or commit automatically.

## Current validated baseline

The following checkpoints are complete, committed, and pushed:

- Phase 3A0-A: nested sortable feasibility.
- Phase 3A0-B Gate 1: functional PDF feasibility.
- Phase 3A-1: production form-template schema.
- Phase 3A-2: controlled registries.
- Phase 3A-3: template ownership and lifecycle operations.
- Phase 3A-4A: definition-tree read model and page CRUD.
- Phase 3A-4B: container CRUD, compatibility, cycle prevention, and ordering.
- Phase 3A-4C1:
  - block CRUD;
  - immutable server-generated stable keys;
  - registry config validation;
  - block/container compatibility;
  - version-scoped block ordering.

- Phase 3A-4C2A:
  - `BlockOptionCapability` discriminated registry contract;
  - `single_select` declared option-backed;
  - heading, paragraph, and short_text declared option-disabled;
  - pure option-capability helpers;
  - database-enforced `@@unique([blockId, value])`.

Still deferred:

- builder UI;
- drag-and-drop integration;
- runtime forms;
- publishing;
- version cloning;
- canonical snapshots and hashing;
- reports;
- PDF Gate 2.

Do not represent deferred work as complete.

## Objective

Implement only:

1. authenticated option create, update, move, and delete actions;
2. option-capability enforcement;
3. per-block value uniqueness handling;
4. active-draft-only writes;
5. contiguous option ordering;
6. contextual `single_select.config.defaultValue` validation during block update;
7. atomic default maintenance when an option value changes or the default option is deleted;
8. focused tests and documentation.

## Critical default-value rule

A block cannot have persisted options before the block itself exists.

Therefore:

### `createFormBlock`

Continue rejecting a supplied `single_select.config.defaultValue`.

Do not add nested option creation to `createFormBlock`.

Do not accept an initial default value during block creation.

### `updateFormBlock`

Permit `single_select.config.defaultValue` only when:

- the config passes the registered config schema;
- the value exactly matches a persisted `FormBlockOption.value`;
- that option belongs to the same block.

A client clears the default by submitting a complete replacement config that omits `defaultValue`.

Do not accept `defaultValue: null`, because the registry schema defines the field as an optional string.

## Explicitly out of scope

Do not implement:

- nested option creation during block creation;
- batch option operations;
- option cloning;
- multi-select, ranking, matrix, or other future choice types;
- new registry capabilities;
- schema changes;
- migrations;
- builder UI;
- drag-and-drop;
- runtime forms;
- publishing;
- snapshots;
- hashing;
- reports;
- PDF work;
- package installation.

## Allowed changes

Expected areas:

```text
app/src/form-templates/
app/main.wasp.ts
docs/PROGRESS_LOG.md
docs/TODO.md
docs/NEXT_PROMPT.md
```

Minimal changes to existing block operation files are expected for contextual default validation.

Do not modify:

```text
app/schema.prisma
app/migrations/
app/package.json
app/src/form-builder/registry/
app/src/clients/
app/src/properties/
app/src/inspections/
spikes/
.env
.env.server
```

If a genuine schema or registry blocker is discovered, stop and report it before changing those areas.

## Step 0 — Repository inspection

Run:

```bash
cd ~/dev/inspection-app
pwd
git status --short
git log -5 --oneline
git diff --check
```

Confirm Phase 3A-4C2A is committed and the working tree is clean.

If unexplained changes exist, stop before editing.

## Step 1 — Read required context

Read completely:

```text
AGENTS.md
docs/FORM_BUILDER_DATA_MODEL.md
docs/FORM_BLOCK_CATALOG.md
docs/FORM_BUILDER_MASTER_SPEC.md
docs/FORM_PLATFORM_ROADMAP.md
docs/PERMISSIONS.md
docs/SECURITY_CHECKLIST.md
docs/PROGRESS_LOG.md
docs/TODO.md
docs/NEXT_PROMPT.md
app/schema.prisma
app/main.wasp.ts
app/src/form-builder/registry/types.ts
app/src/form-builder/registry/blockRegistry.ts
app/src/form-builder/registry/index.ts
app/src/form-templates/authorization.ts
app/src/form-templates/definitionAuthorization.ts
app/src/form-templates/definitionOrdering.ts
app/src/form-templates/blockOptionCapability.ts
app/src/form-templates/blockValidation.ts
app/src/form-templates/blockOperations.ts
app/src/form-templates/blockOperations.wasp.ts
app/src/form-templates/*.test.ts
```

Reuse existing authorization, lifecycle, ordering, transaction, registry, DTO, error, and Wasp conventions.

Avoid duplicating private block ownership helpers unnecessarily. Extract a narrowly reusable helper if needed, while preserving existing behavior and tests.

## Step 2 — Suggested files

Use a focused structure such as:

```text
app/src/form-templates/
  optionValidation.ts
  optionOperations.ts
  optionOperations.wasp.ts
  optionDefaultIntegrity.ts
  optionValidation.test.ts
  optionDefaultIntegrity.test.ts
  optionOperations.test.ts
```

A smaller or slightly different structure is acceptable if it reduces duplication and avoids circular imports.

## Step 3 — Strict input schemas

Use strict Zod schemas and UUID validation.

### Create option

```ts
{
  blockId: string;
  label: string;
  value: string;
  color?: string | null;
  score?: number | null;
  position?: number;
}
```

Rules:

- `blockId`: UUID;
- `label`:
  - trim;
  - minimum 1 character;
  - maximum 200 characters;

- `value`:
  - trim;
  - minimum 1 character;
  - maximum 120 characters;

- `color`:
  - optional and nullable;
  - trim strings;
  - blank string becomes `null`;
  - maximum 32 characters;

- `score`:
  - optional and nullable;
  - must be a finite number when supplied;

- `position`:
  - optional integer;
  - minimum zero;
  - omitted means append.

Do not accept:

```text
id
sortOrder
createdAt
updatedAt
templateVersionId
containerId
blockType
```

### Update option

```ts
{
  optionId: string;
  label?: string;
  value?: string;
  color?: string | null;
  score?: number | null;
}
```

Rules:

- at least one mutable field must be explicitly supplied;
- label/value/color/score validation matches create;
- omitted fields remain unchanged;
- `color: null` clears color;
- blank color normalizes to `null`;
- `score: null` clears score;
- `score: 0` must be treated as explicitly supplied.

Use own-property checks where required. Do not use truthiness checks for `score`, `color`, or other optional fields.

### Move option

```ts
{
	optionId: string;
	toIndex: number;
}
```

`toIndex` is the final zero-based index in the option’s existing block.

Cross-block option movement is not supported in this checkpoint.

### Delete option

```ts
{
	optionId: string;
}
```

Every schema must reject unknown properties.

## Step 4 — Safe result types

Use explicit result DTOs.

### Safe option

```ts
type SafeFormBlockOption = {
	id: string;
	blockId: string;
	label: string;
	value: string;
	sortOrder: number;
	color: string | null;
	score: number | null;
};
```

### Create result

```ts
{
  option: SafeFormBlockOption;
  orderedOptionIds: string[];
}
```

### Update result

```ts
{
	option: SafeFormBlockOption;
	blockDefaultValue: string | null;
}
```

### Move result

```ts
{
  optionId: string;
  orderedOptionIds: string[];
}
```

### Delete result

```ts
{
  deleted: true;
  optionId: string;
  blockId: string;
  versionId: string;
  orderedOptionIds: string[];
  clearedDefaultValue: boolean;
}
```

Do not return user IDs, template ownership data, raw relation objects, or internal registry definitions.

## Step 5 — Ownership and lifecycle

Every option mutation requires:

- authenticated user;
- template owned by that user;
- template lifecycle `ACTIVE`;
- version status `DRAFT`;
- stored block belonging to that version.

Use:

- HTTP 401 for unauthenticated access;
- HTTP 404 for missing or unowned blocks/options;
- HTTP 409 for archived templates or non-draft versions;
- HTTP 409 for malformed stored registry/config data;
- HTTP 400 for a valid stored block that does not support options.

Do not reveal another user’s resource existence.

For create:

```text
blockId
→ block.templateVersion
→ template.userId
```

For update/move/delete:

```text
optionId
→ option.block
→ block.templateVersion
→ template.userId
```

All ownership and lifecycle checks must occur through the Prisma transaction client inside the same transaction as the mutation.

Do not accept version IDs or user IDs from client input.

## Step 6 — Capability enforcement

Resolve the stored block definition through `blockRegistry`.

If the persisted `blockType` is not registered, return HTTP 409.

Use:

```ts
requireOptionBackedCapability(...)
```

Do not hard-code:

```ts
blockType === 'single_select';
```

for option CRUD eligibility.

A known option-disabled block should receive HTTP 400 when an option operation is attempted.

Enforce the capability bounds generically:

### Create

If `maximumOptions` is non-null and the resulting option count would exceed it, reject with HTTP 400.

### Delete

If deleting would result in fewer than `minimumOptions`, reject with HTTP 400.

The current `single_select` contract has:

```text
minimumOptions = 0
maximumOptions = null
```

so these checks currently do not restrict normal editing, but the operations must honor the registry contract.

## Step 7 — Duplicate-value handling

The database constraint:

```text
@@unique([blockId, value])
```

is authoritative.

Do not rely solely on a check-then-insert query.

Catch only the targeted Prisma `P2002` conflict for:

```text
blockId + value
```

Map it to HTTP 409 with a concise message such as:

```text
An option with this value already exists in the block.
```

Support Prisma `meta.target` represented as either:

- an array;
- a string.

Do not translate unrelated `P2002`, foreign-key, or general database failures into duplicate-option errors.

No retry loop is needed for user-supplied duplicate values.

## Step 8 — Ordering scope

An option sibling scope is:

```text
all FormBlockOption rows with blockId = authoritative block ID
```

Use deterministic loading:

```text
sortOrder ASC
id ASC
```

After create, move, or delete, option ordering must be:

```text
0, 1, 2, ...
```

with no gaps or duplicates.

Reuse:

```text
buildContiguousOrderUpdates
insertIdAt
moveIdToIndex
removeId
orderBySortOrderThenId
```

Normalization writes must use:

```ts
where: {
  id,
  blockId,
}
```

through `updateMany`.

If a normalization update affects anything other than exactly one row, return HTTP 409.

Do not normalize IDs obtained from an unscoped query.

## Step 9 — Exact index semantics

### Create

For a block currently containing `N` options:

```text
valid position: 0 through N
omitted position: N
```

### Move

For a block containing `N` options:

```text
valid toIndex: 0 through N - 1
```

Remove the option first, then insert it at its desired final index.

A same-index move is valid and must still normalize the complete scope.

### Delete

Delete the option and normalize all surviving siblings in its former block.

## Step 10 — Contextual default-value helpers

Create focused pure/data-access helpers for default integrity.

Do not embed all JSON mutation logic directly in option actions.

The helper must use the registry capability’s:

```text
defaultValueConfigKey
```

Do not hard-code `"defaultValue"` throughout option operation code, except where required by the current config schema tests.

### Reading current config

For an option-backed block:

1. validate the persisted block config using the registered `configSchema`;
2. require the parsed result to be an object suitable for key access;
3. treat invalid persisted config as HTTP 409 stored-data corruption.

### Setting a default

To set a default:

1. parse the complete proposed config through the registry schema;
2. obtain the configured default key from the capability;
3. when a value is defined, query for an option with:
   - `blockId = current block`;
   - `value = proposed default`;

4. reject with HTTP 400 if no match exists.

### Clearing a default

To clear the default:

1. copy the parsed config object;
2. delete the default key;
3. reparse the resulting complete config through the registry schema;
4. store the parsed result.

Do not store JavaScript `undefined` inside Prisma JSON.

Do not overwrite unrelated config fields such as:

```text
allowOther
otherLabel
```

## Step 11 — Modify block config behavior

### `parseBlockConfig`

Keep it responsible only for registry schema parsing.

Remove the current block-type-specific unconditional rejection of `single_select.defaultValue`.

Do not add database queries to this pure parsing helper.

### `createFormBlock`

After parsing config:

- inspect the block’s `optionCapability`;
- if an option-backed block contains a defined default key, reject with HTTP 400;
- explain that persisted options must be created before assigning a default.

This create-only restriction is required because the block has no ID or persisted options yet.

Do not add options to the create-block input.

### `updateFormBlock`

Inside its existing transaction:

1. resolve the owned active-draft block;
2. parse the proposed complete config when supplied;
3. if the block is option-backed and its default key is defined:
   - verify a matching persisted option under that exact block;

4. reject unmatched defaults with HTTP 400;
5. store the parsed config only after contextual validation succeeds.

Updating a non-config field without supplying config must leave the existing config unchanged.

## Step 12 — Atomic option/default consistency

### Updating an option value

If:

```text
block.config[current default key] === option.oldValue
```

and the option value changes:

1. update the option value;
2. copy the current parsed block config;
3. replace the default with the new option value;
4. reparse the block config;
5. update the block config;

all inside the same transaction.

If the option update hits the duplicate-value constraint, the entire transaction must roll back, including any block config change.

If the changed option was not the current default, leave block config unchanged.

### Deleting the default option

If the deleted option’s value equals the current default:

1. delete the option;
2. remove the default key from a copy of the block config;
3. reparse the config;
4. update the block;
5. normalize surviving option ordering;

all inside the same transaction.

Return:

```text
clearedDefaultValue: true
```

If the deleted option was not the current default, leave config unchanged and return `false`.

### Creating and moving options

Creating or moving an option must not automatically assign or alter the default.

## Step 13 — Public actions

Implement:

```text
createFormBlockOption
updateFormBlockOption
moveFormBlockOption
deleteFormBlockOption
```

### Create

Inside one transaction:

1. resolve authenticated owned active-draft block;
2. resolve stored block definition;
3. require option capability;
4. load block-scoped siblings;
5. enforce maximum count;
6. validate insertion position;
7. create option;
8. map targeted duplicate conflict to 409;
9. normalize complete ordering;
10. return safe result.

### Update

Inside one transaction:

1. resolve authenticated owned active-draft option and parent block;
2. resolve stored block definition;
3. require option capability;
4. calculate explicit update data;
5. update the option;
6. if the old value was the current default and changed:
   - update block config atomically;

7. map targeted duplicate conflict to 409;
8. return safe result and effective default.

### Move

Inside one transaction:

1. resolve authenticated owned active-draft option;
2. require option capability;
3. load all siblings under the authoritative block;
4. apply final-index semantics;
5. normalize all siblings;
6. return ordered IDs.

### Delete

Inside one transaction:

1. resolve authenticated owned active-draft option;
2. require option capability;
3. load sibling IDs;
4. enforce minimum count;
5. determine whether it is the current default;
6. delete the option;
7. clear default atomically when required;
8. normalize remaining siblings;
9. return safe deletion result.

## Step 14 — Transaction rules

Use interactive Prisma transactions with:

```ts
Prisma.TransactionIsolationLevel.RepeatableRead;
```

After entering the transaction, all of the following must use `tx`:

- ownership lookup;
- lifecycle lookup;
- block and option reads;
- config/contextual validation reads;
- mutation;
- duplicate-producing database write;
- block config update;
- ordering normalization.

Global `prisma` should only open the transaction.

Do not retry failed statements inside an aborted transaction.

## Step 15 — Wasp declarations

Create a focused feature spec and register:

```text
createFormBlockOption
updateFormBlockOption
moveFormBlockOption
deleteFormBlockOption
```

Use:

```text
auth: true
```

Declare only genuinely needed entities, likely:

```text
FormTemplate
FormTemplateVersion
FormBlockDefinition
FormBlockOption
```

Add `FormContainerDefinition` only if genuinely required by the selected ownership query.

Do not add pages, routes, or navigation.

Import the spec exactly once in `app/main.wasp.ts`.

## Step 16 — Tests

Use existing test tooling only.

Add focused tests covering at least:

### Input validation

- valid create/update/move/delete input;
- invalid UUIDs;
- unknown properties;
- blank label;
- blank value;
- overlong label/value/color;
- fractional/negative position and move index;
- non-finite score;
- update with no mutable fields;
- `score: 0` is applied;
- `score: null` clears;
- `color: null` clears;
- blank color becomes null;
- raw `sortOrder`, `blockId` on update, timestamps, and persistence fields rejected.

### Ownership and lifecycle

- unauthenticated rejected;
- owned active draft permits writes;
- unowned block/option appears not found;
- archived template rejected;
- published version rejected;
- superseded version rejected;
- failed checks perform no mutation.

### Capability

- `single_select` accepts option operations;
- heading rejects;
- paragraph rejects;
- short_text rejects;
- unknown persisted block type produces 409;
- maximum option count enforced using a synthetic capability;
- minimum option count enforced using a synthetic capability.

### Duplicate values

- duplicate create returns targeted 409;
- duplicate update returns targeted 409;
- same value in another block is allowed conceptually;
- unrelated `P2002` is rethrown;
- non-`P2002` database errors are rethrown;
- duplicate failure rolls back default/config mutation.

### Ordering

- create append;
- create at start;
- create in middle;
- invalid create position;
- move upward;
- move downward;
- same-index move still normalizes;
- invalid move index;
- delete compacts ordering;
- deterministic tie handling by ID;
- every normalization write includes `id + blockId`;
- failed scoped normalization count returns 409.

### Default behavior

- create block without default accepted;
- create block with default remains rejected;
- update block with matching persisted option default accepted;
- update block with missing default rejected;
- option from another block cannot satisfy default;
- clearing default by omitting it from replacement config succeeds;
- changing current default option value updates block config;
- changing a non-default option leaves config unchanged;
- deleting current default clears it;
- deleting non-default leaves config unchanged;
- unrelated config keys are preserved;
- malformed persisted option-backed config returns 409;
- all option/default changes are atomic and use `tx`.

### Regression

All existing page, container, block, registry, stable-key, and capability tests must remain enabled and pass.

Do not weaken or delete existing assertions merely to satisfy compilation.

## Step 17 — Verification

Run:

```bash
cd ~/dev/inspection-app/app

npx --no-install vitest run \
  --config src/form-templates/vitest.config.ts \
  --reporter=verbose

npx --no-install vitest run \
  --config src/form-builder/registry/vitest.config.ts \
  --reporter=verbose
```

Then:

```bash
cd ~/dev/inspection-app

git diff --check
make check
```

Run:

```bash
cd ~/dev/inspection-app/app
npx prisma validate
```

Run a Wasp compile smoke test:

```bash
wasp start
```

If Wasp compiles but cannot connect to PostgreSQL, report the distinction precisely.

Stop processes cleanly.

Inspect restricted scope:

```bash
cd ~/dev/inspection-app

git status --short
git diff --stat
git diff -- \
  app/schema.prisma \
  app/migrations \
  app/package.json \
  app/src/form-builder/registry \
  app/src/clients \
  app/src/properties \
  app/src/inspections \
  spikes
```

The restricted diff must contain no checkpoint-related changes.

## Step 18 — Documentation

After implementation and verification succeed, update narrowly:

### `docs/PROGRESS_LOG.md`

Record completion of:

- option CRUD;
- option capability enforcement;
- duplicate-value handling;
- contiguous option ordering;
- contextual default validation;
- atomic default maintenance.

Record explicitly that UI, runtime, publishing, cloning, reports, and PDF work remain deferred.

### `docs/TODO.md`

Mark only Phase 3A-4C2B items complete.

### `docs/NEXT_PROMPT.md`

Do not replace it with another short bullet-list placeholder.

Read the roadmap and current incomplete Phase 3A work, then write a substantial implementation-ready prompt for the next smallest backend checkpoint.

Likely remaining Phase 3A areas include:

- whole-draft definition validation;
- version cloning;
- publish transaction;
- canonical snapshot creation;
- snapshot hashing;
- published immutability verification.

Do not implement those areas during this checkpoint.

Do not update `docs/DECISIONS.md` unless a genuinely new architectural decision was required.

## Do not do

- Do not change schema or migrations.
- Do not modify registries.
- Do not add new option-backed block types.
- Do not add nested option creation to block creation.
- Do not add cross-block option movement.
- Do not implement batch operations.
- Do not add UI.
- Do not implement runtime forms.
- Do not implement publishing, cloning, snapshots, or hashes.
- Do not install packages.
- Do not stage or commit.

## Final report

Report:

1. Exact files created and modified.
2. Public action inventory.
3. Strict input schemas and null/clear semantics.
4. Safe result DTOs.
5. Ownership and lifecycle enforcement.
6. Option-capability enforcement.
7. Duplicate-value database error handling.
8. Exact create/move/delete index semantics.
9. Block-scoped ordering and normalization safeguards.
10. Contextual default validation.
11. Create-block default restriction.
12. Atomic option-value/default synchronization.
13. Atomic delete/default clearing.
14. Transaction boundaries and isolation.
15. Wasp declarations.
16. Tests and complete results.
17. `git diff --check`.
18. `make check`.
19. Prisma validation.
20. Wasp compile/start result.
21. Final `git status --short`.
22. Documentation changes.
23. Confirmation that schema, migrations, registries, UI, runtime, publishing, reports, and PDF work were untouched.
24. Proposed commit message:

```text
feat(3a): add option operations and default integrity
```

Do not commit automatically.
