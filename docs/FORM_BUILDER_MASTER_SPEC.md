# Form Builder Master Specification

**Created:** 2026-06-17
**Status:** Planning — specification only. No implementation.

---

## 1. Builder Overview

The template builder is a **desktop-first, three-panel web application** for constructing form templates from a controlled block catalogue. It is designed for professional users who need to create structured inspection forms, surveys, checklists, and data-collection workflows.

### Layout

```
┌─────────────┬──────────────────────────────┬─────────────┐
│   LEFT      │         CENTER                │   RIGHT     │
│   Block     │         Canvas                │ Properties  │
│   Palette   │  (pages / sections / groups   │   Panel     │
│             │   / blocks)                   │             │
│             │                               │             │
└─────────────┴──────────────────────────────┴─────────────┘
│                      TOP TOOLBAR                          │
└──────────────────────────────────────────────────────────┘
```

On viewports narrower than 1024px, panels collapse into a single-column mode with a bottom tab bar: Canvas | Palette | Properties.

### Design principles

- **Visual fidelity:** The canvas preview should closely represent how the form will appear at runtime
- **Direct manipulation:** Click to select; drag to reorder; type to edit labels
- **Undo everywhere:** Every mutation is reversible
- **Save safety:** Autosave with clear status; never lose work
- **Accessible:** Keyboard operation, screen-reader announcements, sufficient contrast

---

## 2. Left Panel — Block Palette

The palette displays all available block types organized by category.

### Categories (in order)

1. **Structure** — pages, sections, groups, columns, repeaters, dividers, spacers, page breaks
2. **Display / Content** — headings, paragraphs, rich text, instructions, static images, auto-filled details, disclaimers
3. **Basic Inputs** — short text, long text, number, decimal, currency, date, time, email, phone, URL, yes/no, checkbox, rating, measurement
4. **Choice Inputs** — single select, multi select, radio group, checkbox group, pass/fail/NA, compliant/NC/NI, priority
5. **Data / Calculation** — calculated value, formula, hidden value, auto number, prefilled fields, timestamps
6. **Media** — single photo, multiple photos, photo gallery, file attachment, signature
7. **Inspection / Workflow** — finding, defect assessment, recommendation, corrective action, cost estimate, approval, sign-off
8. **Report Blocks** — (shown only in report designer, not form builder)
9. **Advanced** — deferred blocks (matrix, drawing, barcode, chart, lookup)

### Palette behavior

- Each category is a collapsible accordion section
- Within each category, block types are shown as cards with: icon (lucide-react), label, and brief description tooltip
- **Search:** A search input at the top filters blocks by name or description across all categories
- **Click to add:** Clicking a block card adds it to the end of the currently active section on the canvas. The canvas scrolls to show the new block.
- **Drag to add (Phase 3D):** Dragging a block card from the palette into a specific position on the canvas
- **Favorites/recent:** A "Recently Used" section at the top showing the last 5 block types used (future)
- Palette is scrollable independently of the canvas

---

## 3. Center Panel — Builder Canvas

The canvas displays the template structure as a nested, visual tree.

### Page tabs

- Shown as horizontal tabs across the top of the canvas
- Each tab shows the page title (editable on double-click) and an unsaved-change dot
- "+" tab to add a new page
- Pages can be reordered by dragging tabs (Phase 3D) or via context menu
- Right-click a tab: Rename, Duplicate, Delete (with confirmation)

### Containers (sections, groups, columns)

- Each page contains one or more section containers
- Sections are shown as bordered regions with a title bar
- Groups are shown as nested bordered regions inside sections or other groups
- Column groups show vertical divider lines between columns
- Each container shows an "Add Block" button at the bottom
- Empty containers show a "Drop blocks here" placeholder
- Containers can be collapsed in the builder (title bar click) to reduce visual noise

### Block cards

- Each block is shown as a horizontal card within its container
- Card shows: block type icon (color-coded by category), label text, required indicator (\*), conditional indicator (◇)
- Click a card to select it → blue highlight border, properties load in right panel
- Selected card shows action buttons: ↥ (move up), ↧ (move down), ⧉ (duplicate), ✕ (delete)
- Drag handle on the left edge of each card (Phase 3D)
- Cards show validation errors as red left-border with an error count badge

### Visual states

- **Normal:** Card with border, icon, label
- **Selected:** Blue border, subtle blue background
- **Dragging:** Semi-transparent, raised shadow (Phase 3D)
- **Drop target:** Dashed outline between cards showing insertion position (Phase 3D)
- **Error:** Red left-border, error icon, error count
- **Conditional:** Small ◇ icon, dashed border (when conditional logic configured)
- **Required:** Red asterisk after label

### Canvas interactions

- Click empty area: deselect current block
- Escape: deselect current block
- Double-click block label: inline edit label
- Scroll: canvas scrolls vertically; page tabs remain fixed

---

## 4. Right Panel — Properties

The properties panel shows configuration for the selected block, container, or page.

### Tabs

1. **Content** — primary configuration (label, placeholder, default value, options list, heading level, etc.)
2. **Validation** — required toggle, min/max constraints, regex pattern, custom error message
3. **Logic** — conditional visibility rules; show this block when... (Phase 3G)
4. **Appearance** — CSS class overrides, width, visibility settings (future)
5. **Data** — stable key (read-only), prefilling source, calculation formula (Phase 3G)
6. **Report** — how this field appears in reports; report label override; include/exclude toggle (Phase 3K)
7. **Advanced** — block implementation version, config schema version (read-only debug info)

### Dynamic form rendering

The Content tab renders a form specific to the selected block type:

| Block Type      | Content Fields                                                 |
| --------------- | -------------------------------------------------------------- |
| `heading`       | Level (h1/h2/h3/h4), Text                                      |
| `paragraph`     | Text (textarea), Text formatting toggle                        |
| `short_text`    | Label, Placeholder, Default value, Max length                  |
| `long_text`     | Label, Placeholder, Default value, Rows                        |
| `number`        | Label, Min, Max, Step, Default, Unit label                     |
| `currency`      | Label, Currency code (EUR/USD/GBP), Min, Max                   |
| `date`          | Label, Min date, Max date, Default (today/none/specific)       |
| `yes_no`        | Label, Default (unset/yes/no), Display as (toggle/radio)       |
| `single_select` | Label, Options list (add/remove/reorder), Default, Allow other |
| `multi_select`  | Label, Options list, Min selections, Max selections            |
| `checkbox`      | Label, Checked by default                                      |
| `static_image`  | Image source (upload/URL), Alt text, Caption, Width            |
| `divider`       | Style (solid/dashed/dotted), Thickness, Color                  |
| `page_break`    | (no configurable properties)                                   |
| `section`       | Title, Collapsible, Initially collapsed                        |

### Properties behavior

- Changes are saved on blur or after a 1-second debounce
- Unsaved changes show a subtle highlight on the modified field
- Validation errors appear inline below the field
- The "Reset to default" link appears when a value differs from the block type's default

---

## 5. Top Toolbar

### Left section

- **Template title:** Editable inline text field. Click to edit, Enter to save, Escape to cancel.
- **Save status indicator:**
  - ✓ Saved (green) — all changes persisted
  - ● Dirty (yellow) — unsaved changes exist
  - ◌ Saving (blue spinner) — save in progress
  - ✕ Error (red) — save failed; click to retry

### Center section

- **Undo** (↶) — keyboard: Ctrl+Z
- **Redo** (↷) — keyboard: Ctrl+Shift+Z or Ctrl+Y
- Both buttons show disabled state when nothing to undo/redo

### Right section

- **Preview Form** (eye icon) — opens the form as an end-user would see it in a new tab or modal
- **Preview Report** (document icon) — opens report preview (future)
- **Validate** (checkmark icon) — runs full template validation, shows error list in a dialog
- **Version History** (clock icon) — opens version history panel
- **Publish** (rocket icon) — primary action button; opens confirmation dialog: "Publish version X? Published versions cannot be edited."
- **More** (⋯) — dropdown menu: Duplicate template, Archive template, Export as JSON, Template settings

---

## 6. Drag-and-Drop Behavior (Phase 3D)

### Phase 3A0-A validated decision

Phase 3A0-A v5 Stage A manually validated the current dnd-kit sortable architecture for flat compatible containers:

- `@dnd-kit/react` and `@dnd-kit/helpers` are approved as the drag-and-drop foundation.
- Blocks are sortable items using `useSortable`.
- Compatible containers share sortable groups and expose root/nested container droppables.
- Controlled React state updates happen during `onDragOver` with `move(items, event)`.
- Drag cancel restores the pre-drag snapshot/transaction state.
- Integer ordering with transactional source/destination renumbering is approved for initial persistence.
- The previous custom drop-slot architecture is rejected.

Nested groups, sortable containers themselves, touch, final keyboard flow, production auto-scroll, and production visual styling remain pending Stage B/C validation.

The standalone Vite spike validates interaction architecture only. Production UI must use the existing application's Tailwind/shadcn conventions and remain the desktop-first three-panel builder described in this document. Reuse the smooth sortable state architecture without copying the spike's visual styling.

### Required DnD capabilities

- **Sortable containers:** Reorder pages, sections within a page, groups within a section, blocks within any container
- **Cross-container movement:** Drag a block from section A to section B; from a group to a section; from a section into a group
- **Insertion indicators:** A horizontal line appears between blocks at the drop position during drag
- **Drag overlay:** A floating preview of the dragged block (icon + label) follows the cursor
- **Touch support:** Works on tablet viewports; no 300ms delay; scroll suppressed during drag
- **Keyboard alternatives:** Every drag operation achievable without a mouse (see Section 7)
- **Auto-scroll:** Canvas scrolls when dragging near the top or bottom edge
- **Collision detection:** Correctly identifies the drop target in nested sortable areas
- **Architecture guardrail:** Do not add custom gap droppables for every possible insertion point unless a future measured requirement proves the official sortable architecture insufficient

### Movement fallbacks

- Every block card shows ↑ and ↓ buttons on the right side (visible on hover, always visible on focus)
- ↑ moves the block up one position within its container
- ↓ moves the block down one position
- At the first position, ↑ is disabled. At the last position, ↓ is disabled.
- These buttons work completely independently of drag-and-drop
- Additionally: a "Move to..." dropdown in the block context menu allows relocating a block to a different compatible container and destination position
- Every movement must be achievable through keyboard interaction or the "Move to..." dialog/menu. Move-up/down buttons alone are insufficient for cross-container movement.

### Ordering persistence

Use `sortOrder: Int` with transactional normalization. Moving within one container renumbers that container to `0, 1, 2, ...`; moving across containers renumbers both source and destination containers in one transaction. Persist only committed movement, and roll back local optimistic state if the save fails.

---

## 7. Keyboard and Accessibility

### Keyboard navigation

- **Tab:** Move focus between interactive elements (toolbar → palette → canvas blocks → properties)
- **Arrow keys (canvas focused):** Navigate between blocks
- **Enter (on block):** Select block → Enter again to open properties
- **Space (on selected block):** Toggle selection / open action menu
- **Delete (on selected block):** Delete block with confirmation dialog
- **Ctrl+Z:** Undo
- **Ctrl+Shift+Z / Ctrl+Y:** Redo
- **Escape:** Deselect block / close dialog / cancel drag

### Screen-reader announcements

- "Block [label] of type [type] added to [container]"
- "Block [label] moved to position [N] in [container]"
- "Block [label] deleted"
- "Template saved"
- "Validation failed: [N] errors"
- Live region for drag-and-drop: "Dragging [label]. Drop position [N]."

### Visual accessibility

- Focus indicators visible on all interactive elements (2px outline, high contrast)
- Color is never the only differentiator: block type icons and text labels supplement color coding
- Error states use both color (red) and icon (⚠) with text description
- Required fields use both color (red asterisk) and text ("Required" in properties)
- All icons have aria-labels
- Sufficient color contrast (WCAG AA minimum)

### Touch targets

- Minimum 44×44px for all interactive elements (block cards, buttons, palette items)
- Adequate spacing between touch targets to prevent mis-taps

---

## 8. Undo/Redo System

### Architecture

- **Command pattern:** Every mutation is wrapped in a reversible command object
- **Command stack:** Array of executed commands; maximum depth 50
- **Redo stack:** Cleared when a new command is executed (not undone)
- **Stack cleared** when switching templates

### Command types

- `AddBlockCommand` — reverse: delete block
- `DeleteBlockCommand` — reverse: re-add block at original position with original config
- `DuplicateBlockCommand` — reverse: delete duplicated block
- `MoveBlockCommand` — reverse: move back to original container + position
- `UpdateBlockConfigCommand` — reverse: restore previous config
- `AddPageCommand` — reverse: delete page
- `DeletePageCommand` — reverse: re-add page with all containers and blocks
- `RenamePageCommand` — reverse: restore previous name
- `AddContainerCommand` — reverse: delete container
- `DeleteContainerCommand` — reverse: re-add container with all blocks
- `ReorderPagesCommand` — reverse: restore previous order
- `ReorderContainersCommand` — reverse: restore previous order

### Constraints

- Undo/redo does NOT trigger autosave immediately; changes are batched
- After undo/redo, the autosave debounce timer resets
- If the server rejects an undo/redo operation (e.g., referenced block no longer exists), the local state reverts

---

## 9. Autosave Strategy

### Timing

- **Debounce:** 1 second after the last change
- **Exceptions:** No save during active drag operation; save triggers on drop

### Dirty tracking

- Client maintains a `Set<string>` of changed block IDs
- Only dirty blocks are sent to the server
- On successful save, dirty set is cleared
- On failed save, dirty set is preserved; retry on next change

### Save status display

- **Saved:** Green checkmark, "All changes saved"
- **Dirty:** Yellow dot, "Unsaved changes"
- **Saving:** Blue spinner, "Saving..."
- **Error:** Red X, "Save failed — click to retry"

### Conflict handling

- Each save includes a `expectedVersion` (template version's updatedAt timestamp)
- If server returns 409 Conflict: another session modified the template
- UI shows: "This template was modified in another session. Please reload to continue."
- User must reload before making further changes

### Save data

- Only changed fields are sent (sparse update)
- Server validates: block belongs to template version, user owns template
- Server returns the updated record(s) with new timestamps
- Client updates local state with server response

---

## 10. Template Lifecycle

### Create

1. User clicks "New Template" from template list
2. Dialog: name (required), description (optional), category (optional), tags (optional)
3. On submit: server creates FormTemplate + draft FormTemplateVersion #1
4. User is redirected to the builder for the new draft

### Draft editing

- Freely add, remove, reorder, and configure pages, containers, and blocks
- All changes saved to the draft version
- No effect on any published version or form instance

### Validate

- User clicks "Validate" or validation runs automatically before publish
- Server checks:
  - All blocks have valid configs (per registry schemas)
  - No orphan references (conditional logic pointing to non-existent blocks)
  - No rule cycles (A depends on B, B depends on A)
  - At least one page exists
  - No duplicate stableKeys within the version
  - All required block properties filled
- Results shown in a dialog: "✓ Template is valid" or "✕ [N] issues found" with a list

### Publish

1. User clicks "Publish"
2. Confirmation dialog: "Publish version [N]? Published versions cannot be edited. Form instances will use this version."
3. Server validates template
4. If valid: version status → `PUBLISHED`, publishedAt timestamp set, version number recorded
5. Version becomes immutable (server-enforced)
6. Snapshot: full block tree serialized into version's snapshot JSON field with snapshot schema version and integrity hash
7. If a newer version is published later, the previous latest published version may become `SUPERSEDED` but remains available for historical instances
8. If form instances exist from previous versions, they are unaffected

### New draft from published

1. User opens a published version
2. Clicks "Create new draft" (prompted automatically when attempting to edit)
3. Server creates a new draft version, copying all blocks from the published version
4. New version number = published version number + 1
5. User is redirected to the builder for the new draft

### Archive

- Template lifecycleStatus → `ARCHIVED`
- Template hidden from default list (can show archived with filter)
- Published versions remain accessible for historical instances
- Can be unarchived

### Duplicate

- Creates a new template owned by the current user
- Deep-copies all blocks from the latest draft or published version
- New template starts with draft version #1
- Name: "Copy of [original name]"

---

## 11. Version Model

### Data model (conceptual)

- `FormTemplate` — one template, many versions
- `FormTemplate.lifecycleStatus` — `ACTIVE | ARCHIVED`
- `FormTemplateVersion` — versionNumber, status (`DRAFT | PUBLISHED | SUPERSEDED`), snapshot JSON
- Versions are numbered sequentially: 1, 2, 3, ...
- Status transitions: version `DRAFT → PUBLISHED → SUPERSEDED`; template `ACTIVE ↔ ARCHIVED`
- Published versions are **immutable** (server-enforced in all update/delete operations)

### Snapshot strategy

On publish, the full block tree is serialized into the version's `snapshot` JSON field:

- All pages with their sortOrder
- All containers with their sortOrder, config, and nesting
- All blocks with their sortOrder, config, options, stableKey, and conditional logic
- All block options

This makes each published version fully self-contained. Historical instances reference the version; the version's snapshot contains everything needed to render or validate that instance.

### Constraints

- A version cannot be deleted if any `FormInstance` references it
- A published version cannot be edited (server returns 409 Conflict)
- Version numbers are immutable
- Only one draft version per template at a time

---

## 12. Conditional Logic Builder (Phase 3G)

### Rule format (declarative JSON)

Rules are stored as JSON, never as executable code:

```json
{
	"operator": "and",
	"conditions": [
		{ "blockKey": "roof_type", "operator": "equals", "value": "flat" }
	]
}
```

### Supported operators

- Comparison: `equals`, `not_equals`, `greater_than`, `less_than`, `greater_than_or_equal`, `less_than_or_equal`
- Text: `contains`, `not_contains`, `starts_with`, `ends_with`, `matches_regex`
- Existence: `is_empty`, `is_not_empty`
- Range: `in_range`
- Grouping: `and`, `or` (nested)

### Rule composer UI

- Visual rule builder with AND/OR group toggles
- Field selector: dropdown of all blocks in the template (by stableKey + label)
- Operator selector: filtered by the referenced field's type
- Value input: typed according to the referenced field's response schema
- Live preview: affected block shows dashed border + ◇ icon on canvas
- Debug mode: each block on canvas shows whether its visibility condition is currently true/false based on sample data

### Constraints

- Rules reference blocks by stableKey only (never by database ID)
- Rules are validated server-side: referenced keys must exist, operators must be valid for the field type
- Cycle detection at publish time: topological sort of all rules, reject if cycles detected
- Client evaluates rules for UX (show/hide); server re-evaluates on every response save (authoritative)

---

## 13. Formula Builder (Phase 3G)

### Supported expressions

- Arithmetic: `+`, `-`, `*`, `/`, `( )`
- Comparisons: `==`, `!=`, `<`, `>`, `<=`, `>=`
- Conditional: `IF(condition, true_value, false_value)`
- Aggregations: `SUM`, `AVG`, `MIN`, `MAX`, `COUNT`
- Field references: `{block_key}` syntax
- Constants: numbers, strings (single-quoted)

Example: `IF({roof_condition} < 3, 'Poor', IF({roof_condition} < 5, 'Fair', 'Good'))`

### Safety

- Custom tokenizer and AST evaluator — no `eval()`, no `Function()` constructor
- Type checking: number operations on numbers, string concatenation, boolean comparisons
- Division by zero: returns null with error flag
- Circular reference detection: A references B, B references A → error at publish time
- All referenced blockKeys validated against template version

### Formula builder UI

- Expression input with syntax highlighting
- Field picker: click `{...}` button to insert a field reference from a dropdown
- Live preview: evaluates the formula with sample/default values
- Error display: "Unknown field: X", "Division by zero", "Type mismatch"

---

## 14. Security Requirements

### Server-side ownership

- Every query and action checks `context.user` exists (401 if not)
- Template operations: verify `template.userId === context.user.id`
- Published versions: update/delete operations check `version.status !== 'PUBLISHED'` and return 409 if published
- Block operations: verify the block's template version belongs to an owned template

### Configuration validation

- Block config validated against the block registry's `configSchema` on every save
- Client-provided type information is never trusted — server looks up registry by blockType
- Validation errors returned as structured `{ field: string, message: string }[]`

### Snapshot integrity

- Published version snapshot is generated server-side
- Snapshot is never constructed from client-provided data
- Historical snapshots are never modified

### Template immutability

- Published versions cannot be edited or deleted through any operation
- This is enforced at the database query level (update/delete WHERE status != 'PUBLISHED')
- UI hides edit controls for published versions, but server enforcement is the authority

---

## 15. Related Documents

- `docs/FORM_BLOCK_CATALOG.md` — complete block type catalogue
- `docs/FORM_BUILDER_DATA_MODEL.md` — database schema and ordering strategy
- `docs/FORM_PLATFORM_ROADMAP.md` — phased implementation plan
- `docs/REPORT_DESIGNER_PDF_SPEC.md` — report designer and PDF specification
