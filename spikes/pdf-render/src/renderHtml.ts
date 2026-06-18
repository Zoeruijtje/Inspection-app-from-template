import { baseStyles } from './styles.js';
import { generatedAt } from './config.js';

export function wrapReportHtml(title: string, body: string, extraHead = ''): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>${baseStyles()}</style>
    ${extraHead}
  </head>
  <body>
    <main class="report a4-preview" data-report-title="${escapeAttribute(title)}" data-generated-at="${generatedAt}">
      ${body}
    </main>
  </body>
</html>`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

export function commonCover(title: string): string {
  return `
    <section class="cover" data-section-id="cover">
      <div class="brand-line">Inspection App PDF Gate 1</div>
      <h1>${escapeHtml(title)}</h1>
      <p>Deterministic feasibility fixture generated for Phase 3A0-B Gate 1.</p>
      <div class="meta-grid">
        <div class="meta-label">Generated</div><div>${generatedAt}</div>
        <div class="meta-label">Paper</div><div>A4 portrait</div>
        <div class="meta-label">Resources</div><div>Local or embedded deterministic assets only</div>
      </div>
    </section>`;
}
