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

The `ReportDocument` is a pure function of its inputs. Same inputs → same output. It contains no live database queries — all data is resolved at construction time.

```typescript
interface ReportDocument {
  metadata: ReportMetadata;
  branding: ResolvedBranding;
  layout: ResolvedLayout;
  pages: ReportPage[];
}

interface ReportMetadata {
  reportDocumentId: string;          // UUID — deterministic if same inputs
  generatedAt: string;               // ISO 8601 timestamp
  formInstanceId: string;
  templateVersionId: string;
  reportTemplateVersionId: string;
  brandingProfileId: string;
  exportPresetId: string;
}

interface ResolvedBranding {
  companyName: string;
  logoUrl: string | null;            // Resolved S3 signed URL or null
  primaryColor: string;              // Hex color
  secondaryColor: string;
  fontFamily: string;                // From approved set
  address: string | null;
  contactInfo: string | null;
  footerText: string | null;
  legalText: string | null;
  language: string;                  // e.g., "nl-NL", "en-US"
}

interface ResolvedLayout {
  paperSize: 'A4' | 'Letter' | 'Legal';
  orientation: 'Portrait' | 'Landscape';
  margins: { top: string; right: string; bottom: string; left: string };
  showUnanswered: boolean;
  showNotApplicable: boolean;
  watermark: 'None' | 'Draft' | 'Final' | string;
  imageQuality: number;              // 1-100
}

interface ReportPage {
  pageNumber: number;
  pageType: 'cover' | 'toc' | 'content' | 'appendix';
  blocks: ResolvedReportBlock[];
}

interface ResolvedReportBlock {
  blockType: string;
  config: Record<string, unknown>;   // Merged: report block config + branding overrides + preset overrides
  resolvedData: Record<string, unknown> | null; // Bound data from form responses, or null if static content
  dataBindingStatus: BindingStatus;
  pagination: ComputedPagination;
  visibility: boolean;               // Resolved visibility rules
}
```

### Binding statuses

| Status | Condition | Behavior |
|--------|-----------|----------|
| `resolved` | Block key exists in template version AND response data is available | Normal rendering with bound data |
| `no_response` | Block key exists but user did not submit a response (optional field, skipped) | Render per `showUnanswered` preset setting: show empty cell or hide block |
| `not_applicable` | Response value is "N/A" (pass_fail_na) or "Not Inspected" (compliant_nc_ni) | Render per `showNotApplicable` preset setting |
| `hidden_by_rule` | Block was hidden by conditional logic at submission time | Omit from report (unless configured to show hidden fields) |
| `missing_binding` | Block key referenced in report template but not found in form template version (block was removed in a newer template version) | Render placeholder: "[Field 'X' is no longer available in this template version]" |
| `incompatible_type` | Block key found but the block type has changed and the old response shape is incompatible | Render placeholder: "[Data format for 'X' has changed — cannot display]" |
| `render_error` | An error occurred while rendering this specific block | Render placeholder: "[Error rendering 'X']" with error details in debug mode |

---

## 3. Historical Report Regeneration

`buildReportDocument()` is a pure function. For deterministic regeneration:

- **Original form data:** Preserved in BlockResponse records (never modified after instance completion)
- **Template version:** Immutable once published. Snapshot stored in version record.
- **Report template version:** Immutable once published. Snapshot stored.
- **Branding profile:** May change over time. At report generation time, capture the resolved branding into an `ExportSnapshot`.
- **Export preset:** May change. Capture into `ExportSnapshot`.

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

| Category | Settings |
|----------|----------|
| Paper | Size (A4/Letter/Legal), orientation (Portrait/Landscape) |
| Margins | Top, right, bottom, left (mm) |
| Colors | Primary (headings, borders), secondary (accents), background |
| Fonts | Font family (from approved set: Inter, Roboto, Open Sans, Lato, Merriweather, Source Sans Pro), heading scale (%), paragraph size (pt), line spacing |
| Spacing | Block spacing (mm), section spacing (mm), paragraph indentation |
| Borders | Show/hide block borders, border color, border width |
| Tables | Header background color, alternating row colors, border style, cell padding |
| Density | Compact (reduced spacing), normal, spacious (increased spacing) |
| Display | Show/hide unanswered fields, show/hide not-applicable answers, label/value layout (stacked or two-column) |
| Sections | New page per form section toggle, keep heading with content toggle |
| Headers/Footers | Show header (logo left, title right), show footer (page X of Y centered, date left) |
| Watermark | None / Draft / Final / Custom text, opacity, rotation |
| Language | nl-NL, en-US, etc. (affects date/number/currency formatting) |

---

## 7. PDF Engine Comparison

### Preferred candidate: Playwright/Chromium

Must pass Phase 3A0-B feasibility spike before final commitment.

| Engine | CSS Support | Pagination | Headers/Footers | Tables | Images | Deterministic | Deployment |
|--------|------------|------------|-----------------|--------|--------|---------------|------------|
| **Playwright/Chromium** | Full CSS (print, flexbox, grid, break-inside) | Battle-tested Chromium print engine | CSS @page margin boxes or position:fixed | thead display: table-header-group | All formats, object-fit, srcset | Same HTML + same Chromium = same PDF | Chromium binary (~size unknown until spike), Dockerfile required |
| Puppeteer | Full CSS (same engine) | Battle-tested (same engine) | CSS @page margin boxes | thead display: table-header-group | All formats | Same HTML + same Chromium = same PDF | Chromium binary |
| React PDF (`@react-pdf/renderer`) | No CSS — custom layout model | Manual page breaks only | Manual via fixed elements | Manual column widths, no auto-repeat headers | Limited format support | Deterministic but limited layout fidelity | Pure JS, lightweight |
| Paged.js | CSS print polyfill | Polyfilled — inconsistent across browsers | Polyfilled | Polyfilled | CSS-only | Variable (browser-dependent) | JS library, no binary |
| PDFKit / pdfmake | No CSS — manual drawing commands | Manual | Manual text placement | Manual column widths, explicit row positions | Manual image placement | Deterministic | Pure JS, lightweight |
| External API service | N/A (black box) | N/A | N/A | N/A | N/A | Unknown | Zero infra, ongoing cost, data privacy risk |

**Do not claim Puppeteer is less maintained.** Puppeteer and Playwright share the same browser automation lineage and both are actively maintained by their respective teams. Playwright is preferred because it is already present conceptually in this project's `e2e-tests/` dependency, not because Puppeteer is inadequate.

### Playwright header/footer limitations (to be tested in Phase 3A0-B)

Playwright's `page.pdf()` supports `headerTemplate` and `footerTemplate` options, but these have known limitations:
- Headers and footers are rendered in a separate context from the main page content
- They cannot contain complex CSS (flexbox/grid support is limited in the header/footer context)
- They have fixed height and cannot grow with content
- Dynamic content (e.g., "Page X of Y") uses special `<span class="pageNumber">` and `<span class="totalPages">` elements
- Images in headers/footers must be base64-encoded data URIs (cannot reference external files)
- The header/footer template is a complete HTML document, not a fragment

**Alternative approach:** Render headers and footers as part of the main HTML content using CSS `position: fixed` with appropriate `@page` margin boxes. This approach may provide more layout flexibility but must be tested in the spike.

---

## 8. Pagination Contract

Each report block declares its pagination behavior:

```typescript
interface PaginationConfig {
  splittable: boolean;              // Can split across pages?
  keepTogether: boolean;            // Keep entire block on one page?
  keepWithNext: boolean;            // Keep with the following block?
  pageBreakBefore: boolean;         // Start on a new page?
  pageBreakAfter: boolean;          // Force page break after this block?
  minimumRemainingHeight: string;   // e.g., "30%" — if less than this page space remains, break before
  repeatHeader: boolean;            // For tables: repeat header on each continuation page
  orphanPolicy: number;             // Minimum lines/rows kept together at page top/bottom
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

CSS break rules alone are insufficient for content taller than one page. The ReportDocument construction phase must compute whether each block fits within the remaining page space and split oversized blocks at logical boundaries.

**Important limitation:** ReportDocument construction uses approximate height estimation (character count × line height ÷ page height). Actual physical page fit depends on browser layout. Phase 3A0-B must validate whether this estimation approach is sufficient or whether actual browser-layout measurement is required. The spike must test whether programmatic splitting (based on sub-element boundaries) produces acceptable results without browser-based measurement.

### Block-specific pagination

| Block type | If taller than one page | Strategy |
|-----------|------------------------|----------|
| Paragraph (long text) | Allow natural text flow split between lines | CSS `widows: 2; orphans: 2` |
| Heading + content | Keep heading with at least 2 lines of following content | `page-break-after: avoid` on heading; if remaining space < 15%, page break before heading |
| Finding card | Split at sub-block boundaries | Programmatic: title → description → photos → recommendation. Split after the last complete sub-block that fits. |
| Photo gallery | Split between complete photo rows | `break-inside: avoid` on each figure row (photo + caption wrapped together) |
| Key-value grid | Split between rows; never split a row | `break-inside: avoid` on each row |
| Table | Split between rows; repeat headers | `thead { display: table-header-group }` |
| Signature block | Never split | `break-inside: avoid` + `page-break-before: always` if remaining space < 40% |
| Floor plan | Never split; prefer full-page | `page-break-before: always`; scale to fit page if needed |
| Cover page | Never flow content onto cover | `page-break-after: always` on cover |

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
| Setting | Options | Description |
|---------|---------|-------------|
| Columns | 1, 2, 3, 4 | Number of photos per row |
| Aspect ratio | 4:3, 3:2, 16:9, 1:1, original | Container shape; "original" preserves each photo's native ratio |
| Fit mode | contain, cover | How the image fills its container |
| Row height | auto, fixed (mm) | Consistent row height or natural height |
| Spacing | mm | Gap between photos in the grid |
| Borders | width (mm), color, radius (mm) | Photo border styling |
| Captions | show/hide, position (below), font size (pt) | Caption display |
| Max photos | number | Limit photos shown; remainder accessible via link |
| Start on new page | boolean | Force photo grid to start on a new page |
| Keep rows together | boolean | Avoid splitting a row across pages |

### Image distortion prevention
- Images are never placed in unstyled `<img>` tags
- Always rendered inside a container with explicit `aspect-ratio` or fixed dimensions
- `object-fit` controls how the image fills the container
- `max-width: 100%` as a safety net
- Test with portrait, landscape, square, and extreme aspect ratio images (panorama, tall mobile screenshot)

---

## 11. PDF Fixture Suite

27 mandatory test fixtures for Phase 3A0-B and Phase 3M.

### Fixture generation requirements
- All images MUST be locally generated JPEG/PNG files with deterministic dimensions, aspect ratios, and file sizes
- Do NOT depend on remote/online images for core tests
- Use a script to generate: solid-color rectangles at specific dimensions, or simple geometric patterns

| # | Fixture | Description | Key Verification |
|---|---------|-------------|-----------------|
| 1 | Very short report | 1 page, cover + 1 content section | Correct page dimensions, no blank pages |
| 2 | Long report | 50+ pages, 20 sections with content | All pages render, sequential page numbers |
| 3 | Long paragraph | 5000+ characters of continuous prose | No text clipping, correct pagination, widows/orphans respected |
| 4 | Long unbroken URL | 200+ characters, no hyphens or spaces | Text wraps within container, no horizontal overflow |
| 5 | Many sections | 20+ sections, some with headings only (no content blocks) | Empty sections don't produce blank pages |
| 6 | Empty sections | Section with heading but zero content blocks | Section heading renders, no excess whitespace, no blank page |
| 7 | All field types | One of each basic input block, all filled with data | Every field type renders correctly, values visible |
| 8 | One photo | Single portrait-orientation photo with caption | Image renders at correct aspect ratio, caption present |
| 9 | 50+ photos | 50+ photos in a 3-column grid, mixed sizes | All photos render, no missing images, correct columns, pagination |
| 10 | Portrait + landscape | Mixed orientations in same 2-column grid | No distortion, rows with mixed orientations look acceptable |
| 11 | Missing/broken image | Image URL returns 404; image URL returns 500; image URL times out | Placeholder rendered for each, layout not broken |
| 12 | Long captions | 500+ character captions under each photo | Captions don't overflow, captions stay with photos |
| 13 | Large findings table | 50+ findings, all columns populated | Table headers repeat, rows split correctly, long cells wrap |
| 14 | Finding > one page | Single finding with long description + multiple photos + recommendation | Block splits at sub-boundaries, heading not orphaned |
| 15 | Repeating table | 20+ rows with mixed content lengths | Row-based splitting, headers repeat |
| 16 | Signatures | Multiple signature blocks on one page | Signatures stay together, not split across pages |
| 17 | Different logos | Small (100×50), large (800×400), rectangular, square | All scale correctly, none overflow |
| 18 | Different branding | Dark theme (white on #1a1a2e), light theme, high-contrast | Colors render correctly, text readable |
| 19 | Dutch text | Extended characters: é, ë, ï, €, ij, IJ | All characters render correctly |
| 20 | English text | Standard ASCII, common punctuation | Baseline text rendering |
| 21 | Euro currency | € 1.234,56 formatting | Euro symbol renders, number format correct for nl-NL locale |
| 22 | Page boundary | Block content ending exactly at page bottom edge | No clipping, no blank next page, no orphan lines |
| 23 | Explicit page breaks | page_break blocks placed between sections | Each section starts on new page, no extra blank pages |
| 24 | Headers and footers | Running header (title + logo), footer (page X of Y + date) | Present on every page, page numbers sequential and correct |
| 25 | Table of contents | 10+ sections, auto-generated TOC | Correct section titles, correct page numbers |
| 26 | Draft watermark | Semi-transparent "DRAFT" across each page | Visible on every page, does not obscure content |
| 27 | Large report | 200+ pages, 500+ photos, all block types | Generation succeeds, acceptable time and memory |

---

## 12. Deployment Feasibility

All metrics below are **unknown** until Phase 3A0-B measures them:

| Metric | Expected Range | Actual (TBD by spike) |
|--------|---------------|----------------------|
| Chromium binary size | Unknown | |
| Cold-start time (first page.pdf call) | Unknown | |
| Warm-start time (subsequent calls) | Unknown | |
| Memory usage (typical 10-page report) | Unknown | |
| Memory usage (50-photo report) | Unknown | |
| Memory usage (200-page report) | Unknown | |
| Railway Docker image size with Chromium | Unknown | |
| Required apt packages for Chromium | Unknown | |

### Railway deployment approach (to be validated)
- Dockerfile based on `node:20-slim` or similar
- Install Chromium dependencies via apt
- Use `playwright-core` (lighter than full `playwright`)
- Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to system Chromium
- Wasp background job for async PDF generation
- PDF generation time potentially 30-60s for large reports — background job with status polling

---

## 13. Security

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
