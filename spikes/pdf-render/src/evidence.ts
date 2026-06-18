import fs from 'node:fs/promises';
import path from 'node:path';
import { metricsDir, projectDir } from './config.js';
import type { FixtureEvidence, RunMeasurements } from './types.js';

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export async function writeSummary(evidence: FixtureEvidence[], runMeasurements: RunMeasurements): Promise<void> {
  await writeJson(path.join(metricsDir, 'core-summary.json'), { runMeasurements, fixtures: evidence });
  await fs.writeFile(path.join(metricsDir, 'core-summary.md'), renderSummaryMarkdown(evidence, runMeasurements));
  await fs.writeFile(path.join(metricsDir, 'manual-review.md'), renderManualReviewMarkdown(evidence));
  await fs.writeFile(path.join(projectDir, 'README.md'), renderReadme(evidence, runMeasurements));
}

export function renderSummaryMarkdown(evidence: FixtureEvidence[], runMeasurements: RunMeasurements): string {
  const rows = evidence.map((item) => `| ${item.id} | ${item.automatedStatus} | ${item.manualStatus} | ${item.finalStatus} | ${item.measurements.physicalPageCount ?? 'n/a'} | ${item.measurements.pdfSizeBytes ?? 'n/a'} |`).join('\n');
  return `# Core PDF Fixture Summary

Generated PDF analysis is authoritative for physical page count and dimensions. Manual PDF inspection is required for visual correctness.

## Run Measurements

- Chromium executable path: ${runMeasurements.chromiumExecutablePath ?? 'unavailable'}
- Playwright package version: ${runMeasurements.playwrightPackageVersion ?? 'unavailable'}
- Browser revision: ${runMeasurements.browserRevision ?? 'unavailable'}
- Browser version: ${runMeasurements.browserVersion ?? 'unavailable'}
- Browser installation succeeded: ${runMeasurements.browserInstallSucceeded}
- Chromium launch succeeded: ${runMeasurements.chromiumLaunchSucceeded}
- Chromium executable size: ${formatBytes(runMeasurements.chromiumExecutableSizeBytes)}
- Playwright install size: ${formatBytes(runMeasurements.playwrightInstallSizeBytes)}
- Browser process cold launch: ${formatMs(runMeasurements.browserProcessColdLaunchMs)}
- First render: ${formatMs(runMeasurements.firstRenderMs)}
- Warm render with browser reuse: ${formatMs(runMeasurements.warmRenderWithBrowserReuseMs)}
- Environment diagnostic: ${runMeasurements.environmentDiagnostic}

## Fixtures

| Fixture | Automated | Manual | Final | PDF pages | PDF bytes |
| --- | --- | --- | --- | --- | --- |
${rows}
`;
}

export function renderManualReviewMarkdown(evidence: FixtureEvidence[]): string {
  const sections = evidence.map((item) => `## ${item.id} — ${item.title}

- Generated HTML path: \`${relative(item.artifactPaths.html)}\`
- Generated PDF path: \`${relative(item.artifactPaths.pdf)}\`
- Preview screenshot path: \`${relative(item.artifactPaths.previewScreenshot)}\`
- Automated status: ${item.automatedStatus}
- Manual status: ${item.manualStatus}
- Final status: ${item.finalStatus}
- Known diagnostic or limitation: ${item.knownLimitation}

Automated findings:
${list(item.automatedFindings)}

Diagnostics:
${list(item.diagnostics.length > 0 ? item.diagnostics : ['No automated failure diagnostics recorded.'])}

Manual inspection checklist:
${list(item.manualChecklist)}
`).join('\n');

  return `# Gate 1 Manual Review Checklist

Do not change \`manualStatus\` or \`finalStatus\` from \`PENDING\` based only on automated output. Visual fixtures require user inspection of the generated HTML/PDF/screenshot artifacts.

${sections}
`;
}

export function renderReadme(evidence: FixtureEvidence[], runMeasurements: RunMeasurements): string {
  return `# Phase 3A0-B Gate 1 — PDF Render Spike

This isolated spike tests Playwright/Chromium PDF feasibility for the 12 core fixtures only. Gate 2 extended fixtures are intentionally not implemented yet.

## Assertion Authority

- Generated PDF: authoritative for physical page count and page dimensions.
- pdfjs-dist text extraction: authoritative only for whether expected text exists in the PDF content stream.
- Browser DOM assertions: authoritative for source DOM elements, fonts, and images being ready before printing.
- DOM page estimates: diagnostic heuristics only.
- Manual PDF inspection: required for visual correctness, including clipping, overlap, repeated headers, captions, image distortion, margins, and preview/PDF equivalence.

Text extraction can prove that expected text exists in the PDF content stream. It cannot prove that text is visible, unclipped, correctly positioned, or visually readable.

## Functional Renderer Feasibility

Automated results are evidence only. Playwright is not approved until the user manually reviews the 12 core fixture artifacts.

${renderFixtureTable(evidence)}

## Deployment Suitability Measurements

These numbers describe this local environment only. Operating-system filesystem caches, WSL state, machine load, and previous browser installation may influence results. Do not generalize these values into guaranteed Railway production values.

- Chromium executable path: ${runMeasurements.chromiumExecutablePath ?? 'unavailable'}
- Playwright package version: ${runMeasurements.playwrightPackageVersion ?? 'unavailable'}
- Browser revision: ${runMeasurements.browserRevision ?? 'unavailable'}
- Browser version: ${runMeasurements.browserVersion ?? 'unavailable'}
- Browser installation succeeded: ${runMeasurements.browserInstallSucceeded}
- Chromium launch succeeded: ${runMeasurements.chromiumLaunchSucceeded}
- Chromium executable size: ${formatBytes(runMeasurements.chromiumExecutableSizeBytes)}
- Playwright install size: ${formatBytes(runMeasurements.playwrightInstallSizeBytes)}
- Browser process cold launch: ${formatMs(runMeasurements.browserProcessColdLaunchMs)}
- First render: ${formatMs(runMeasurements.firstRenderMs)}
- Warm render with browser reuse: ${formatMs(runMeasurements.warmRenderWithBrowserReuseMs)}
- Environment diagnostic: ${runMeasurements.environmentDiagnostic}

## Artifacts

- Manual review checklist: \`artifacts/metrics/manual-review.md\`
- Core summary JSON: \`artifacts/metrics/core-summary.json\`
- Core summary Markdown: \`artifacts/metrics/core-summary.md\`
- Generated HTML: \`artifacts/html/core-*.html\`
- Generated PDFs: \`artifacts/pdf/core-*.pdf\`
- Preview screenshots: \`artifacts/screenshots/core-*-preview.png\`

Generated PDFs, screenshots, assets, browser cache, and temporary artifacts are ignored by Git.

## Docker Fallback Proposal

Native WSL and Docker measurements must stay separate. If native WSL remains blocked, use the official Playwright image that exactly matches this package version:

\`\`\`bash
cd ~/dev/inspection-app
docker run --rm \\
  -v "$PWD":/work \\
  -w /work/spikes/pdf-render \\
  -e PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \\
  mcr.microsoft.com/playwright:v${runMeasurements.playwrightPackageVersion ?? '1.61.0'}-noble \\
  bash -lc 'npm ci && npm run generate:assets && npm run render:core && npm run measure:deployment && npm run check'
\`\`\`

Do not mix native WSL measurements with Docker measurements. Store Docker artifacts under a separate run label before comparing results.

## Gate 2 Deferred Fixtures

Gate 2 starts only after user manual approval of Gate 1. Deferred fixture IDs: \`ext-13-very-short\`, \`ext-14-long-50-pages\`, \`ext-15-long-url\`, \`ext-16-empty-sections\`, \`ext-17-all-field-types\`, \`ext-18-missing-broken-image\`, \`ext-19-large-findings-table\`, \`ext-20-finding-one-page-plus\`, \`ext-21-repeating-table\`, \`ext-22-signatures\`, \`ext-23-different-logos\`, \`ext-24-different-branding\`, \`ext-25-dutch-english\`, \`ext-26-toc\`, and \`ext-27-watermark-large\`.
`;
}

function renderFixtureTable(evidence: FixtureEvidence[]): string {
  const rows = evidence.map((item) => `| ${item.id} | ${item.automatedStatus} | ${item.manualStatus} | ${item.finalStatus} | ${summarizeDiagnostics(item.diagnostics)} |`).join('\n');
  return `| Fixture | Automated | Manual | Final | Diagnostics |
| --- | --- | --- | --- | --- |
${rows}`;
}

function summarizeDiagnostics(diagnostics: string[]): string {
  if (diagnostics.length === 0) return 'No automated failure diagnostics';
  return diagnostics
    .map((diagnostic) => diagnostic.split('\n')[0]?.replaceAll('|', '\\|') ?? diagnostic)
    .join('; ');
}

function list(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

function relative(filePath: string): string {
  return path.relative(projectDir, filePath);
}

function formatBytes(value: number | null): string {
  if (value === null) return 'unavailable';
  return `${value} bytes`;
}

function formatMs(value: number | null): string {
  if (value === null) return 'unavailable';
  return `${value} ms`;
}
