# Phase 3A0-B Gate 1 — PDF Render Spike

This isolated spike tests Playwright/Chromium PDF feasibility for the 12 core fixtures only. Gate 2 extended fixtures are intentionally not implemented yet.

## Assertion Authority

- Generated PDF: authoritative for physical page count and page dimensions.
- pdfjs-dist text extraction: authoritative only for whether expected text exists in the PDF content stream.
- Browser DOM assertions: authoritative for source DOM elements, fonts, and images being ready before printing.
- DOM page estimates: diagnostic heuristics only.
- Manual PDF inspection: required for visual correctness, including clipping, overlap, repeated headers, captions, image distortion, margins, and preview/PDF equivalence.

Text extraction can prove that expected text exists in the PDF content stream. It cannot prove that text is visible, unclipped, correctly positioned, or visually readable.

## Functional Renderer Feasibility

PASS.

Phase 3A0-B Gate 1 functional feasibility is MANUALLY VERIFIED PASS. Playwright/Chromium successfully generated the 12 core feasibility fixtures in native WSL after Linux browser dependencies were installed.

Playwright/Chromium is approved as the current PDF-rendering candidate for continued implementation and Gate 2 validation. This does not mean the complete production renderer is finished.

| Fixture | Automated | Manual | Final | Diagnostics |
| --- | --- | --- | --- | --- |
| core-01-normal-a4 | PASS | PASS | PASS | No automated failure diagnostics |
| core-02-long-text-5000 | PASS | PASS | PASS | No automated failure diagnostics |
| core-03-unsplittable-oversized | PASS | PASS | PASS | No automated failure diagnostics |
| core-04-table-50 | PASS | PASS | PASS | No automated failure diagnostics |
| core-05-header-footer-pages | PASS | PASS | PASS | No automated failure diagnostics |
| core-06-explicit-breaks | PASS | PASS | PASS | No automated failure diagnostics |
| core-07-photos-1col | PASS | PASS | PASS | No automated failure diagnostics |
| core-08-photos-2col | PASS | PASS | PASS | No automated failure diagnostics |
| core-09-photos-4col | PASS | PASS | PASS | No automated failure diagnostics |
| core-10-mixed-orientation-captions | PASS | PASS | PASS | No automated failure diagnostics |
| core-11-photos-50 | PASS | PASS | PASS | No automated failure diagnostics |
| core-12-preview-vs-pdf-deploy | PASS | PASS | PASS | No automated failure diagnostics |

## Core 05 Caveat

Manual review passed for technical feasibility. The fixture intentionally
renders both CSS/static and Playwright-template header/footer strategies,
producing duplicate visual elements. Production must choose one strategy;
the combined appearance is not an approved report design.

## Deployment Suitability Measurements

These numbers describe this local environment only. Operating-system filesystem caches, WSL state, machine load, and previous browser installation may influence results. Do not generalize these values into guaranteed Railway production values.

- Chromium executable path: /home/zoe/dev/inspection-app/spikes/pdf-render/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome
- Playwright package version: 1.61.0
- Browser revision: 1228
- Browser version: 149.0.7827.55
- Browser installation succeeded: true
- Chromium launch succeeded: true
- Chromium executable size: 278568152 bytes
- Playwright install size: 674450721 bytes
- Browser process cold launch: 65 ms
- First render: 1060 ms
- Warm render with browser reuse: 368 ms
- Environment diagnostic: platform=linux; arch=x64; node=v24.16.0; release=6.18.33.1-microsoft-standard-WSL2; PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright; configuredBrowserCachePath=.cache/ms-playwright; Chromium executable resolved.

Deployment suitability remains unresolved or only partially measured:

- peak Chromium process-tree RSS remains unavailable;
- Railway/container execution has not been tested;
- real infrastructure cold-start behavior is unknown;
- concurrency and background-job behavior are untested;
- local WSL timings are not guaranteed production timings.

## Artifacts

- Manual review checklist: `artifacts/metrics/manual-review.md`
- Core summary JSON: `artifacts/metrics/core-summary.json`
- Core summary Markdown: `artifacts/metrics/core-summary.md`
- Generated HTML: `artifacts/html/core-*.html`
- Generated PDFs: `artifacts/pdf/core-*.pdf`
- Preview screenshots: `artifacts/screenshots/core-*-preview.png`

Generated PDFs, screenshots, assets, browser cache, and temporary artifacts are ignored by Git.

## Gate 2 Deferred Fixtures

Gate 2 starts only after user manual approval of Gate 1. Deferred fixture IDs: `ext-13-very-short`, `ext-14-long-50-pages`, `ext-15-long-url`, `ext-16-empty-sections`, `ext-17-all-field-types`, `ext-18-missing-broken-image`, `ext-19-large-findings-table`, `ext-20-finding-one-page-plus`, `ext-21-repeating-table`, `ext-22-signatures`, `ext-23-different-logos`, `ext-24-different-branding`, `ext-25-dutch-english`, `ext-26-toc`, and `ext-27-watermark-large`.

Remaining work:

- Gate 2 extended fixtures remain pending.
- Production report styling remains pending.
- Production must choose one header/footer implementation strategy.
- Real deployment/container validation remains pending.
