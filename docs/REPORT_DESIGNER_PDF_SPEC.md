# Report Designer & PDF Specification

**Created:** 2026-06-17
**Status:** Planning — specification only. No implementation. Chromium binary size, memory, and cold-start time are unknown until Phase 3A0-B measures them.

---

## 1. Report Pipeline

The report system uses a canonical intermediate representation to decouple form data from PDF rendering.

```
[1] Completed form data
    (FormInstance + BlockResponses + Media + Findings)
        +
[2] Immutable template version snapshot
    (FormTemplateVersion with full block tree)
        +
[3] Report template version
    (ReportTemplateVersion with ReportBlockDefinitions)
        +
[4] Branding profile
    (colors, fonts, logo, company info)
        +
[5] Export preset
    (paper size, orientation, margins, quality, show/hide options)
        │
        ▼
[6] buildReportDocument()
    → resolved ReportDocument (canonical intermediate representation)
        │
        ├──▶ [7a] Browser preview: renderReportHtml(ReportDocument) → HTML with print CSS
        │
        └──▶ [7b] PDF generation: renderReportHtml(ReportDocument) → HTML → Playwright Chromium → page.pdf() → PDF bytes → S3 FileAsset → ReportExport record → signed download URL
```

---

## 2. Canonical ReportDocument

The `ReportDocument` is a pure logical representation of report content. It contains no live database queries — all data is resolved at construction time. Physical page boundaries, page count, and final page numbers are renderer output after Chromium layout, not part of the canonical logical document.

```typescript
interface ReportDocument {
	metadata: ReportMetadata;
	branding: ResolvedBranding;
	layout: ResolvedLayout;
	sections: ReportSection[];
}

interface ReportMetadata {
	reportDocumentId: string; // UUID derived from or assigned to this report generation
	generatedAt: string; // ISO 8601 timestamp supplied as an explicit input or persisted snapshot value
	formInstanceId: string;
	templateVersionId: string;
	reportTemplateVersionId: string;
	brandingProfileId: string;
	exportPresetId: string;
}

interface ResolvedBranding {
	companyName: string;
	logoAsset: ResolvedAsset | null;
	primaryColor: string; // Hex color
	secondaryColor: string;
	fontFamily: string; // From approved set
	address: string | null;
	contactInfo: string | null;
	footerText: string | null;
	legalText: string | null;
	language: string; // e.g., "nl-NL", "en-US"
}

interface ResolvedAsset {
	fileAssetId: string;
	contentHash: string;
	storageKey: string;
	mimeType: string;
	renderSource: string; // local path, bytes reference, or deterministic data URL prepared before rendering
}

interface ResolvedLayout {
	paperSize: 'A4' | 'Letter' | 'Legal';
	orientation: 'Portrait' | 'Landscape';
	margins: { top: string; right: string; bottom: string; left: string };
	showUnanswered: boolean;
	showNotApplicable: boolean;
	watermark: 'None' | 'Draft' | 'Final' | string;
	imageQuality: number; // 1-100
}

interface ReportSection {
	id: string;
	sectionType: 'cover' | 'toc' | 'content' | 'appendix';
	blocks: ResolvedReportBlock[];
	pageBreakBefore?: boolean;
	pageBreakAfter?: boolean;
}

interface ResolvedReportBlock {
	blockType: string;
	config: Record<string, unknown>; // Merged: report block config + branding overrides + preset overrides
	resolvedData: Record<string, unknown> | null; // Bound data from form responses, or null if static content
	dataBindingStatus: BindingStatus;
	pagination: ComputedPagination;
	visibility: boolean; // Resolved visibility rules
}

interface RenderedReportResult {
	pdfBytes: Uint8Array;
	physicalPageCount: number;
	diagnostics: PaginationDiagnostic[];
}
```

### Binding statuses

| Status              | Condition                                                                                                                      | Behavior                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `resolved`          | Block key exists in template version AND response data is available                                                            | Normal rendering with bound data                                                  |
| `no_response`       | Block key exists but user did not submit a response (optional field, skipped)                                                  | Render per `showUnanswered` preset setting: show empty cell or hide block         |
| `not_applicable`    | Response value is "N/A" (pass_fail_na) or "Not Inspected" (compliant_nc_ni)                                                    | Render per `showNotApplicable` preset setting                                     |
| `hidden_by_rule`    | Block was hidden by conditional logic at submission time                                                                       | Omit from report (unless configured to show hidden fields)                        |
| `missing_binding`   | Block key referenced in report template but not found in form template version (block was removed in a newer template version) | Render placeholder: "[Field 'X' is no longer available in this template version]" |
| `incompatible_type` | Block key found but the block type has changed and the old response shape is incompatible                                      | Render placeholder: "[Data format for 'X' has changed — cannot display]"          |
| `render_error`      | An error occurred while rendering this specific block                                                                          | Render placeholder: "[Error rendering 'X']" with error details in debug mode      |

---

## 3. Historical Report Regeneration

`buildReportDocument()` is a pure function of pinned inputs. For deterministic layout/content regeneration:

- **Original form data:** Preserved in BlockResponse records (never modified after instance completion)
- **Template version:** Immutable once published. Snapshot stored in version record.
- **Report template version:** Immutable once published. Snapshot stored.
- **Branding profile:** May change over time. At report generation time, capture the resolved branding into an `ExportSnapshot`.
- **Export preset:** May change. Capture into `ExportSnapshot`.
- **Generation timestamp:** `generatedAt` is an explicit input or persisted snapshot value, not an implicit call to the current clock.
- **Assets:** Use stable asset identity (`fileAssetId`, `contentHash`, `storageKey`, `mimeType`) and resolve assets to bytes, local paths, or deterministic data URLs before rendering. Expiring signed URLs are access mechanisms, not canonical content identifiers.

For strict deterministic regeneration, pin Chromium version, font files/version, locale, timezone, generation timestamp, asset bytes/content hashes, report/template snapshots, and branding/export snapshot. Do not promise byte-identical PDFs until Phase 3A0-B proves it. The baseline goal is deterministic layout/content for pinned inputs.

`ExportSnapshot` model:

- id, reportExportId FK, branding JSON (resolved), preset JSON (resolved), generatedAt
- Stored at generation time; used for future regeneration requests for the same report

---

## 4. Report Template Versioning

Report templates follow the same draft/publish/version lifecycle as form templates.

- `ReportTemplate` → `ReportTemplateVersion` → `ReportBlockDefinition`
- Bindings reference form blocks by `stableKey`
- At publish time: validate all bindings against the target form template version
- Warnings (not errors) for bindings to keys not found in the form template
- Published report versions are immutable

---

## 5. Report Designer UX

### Layout

The report designer uses the same three-panel layout as the form builder:

- **Left panel:** Report block palette (cover, logo, title, TOC, summary, section, field value, key-value list, findings summary/detail/table, photo grid, signature, cost summary, static text, disclaimer, page break, appendix, attachment list)
- **Center panel:** Flow canvas — blocks stacked vertically with page-break indicators. NOT a free-positioning canvas.
- **Right panel:** Properties — data binding (field selector by stableKey), visibility rules, styling overrides, photo layout settings

### Photo layout configuration

Per photo grid block:

- Columns: 1, 2, 3, or 4
- Aspect ratio: 4:3, 3:2, 16:9, 1:1, or original
- Fit mode: contain (show full image) or cover (fill area, crop from center)
- Row height: fixed (mm) or auto
- Spacing: gap between photos (mm)
- Captions: show/hide, position (below photo), font size
- Max photos: limit per block
- Start on new page: toggle
- Keep rows together: avoid splitting a row across pages

### Preview mode

- Renders ReportDocument as HTML in the browser
- A4 page frames with correct aspect ratio (210×297mm scaled to viewport)
- Page boundaries visible
- Zoom controls
- Page count display
- Sample data toggle (fill with placeholder data to preview layout)
- Missing binding warnings highlighted in yellow

---

## 6. Report Style Settings

Configurable at the BrandingProfile and ExportPreset level:

| Category        | Settings                                                                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Paper           | Size (A4/Letter/Legal), orientation (Portrait/Landscape)                                                                                             |
| Margins         | Top, right, bottom, left (mm)                                                                                                                        |
| Colors          | Primary (headings, borders), secondary (accents), background                                                                                         |
| Fonts           | Font family (from approved set: Inter, Roboto, Open Sans, Lato, Merriweather, Source Sans Pro), heading scale (%), paragraph size (pt), line spacing |
| Spacing         | Block spacing (mm), section spacing (mm), paragraph indentation                                                                                      |
| Borders         | Show/hide block borders, border color, border width                                                                                                  |
| Tables          | Header background color, alternating row colors, border style, cell padding                                                                          |
| Density         | Compact (reduced spacing), normal, spacious (increased spacing)                                                                                      |
| Display         | Show/hide unanswered fields, show/hide not-applicable answers, label/value layout (stacked or two-column)                                            |
| Sections        | New page per form section toggle, keep heading with content toggle                                                                                   |
| Headers/Footers | Show header (logo left, title right), show footer (page X of Y centered, date left)                                                                  |
| Watermark       | None / Draft / Final / Custom text, opacity, rotation                                                                                                |
| Language        | nl-NL, en-US, etc. (affects date/number/currency formatting)                                                                                         |

---

## 7. PDF Engine Comparison

### Preferred candidate: Playwright/Chromium

Must pass Phase 3A0-B feasibility spike before final commitment.

| Engine                            | CSS Support                                   | Pagination                                | Headers/Footers                          | Tables                                       | Images                          | Deterministic                             | Deployment                                                       |
| --------------------------------- | --------------------------------------------- | ----------------------------------------- | ---------------------------------------- | -------------------------------------------- | ------------------------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| **Playwright/Chromium**           | Full CSS (print, flexbox, grid, break-inside) | Battle-tested Chromium print engine       | CSS @page margin boxes or position:fixed | thead display: table-header-group            | All formats, object-fit, srcset | Layout/content deterministic when inputs are pinned; byte identity unproven | Chromium binary (size unknown until spike), Dockerfile required |
| Puppeteer                         | Full CSS (same engine)                        | Battle-tested (same engine)               | CSS @page margin boxes                   | thead display: table-header-group            | All formats                     | Layout/content deterministic when inputs are pinned; byte identity unproven | Chromium binary                                                  |
| React PDF (`@react-pdf/renderer`) | No CSS — custom layout model                  | Manual page breaks only                   | Manual via fixed elements                | Manual column widths, no auto-repeat headers | Limited format support          | Deterministic but limited layout fidelity | Pure JS, lightweight                                             |
| Paged.js                          | CSS print polyfill                            | Polyfilled — inconsistent across browsers | Polyfilled                               | Polyfilled                                   | CSS-only                        | Variable (browser-dependent)              | JS library, no binary                                            |
| PDFKit / pdfmake                  | No CSS — manual drawing commands              | Manual                                    | Manual text placement                    | Manual column widths, explicit row positions | Manual image placement          | Deterministic                             | Pure JS, lightweight                                             |
| External API service              | N/A (black box)                               | N/A                                       | N/A                                      | N/A                                          | N/A                             | Unknown                                   | Zero infra, ongoing cost, data privacy risk                      |

**Do not claim Puppeteer is less maintained.** Puppeteer and Playwright share the same browser automation lineage and both are actively maintained by their respective teams. Playwright is preferred because it is already present conceptually in this project's `e2e-tests/` dependency, not because Puppeteer is inadequate.

### Playwright header/footer facts and hypotheses

Playwright's `page.pdf()` supports `headerTemplate` and `footerTemplate` options, but these have known limitations:

- Header/footer template scripts are not evaluated.
- Main-page styles are not inherited by header/footer templates.
- Dynamic content such as page number and total pages uses special `<span class="pageNumber">` and `<span class="totalPages">` classes.

The following remain Phase 3A0-B hypotheses until tested: fragment versus complete markup behavior, inline CSS requirements, flex/grid support, embedded fonts, data-URI logo behavior, local/file asset behavior, different first-page header/footer behavior, header/footer height limits, long company names, and multilingual text.

**Alternative approach:** Render headers and footers as part of the main HTML content using CSS `position: fixed` with appropriate `@page` margin boxes. This approach may provide more layout flexibility but must be tested in the spike.

---

## 8. Pagination Contract

Each report block declares its pagination behavior:

```typescript
interface PaginationConfig {
	splittable: boolean; // Can split across pages?
	keepTogether: boolean; // Keep entire block on one page?
	keepWithNext: boolean; // Keep with the following block?
	pageBreakBefore: boolean; // Start on a new page?
	pageBreakAfter: boolean; // Force page break after this block?
	minimumRemainingHeight: string; // e.g., "30%" — if less than this page space remains, break before
	repeatHeader: boolean; // For tables: repeat header on each continuation page
	orphanPolicy: number; // Minimum lines/rows kept together at page top/bottom
	overflowStrategy: 'split' | 'scale' | 'landscape' | 'truncate';
	splitStrategy: 'by-row' | 'by-paragraph' | 'by-block-child' | null;
}
```

---

## 9. Anti-Clipping Strategy

### Non-negotiable rules

1. Text must never clip, overlap, disappear, overflow horizontally, or split mid-character
2. Images must never distort, stretch, exceed containers, lose captions, or detach from captions
3. Headings must never be alone at the bottom of a page
4. Tables must repeat headers on continuation pages and split between rows
5. Signatures must stay together on one page
6. Cover page content must not flow onto subsequent pages

### CSS strategy

- `@page { size: A4; margin: ... }` for page dimensions
- `page-break-before: always` for explicit page breaks
- `page-break-after: avoid` to keep headings with following content
- `break-inside: avoid` on figures, cards, signatures, and table rows
- `overflow-wrap: break-word; word-break: break-word; hyphens: auto` on all text containers
- `max-width: 100%; box-sizing: border-box` on all elements
- `table-layout: fixed; width: 100%` on tables
- `object-fit: cover` or `contain` on images within fixed aspect-ratio containers

### Programmatic block splitting

CSS break rules alone are insufficient for content taller than one page. Oversized blocks must be split at logical boundaries based on browser-measured layout after fonts and assets finish loading.

Pagination strategy order:

1. Build semantic report structure.
2. Let Chromium native pagination and print CSS handle normal flow.
3. Use `break-before`, `break-after`, `break-inside`, and repeated table headers.
4. Run browser measurement after fonts and assets finish loading.
5. Split oversized blocks based on actual measured dimensions and structured sub-boundaries.
6. Emit graceful overflow diagnostics when content cannot be split safely.

Character-count estimates may be used only as optional heuristics, never as the primary source of page-fit truth.

### Block-specific pagination

| Block type            | If taller than one page                                 | Strategy                                                                                                        |
| --------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Paragraph (long text) | Allow natural text flow split between lines             | CSS `widows: 2; orphans: 2`                                                                                     |
| Heading + content     | Keep heading with at least 2 lines of following content | `page-break-after: avoid` on heading; if remaining space < 15%, page break before heading                       |
| Finding card          | Split at sub-block boundaries                           | Programmatic: title → description → photos → recommendation. Split after the last complete sub-block that fits. |
| Photo gallery         | Split between complete photo rows                       | `break-inside: avoid` on each figure row (photo + caption wrapped together)                                     |
| Key-value grid        | Split between rows; never split a row                   | `break-inside: avoid` on each row                                                                               |
| Table                 | Split between rows; repeat headers                      | `thead { display: table-header-group }`                                                                         |
| Signature block       | Never split                                             | `break-inside: avoid` + `page-break-before: always` if remaining space < 40%                                    |
| Floor plan            | Never split; prefer full-page                           | `page-break-before: always`; scale to fit page if needed                                                        |
| Cover page            | Never flow content onto cover                           | `page-break-after: always` on cover                                                                             |

### Widow/orphan behavior

- Minimum 2 lines of a paragraph at the top of a page (widow)
- Minimum 2 lines at the bottom of a page (orphan)
- CSS: `widows: 2; orphans: 2`
- For headings: a heading at page bottom with zero content lines below it is an orphan heading — prevented by `keepWithNext` + minimum remaining height check

### Long text and URL handling

- `overflow-wrap: break-word; word-break: break-word; hyphens: auto` on all text containers
- For URLs specifically: `word-break: break-all` to allow breaking at any character within the URL
- `white-space: pre-wrap` on pre-formatted text blocks
- Test with 200+ character unbroken strings

### Missing/broken images

- Server verifies all image URLs are accessible before PDF generation
- Missing image → render placeholder with "Image not available" text and file name
- HTTP error → render error placeholder
- Timeout (>10s) → render loading-failed placeholder
- Never silently drop images or leave blank spaces

### Blank-page detection

- After PDF generation, analyze page count vs expected
- Detect pages with zero visible content (only headers/footers/watermarks)
- Common causes: `page-break-before` on first block creating leading blank page, `page-break-after` on last block creating trailing blank page, `break-inside: avoid` forcing a block to a new page when the previous page had exact fit
- Mitigation: suppress `page-break-before` on the first element, suppress `page-break-after` on the last element

### Horizontal-overflow detection

- All containers use `max-width: 100%` and `box-sizing: border-box`
- Images use `max-width: 100%; height: auto` within fixed containers
- Tables use `table-layout: fixed; width: 100%`
- After PDF generation, render pages to images and scan for content beyond margin boundaries

---

## 10. Photo Layout Specification

### Rendering model

- CSS Grid with explicit column tracks: `grid-template-columns: repeat(N, 1fr)`
- Fixed aspect-ratio containers: `aspect-ratio: X/Y` on each photo container
- Image fit: `object-fit: cover` (crop to fill) or `object-fit: contain` (show full image)
- Each photo + caption wrapped in `<figure>` with `break-inside: avoid`
- Grid row acts as a split boundary: a row either fits on the current page or moves to the next

### Configurable settings

| Setting            | Options                                     | Description                                                     |
| ------------------ | ------------------------------------------- | --------------------------------------------------------------- |
| Columns            | 1, 2, 3, 4                                  | Number of photos per row                                        |
| Aspect ratio       | 4:3, 3:2, 16:9, 1:1, original               | Container shape; "original" preserves each photo's native ratio |
| Fit mode           | contain, cover                              | How the image fills its container                               |
| Row height         | auto, fixed (mm)                            | Consistent row height or natural height                         |
| Spacing            | mm                                          | Gap between photos in the grid                                  |
| Borders            | width (mm), color, radius (mm)              | Photo border styling                                            |
| Captions           | show/hide, position (below), font size (pt) | Caption display                                                 |
| Max photos         | number                                      | Limit photos shown; remainder accessible via link               |
| Start on new page  | boolean                                     | Force photo grid to start on a new page                         |
| Keep rows together | boolean                                     | Avoid splitting a row across pages                              |

### Image distortion prevention

- Images are never placed in unstyled `<img>` tags
- Always rendered inside a container with explicit `aspect-ratio` or fixed dimensions
- `object-fit` controls how the image fills the container
- `max-width: 100%` as a safety net
- Test with portrait, landscape, square, and extreme aspect ratio images (panorama, tall mobile screenshot)

---

## 11. PDF Fixture Suite

The PDF suite has 27 total planned cases: 12 mandatory core feasibility fixtures for Phase 3A0-B and 15 extended validation fixtures before the production PDF renderer is considered release-ready.

### Fixture generation requirements

- All images MUST be locally generated JPEG/PNG files with deterministic dimensions, aspect ratios, and file sizes
- Do NOT depend on remote/online images for core tests
- Use a script to generate: solid-color rectangles at specific dimensions, or simple geometric patterns

### Core feasibility gate — 12 fixtures

| #   | Fixture                       | Key Verification                                                  |
| --- | ----------------------------- | ----------------------------------------------------------------- |
| 1   | Normal A4 report              | Correct page dimensions, margins, no blank pages                  |
| 2   | 5,000+ character text         | No clipping; browser-measured pagination behaves acceptably       |
| 3   | Unsplittable oversized block  | Graceful overflow diagnostic or safe page-break behavior          |
| 4   | 50-row table                  | Rows split correctly and table header repeats                     |
| 5   | Header/footer/page X of Y     | Page numbers and total pages render correctly                     |
| 6   | Explicit page breaks          | No extra leading/trailing blank pages                             |
| 7   | One-column image layout       | Images and captions stay together without distortion              |
| 8   | Two-column image layout       | Mixed image sizes fit without horizontal overflow                 |
| 9   | Four-column image layout      | Dense photo grid paginates without missing images                 |
| 10  | Mixed orientations + captions | Portrait/landscape images and long captions stay readable         |
| 11  | 50+ photo stress test         | All photos render; timing and memory are measured                 |
| 12  | Preview vs PDF + deployment   | Browser preview and PDF are compared; binary, memory, and runtime metrics are measured |

### Extended validation — 15 fixtures

| #   | Fixture              | Key Verification                                             |
| --- | -------------------- | ------------------------------------------------------------ |
| 13  | Very short report    | One-page report does not create blank pages                  |
| 14  | Long report          | 50+ pages render with sequential physical page numbers       |
| 15  | Long unbroken URL    | Text wraps within container; no horizontal overflow          |
| 16  | Many/empty sections  | Empty sections and headings do not create blank pages        |
| 17  | All field types      | Every baseline field type renders correctly                  |
| 18  | Missing/broken image | Placeholders render for missing or failed assets             |
| 19  | Large findings table | Long cells wrap and table headers repeat                     |
| 20  | Finding > one page   | Finding splits at measured sub-boundaries                    |
| 21  | Repeating table      | Row-based splitting and repeated headers work                |
| 22  | Signatures           | Signatures stay together and do not split across pages       |
| 23  | Different logos      | Logo assets scale correctly without overflow                 |
| 24  | Different branding   | Brand colors remain readable                                 |
| 25  | Dutch/English text   | Localized characters, punctuation, and currency render       |
| 26  | Table of contents    | TOC entries and physical page references are correct         |
| 27  | Draft watermark / large report | Watermark does not obscure content; large report succeeds with measured resource use |

---

## 12. Deployment Feasibility

All metrics below are **unknown** until Phase 3A0-B measures them:

| Metric                                  | Expected Range | Actual Measurement |
| --------------------------------------- | -------------- | ------------------ |
| Chromium binary size                    | Unknown        |                       |
| Cold-start time (first page.pdf call)   | Unknown        |                       |
| Warm-start time (subsequent calls)      | Unknown        |                       |
| Memory usage (typical 10-page report)   | Unknown        |                       |
| Memory usage (50-photo report)          | Unknown        |                       |
| Memory usage (200-page report)          | Unknown        |                       |
| Railway Docker image size with Chromium | Unknown        |                       |
| Required apt packages for Chromium      | Unknown        |                       |

### Railway deployment approach (to be validated)

- Dockerfile based on `node:20-slim` or similar
- Install Chromium dependencies via apt
- Use `playwright-core` (lighter than full `playwright`)
- Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to system Chromium
- Wasp background job for async PDF generation
- PDF generation time potentially 30-60s for large reports — background job with status polling

---

## 13. ReportBlockTypeDefinition Contracts

Every `ReportBlockTypeDefinition` must define:

```text
typeId
label
category
config contract
binding contract
resolved data contract
visibility behavior
pagination contract
renderer responsibility
error fallback
phase
```

Planned report-block contracts:

| typeId | Category | Binding contract | Pagination contract | Error fallback | Phase |
| --- | --- | --- | --- | --- | --- |
| `report_cover` | Structure | Branding/export snapshot | Unsplittable; starts report | Render minimal title cover | 3K |
| `report_logo` | Branding | `ResolvedAsset` logo | Keep together | Omit with diagnostic placeholder | 3K |
| `report_title` | Content | Static/report metadata | Keep with next | Render configured fallback text | 3K |
| `report_toc` | Navigation | Renderer physical page map | Splittable by row | Show unavailable until pagination completes | 3K |
| `report_summary` | Content | Bound summary fields or static text | Splittable by paragraph | Placeholder with binding status | 3K |
| `report_section` | Structure | Form section stableKey or report-only section | Page-break configurable | Render section header only | 3K |
| `report_field_value` | Field | One form block stableKey | Keep label/value row together | Binding placeholder | 3K |
| `report_key_value_list` | Field | Multiple form block stableKeys | Splittable by row | Row-level binding placeholder | 3K |
| `report_findings_summary` | Findings | Finding collection | Splittable by row/card | Empty-state summary | 3K |
| `report_findings_detail` | Findings | Finding collection/detail binding | Splittable by finding sub-block | Finding-level error placeholder | 3K |
| `report_findings_table` | Findings | Finding collection | Table rows split; repeat header | Row-level placeholder | 3K |
| `report_photo_grid` | Media | Photo collection | Splittable by measured row | Missing-photo placeholder | 3K |
| `report_before_after` | Specialized | Paired photo collection | Keep pair together where possible | Pair-level placeholder | 3R |
| `report_floor_plan` | Media | Floor plan asset + pins | Prefer full page; unsplittable | Asset placeholder with diagnostics | 3N |
| `report_signature` | Evidence | Signature response | Keep together; minimum remaining height | Evidence placeholder | 3K |
| `report_cost_summary` | Findings | Cost fields/findings | Splittable by row | Omit invalid totals with diagnostic | 3K |
| `report_chart` | Deferred | Resolved data series | Keep together or page break before | Static table fallback | Deferred |
| `report_static_text` | Content | Static sanitized text | Splittable by paragraph | Render placeholder | 3K |
| `report_disclaimer` | Content | Static legal text | Splittable by paragraph | Render configured fallback | 3K |
| `report_page_break` | Structure | None | Forces page break | No-op if invalid position | 3K |
| `report_appendix` | Structure | Appendix block collection | Page-break before | Omit empty appendix | 3K |
| `report_attachment_list` | Media | File attachment collection | Splittable by row | Row-level placeholder | 3K |

---

## 14. Security

### Print route

- Authenticated: verifies `context.user` and instance ownership
- Content Security Policy: restricts resource loading
- Only loads resources from localhost (the app server itself)
- Images: only S3 signed URLs generated server-side for owned media

### SSRF prevention

- Do not fetch arbitrary URLs during PDF generation
- If external resource loading is enabled: strict allowlist, block internal IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16), block metadata endpoints
- Image URLs: validate they are S3 signed URLs for files owned by the instance's user

### Download

- PDF stored as a File record with userId
- Download via ownership-checked signed URL (same pattern as existing file downloads)
- Cannot access another user's report by URL manipulation
