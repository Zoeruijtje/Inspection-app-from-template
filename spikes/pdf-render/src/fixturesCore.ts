import { commonCover, escapeHtml, wrapReportHtml } from './renderHtml.js';
import type { FixtureAsset, FixtureDefinition } from './types.js';

export const coreFixtures: FixtureDefinition[] = [
  {
    id: 'core-01-normal-a4',
    title: 'Normal branded A4 report',
    description: 'A compact branded A4 report with cover, metadata, sections, and summary content.',
    expectedMinimumPageCount: 2,
    expectedTextMarkers: ['CORE01_BRAND_MARKER', 'CORE01_SUMMARY_MARKER'],
    manualChecklist: ['Inspect A4 margins', 'Inspect branding/logo treatment', 'Check for horizontal overflow', 'Check for accidental blank pages'],
    knownLimitation: 'Automated checks cannot prove visual margin quality or brand polish.',
    buildHtml: ({ assets }) => wrapReportHtml('Core 01 Normal A4', `
      ${commonCover('Normal branded A4 report')}
      <section class="section" data-section-id="core-01-summary">
        <h2>Inspection Summary CORE01_BRAND_MARKER</h2>
        <div class="meta-grid">
          <div class="meta-label">Client</div><div>Demo Vereniging van Eigenaren</div>
          <div class="meta-label">Property</div><div>Keizersgracht 100, Amsterdam</div>
          <div class="meta-label">Inspector</div><div>Inspection App Gate 1</div>
        </div>
        ${logoHtml(assets['logo-png'])}
        <p>CORE01_SUMMARY_MARKER This report validates ordinary branded document flow, typography, and A4 page setup.</p>
        <div class="card">Observation: roof access is safe, visible drainage is clear, and the inspection record contains a deterministic evidence block.</div>
      </section>
    `)
  },
  {
    id: 'core-02-long-text-5000',
    title: 'Text block exceeding 5,000 characters',
    description: 'A long text block with start, middle, and end markers for PDF text extraction.',
    expectedMinimumPageCount: 2,
    expectedTextMarkers: ['CORE02_START_MARKER', 'CORE02_MIDDLE_MARKER', 'CORE02_END_MARKER'],
    manualChecklist: ['Inspect text clipping', 'Inspect text overlap', 'Verify continuation across pages', 'Check paragraph flow readability'],
    knownLimitation: 'Extracted text proves content presence, not visible continuity or readability.',
    buildHtml: () => wrapReportHtml('Core 02 Long Text', `
      <section class="section" data-section-id="core-02-long-text">
        <h1>Long Text Pagination</h1>
        <p>${longText()}</p>
      </section>
    `)
  },
  {
    id: 'core-03-unsplittable-oversized',
    title: 'Unsplittable oversized block',
    description: 'An intentionally oversized keep-together block with an explicit overflow diagnostic.',
    expectedMinimumPageCount: 1,
    expectedTextMarkers: ['CORE03_OVERFLOW_DIAGNOSTIC', 'CORE03_BOUNDED_PLACEHOLDER'],
    requiresOverflowDiagnostic: true,
    manualChecklist: ['Inspect explicit overflow diagnostic', 'Confirm clipping is not silently accepted', 'Inspect where oversized content lands'],
    knownLimitation: 'The fixture intentionally substitutes a bounded diagnostic placeholder when the source block would exceed the usable page area.',
    buildHtml: () => wrapReportHtml('Core 03 Oversized Unsplittable', `
      <section class="section" data-section-id="core-03-oversized">
        <h1>Oversized Unsplittable Block</h1>
        <div class="diagnostic" data-overflow-diagnostic="true">CORE03_OVERFLOW_DIAGNOSTIC: This block is deliberately taller than one A4 page and cannot be split safely.</div>
        <div class="card oversized-placeholder" data-block-id="core-03-unsplittable" data-overflow-diagnostic="true">
          <h2>CORE03_BOUNDED_PLACEHOLDER</h2>
          <p>The original unsplittable source block is taller than the usable A4 page area. The spike renders this bounded diagnostic placeholder instead of clipping or spilling a partial block onto a continuation page.</p>
          <p>Original block diagnostic: estimated source height 330mm; usable page height approximately 259mm after print margins.</p>
        </div>
      </section>
    `)
  },
  {
    id: 'core-04-table-50',
    title: 'Table with at least 50 rows and repeated headers',
    description: 'A fixed-layout table with 50 unique row markers.',
    expectedMinimumPageCount: 2,
    expectedTableRows: 50,
    expectedTextMarkers: Array.from({ length: 50 }, (_, index) => `CORE04_ROW_${String(index + 1).padStart(2, '0')}`),
    manualChecklist: ['Verify repeated headers visually', 'Inspect row boundaries', 'Inspect long-cell wrapping', 'Check for row clipping'],
    knownLimitation: 'Text extraction and DOM row count cannot prove the table header is visually repeated on continuation pages.',
    buildHtml: () => wrapReportHtml('Core 04 Table 50', `
      <section class="section" data-section-id="core-04-table">
        <h1>50 Row Table</h1>
        <table data-expected-row-count="50">
          <thead>
            <tr><th>Marker</th><th>Location</th><th>Finding</th><th>Recommendation</th></tr>
          </thead>
          <tbody>
            ${Array.from({ length: 50 }, (_, index) => tableRow(index + 1)).join('')}
          </tbody>
        </table>
      </section>
    `)
  },
  {
    id: 'core-05-header-footer-pages',
    title: 'Header, footer, page number, and total-page rendering',
    description: 'Fixed header/footer plus Playwright header/footer templates for page-number evidence.',
    expectedMinimumPageCount: 3,
    expectedTextMarkers: ['CORE05_STATIC_HEADER', 'CORE05_STATIC_FOOTER', 'Page 1 of 3', 'Page 2 of 3', 'Page 3 of 3'],
    expectedImages: 1,
    expectedImageAssetIds: ['logo-png'],
    manualChecklist: ['Verify page X of Y', 'Inspect overlap with body content', 'Inspect first-page behavior', 'Inspect logo', 'Inspect typography'],
    knownLimitation: 'Page-number text extraction from header/footer templates may vary; visual review is authoritative.',
    buildHtml: ({ assets }) => wrapReportHtml('Core 05 Header Footer', `
      <div class="fixed-header"><span>CORE05_STATIC_HEADER</span>${inlineLogo(assets['logo-png'])}</div>
      <div class="fixed-footer"><span>CORE05_STATIC_FOOTER</span><span>Generated fixture footer</span></div>
      <div class="header-footer-spacer"></div>
      <section class="section" data-section-id="core-05-header-footer">
        <h1>Header and Footer Test Page 1</h1>
        ${Array.from({ length: 7 }, (_, index) => `<p>CORE05_BODY_PAGE_1 paragraph ${index + 1}. ${sampleSentence()}</p>`).join('')}
      </section>
      <section class="section page-break" data-section-id="core-05-page-two">
        <h1>Header and Footer Test Page 2</h1>
        ${Array.from({ length: 7 }, (_, index) => `<p>CORE05_BODY_PAGE_2 paragraph ${index + 1}. ${sampleSentence()}</p>`).join('')}
      </section>
      <section class="section page-break" data-section-id="core-05-page-three">
        <h1>Header and Footer Test Page 3</h1>
        ${Array.from({ length: 7 }, (_, index) => `<p>CORE05_BODY_PAGE_3 paragraph ${index + 1}. ${sampleSentence()}</p>`).join('')}
      </section>
    `)
  },
  {
    id: 'core-06-explicit-breaks',
    title: 'Explicit page breaks',
    description: 'Three sections separated by explicit page breaks.',
    expectedMinimumPageCount: 3,
    expectedTextMarkers: ['CORE06_PAGE_ONE', 'CORE06_PAGE_TWO', 'CORE06_PAGE_THREE'],
    manualChecklist: ['Verify exact explicit break positions', 'Check for leading blank pages', 'Check for trailing blank pages', 'Check for accidental blank pages between sections'],
    knownLimitation: 'Physical page count proves minimum pagination only, not exact visual break position.',
    buildHtml: () => wrapReportHtml('Core 06 Explicit Breaks', `
      <section class="section" data-section-id="core-06-page-one"><h1>CORE06_PAGE_ONE</h1><p>${sampleSentence()}</p></section>
      <section class="section page-break" data-section-id="core-06-page-two"><h1>CORE06_PAGE_TWO</h1><p>${sampleSentence()}</p></section>
      <section class="section page-break" data-section-id="core-06-page-three"><h1>CORE06_PAGE_THREE</h1><p>${sampleSentence()}</p></section>
    `)
  },
  photoFixture('core-07-photos-1col', 'One-column photo layout', 1, ['landscape-01-jpg', 'portrait-01-jpg', 'square-01-png']),
  photoFixture('core-08-photos-2col', 'Two-column photo layout', 2, ['landscape-01-jpg', 'portrait-01-jpg', 'square-01-png', 'panorama-01-jpg', 'tall-01-jpg', 'landscape-02-png']),
  photoFixture('core-09-photos-4col', 'Four-column photo layout', 4, ['landscape-01-jpg', 'portrait-01-jpg', 'square-01-png', 'panorama-01-jpg', 'tall-01-jpg', 'landscape-02-png', 'portrait-02-png', 'landscape-01-jpg']),
  {
    id: 'core-10-mixed-orientation-captions',
    title: 'Mixed portrait and landscape photos with long captions',
    description: 'Mixed orientation photo grid with long captions and text markers.',
    expectedImages: 6,
    expectedImageAssetIds: ['landscape-01-jpg', 'portrait-01-jpg', 'panorama-01-jpg', 'tall-01-jpg', 'square-01-png', 'portrait-02-png'],
    expectedTextMarkers: ['CORE10_CAPTION_START', 'CORE10_CAPTION_END'],
    manualChecklist: ['Verify mixed orientation placement', 'Inspect cropping/distortion', 'Verify long captions stay attached', 'Inspect pagination around figures'],
    knownLimitation: 'Browser image readiness cannot prove final PDF aspect ratio or caption association.',
    buildHtml: ({ assets }) => wrapReportHtml('Core 10 Mixed Captions', `
      <section class="section" data-section-id="core-10-mixed">
        <h1>Mixed Orientation Photo Captions</h1>
        ${photoGrid(assets, ['landscape-01-jpg', 'portrait-01-jpg', 'panorama-01-jpg', 'tall-01-jpg', 'square-01-png', 'portrait-02-png'], 2, true)}
      </section>
    `)
  },
  {
    id: 'core-11-photos-50',
    title: 'At least 50 photos',
    description: 'Stress fixture with 52 deterministic local photo elements.',
    expectedImages: 52,
    expectedImageAssetIds: buildRepeatedAssets(52),
    expectedMinimumPageCount: 4,
    expectedTextMarkers: ['CORE11_PHOTO_001', 'CORE11_PHOTO_052'],
    manualChecklist: ['Verify all photos visually present', 'Inspect pagination', 'Inspect caption attachment', 'Inspect cropping/distortion under stress'],
    knownLimitation: 'Automated image readiness proves source load only; it does not prove every image is visually placed correctly in the PDF.',
    buildHtml: ({ assets }) => wrapReportHtml('Core 11 50 Photos', `
      <section class="section" data-section-id="core-11-stress">
        <h1>50+ Photo Stress Test</h1>
        ${photoGrid(assets, buildRepeatedAssets(52), 4, false, 'CORE11_PHOTO_')}
      </section>
    `)
  },
  {
    id: 'core-12-preview-vs-pdf-deploy',
    title: 'Browser-preview versus generated-PDF comparison plus deployment measurements',
    description: 'A mixed report that records DOM page estimate as heuristic and PDF page count as authoritative.',
    expectedMinimumPageCount: 2,
    expectedImages: 4,
    expectedImageAssetIds: ['logo-png', 'landscape-01-jpg', 'portrait-01-jpg', 'square-01-png'],
    expectedTextMarkers: ['CORE12_PREVIEW_MARKER', 'CORE12_PDF_COUNT_AUTHORITATIVE'],
    manualChecklist: ['Compare preview screenshot to generated PDF', 'Verify PDF page count against visual document', 'Inspect mixed content fidelity', 'Review deployment measurements separately from renderer feasibility'],
    knownLimitation: 'DOM page estimate is diagnostic only and must not override generated PDF page count.',
    buildHtml: ({ assets }) => wrapReportHtml('Core 12 Preview PDF Deploy', `
      ${commonCover('Preview versus PDF comparison')}
      <section class="section" data-section-id="core-12-mixed">
        <h2>CORE12_PREVIEW_MARKER</h2>
        <p>CORE12_PDF_COUNT_AUTHORITATIVE The generated PDF page count is authoritative. Browser DOM page estimate is only a heuristic.</p>
        ${logoHtml(assets['logo-png'])}
        ${photoGrid(assets, ['landscape-01-jpg', 'portrait-01-jpg', 'square-01-png'], 2, false)}
        <table>
          <thead><tr><th>Metric</th><th>Authority</th></tr></thead>
          <tbody>
            <tr><td>Physical page count</td><td>Generated PDF analysis</td></tr>
            <tr><td>Preview page estimate</td><td>DOM heuristic only</td></tr>
          </tbody>
        </table>
      </section>
    `)
  }
];

function photoFixture(id: FixtureDefinition['id'], title: string, columns: 1 | 2 | 4, assetIds: string[]): FixtureDefinition {
  const captionPrefix = `${id.toUpperCase().replaceAll('-', '_')}_CAPTION_`;
  return {
    id,
    title,
    description: `${columns}-column deterministic local photo grid.`,
    expectedImages: assetIds.length,
    expectedImageAssetIds: assetIds,
    expectedTextMarkers: [captionPrefix],
    manualChecklist: ['Verify image placement', 'Inspect cropping', 'Inspect distortion', 'Verify captions stay attached', 'Inspect pagination around photo rows'],
    knownLimitation: 'Browser diagnostics prove source images loaded before printing; final PDF placement and visual quality remain manual checks.',
    buildHtml: ({ assets }) => wrapReportHtml(title, `
      <section class="section" data-section-id="${id}">
        <h1>${escapeHtml(title)}</h1>
        ${photoGrid(assets, assetIds, columns, false, captionPrefix)}
      </section>
    `)
  };
}

function logoHtml(asset?: FixtureAsset): string {
  if (!asset) return '';
  return `<figure style="width:42mm"><div class="image-frame wide"><img src="${asset.dataUrl}" alt="logo-png" data-asset-id="${asset.id}"></div><figcaption>Deterministic embedded logo asset</figcaption></figure>`;
}

function inlineLogo(asset?: FixtureAsset): string {
  if (!asset) return '<span>No logo</span>';
  return `<span><img src="${asset.dataUrl}" alt="logo-png" data-asset-id="${asset.id}" style="width:22mm;height:8mm;object-fit:contain"></span>`;
}

function photoGrid(assets: Record<string, FixtureAsset>, assetIds: string[], columns: 1 | 2 | 4, longCaptions: boolean, captionPrefix = 'PHOTO_CAPTION_'): string {
  const figures = assetIds.map((assetId, index) => {
    const asset = assets[assetId];
    if (!asset) return '';
    const frameClass = asset.width > asset.height * 1.6 ? 'wide' : asset.height > asset.width * 1.3 ? 'tall' : '';
    const marker = `${captionPrefix}${String(index + 1).padStart(3, '0')}`;
    const caption = longCaptions
      ? `${index === 0 ? 'CORE10_CAPTION_START ' : ''}${marker}: ${asset.id} has a deliberately long caption that should remain attached to its image through pagination and print layout. ${index === assetIds.length - 1 ? 'CORE10_CAPTION_END' : ''}`
      : `${marker}: ${asset.id}`;
    return `
      <figure data-photo-index="${index + 1}">
        <div class="image-frame ${frameClass}">
          <img src="${asset.dataUrl}" alt="${asset.id}" data-asset-id="${asset.id}">
        </div>
        <figcaption>${escapeHtml(caption)}</figcaption>
      </figure>`;
  }).join('');
  return `<div class="photo-grid cols-${columns}" data-expected-image-count="${assetIds.length}">${figures}</div>`;
}

function longText(): string {
  const sentence = 'The inspection narrative describes surface condition, access constraints, moisture indicators, maintenance recommendations, and follow-up observations for a deterministic feasibility report. ';
  const repeated = Array.from({ length: 42 }, (_, index) => `${sentence}Paragraph segment ${index + 1} keeps the text natural enough for line wrapping and page continuation. `).join('');
  return `CORE02_START_MARKER ${repeated.slice(0, 2800)} CORE02_MIDDLE_MARKER ${repeated.slice(2800)} CORE02_END_MARKER`;
}

function tableRow(rowNumber: number): string {
  const marker = `CORE04_ROW_${String(rowNumber).padStart(2, '0')}`;
  return `<tr data-row-marker="${marker}"><td>${marker}</td><td>Zone ${rowNumber}</td><td>${sampleSentence()}</td><td>Document and review during planned maintenance cycle ${rowNumber}.</td></tr>`;
}

function sampleSentence(): string {
  return 'Observed condition is stable with routine monitoring recommended; long descriptive wording is included to exercise wrapping behavior.';
}

function buildRepeatedAssets(count: number): string[] {
  const source = ['landscape-01-jpg', 'portrait-01-jpg', 'square-01-png', 'panorama-01-jpg', 'tall-01-jpg', 'landscape-02-png', 'portrait-02-png'];
  return Array.from({ length: count }, (_, index) => {
    const assetId = source[index % source.length];
    if (!assetId) throw new Error('Repeated asset source list is empty.');
    return assetId;
  });
}
