# Form Builder Data Model

**Created:** 2026-06-17
**Status:** Planning — specification. Ordering strategy is unresolved pending Phase 3A0-A spike. Container reference approach is unresolved pending further analysis.

---

## 1. Form-Definition Model Comparison

Three approaches were analyzed for storing template structure (pages, sections, groups, blocks).

### Model A — Separate Page, Section, and Block tables

Dedicated tables for each structural level:

```
FormPageDefinition (id, templateVersionId, title, sortOrder, timestamps)
FormSectionDefinition (id, pageId, title, sortOrder, collapsible, timestamps)
FormBlockDefinition (id, sectionId|groupId, blockType, config, sortOrder,
                     containerType, containerId, ...)
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
- Polymorphic containers: a block can be in a section, group, column, or repeater. Model A still requires a `containerType` + `containerId` pattern alongside explicit FKs
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

### Model C — Hybrid (Recommended structure, with unresolved FK question)

Pages are a separate table (top-level concept). Containers are unified. Blocks are leaf nodes. **The exact FK relationship between blocks and containers is unresolved** — see Section 2 below.

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
- Blocks are leaf nodes with validated JSON configs — separate table with polymorphic container reference
- Self-referential containers (`parentContainerId`) enable nested groups without schema changes
- `stableKey` on blocks is the universal reference for rules, bindings, and report data mapping

---

## 2. Container Reference Approach (UNRESOLVED)

Two approaches for how blocks reference their parent container. This decision affects referential integrity and query patterns.

### Approach 2a — Polymorphic containerType + containerId (string-based)

```prisma
model FormBlockDefinition {
  containerType  String   // 'page' | 'section' | 'group' | 'column_group' | 'repeater'
  containerId    String   // FK value — but Prisma cannot create polymorphic FKs
}
```

The `containerId` value is the ID of the target container, but Prisma does not support polymorphic foreign keys. Referential integrity cannot be enforced at the database level. The application must validate that `containerId` refers to an existing record of type `containerType`.

**Pros:** Simple schema, flexible (new container types without schema changes), queries are straightforward (`WHERE containerType = 'section' AND containerId = X`).

**Cons:** No database-level referential integrity. Orphaned blocks possible if the application fails to clean up. Cannot use Prisma relation includes to traverse from block → container.

### Approach 2b — Explicit FK to FormContainerDefinition

```prisma
model FormBlockDefinition {
  containerId    String
  container      FormContainerDefinition @relation(fields: [containerId], references: [id])
}
```

Blocks always reference `FormContainerDefinition`. For blocks directly on a page (no intermediate container), a "virtual" container record is created automatically.

**Pros:** Full referential integrity at database level. Prisma relation navigation works (`include: { container: true }`). Cascading deletes work correctly.

**Cons:** Requires a container record for every block (even blocks directly on a page). The container table must handle the page-level case. The `containerType` field still needed but is now informational rather than structural.

**Recommendation:** Deferred to Phase 3A implementation analysis. Both approaches are compatible with the hybrid model. The explicit FK approach (2b) is preferred for data integrity but must be weighed against the added complexity of mandatory container records. The polymorphic approach (2a) is simpler but requires application-level integrity checks.

---

## 3. Ordering Strategy (UNRESOLVED)

The strategy for maintaining ordered positions of pages, containers, and blocks is **unresolved** as of this specification. Phase 3A0-A must implement and compare all three strategies below, then recommend one. The chosen strategy determines the `sortOrder` column type in the production schema (Phase 3A).

### Strategy 1 — Integer positions with transactional normalization

- Column type: `sortOrder: Int`
- On every move: renumber ALL items in the affected container (0, 1, 2, ...) within a database transaction
- Query: `ORDER BY sortOrder` (simple, fast)
- Write amplification: N writes per single move (where N = items in container)
- No precision issues; no gaps
- Simple to understand and debug

### Strategy 2 — Decimal/fractional ranking

- Column type: `sortOrder: Float`
- On move between A (sortOrder=1.0) and B (sortOrder=2.0): new item gets `(1.0 + 2.0) / 2 = 1.5`
- Only the moved item is updated (single-row write)
- Float64 provides ~53 bits of mantissa precision
- Eventually runs out of precision with repeated mid-point insertions at the same position
- Mitigation: periodic renormalization — when minimum gap < 1e-10, renumber the container to integers
- Query: `ORDER BY sortOrder` (simple, fast)
- Edge cases: floating-point comparison may require rounding

### Strategy 3 — LexoRank-style string keys

- Column type: `sortKey: String`
- Alphabet: e.g., "0123456789abcdefghijklmnopqrstuvwxyz"
- On move between A and B: generate a key lexicographically between them (e.g., between "a" and "b" → "an")
- Infinite insertions between any two keys without rebalancing
- Single-row update per move
- Used in production by Jira, Notion, Linear for real-time collaborative ordering
- Key length grows with repeated mid-point insertions
- Mitigation: periodic rebalancing to shorten keys
- Query: `ORDER BY sortKey` (string comparison, slightly slower than numeric)
- Implementation complexity: higher than the other two strategies

### Comparison criteria (to be evaluated by Phase 3A0-A spike)

| Criterion | Integer | Fractional | LexoRank |
|-----------|---------|------------|----------|
| Implementation complexity | | | |
| Write amplification (10 items) | | | |
| Write amplification (100 items) | | | |
| Precision/longevity | | | |
| Query performance | | | |
| Debuggability | | | |
| Collaborative editing suitability | | | |
| Prisma compatibility | | | |

---

## 4. Entity-Relationship Specification

### `FormTemplate`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String (UUID) | @id @default(uuid()) | Primary key |
| name | String | Required, max 200 chars | Template display name |
| description | String? | Optional, max 2000 chars | Template description |
| category | String? | Optional | User-defined category |
| tags | String[] | Optional | User-defined tags |
| userId | String | FK → User.id | Owner |
| user | User | @relation(fields: [userId], references: [id]) | Owner relation |
| status | String | Default "Draft" | Draft, Published, Archived |
| createdAt | DateTime | @default(now()) | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last update timestamp |

Indexes: `@@index([userId])`

### `FormTemplateVersion`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String (UUID) | @id @default(uuid()) | Primary key |
| templateId | String | FK → FormTemplate.id | Parent template |
| template | FormTemplate | @relation(fields: [templateId], references: [id]) | Parent relation |
| versionNumber | Int | Required | Sequential version number |
| status | String | Default "Draft" | Draft, Published, Archived |
| publishedAt | DateTime? | Nullable | When published |
| snapshot | JSON? | Nullable | Serialized full block tree (set on publish) |
| createdAt | DateTime | @default(now()) | Creation timestamp |

Indexes: `@@index([templateId])`, `@@unique([templateId, versionNumber])`

Deletion: Versions cascade-deleted when template deleted (except: restrict if any FormInstance references the version).

### `FormPageDefinition`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String (UUID) | @id @default(uuid()) | Primary key |
| templateVersionId | String | FK → FormTemplateVersion.id | Parent version |
| templateVersion | FormTemplateVersion | @relation(fields: [templateVersionId], references: [id]) | Parent relation |
| title | String | Required, max 200 chars | Page title |
| sortOrder | (TBD by spike) | Required | Page order |
| createdAt | DateTime | @default(now()) | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last update timestamp |

Indexes: `@@index([templateVersionId])`

Deletion: Cascade to containers on this page. Cascade to blocks directly on this page (if approach 2a).

### `FormContainerDefinition`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String (UUID) | @id @default(uuid()) | Primary key |
| templateVersionId | String | FK → FormTemplateVersion.id | Parent version |
| containerType | String | Required | section, group, column_group, repeater, tab_group |
| pageId | String? | FK → FormPageDefinition.id (nullable) | Parent page (for sections) |
| parentContainerId | String? | Self-referential FK | Parent container (for nested groups/columns) |
| title | String? | Optional, max 200 chars | Container title |
| config | JSON? | Optional | Container-specific configuration |
| sortOrder | (TBD by spike) | Required | Order within parent |
| createdAt | DateTime | @default(now()) | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last update timestamp |

Indexes: `@@index([templateVersionId])`, `@@index([pageId])`, `@@index([parentContainerId])`

Deletion: Cascade to child containers. Cascade to blocks in this container. Self-referential: deleting a parent container cascades to all nested children.

### `FormBlockDefinition`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String (UUID) | @id @default(uuid()) | Primary key |
| templateVersionId | String | FK → FormTemplateVersion.id | Parent version |
| blockType | String | Required | Block type identifier (registry key) |
| blockImplementationVersion | Int | Required | Runtime behavior version |
| configSchemaVersion | Int | Required | Config schema version |
| config | JSON | Required | Validated block configuration |
| containerType | String | Required | Type of parent container (or 'page') |
| containerId | String | Required | ID of parent container or page |
| sortOrder | (TBD by spike) | Required | Order within container |
| stableKey | String | Required, unique within version | Stable identifier for rules/bindings/references |
| label | String | Required, max 200 chars | Display label |
| required | Boolean | @default(false) | Whether a response is required |
| conditionalVisibility | JSON? | Optional | Declarative visibility rule |
| validation | JSON? | Optional | Additional validation rules (min/max/regex) |
| createdAt | DateTime | @default(now()) | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last update timestamp |

Indexes: `@@index([templateVersionId])`, `@@index([containerType, containerId])`, `@@unique([templateVersionId, stableKey])`

Deletion: Cascade to block options.

### `FormBlockOption`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String (UUID) | @id @default(uuid()) | Primary key |
| blockId | String | FK → FormBlockDefinition.id | Parent block |
| block | FormBlockDefinition | @relation(fields: [blockId], references: [id], onDelete: Cascade) | Parent relation |
| label | String | Required | Option display label |
| value | String | Required | Option value |
| sortOrder | Int | Required | Order within option list |
| color | String? | Optional | Color for visual distinction |
| score | Float? | Optional | Score/weight for calculations |

Indexes: `@@index([blockId])`

---

## 5. Response Storage Model

### `FormInstance`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String (UUID) | @id @default(uuid()) | Primary key |
| templateVersionId | String | FK → FormTemplateVersion.id | Immutable reference to published version |
| userId | String | FK → User.id | Instance owner (the user filling the form) |
| title | String | Required | Instance title |
| status | String | Default "InProgress" | InProgress, Completed, Locked |
| startedAt | DateTime | @default(now()) | When the instance was created |
| completedAt | DateTime? | Nullable | When submitted |
| lockedAt | DateTime? | Nullable | When locked |
| createdAt | DateTime | @default(now()) | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last update timestamp |

Indexes: `@@index([userId])`, `@@index([templateVersionId])`

### `BlockResponse`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String (UUID) | @id @default(uuid()) | Primary key |
| instanceId | String | FK → FormInstance.id | Parent instance |
| blockDefinitionId | String | FK → FormBlockDefinition.id | Which template block this responds to |
| blockKey | String | Required (denormalized) | Stable key from the block definition |
| blockType | String | Required (denormalized) | Block type from the block definition |
| responseData | JSON | Required | Validated response data |
| createdAt | DateTime | @default(now()) | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last update timestamp |

Indexes: `@@index([instanceId])`, `@@unique([instanceId, blockDefinitionId])`

### `RepeatGroupInstance`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String (UUID) | @id @default(uuid()) | Primary key |
| instanceId | String | FK → FormInstance.id | Parent form instance |
| blockDefinitionId | String | FK → FormBlockDefinition.id | The repeating_group block |
| sortOrder | Int | Required | Order among group instances |
| createdAt | DateTime | @default(now()) | Creation timestamp |

### `RepeatGroupResponse`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String (UUID) | @id @default(uuid()) | Primary key |
| groupInstanceId | String | FK → RepeatGroupInstance.id | Parent group instance |
| blockDefinitionId | String | FK → FormBlockDefinition.id | Child block within repeating group |
| responseData | JSON | Required | Validated response data |
| sortOrder | Int | Required | Order position |
| createdAt | DateTime | @default(now()) | Creation timestamp |

---

## 6. Configuration Validation Flow

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

---

## 7. Ownership Rules

| Operation | Ownership Check |
|-----------|----------------|
| Create template | Set `userId = context.user.id` |
| Read template | `WHERE userId = context.user.id` |
| Update template | Load template, verify `template.userId === context.user.id` |
| Delete template | Load template, verify ownership |
| Publish version | Load template via version, verify ownership |
| Create instance | Set `userId = context.user.id`; verify template version is published |
| Read instance | `WHERE userId = context.user.id` |
| Save response | Load instance, verify `instance.userId === context.user.id`; verify `blockDefinitionId` exists in `instance.templateVersion`'s blocks |
| Submit instance | Load instance, verify ownership; validate all required blocks have responses |
| Access media | Load instance, verify ownership |
| Generate report | Load instance, verify ownership |
| Download report PDF | Load ReportExport, verify ownership via instance chain |

---

## 8. Future Migration Strategy

### Adding a new block type
1. Define the BlockTypeDefinition in the registry (all 10 required properties)
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
