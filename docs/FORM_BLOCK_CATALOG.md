# Form Block Catalogue

**Created:** 2026-06-17
**Status:** Planning — specification only. No implementation.

---

This catalogue defines the structural container types and leaf block types available in the form builder platform. Catalogue presence does not imply immediate implementation; entries are phased as Baseline, Near-term, Deferred, or Specialized pack.

The platform uses two registry concepts. They may share infrastructure, but they have distinct persistence and validation semantics.

### Structural registry

Structural nodes are persisted as pages and `FormContainerDefinition` records, not as ordinary `FormBlockDefinition` rows.

```typescript
interface ContainerTypeDefinition {
	typeId: string;
	implementationVersion: number;
	configSchemaVersion: number;
	configSchema: ZodSchema;
	allowedParentTypes: string[];
	allowedChildContainerTypes: string[];
	acceptsBlocks: boolean;
	builderComponent: ComponentType;
	runtimeComponent: ComponentType;
	reportLayoutContract: PaginationContract;
	migrationStrategy: MigrationStrategy | null;
}
```

Structural types:

```text
page
section
group
column_group
column
repeating_group
conditional_container
tab_group
tab_panel
```

A page may remain a separate top-level page registry if preferable, but it must not be persisted as `FormBlockDefinition`.

### Leaf block registry

Leaf blocks are persisted as `FormBlockDefinition` rows that reference a real `FormContainerDefinition.containerId`. Each leaf block type must be registered in the controlled block registry with the following 11 required properties:

1. **typeId** — stable unique string identifier (never changes)
2. **blockImplementationVersion** — runtime behavior version (incremented on component logic changes)
3. **configSchemaVersion** — version of the Zod schema validating config JSON
4. **configSchema** — ZodSchema for configuration validation
5. **responseSchema** — ZodSchema for submitted response data
6. **optionCapability** — discriminated union declaring whether the block owns ordered choices and what selection-mode/option-count rules apply
7. **builderPreviewComponent** — rendered in the builder canvas
8. **runtimeComponent** — rendered in the form-filling runtime
9. **reportComponent** — rendered in reports (HTML preview and PDF)
10. **pdfPaginationContract** — PDF pagination behavior declaration
11. **configMigrationStrategy** — function or null for migrating old configs

**Option support:** Catalogue presence does not imply option support. Option support is declared by `optionCapability` on the registry entry, not inferred from `typeId` or category. `single_select` is currently the only option-backed production block (`kind: "options", selectionMode: "single"`). All other baseline blocks are option-disabled (`kind: "none"`).

Each leaf block entry below specifies: typeId, label, category, description, phase, config properties, response type, supported containers, repeatable flag, and pdfPaginationContract.

### Implementation scope

- **Baseline:** Initial production set needed for useful templates.
- **Near-term:** Important follow-on blocks after the baseline is stable.
- **Deferred:** Planned but not required for the initial builder/runtime release.
- **Specialized pack:** Optional domain-specific template-pack blocks, not generic core.

---

## Category 1: Structural Types

Structural nodes define form layout and organization. They are registry-controlled containers/pages, not ordinary leaf blocks.

### `page`

- **Label:** Page
- **Category:** Structure
- **Description:** Top-level container representing a form page. Pages are navigated sequentially or via tabs at runtime.
- **Phase:** 3E
- **Implementation scope:** Baseline
- **Config:** `{ title: string }`
- **Response:** None (structural only)
- **Containers:** template version (top-level)
- **Repeatable:** No
- **Pagination:** `{ splittable: false, keepTogether: true, pageBreakBefore: true, pageBreakAfter: false }`

### `section`

- **Label:** Section
- **Category:** Structure
- **Description:** Collapsible content section within a page. Groups related blocks visually and semantically.
- **Phase:** 3E
- **Implementation scope:** Baseline
- **Config:** `{ title: string, collapsible: boolean, initiallyCollapsed: boolean }`
- **Response:** None (structural only)
- **Containers:** page
- **Repeatable:** No
- **Pagination:** `{ splittable: true, keepTogether: false, keepWithNext: false, pageBreakBefore: false, pageBreakAfter: false }`

### `group`

- **Label:** Group
- **Category:** Structure
- **Description:** Visual card container for related blocks. Can be nested within sections or other groups.
- **Phase:** 3F
- **Implementation scope:** Near-term
- **Config:** `{ title: string, collapsible: boolean, borderStyle: 'solid'|'dashed'|'none' }`
- **Response:** None (structural only)
- **Containers:** section, group
- **Repeatable:** No
- **Pagination:** `{ splittable: true, keepTogether: false }`

### `column_group`

- **Label:** Columns
- **Category:** Structure
- **Description:** Multi-column layout container. Each column accepts blocks independently.
- **Phase:** 3F
- **Implementation scope:** Near-term
- **Config:** `{ columns: 2|3|4, columnRatios: number[] }`
- **Response:** None (structural only)
- **Containers:** section, group
- **Repeatable:** No
- **Pagination:** `{ splittable: true, keepTogether: false }`

### `column`

- **Label:** Column
- **Category:** Structure
- **Description:** Child container within a `column_group`. Accepts leaf blocks independently from sibling columns.
- **Phase:** 3F
- **Implementation scope:** Near-term
- **Config:** `{ widthRatio: number }`
- **Response:** None (structural only)
- **Containers:** column_group
- **Repeatable:** No
- **Pagination:** `{ splittable: true, keepTogether: false }`

### `repeating_group`

- **Label:** Repeating Group
- **Category:** Structure
- **Description:** Dynamic container where the user can add/remove instances at runtime. Each instance contains the same set of child blocks.
- **Phase:** 3F
- **Implementation scope:** Near-term
- **Config:** `{ title: string, minInstances: number, maxInstances: number, addButtonLabel: string }`
- **Response:** Array of group instance responses
- **Containers:** section
- **Repeatable:** No (it IS the repeater)
- **Pagination:** `{ splittable: true, keepTogether: false, splitStrategy: 'by-block-child' }`

### `table_repeater`

- **Label:** Table Repeater
- **Category:** Structure
- **Description:** Tabular repeating data with defined columns. Each column maps to a field type; each row is an instance.
- **Phase:** 3F
- **Implementation scope:** Near-term
- **Config:** `{ title: string, columns: [{ header: string, fieldType: string, width: string }], minRows: number, maxRows: number }`
- **Response:** Array of row objects
- **Containers:** section
- **Repeatable:** No
- **Pagination:** `{ splittable: true, repeatHeader: true, keepTogether: false, splitStrategy: 'by-row' }`

### `divider`

- **Label:** Divider
- **Category:** Structure
- **Description:** Horizontal rule separator between blocks.
- **Phase:** 3E
- **Implementation scope:** Baseline
- **Config:** `{ style: 'solid'|'dashed'|'dotted', thickness: number, color: string }`
- **Response:** None
- **Containers:** section, group, column_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `spacer`

- **Label:** Spacer
- **Category:** Structure
- **Description:** Vertical whitespace of configurable height.
- **Phase:** 3F
- **Implementation scope:** Near-term
- **Config:** `{ height: number, unit: 'px'|'rem'|'em' }`
- **Response:** None
- **Containers:** section, group, column_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `page_break`

- **Label:** Page Break
- **Category:** Structure
- **Description:** Forces a page break in form preview and PDF report at this position.
- **Phase:** 3E
- **Implementation scope:** Baseline
- **Config:** `{}` (no configurable properties)
- **Response:** None
- **Containers:** section, group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, pageBreakAfter: true }`

### `conditional_container`

- **Label:** Conditional Container
- **Category:** Structure
- **Description:** Container whose entire contents are shown or hidden based on a declarative rule.
- **Phase:** 3G
- **Implementation scope:** Deferred
- **Config:** `{ title: string, visibilityRule: RuleGroup }`
- **Response:** None
- **Containers:** section, group
- **Repeatable:** No
- **Pagination:** `{ splittable: true, keepTogether: false }`

### `tab_group`

- **Label:** Tab Group
- **Category:** Structure
- **Description:** Tabbed container switching between panels. Each tab is a named container.
- **Phase:** Deferred
- **Implementation scope:** Deferred
- **Config:** `{ tabs: [{ label: string }] }`
- **Response:** None
- **Containers:** section
- **Repeatable:** No
- **Pagination:** `{ splittable: true, keepTogether: false }`

### `tab_panel`

- **Label:** Tab Panel
- **Category:** Structure
- **Description:** Child container within a `tab_group`; each panel accepts blocks independently.
- **Phase:** Deferred
- **Implementation scope:** Deferred
- **Config:** `{ label: string }`
- **Response:** None (structural only)
- **Containers:** tab_group
- **Repeatable:** No
- **Pagination:** `{ splittable: true, keepTogether: false }`

---

## Category 2: Display / Content Blocks

Blocks that display static or auto-filled content — no user input.

### `heading`

- **Label:** Heading
- **Category:** Display/Content
- **Description:** Section heading with configurable level (h1-h4) and text.
- **Phase:** 3E
- **Config:** `{ level: 1|2|3|4, text: string }`
- **Response:** None
- **Containers:** section, group, column_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepWithNext: true }`

### `paragraph`

- **Label:** Paragraph
- **Category:** Display/Content
- **Description:** Static text block. Supports plain text; rich text deferred.
- **Phase:** 3E
- **Config:** `{ text: string }`
- **Response:** None
- **Containers:** section, group, column_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: true, orphanPolicy: 2 }`

### `rich_text`

- **Label:** Rich Text
- **Category:** Display/Content
- **Description:** Formatted static content with bold, italic, lists, and links.
- **Phase:** 3F
- **Config:** `{ html: string }` (sanitized server-side)
- **Response:** None
- **Containers:** section, group, column_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: true, orphanPolicy: 2 }`

### `instruction`

- **Label:** Instruction / Callout
- **Category:** Display/Content
- **Description:** Highlighted information box with configurable type (info, warning, tip, danger).
- **Phase:** 3F
- **Config:** `{ type: 'info'|'warning'|'tip'|'danger', title: string, body: string }`
- **Response:** None
- **Containers:** section, group, column_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `static_image`

- **Label:** Static Image
- **Category:** Display/Content
- **Description:** Non-response image such as a logo, diagram, or reference photo.
- **Phase:** 3E
- **Config:** `{ fileId: string, altText: string, caption: string, maxWidth: string }`
- **Response:** None
- **Containers:** section, group, column_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `client_details`

- **Label:** Client Details
- **Category:** Display/Content
- **Description:** Auto-filled from the linked Client record when starting a form instance.
- **Phase:** 3F
- **Config:** `{ showName: boolean, showEmail: boolean, showPhone: boolean, showCompany: boolean, showNotes: boolean }`
- **Response:** None (auto-filled)
- **Containers:** section, group
- **Repeatable:** No
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `property_details`

- **Label:** Property Details
- **Category:** Display/Content
- **Description:** Auto-filled from the linked Property record.
- **Phase:** 3F
- **Config:** `{ showAddress: boolean, showType: boolean, showNotes: boolean }`
- **Response:** None (auto-filled)
- **Containers:** section, group
- **Repeatable:** No
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `inspection_metadata`

- **Label:** Inspection Metadata
- **Category:** Display/Content
- **Description:** Auto-filled: form instance title, date, template name, inspector name.
- **Phase:** 3F
- **Config:** `{ showTitle: boolean, showDate: boolean, showTemplate: boolean, showInspector: boolean }`
- **Response:** None (auto-filled)
- **Containers:** section, group
- **Repeatable:** No
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `inspector_details`

- **Label:** Inspector Details
- **Category:** Display/Content
- **Description:** Auto-filled from the current user's profile.
- **Phase:** 3F
- **Config:** `{ showName: boolean, showEmail: boolean, showPhone: boolean }`
- **Response:** None (auto-filled)
- **Containers:** section, group
- **Repeatable:** No
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `disclaimer`

- **Label:** Disclaimer
- **Category:** Display/Content
- **Description:** Standard legal or disclaimer text block, typically placed at the end of a form.
- **Phase:** 3F
- **Config:** `{ text: string }`
- **Response:** None
- **Containers:** section, group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: true, orphanPolicy: 2 }`

### `terms_approval`

- **Label:** Terms & Approval Text
- **Category:** Display/Content
- **Description:** Text block with a required acknowledgment checkbox.
- **Phase:** 3F
- **Config:** `{ text: string, acknowledgmentLabel: string }`
- **Response:** `{ accepted: boolean }`
- **Containers:** section, group
- **Repeatable:** No
- **Pagination:** `{ splittable: false, keepTogether: true }`

---

## Category 3: Basic Input Blocks

Blocks that capture user input.

### `short_text`

- **Label:** Short Text
- **Category:** Basic Inputs
- **Description:** Single-line text input.
- **Phase:** 3E
- **Config:** `{ label: string, placeholder: string, defaultValue: string, maxLength: number }`
- **Response:** `{ value: string }`
- **Containers:** section, group, column_group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `long_text`

- **Label:** Long Text
- **Category:** Basic Inputs
- **Description:** Multi-line textarea.
- **Phase:** 3E
- **Config:** `{ label: string, placeholder: string, defaultValue: string, rows: number, maxLength: number }`
- **Response:** `{ value: string }`
- **Containers:** section, group, column_group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: true, orphanPolicy: 2 }`

### `number`

- **Label:** Number
- **Category:** Basic Inputs
- **Description:** Integer input with optional min/max/step constraints.
- **Phase:** 3E
- **Config:** `{ label: string, min: number, max: number, step: number, defaultValue: number, unitLabel: string }`
- **Response:** `{ value: number }`
- **Containers:** section, group, column_group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `decimal`

- **Label:** Decimal
- **Category:** Basic Inputs
- **Description:** Decimal number input with configurable precision.
- **Phase:** 3F
- **Config:** `{ label: string, min: number, max: number, precision: number, defaultValue: number, unitLabel: string }`
- **Response:** `{ value: number }`
- **Containers:** section, group, column_group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `currency`

- **Label:** Currency
- **Category:** Basic Inputs
- **Description:** Monetary value input with currency code.
- **Phase:** 3E
- **Config:** `{ label: string, currencyCode: string, min: number, max: number, defaultValue: number }`
- **Response:** `{ amountMinor: number, currencyCode: string }`
- **Containers:** section, group, column_group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`
- **Currency note:** Store ordinary currencies in minor units (for example cents) with the ISO currency code. Currencies with non-two-decimal minor units must use the ISO 4217 minor-unit definition when converting display values.

### `percentage`

- **Label:** Percentage
- **Category:** Basic Inputs
- **Description:** Percentage value (0-100 by default, configurable range).
- **Phase:** 3F
- **Config:** `{ label: string, min: number, max: number, defaultValue: number }`
- **Response:** `{ value: number }`
- **Containers:** section, group, column_group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `date`

- **Label:** Date
- **Category:** Basic Inputs
- **Description:** Date picker using a calendar widget.
- **Phase:** 3E
- **Config:** `{ label: string, minDate: string, maxDate: string, defaultValue: 'today'|'none'|string }`
- **Response:** `{ value: string }` (ISO date)
- **Containers:** section, group, column_group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `time`

- **Label:** Time
- **Category:** Basic Inputs
- **Description:** Time input (HH:MM).
- **Phase:** 3F
- **Config:** `{ label: string, defaultValue: string }`
- **Response:** `{ value: string }` (HH:MM)
- **Containers:** section, group, column_group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `date_time`

- **Label:** Date & Time
- **Category:** Basic Inputs
- **Description:** Combined date and time picker.
- **Phase:** 3F
- **Config:** `{ label: string, minDate: string, maxDate: string, defaultValue: string }`
- **Response:** `{ value: string }` (ISO datetime)
- **Containers:** section, group, column_group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `email`

- **Label:** Email
- **Category:** Basic Inputs
- **Description:** Email input with format validation.
- **Phase:** 3F
- **Config:** `{ label: string, placeholder: string, defaultValue: string }`
- **Response:** `{ value: string }`
- **Containers:** section, group, column_group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `phone`

- **Label:** Telephone
- **Category:** Basic Inputs
- **Description:** Phone number input.
- **Phase:** 3F
- **Config:** `{ label: string, placeholder: string, defaultValue: string, defaultCountryCode: string }`
- **Response:** `{ value: string }`
- **Containers:** section, group, column_group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `url`

- **Label:** URL
- **Category:** Basic Inputs
- **Description:** URL input with format validation.
- **Phase:** 3F
- **Config:** `{ label: string, placeholder: string, defaultValue: string }`
- **Response:** `{ value: string }`
- **Containers:** section, group, column_group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `address`

- **Label:** Address
- **Category:** Basic Inputs
- **Description:** Multi-field address block (street, city, postal code, country).
- **Phase:** 3F
- **Config:** `{ label: string, showStreet: boolean, showCity: boolean, showPostalCode: boolean, showCountry: boolean }`
- **Response:** `{ street: string, city: string, postalCode: string, country: string }`
- **Containers:** section, group
- **Repeatable:** No
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `yes_no`

- **Label:** Yes / No
- **Category:** Basic Inputs
- **Description:** Binary toggle or radio buttons.
- **Phase:** 3E
- **Config:** `{ label: string, displayAs: 'toggle'|'radio', defaultValue: 'yes'|'no'|'unset' }`
- **Response:** `{ value: boolean | null }`
- **Containers:** section, group, column_group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `checkbox`

- **Label:** Checkbox
- **Category:** Basic Inputs
- **Description:** Single boolean checkbox.
- **Phase:** 3E
- **Config:** `{ label: string, checkedByDefault: boolean }`
- **Response:** `{ value: boolean }`
- **Containers:** section, group, column_group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `rating`

- **Label:** Rating
- **Category:** Basic Inputs
- **Description:** Star or number rating with configurable scale.
- **Phase:** 3F
- **Config:** `{ label: string, min: number, max: number, step: number, icon: 'star'|'circle'|'number', defaultValue: number }`
- **Response:** `{ value: number }`
- **Containers:** section, group, column_group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `measurement`

- **Label:** Measurement
- **Category:** Basic Inputs
- **Description:** Number input with a configurable unit of measurement.
- **Phase:** 3F
- **Config:** `{ label: string, unit: string, unitOptions: string[], min: number, max: number, precision: number, defaultValue: { value: number, unit: string } }`
- **Response:** `{ value: number, unit: string }`
- **Containers:** section, group, column_group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

---

## Category 4: Choice Input Blocks

Blocks that present a set of options for the user to select from.

### `single_select`

- **Label:** Single Select
- **Category:** Choice Inputs
- **Description:** Dropdown with one selectable option.
- **Phase:** 3E
- **Config:** `{ label: string, options: [{ label: string, value: string }], defaultValue: string, allowOther: boolean, otherLabel: string }`
- **Response:** `{ value: string }`
- **Containers:** section, group, column_group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `multi_select`

- **Label:** Multi Select
- **Category:** Choice Inputs
- **Description:** Dropdown or tag list allowing multiple selections.
- **Phase:** 3E
- **Config:** `{ label: string, options: [{ label: string, value: string }], minSelections: number, maxSelections: number, defaultValue: string[] }`
- **Response:** `{ values: string[] }`
- **Containers:** section, group, column_group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `radio_group`

- **Label:** Radio Group
- **Category:** Choice Inputs
- **Description:** Radio buttons displayed vertically or horizontally.
- **Phase:** 3F
- **Config:** `{ label: string, options: [{ label: string, value: string, color: string }], layout: 'vertical'|'horizontal', defaultValue: string }`
- **Response:** `{ value: string }`
- **Containers:** section, group, column_group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `checkbox_group`

- **Label:** Checkbox Group
- **Category:** Choice Inputs
- **Description:** Multiple checkboxes.
- **Phase:** 3F
- **Config:** `{ label: string, options: [{ label: string, value: string }], minSelections: number, maxSelections: number, defaultValue: string[], layout: 'vertical'|'horizontal' }`
- **Response:** `{ values: string[] }`
- **Containers:** section, group, column_group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `pass_fail_na`

- **Label:** Pass / Fail / N/A
- **Category:** Choice Inputs
- **Description:** Three-state assessment toggle. Commonly used in inspections.
- **Phase:** 3F
- **Config:** `{ label: string, passLabel: string, failLabel: string, naLabel: string, defaultValue: 'pass'|'fail'|'na' }`
- **Response:** `{ value: 'pass'|'fail'|'na' }`
- **Containers:** section, group, column_group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `compliant_nc_ni`

- **Label:** Compliant / Non-Compliant / Not Inspected
- **Category:** Choice Inputs
- **Description:** Compliance assessment with three states.
- **Phase:** 3F
- **Config:** `{ label: string, compliantLabel: string, nonCompliantLabel: string, notInspectedLabel: string, defaultValue: string }`
- **Response:** `{ value: 'compliant'|'non_compliant'|'not_inspected' }`
- **Containers:** section, group, column_group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `priority`

- **Label:** Priority / Severity
- **Category:** Choice Inputs
- **Description:** Priority level selector with color coding.
- **Phase:** 3F
- **Config:** `{ label: string, levels: [{ label: string, value: string, color: string }], defaultValue: string }`
- **Response:** `{ value: string }`
- **Containers:** section, group, column_group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

---

## Category 5: Data / Calculation Blocks

Blocks that compute, store, or reference data — with reduced or no direct user input.

### `calculated_value`

- **Label:** Calculated Value
- **Category:** Data/Calculation
- **Description:** Display-only result computed from a formula. Visible in form and report but not editable.
- **Phase:** 3G
- **Config:** `{ label: string, formula: string, displayFormat: string }`
- **Response:** `{ value: number|string }` (computed server-side)
- **Containers:** section, group, column_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `formula`

- **Label:** Formula
- **Category:** Data/Calculation
- **Description:** Hidden calculation that stores its result as a response value for use in other formulas or reports.
- **Phase:** 3G
- **Config:** `{ formula: string }`
- **Response:** `{ value: number|string }` (computed server-side)
- **Containers:** section, group, column_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }` (hidden, but included for completeness)

### `hidden_value`

- **Label:** Hidden Value
- **Category:** Data/Calculation
- **Description:** Not displayed in the form; stores a fixed or prefilled value in the response data.
- **Phase:** 3F
- **Config:** `{ value: string|number|boolean }`
- **Response:** `{ value: string|number|boolean }`
- **Containers:** section, group
- **Repeatable:** No
- **Pagination:** `{ splittable: false, keepTogether: true }` (hidden)

### `auto_number`

- **Label:** Auto Number
- **Category:** Data/Calculation
- **Description:** Auto-incrementing reference number, scoped per template.
- **Phase:** 3F
- **Config:** `{ prefix: string, paddingLength: number, startAt: number }`
- **Response:** `{ value: string }`
- **Containers:** section, group
- **Repeatable:** No
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `prefilled_field`

- **Label:** Prefilled Field
- **Category:** Data/Calculation
- **Description:** Populated from client, property, or user data at instance creation. Editable by the user.
- **Phase:** 3F
- **Config:** `{ label: string, source: 'client'|'property'|'user'|'template', sourceField: string, editable: boolean }`
- **Response:** `{ value: string }`
- **Containers:** section, group, column_group
- **Repeatable:** No
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `user_field`

- **Label:** User / Inspector Field
- **Category:** Data/Calculation
- **Description:** Auto-filled with current user info. Not editable.
- **Phase:** 3F
- **Config:** `{ label: string, userField: 'name'|'email'|'username' }`
- **Response:** `{ value: string }` (auto-filled)
- **Containers:** section, group, column_group
- **Repeatable:** No
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `timestamp`

- **Label:** Timestamp
- **Category:** Data/Calculation
- **Description:** Auto-captured date and time. Can be configured to record created, modified, or submitted time.
- **Phase:** 3F
- **Config:** `{ label: string, captureEvent: 'created'|'modified'|'submitted'|'custom', format: string }`
- **Response:** `{ value: string }` (ISO datetime)
- **Containers:** section, group, column_group
- **Repeatable:** No
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `gps_location`

- **Label:** GPS Location
- **Category:** Data/Calculation
- **Description:** Captures device GPS coordinates. Requires user permission.
- **Phase:** 3H
- **Config:** `{ label: string, captureOn: 'manual'|'auto', accuracy: 'high'|'low' }`
- **Response:** `{ latitude: number, longitude: number, accuracy: number, timestamp: string }`
- **Containers:** section, group
- **Repeatable:** No
- **Pagination:** `{ splittable: false, keepTogether: true }`

---

## Category 6: Media Blocks

Blocks for capturing and displaying photos, files, signatures, and floor plans.

### `single_photo`

- **Label:** Single Photo
- **Category:** Media
- **Description:** Capture or upload one photo with an optional caption.
- **Phase:** 3I
- **Config:** `{ label: string, required: boolean, source: 'camera'|'upload'|'both', maxFileSizeMB: number }`
- **Response:** `{ fileId: string, caption: string }`
- **Containers:** section, group, column_group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `multi_photo`

- **Label:** Multiple Photos
- **Category:** Media
- **Description:** Upload multiple photos with captions and reordering.
- **Phase:** 3I
- **Config:** `{ label: string, minPhotos: number, maxPhotos: number, source: 'camera'|'upload'|'both', maxFileSizeMB: number }`
- **Response:** `{ photos: [{ fileId: string, caption: string, sortOrder: number }] }`
- **Containers:** section, group
- **Repeatable:** No
- **Pagination:** `{ splittable: true, splitStrategy: 'by-row', keepTogether: false }`

### `photo_gallery`

- **Label:** Photo Gallery
- **Category:** Media
- **Description:** Configurable grid gallery for reports. Columns, aspect ratio, and layout are configured here.
- **Phase:** 3K
- **Config:** `{ label: string, columns: 1|2|3|4, aspectRatio: string, fitMode: 'contain'|'cover', spacing: number, showCaptions: boolean, maxPhotos: number }`
- **Response:** `{ photos: [{ fileId: string, caption: string, sortOrder: number }] }`
- **Containers:** section, group
- **Repeatable:** No
- **Pagination:** `{ splittable: true, splitStrategy: 'by-row', keepTogether: false }`

### `file_attachment`

- **Label:** File Attachment
- **Category:** Media
- **Description:** Upload one or more document files (PDF, DOC, XLS, etc.).
- **Phase:** 3I
- **Config:** `{ label: string, allowedTypes: string[], maxFiles: number, maxFileSizeMB: number }`
- **Response:** `{ files: [{ fileId: string, fileName: string, fileSize: number }] }`
- **Containers:** section, group
- **Repeatable:** No
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `signature`

- **Label:** Signature
- **Category:** Media
- **Description:** Digital signature capture via HTML Canvas drawing.
- **Phase:** 3I
- **Config:** `{ label: string, signerNameLabel: string, signerRoleLabel: string, penColor: string, penWidth: number }`
- **Response:** `{ fileId: string, signerName: string, signerRole: string, signedAt: string }`
- **Containers:** section, group
- **Repeatable:** No
- **Pagination:** `{ splittable: false, keepTogether: true, minimumRemainingHeight: '40%' }`

---

## Category 7: Inspection / Workflow Blocks

Blocks specifically designed for inspection and defect-management workflows — but fully configurable for other uses.

### `finding`

- **Label:** Finding / Deviation
- **Category:** Inspection/Workflow
- **Description:** Structured record of an observation, defect, or finding. Includes title, description, category, severity, status, location, recommendation, and cost estimate.
- **Phase:** 3J
- **Config:** `{ label: string, showCategory: boolean, showSeverity: boolean, showLocation: boolean, showRecommendation: boolean, showCost: boolean, categories: string[], severityLevels: [{ label: string, value: string, color: string }] }`
- **Response:** `{ title: string, description: string, category: string, severity: string, location: string, recommendation: string, costEstimateCents: number }`
- **Containers:** section, group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: true, splitStrategy: 'by-block-child', keepTogether: false, minimumRemainingHeight: '30%' }`

### `defect_assessment`

- **Label:** Defect Assessment
- **Category:** Inspection/Workflow
- **Description:** Extended finding with additional fields for extent, urgency, and classification.
- **Phase:** 3J
- **Config:** `{ label: string, showExtent: boolean, showUrgency: boolean, showClassification: boolean }`
- **Response:** `{ title: string, description: string, category: string, severity: string, extent: string, urgency: string, classification: string, recommendation: string }`
- **Containers:** section, group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: true, splitStrategy: 'by-block-child', keepTogether: false }`

### `recommendation`

- **Label:** Recommendation
- **Category:** Inspection/Workflow
- **Description:** Suggested corrective action text, optionally linked to a finding.
- **Phase:** 3J
- **Config:** `{ label: string, linkToFinding: boolean }`
- **Response:** `{ text: string, linkedFindingBlockKey: string }`
- **Containers:** section, group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: true, orphanPolicy: 2 }`

### `corrective_action`

- **Label:** Corrective Action
- **Category:** Inspection/Workflow
- **Description:** Required action with optional assignee and deadline.
- **Phase:** 3J
- **Config:** `{ label: string, showAssignee: boolean, showDeadline: boolean }`
- **Response:** `{ description: string, assigneeUserId: string, deadline: string }`
- **Containers:** section, group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `cost_estimate`

- **Label:** Cost Estimate
- **Category:** Inspection/Workflow
- **Description:** Estimated repair or corrective cost in integer cents with currency code.
- **Phase:** 3J
- **Config:** `{ label: string, currencyCode: string }`
- **Response:** `{ amountMinor: number, currencyCode: string, description: string }`
- **Containers:** section, group, repeating_group
- **Repeatable:** Yes
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `task_creation`

- **Label:** Task Creation
- **Category:** Inspection/Workflow
- **Description:** Auto-creates a follow-up task in the workflow engine when the form is submitted.
- **Phase:** 3J
- **Config:** `{ label: string, defaultTitle: string, defaultPriority: string, assignToInspector: boolean }`
- **Response:** `{ taskId: string }` (generated on submit)
- **Containers:** section, group
- **Repeatable:** No
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `case_trigger`

- **Label:** Case / Ticket Trigger
- **Category:** Inspection/Workflow
- **Description:** Auto-creates a case or ticket in the workflow engine based on form responses.
- **Phase:** 3J
- **Config:** `{ label: string, triggerCondition: RuleGroup, defaultTitle: string, defaultPriority: string }`
- **Response:** `{ caseId: string }` (generated if condition met)
- **Containers:** section, group
- **Repeatable:** No
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `approval`

- **Label:** Approval
- **Category:** Inspection/Workflow
- **Description:** Inspector or reviewer approval step with comment.
- **Phase:** 3J
- **Config:** `{ label: string, approverRole: string, requireComment: boolean }`
- **Response:** `{ approved: boolean, comment: string, approvedBy: string, approvedAt: string }`
- **Containers:** section, group
- **Repeatable:** No
- **Pagination:** `{ splittable: false, keepTogether: true }`

### `inspector_signoff`

- **Label:** Inspector Sign-off
- **Category:** Inspection/Workflow
- **Description:** Inspector's final sign-off with signature and date.
- **Phase:** 3J
- **Config:** `{ label: string, declarationText: string }`
- **Response:** `{ signed: boolean, signatureFileId: string, signedAt: string }`
- **Containers:** section, group
- **Repeatable:** No
- **Pagination:** `{ splittable: false, keepTogether: true, minimumRemainingHeight: '40%' }`

### `customer_signoff`

- **Label:** Customer Sign-off
- **Category:** Inspection/Workflow
- **Description:** Customer acknowledgment and signature.
- **Phase:** 3J
- **Config:** `{ label: string, declarationText: string, requireName: boolean }`
- **Response:** `{ signed: boolean, customerName: string, signatureFileId: string, signedAt: string }`
- **Containers:** section, group
- **Repeatable:** No
- **Pagination:** `{ splittable: false, keepTogether: true, minimumRemainingHeight: '40%' }`

---

## Category 8: Report Blocks

Blocks used exclusively in the report designer to construct report layouts. Minimum report-block contracts are defined in `docs/REPORT_DESIGNER_PDF_SPEC.md`; this catalogue lists planned report block identifiers and phases rather than full implementation specs.

### Report blocks (22 total)

`report_cover`, `report_logo`, `report_title`, `report_toc`, `report_summary`, `report_section`, `report_field_value`, `report_key_value_list`, `report_findings_summary`, `report_findings_detail`, `report_findings_table`, `report_photo_grid`, `report_before_after` (Specialized), `report_floor_plan`, `report_signature`, `report_cost_summary`, `report_chart` (Deferred), `report_static_text`, `report_disclaimer`, `report_page_break`, `report_appendix`, `report_attachment_list`

See the `ReportBlockTypeDefinition` contract section in `docs/REPORT_DESIGNER_PDF_SPEC.md` for required report-block fields, binding behavior, pagination responsibility, and error fallback expectations.

---

## Deferred Blocks

Blocks planned but deferred beyond Phase 3F:

- `tab_group` — tabbed container
- `button_choice` — visual button-style choice
- `matrix` — choice matrix/grid
- `lookup_reference` — pull data from another block or external source
- `barcode_qr` — barcode/QR scanner
- `drawing_sketch` — free-form drawing canvas
- `photo_annotation` — draw/place markers on photos
- `report_chart` — data visualization charts in reports

## Specialized Blocks (Phase 3R)

Blocks for specialized template packs:

- `condition_score` — NEN-style condition rating
- `before_after_photos` — side-by-side photo comparison
- `report_before_after` — before/after in reports

---

## Block Registry Contract

Every leaf block type registered MUST provide:

```typescript
interface BlockTypeDefinition {
	typeId: string; // 1. stable unique identifier
	blockImplementationVersion: number; // 2. runtime behavior version
	configSchemaVersion: number; // 3. config schema version
	configSchema: z.ZodSchema; // 4. config validation
	responseSchema: z.ZodSchema; // 5. response validation
	builderPreviewComponent: React.FC; // 6. canvas preview
	runtimeComponent: React.FC; // 7. form-filling renderer
	reportComponent: React.FC; // 8. report/PDF renderer
	pdfPaginationContract: PaginationConfig; // 9. pagination behavior
	configMigrationStrategy: ConfigMigrationFn | null; // 10. migration function
	category: BlockCategory;
	label: string;
	description: string;
	icon: string; // lucide-react icon name
	defaultConfig: Record<string, unknown>;
	allowedContainers: ContainerType[];
	repeatable: boolean;
}
```

Structural types use `ContainerTypeDefinition` from the structural registry section above.

## Safety Requirements

- Rich text HTML is sanitized server-side before save and before render.
- URL fields are validated and normalized; unsafe protocols are rejected.
- Uploaded files enforce MIME allowlists, size limits, ownership checks, and signed access.
- Formula and calculated-value blocks use a safe parser/evaluator; no executable JavaScript, `eval`, or `Function` constructor is allowed.
- Hidden values are convenience data only and must never be trusted as authorization or ownership data.
- Signatures are evidence records. They are not automatically legally binding without the surrounding legal/commercial workflow and review.
- GPS/location collection requires user permission, clear disclosure, and graceful denial handling.
