# Form Builder Data Model

**Created:** 2026-06-17
**Status:** Architecture baseline — key Phase 3A decisions resolved. Nested-container interaction remains subject to Stage B validation.

---

## 1. Form-Definition Model Comparison

Three approaches were analyzed for storing template structure (pages, sections, groups, blocks).

### Model A — Separate Page, Section, and Block tables

Dedicated tables for each structural level:

```
FormPageDefinition (id, templateVersionId, title, sortOrder, timestamps)
FormSectionDefinition (id, pageId, title, sortOrder, collapsible, timestamps)
FormBlockDefinition (id, containerId, blockType, config, sortOrder, ...)
FormBlockOption (id, blockId, label, value, sortOrder, ...)
```

**Pros:**

- Type-safe: each table has columns specific to its level
- Queryable: `SELECT blocks WHERE sectionId = X` is simple and indexed
- Relational integrity: foreign keys cascade correctly
- Familiar ORM patterns: Prisma relations work naturally
- Index-friendly: composite indexes on (parentId, sortOrder) are straightforward

**Cons:**

- Rigid hierarchy: adding a new container type (columns, tabs) requires schema changes or awkward nullable FKs
- Deep joins: loading the full template tree requires 4+ table joins
- Polymorphic containers: a block can be in a section, group, column, or repeater. Model A tends toward nullable parent FKs or unsupported polymorphic references unless all block parents are normalized as containers
- Nested groups (group within group) require self-referential patterns on the section/group table, which mixes levels

### Model B — One generic nested FormNodeDefinition tree

Single table for all structural elements:

```
FormNodeDefinition (id, templateVersionId, nodeType, config JSON, parentId?, sortOrder, path)
```

Node types: `page`, `section`, `group`, `block`, `column`, `repeater`.

**Pros:**

- Flexible hierarchy: any node type can contain any other (controlled by registry rules)
- Simple schema: one table, one set of CRUD operations
- Easy re-parenting: change `parentId`
- Materialized path possible for fast subtree queries

**Cons:**

- Type safety lost: every node has the same columns; block-specific fields buried in JSON
- Query complexity: recursive CTEs required for tree queries
- Prisma limitations: limited support for recursive relations; no native tree traversal
- Validation complexity: different rules per node type enforced entirely in application code
- Index challenges: compound indexes less effective when mixing page, section, and block nodes in one table
- Migration difficulty: changing a "section" concept affects the same table as "block" changes

### Model C — Hybrid (Recommended)

Pages are a separate table (top-level concept). Containers are unified. Blocks are leaf nodes. Blocks reference `FormContainerDefinition` with a real foreign key.

```
FormTemplate
  → FormTemplateVersion
    → FormPageDefinition (separate table — pages are top-level)
    → FormContainerDefinition (unified container table)
    → FormBlockDefinition (leaf block table)
    → FormBlockOption (choice options)
```

**Why this general approach:**

- Pages are a top-level concept (they represent logical or physical pages) — separate table justified
- Sections, groups, columns, repeaters share nesting and reordering behavior — unified container table reduces duplication
- Blocks are leaf nodes with validated JSON configs and a required `containerId` FK to `FormContainerDefinition`
- Self-referential containers (`parentContainerId`) enable nested groups without schema changes
- `stableKey` on blocks is the universal reference for rules, bindings, and report data mapping

---

## 2. Container Reference Approach

### Rejected approach — polymorphic containerType + containerId

```prisma
model FormBlockDefinition {
  containerType  String   // 'page' | 'section' | 'group' | 'column_group' | 'repeater'
  containerId    String   // FK value — but Prisma cannot create polymorphic FKs
}
```

This is rejected for the Phase 3A baseline. Prisma cannot create a real foreign key for a polymorphic target, so database-level referential integrity would be unavailable and orphaned blocks would be possible if application cleanup failed.

### Approved approach — explicit FK to FormContainerDefinition

```prisma
model FormBlockDefinition {
  containerId    String
  container      FormContainerDefinition @relation(
    fields: [containerId],
    references: [id],
    onDelete: Cascade
  )
}
```

Blocks always belong to a real `FormContainerDefinition`; `FormBlockDefinition.containerType` is not part of the baseline schema. Pages contain one or more root containers. If a page visually allows blocks directly on the page, the implementation creates one auto-managed page-root container that may contain many blocks, not one virtual container per block and not a polymorphic page/block parent.

Container types remain registry-controlled:

```text
section
group
column_group
column
repeating_group
conditional_container
tab_group
tab_panel
```

The exact list may be phased, but the registry must reject unsupported parent-child combinations.

---

## 3. Ordering Strategy

The Phase 3A baseline uses integer `sortOrder` values with transactional renumbering. Phase 3A0-A v5 Stage A manually validated flat sortable behavior with the current dnd-kit sortable architecture; nested containers remain pending Stage B validation.

### Approved strategy — integer positions with transactional normalization

- Column type: `sortOrder: Int`
- On every move: renumber all items in each affected parent scope (0, 1, 2, ...) within one database transaction
- Moving within one container renumbers that container
- Moving across containers renumbers both source and destination containers transactionally
- Query: `ORDER BY sortOrder` (simple, fast)
- Write amplification: N writes per single move (where N = items in container)
- No precision issues; no gaps
- Simple to understand and debug
- Invariant: within one parent scope, `sortOrder` values are unique and contiguous after every committed transaction

The following fields use `Int`:

```text
FormPageDefinition.sortOrder
FormContainerDefinition.sortOrder
FormBlockDefinition.sortOrder
FormBlockOption.sortOrder
RepeatGroupInstance.sortOrder
```

Do not add a broad database uniqueness constraint across polymorphic parent scopes. Enforce ordering invariants in the transaction for the concrete scope being changed.

### Ordering strategy comparison

| Criterion                         | Integer | Fractional | LexoRank |
| --------------------------------- | ------- | ---------- | -------- |
| Implementation complexity         | Low     | Medium     | High     |
| Write amplification (10 items)    | Up to 10 rows per affected container | Usually 1 row | Usually 1 row |
| Write amplification (100 items)   | Up to 100 rows per affected container | Usually 1 row | Usually 1 row |
| Precision/longevity               | No precision issues after normalization | Needs periodic renormalization after repeated midpoint inserts | Key length can grow; may need rebalancing |
| Query performance                 | Simple numeric order | Simple numeric order | String order; still workable but less transparent |
| Debuggability                     | Excellent | Good until gaps get dense | Harder for humans to inspect |
| Collaborative editing suitability | Limited without conflict handling | Better | Stronger fit for collaborative systems |
| Prisma compatibility              | Excellent | Good, with precision care | Good, with custom key generation |

Integer ordering is chosen because initial template editing is single-user, expected container sizes are modest, and deterministic transaction behavior is easier to test and debug. Fractional and lexicographic ranking remain future options if collaborative editing or high-frequency concurrent ordering becomes a real requirement. Lexicographic ranking is suitable for collaborative systems but introduces greater implementation and rebalancing complexity.

---

## 4. Template and Version Lifecycle

`FormTemplate` is the long-lived identity. `FormTemplateVersion` holds editable and published content.

```text
FormTemplate.lifecycleStatus:
ACTIVE | ARCHIVED
```

```text
FormTemplateVersion.status:
DRAFT | PUBLISHED | SUPERSEDED
```

Rules:

- At most one active draft per template unless intentionally changed later.
- Published versions are immutable.
- Publishing a newer version may mark the previous latest published version `SUPERSEDED`.
- Superseded versions remain available for historical instances and report regeneration.
- Archiving a template does not delete historical versions.

Use enums in the production schema rather than unconstrained strings.

---

## 5. Entity-Relationship Specification

### `FormTemplate`

| Field       | Type          | Constraints                                   | Description                |
| ----------- | ------------- | --------------------------------------------- | -------------------------- |
| id          | String (UUID) | @id @default(uuid())                          | Primary key                |
| name        | String        | Required, max 200 chars                       | Template display name      |
| description | String?       | Optional, max 2000 chars                      | Template description       |
| category    | String?       | Optional                                      | User-defined category      |
| tags        | String[]      | Optional                                      | User-defined tags          |
| userId      | String        | FK → User.id                                  | Owner                      |
| user        | User          | @relation(fields: [userId], references: [id]) | Owner relation             |
| lifecycleStatus | FormTemplateLifecycleStatus | Default ACTIVE                                | ACTIVE or ARCHIVED         |
| createdAt   | DateTime      | @default(now())                               | Creation timestamp         |
| updatedAt   | DateTime      | @updatedAt                                    | Last update timestamp      |

Indexes: `@@index([userId])`

### `FormTemplateVersion`

| Field         | Type          | Constraints                                       | Description                                 |
| ------------- | ------------- | ------------------------------------------------- | ------------------------------------------- |
| id            | String (UUID) | @id @default(uuid())                              | Primary key                                 |
| templateId    | String        | FK → FormTemplate.id                              | Parent template                             |
| template      | FormTemplate  | @relation(fields: [templateId], references: [id]) | Parent relation                             |
| versionNumber | Int           | Required                                          | Sequential version number                   |
| status        | FormTemplateVersionStatus | Default DRAFT                                    | DRAFT, PUBLISHED, SUPERSEDED                |
| publishedAt   | DateTime?     | Nullable                                          | When published                              |
| snapshot      | JSON?         | Nullable                                          | Canonical serialized template tree set on publish |
| snapshotSchemaVersion | Int?   | Nullable                                          | Snapshot format version                     |
| snapshotHash  | String?       | Nullable                                          | Integrity hash for the canonical snapshot   |
| createdAt     | DateTime      | @default(now())                                   | Creation timestamp                          |

Indexes: `@@index([templateId])`, `@@unique([templateId, versionNumber])`

Deletion: Versions cascade-deleted when template deleted (except: restrict if any FormInstance references the version).

### `FormPageDefinition`

| Field             | Type                | Constraints                                              | Description           |
| ----------------- | ------------------- | -------------------------------------------------------- | --------------------- |
| id                | String (UUID)       | @id @default(uuid())                                     | Primary key           |
| templateVersionId | String              | FK → FormTemplateVersion.id                              | Parent version        |
| templateVersion   | FormTemplateVersion | @relation(fields: [templateVersionId], references: [id]) | Parent relation       |
| title             | String              | Required, max 200 chars                                  | Page title            |
| sortOrder         | Int                 | Required                                                 | Page order            |
| createdAt         | DateTime            | @default(now())                                          | Creation timestamp    |
| updatedAt         | DateTime            | @updatedAt                                               | Last update timestamp |

Indexes: `@@index([templateVersionId])`

Deletion: Cascade to root containers on this page; containers cascade to child containers and blocks.

### `FormContainerDefinition`

| Field             | Type           | Constraints                           | Description                                       |
| ----------------- | -------------- | ------------------------------------- | ------------------------------------------------- |
| id                | String (UUID)  | @id @default(uuid())                  | Primary key                                       |
| templateVersionId | String         | FK → FormTemplateVersion.id           | Parent version                                    |
| containerType     | String         | Required                              | section, group, column_group, column, repeating_group, conditional_container, tab_group, tab_panel |
| pageId            | String?        | FK → FormPageDefinition.id (nullable) | Parent page (for sections)                        |
| parentContainerId | String?        | Self-referential FK                   | Parent container (for nested groups/columns)      |
| title             | String?        | Optional, max 200 chars               | Container title                                   |
| config            | JSON?          | Optional                              | Container-specific configuration                  |
| sortOrder         | Int            | Required                              | Order within parent                               |
| createdAt         | DateTime       | @default(now())                       | Creation timestamp                                |
| updatedAt         | DateTime       | @updatedAt                            | Last update timestamp                             |

Indexes: `@@index([templateVersionId])`, `@@index([pageId])`, `@@index([parentContainerId])`

Deletion: Cascade to child containers. Cascade to blocks in this container. Self-referential: deleting a parent container cascades to all nested children.

Container parent invariants:

- A root container has `pageId` and no `parentContainerId`.
- A nested container has `parentContainerId` and no `pageId`.
- Application-level invariant: `(pageId IS NOT NULL) XOR (parentContainerId IS NOT NULL)`.
- Cycles are prevented in application validation before save/publish.
- Every container must belong to the same `templateVersionId` as its page, parent container, child containers, and child blocks.

### `FormBlockDefinition`

| Field                      | Type           | Constraints                     | Description                                     |
| -------------------------- | -------------- | ------------------------------- | ----------------------------------------------- |
| id                         | String (UUID)  | @id @default(uuid())            | Primary key                                     |
| templateVersionId          | String         | FK → FormTemplateVersion.id     | Parent version                                  |
| blockType                  | String         | Required                        | Block type identifier (registry key)            |
| blockImplementationVersion | Int            | Required                        | Runtime behavior version                        |
| configSchemaVersion        | Int            | Required                        | Config schema version                           |
| config                     | JSON           | Required                        | Validated block configuration                   |
| containerId                | String         | FK → FormContainerDefinition.id | Real parent container                           |
| container                  | FormContainerDefinition | @relation(fields: [containerId], references: [id], onDelete: Cascade) | Parent relation |
| sortOrder                  | Int            | Required                        | Order within container                          |
| stableKey                  | String         | Required, unique within version | Stable identifier for rules/bindings/references |
| label                      | String         | Required, max 200 chars         | Display label                                   |
| required                   | Boolean        | @default(false)                 | Whether a response is required                  |
| conditionalVisibility      | JSON?          | Optional                        | Declarative visibility rule                     |
| validation                 | JSON?          | Optional                        | Additional validation rules (min/max/regex)     |
| createdAt                  | DateTime       | @default(now())                 | Creation timestamp                              |
| updatedAt                  | DateTime       | @updatedAt                      | Last update timestamp                           |

Indexes: `@@index([templateVersionId])`, `@@index([containerId])`, `@@unique([templateVersionId, stableKey])`

Deletion: Cascade to block options.

### `FormBlockOption`

| Field     | Type                | Constraints                                                       | Description                   |
| --------- | ------------------- | ----------------------------------------------------------------- | ----------------------------- |
| id        | String (UUID)       | @id @default(uuid())                                              | Primary key                   |
| blockId   | String              | FK → FormBlockDefinition.id                                       | Parent block                  |
| block     | FormBlockDefinition | @relation(fields: [blockId], references: [id], onDelete: Cascade) | Parent relation               |
| label     | String              | Required                                                          | Option display label          |
| value     | String              | Required                                                          | Option value                  |
| sortOrder | Int                 | Required                                                          | Order within option list      |
| color     | String?             | Optional                                                          | Color for visual distinction  |
| score     | Float?              | Optional                                                          | Score/weight for calculations |

Indexes: `@@index([blockId])`, `@@unique([blockId, value])`

**Uniqueness invariant:** Within one block, each option value is unique. The same value may exist in a different block. This database constraint is enforced because option values are referenced by block configuration, responses, conditions, and reports.

### `BlockTypeDefinition.optionCapability`

Every block type must declare whether it supports ordered choices via a discriminated union:

```typescript
export type BlockOptionCapability =
  | { kind: "none" }
  | {
      kind: "options";
      selectionMode: "single";
      defaultValueConfigKey: "defaultValue";
      minimumOptions: number;
      maximumOptions: number | null;
    };
```

`optionCapability` is a required field on `BlockTypeDefinition`. The discriminated contract is extensible enough to carry option-specific behavior without checking block type names throughout the application.

**Production baseline declarations (Phase 3A-4C2A):**

| Block type      | Capability | Details |
| --------------- | ---------- | ------- |
| `heading`       | `{ kind: "none" }` | Not option-backed |
| `paragraph`     | `{ kind: "none" }` | Not option-backed |
| `short_text`    | `{ kind: "none" }` | Not option-backed |
| `single_select` | `{ kind: "options", selectionMode: "single", defaultValueConfigKey: "defaultValue", minimumOptions: 0, maximumOptions: null }` | Option-backed; draft minimum is 0 (block creatable before options added) |

Catalogue presence does not imply option support. Option support is declared solely by `optionCapability`.

---

## 6. Published Snapshot Authority

### Draft state

Normalized relational rows are the editable draft source of truth:

```text
FormPageDefinition
FormContainerDefinition
FormBlockDefinition
FormBlockOption
```

### Publish transaction

Publishing must:

1. validate the complete normalized tree;
2. validate registry schemas;
3. validate parent-child container compatibility;
4. validate unique stable keys;
5. detect rule/formula cycles;
6. normalize ordering;
7. serialize a canonical snapshot;
8. calculate an integrity hash;
9. store the snapshot schema version;
10. mark the version published and immutable in one transaction.

### Runtime authority

Once published:

- form runtime uses the immutable snapshot;
- report binding uses the immutable snapshot;
- historical regeneration uses the same snapshot;
- published normalized rows and snapshot are not edited;
- changes require a new draft version.

Published normalized rows may be retained for querying/debugging, but the immutable snapshot is the execution contract.

---

## 7. Response Storage Model

### `FormInstance`

| Field             | Type          | Constraints                 | Description                                |
| ----------------- | ------------- | --------------------------- | ------------------------------------------ |
| id                | String (UUID) | @id @default(uuid())        | Primary key                                |
| templateVersionId | String        | FK → FormTemplateVersion.id | Immutable reference to published version   |
| userId            | String        | FK → User.id                | Instance owner (the user filling the form) |
| title             | String        | Required                    | Instance title                             |
| status            | String        | Default "InProgress"        | InProgress, Completed, Locked              |
| startedAt         | DateTime      | @default(now())             | When the instance was created              |
| completedAt       | DateTime?     | Nullable                    | When submitted                             |
| lockedAt          | DateTime?     | Nullable                    | When locked                                |
| createdAt         | DateTime      | @default(now())             | Creation timestamp                         |
| updatedAt         | DateTime      | @updatedAt                  | Last update timestamp                      |

Indexes: `@@index([userId])`, `@@index([templateVersionId])`

### `BlockResponse`

| Field             | Type          | Constraints                 | Description                           |
| ----------------- | ------------- | --------------------------- | ------------------------------------- |
| id                | String (UUID) | @id @default(uuid())        | Primary key                           |
| instanceId        | String        | FK → FormInstance.id        | Parent instance                       |
| blockDefinitionId | String        | FK → FormBlockDefinition.id | Which template block this responds to |
| blockKey          | String        | Required (denormalized)     | Stable key from the block definition  |
| blockType         | String        | Required (denormalized)     | Block type from the block definition  |
| responseData      | JSON          | Required                    | Validated response data               |
| createdAt         | DateTime      | @default(now())             | Creation timestamp                    |
| updatedAt         | DateTime      | @updatedAt                  | Last update timestamp                 |

Indexes: `@@index([instanceId])`, `@@unique([instanceId, blockDefinitionId])`

### `RepeatGroupInstance`

| Field             | Type          | Constraints                 | Description                 |
| ----------------- | ------------- | --------------------------- | --------------------------- |
| id                | String (UUID) | @id @default(uuid())        | Primary key                 |
| instanceId        | String        | FK → FormInstance.id        | Parent form instance        |
| blockDefinitionId | String        | FK → FormBlockDefinition.id | The repeating_group block   |
| sortOrder         | Int           | Required                    | Order among group instances |
| createdAt         | DateTime      | @default(now())             | Creation timestamp          |

### `RepeatGroupResponse`

| Field             | Type          | Constraints                 | Description                        |
| ----------------- | ------------- | --------------------------- | ---------------------------------- |
| id                | String (UUID) | @id @default(uuid())        | Primary key                        |
| groupInstanceId   | String        | FK → RepeatGroupInstance.id | Parent group instance              |
| blockDefinitionId | String        | FK → FormBlockDefinition.id | Child block within repeating group |
| responseData      | JSON          | Required                    | Validated response data            |
| sortOrder         | Int           | Required                    | Order position                     |
| createdAt         | DateTime      | @default(now())             | Creation timestamp                 |

---

## 8. Configuration Validation Flow

1. Client sends `{ blockType, config }` to server (or saves a FormBlockDefinition with config)
2. Server looks up `blockRegistry.get(blockType)`
3. If block type not found in registry → return 400 "Unknown block type"
4. Server gets `configSchema` from registry entry (at the current `configSchemaVersion`)
5. Server validates `config` against `configSchema` using Zod
6. If the block already exists and its stored `configSchemaVersion` < current version → run `configMigrationStrategy(oldConfig)` to upgrade
7. If validation fails → return structured errors: `[{ path: "fieldName", message: "..." }]`
8. If validation passes → save block

On publish, run full template validation:

- All blocks have valid configs against current registry schemas
- No orphan `stableKey` references in conditional logic or formulas
- No rule cycles (dependency graph topological sort)
- At least one page exists
- No duplicate `stableKey` values within the version
- Parent-child container compatibility matches the structural registry
- `sortOrder` values are normalized within every parent scope

---

## 9. Ownership Rules

| Operation           | Ownership Check                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Create template     | Set `userId = context.user.id`                                                                                                        |
| Read template       | `WHERE userId = context.user.id`                                                                                                      |
| Update template     | Load template, verify `template.userId === context.user.id`                                                                           |
| Delete template     | Load template, verify ownership                                                                                                       |
| Publish version     | Load template via version, verify ownership                                                                                           |
| Create instance     | Set `userId = context.user.id`; verify template version is published                                                                  |
| Read instance       | `WHERE userId = context.user.id`                                                                                                      |
| Save response       | Load instance, verify `instance.userId === context.user.id`; verify `blockDefinitionId` exists in `instance.templateVersion`'s blocks |
| Submit instance     | Load instance, verify ownership; validate all required blocks have responses                                                          |
| Access media        | Load instance, verify ownership                                                                                                       |
| Generate report     | Load instance, verify ownership                                                                                                       |
| Download report PDF | Load ReportExport, verify ownership via instance chain                                                                                |

---

## 10. Future Migration Strategy

### Adding a new block type

1. Define the BlockTypeDefinition in the registry (all 11 required properties, including `optionCapability`)
2. Register it: `registerBlockType(newBlockDef)`
3. No schema changes required (config stored as JSON in existing FormBlockDefinition table)
4. New block type immediately available in the builder palette

### Evolving a block type's config schema

1. Increment `configSchemaVersion` in the registry entry
2. Update `configSchema` to the new Zod schema
3. Provide a `configMigrationStrategy` function that transforms old config → new config
4. Existing blocks with old `configSchemaVersion` are auto-migrated on next save
5. Blocks with no migration strategy are flagged for manual review

### Evolving a block type's response schema

1. Update `responseSchema` in the registry entry
2. Existing responses in completed/locked instances are NOT migrated (historical integrity)
3. New responses validated against the new schema
4. Reports reading old responses must handle the old response shape
