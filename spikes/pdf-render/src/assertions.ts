import { a4HeightPt, a4WidthPt } from './config.js';
import type { FixtureDefinition, FixtureEvidence, PdfAnalysis } from './types.js';

const dimensionTolerancePt = 2;

export function evaluateFixture(definition: FixtureDefinition, evidence: FixtureEvidence): FixtureEvidence {
  const findings: string[] = [];
  const failures: string[] = [];
  const pdfAnalysis = evidence.pdfAnalysis;
  const domDiagnostics = evidence.domDiagnostics;
  const networkDiagnostics = evidence.networkDiagnostics;

  if (!pdfAnalysis) {
    failures.push('Generated PDF analysis is unavailable.');
  } else {
    findings.push(`Generated PDF has ${pdfAnalysis.pageCount} physical page(s).`);

    if (definition.expectedMinimumPageCount && pdfAnalysis.pageCount < definition.expectedMinimumPageCount) {
      failures.push(`Expected at least ${definition.expectedMinimumPageCount} physical page(s), got ${pdfAnalysis.pageCount}.`);
    }

    if (definition.id === 'core-01-normal-a4') {
      const nonA4 = pdfAnalysis.pages.filter((page) => !isA4Page(page.widthPt, page.heightPt));
      if (nonA4.length > 0) {
        failures.push(`A4 dimension check failed for page(s): ${nonA4.map((page) => page.pageNumber).join(', ')}.`);
      } else {
        findings.push('All generated PDF pages match A4 dimensions within tolerance.');
      }
    }

    const normalizedExtractedText = normalizeText(pdfAnalysis.extractedText);
    for (const marker of definition.expectedTextMarkers ?? []) {
      if (!normalizedExtractedText.includes(normalizeText(marker))) {
        failures.push(`Expected PDF text marker not extracted: ${marker}`);
      }
    }

    if ((definition.expectedTextMarkers?.length ?? 0) > 0) {
      findings.push(`Checked ${definition.expectedTextMarkers?.length ?? 0} expected PDF text marker(s) with pdfjs-dist.`);
    }

    if (pdfAnalysis.textExtractionDiagnostic) {
      failures.push(`PDF text extraction diagnostic: ${pdfAnalysis.textExtractionDiagnostic}`);
    }

    if (definition.id === 'core-03-unsplittable-oversized' && pdfAnalysis.pageCount > 1) {
      failures.push(`Core 03 bounded diagnostic placeholder should not spill across pages; generated ${pdfAnalysis.pageCount} page(s).`);
    }

    if (definition.id === 'core-05-header-footer-pages') {
      if (pdfAnalysis.pageCount !== 3) {
        failures.push(`Core 05 must deterministically generate exactly 3 physical pages for page X of Y evidence; got ${pdfAnalysis.pageCount}.`);
      }
      const headerCount = countOccurrences(normalizedExtractedText, normalizeText('CORE05_STATIC_HEADER'));
      const footerCount = countOccurrences(normalizedExtractedText, normalizeText('CORE05_STATIC_FOOTER'));
      if (headerCount < 3) {
        failures.push(`Expected CORE05_STATIC_HEADER on all three pages; extracted ${headerCount} occurrence(s).`);
      }
      if (footerCount < 3) {
        failures.push(`Expected CORE05_STATIC_FOOTER on all three pages; extracted ${footerCount} occurrence(s).`);
      }
      findings.push(`Core 05 extracted header occurrences=${headerCount}; footer occurrences=${footerCount}.`);
    }
  }

  if (!domDiagnostics) {
    failures.push('Browser DOM diagnostics are unavailable.');
  } else {
    if (!domDiagnostics.fontsReady) failures.push('document.fonts.ready did not complete successfully.');

    if (definition.expectedTableRows !== undefined) {
      if (domDiagnostics.rowCount !== definition.expectedTableRows) {
        failures.push(`Expected source DOM table row count ${definition.expectedTableRows}, got ${domDiagnostics.rowCount}.`);
      } else {
        findings.push(`Source DOM contains ${domDiagnostics.rowCount} table row(s).`);
      }
    }

    if (definition.requiresOverflowDiagnostic) {
      if (domDiagnostics.overflowDiagnostics.length === 0) {
        failures.push('Expected explicit overflow diagnostic was not found in the source DOM.');
      } else {
        findings.push(`Found overflow diagnostic(s): ${domDiagnostics.overflowDiagnostics.join('; ')}`);
      }
    }

    if (domDiagnostics.horizontalOverflow) {
      failures.push(`Horizontal DOM overflow detected: scrollWidth=${domDiagnostics.scrollWidth}, clientWidth=${domDiagnostics.clientWidth}, widestElement=${JSON.stringify(domDiagnostics.widestElement)}.`);
    } else {
      findings.push(`No horizontal DOM overflow detected (scrollWidth=${domDiagnostics.scrollWidth}, clientWidth=${domDiagnostics.clientWidth}).`);
    }

    if (definition.expectedImages !== undefined) {
      const images = domDiagnostics.imageDiagnostics;
      const imageFailures = images.filter((image) => !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0 || !image.decoded || !image.src?.startsWith('data:image/'));
      if (images.length !== definition.expectedImages) {
        failures.push(`Expected ${definition.expectedImages} image element(s), got ${images.length}.`);
      }
      if (imageFailures.length > 0) {
        failures.push(`Embedded image readiness failed for ${imageFailures.length} image(s): ${imageFailures.map((image) => `${image.assetId ?? image.alt}(complete=${image.complete}, natural=${image.naturalWidth}x${image.naturalHeight}, decoded=${image.decoded}, dataUrl=${image.src?.startsWith('data:image/') ?? false}, error=${image.decodeError ?? 'none'})`).join('; ')}`);
      }
      const observedIds = images.map((image) => image.assetId).filter(Boolean);
      const missingAssetIds = (definition.expectedImageAssetIds ?? []).filter((assetId) => !observedIds.includes(assetId));
      if (missingAssetIds.length > 0) {
        failures.push(`Expected local/embedded asset id(s) missing from DOM image diagnostics: ${missingAssetIds.join(', ')}`);
      }
      const dimensions = images.map((image) => `${image.assetId ?? image.alt}:${image.naturalWidth}x${image.naturalHeight}`).join(', ');
      findings.push(`Browser image diagnostics checked ${images.length} embedded data URL image element(s): ${dimensions}.`);
    }

    findings.push(`DOM page estimate heuristic: ${domDiagnostics.pageEstimate ?? 'unavailable'} (${domDiagnostics.pageEstimateMethod}).`);
  }

  if (networkDiagnostics.unexpectedRequests.length > 0) {
    failures.push(`Unexpected external request(s) blocked: ${networkDiagnostics.unexpectedRequests.join(', ')}`);
  } else {
    findings.push('No unexpected external HTTP/HTTPS requests were observed.');
  }

  return {
    ...evidence,
    automatedStatus: failures.length > 0 ? 'FAIL' : 'PASS',
    manualStatus: 'PENDING',
    finalStatus: failures.length > 0 ? 'PENDING' : 'PENDING',
    automatedFindings: findings,
    diagnostics: [...evidence.diagnostics, ...failures]
  };
}

function isA4Page(widthPt: number, heightPt: number): boolean {
  return Math.abs(widthPt - a4WidthPt) <= dimensionTolerancePt && Math.abs(heightPt - a4HeightPt) <= dimensionTolerancePt;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function countOccurrences(value: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let index = value.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = value.indexOf(needle, index + needle.length);
  }
  return count;
}
