import type { Browser, Page } from 'playwright';

export type Status = 'PASS' | 'FAIL' | 'BLOCKED';
export type ManualStatus = 'PENDING' | 'PASS' | 'FAIL' | 'NOT_REQUIRED';
export type FinalStatus = 'PENDING' | 'PASS' | 'FAIL' | 'BLOCKED';

export type CoreFixtureId =
  | 'core-01-normal-a4'
  | 'core-02-long-text-5000'
  | 'core-03-unsplittable-oversized'
  | 'core-04-table-50'
  | 'core-05-header-footer-pages'
  | 'core-06-explicit-breaks'
  | 'core-07-photos-1col'
  | 'core-08-photos-2col'
  | 'core-09-photos-4col'
  | 'core-10-mixed-orientation-captions'
  | 'core-11-photos-50'
  | 'core-12-preview-vs-pdf-deploy';

export interface FixtureAsset {
  id: string;
  path: string;
  width: number;
  height: number;
  mimeType: 'image/png' | 'image/jpeg';
  dataUrl: string;
  byteLength: number;
  validation: AssetValidation;
}

export interface AssetValidation {
  fileSignature: 'png' | 'jpeg' | 'unknown';
  nodeDecoded: boolean;
  decodedWidth: number | null;
  decodedHeight: number | null;
  diagnostic: string | null;
}

export interface FixtureDefinition {
  id: CoreFixtureId;
  title: string;
  description: string;
  expectedMinimumPageCount?: number;
  expectedTextMarkers?: string[];
  expectedTableRows?: number;
  expectedImages?: number;
  expectedImageAssetIds?: string[];
  requiresOverflowDiagnostic?: boolean;
  manualChecklist: string[];
  knownLimitation: string;
  buildHtml: (context: FixtureBuildContext) => string;
}

export interface FixtureBuildContext {
  assets: Record<string, FixtureAsset>;
}

export interface PdfPageInfo {
  pageNumber: number;
  widthPt: number;
  heightPt: number;
}

export interface PdfAnalysis {
  pageCount: number;
  pages: PdfPageInfo[];
  extractedText: string;
  textExtractionMethod: string;
  textExtractionDiagnostic: string | null;
}

export interface ImageDiagnostic {
  src: string | null;
  alt: string;
  assetId: string | null;
  complete: boolean;
  naturalWidth: number;
  naturalHeight: number;
  decoded: boolean;
  placeholder: boolean;
  decodeError: string | null;
}

export interface DomDiagnostics {
  fontsReady: boolean;
  rowCount: number;
  blockCount: number;
  overflowDiagnostics: string[];
  imageDiagnostics: ImageDiagnostic[];
  horizontalOverflow: boolean;
  scrollWidth: number;
  clientWidth: number;
  widestElement: {
    tagName: string;
    className: string;
    assetId: string | null;
    scrollWidth: number;
    clientWidth: number;
  } | null;
  pageEstimate: number | null;
  pageEstimateMethod: string;
}

export interface NetworkDiagnostics {
  unexpectedRequests: string[];
  blockedRequests: string[];
}

export interface MemoryMeasurement {
  peakProcessTreeRssBytes: number | null;
  measurementMethod: string;
  samplingIntervalMs: number | null;
  diagnostic: string | null;
}

export interface FixtureMeasurements {
  pdfGenerationMs: number | null;
  pdfSizeBytes: number | null;
  physicalPageCount: number | null;
  memoryMeasurement: MemoryMeasurement;
}

export interface RunMeasurements {
  playwrightPackageVersion: string | null;
  browserRevision: string | null;
  browserVersion: string | null;
  browserInstallSucceeded: boolean;
  chromiumLaunchSucceeded: boolean;
  browserProcessColdLaunchMs: number | null;
  firstRenderMs: number | null;
  warmRenderWithBrowserReuseMs: number | null;
  playwrightInstallSizeBytes: number | null;
  chromiumExecutableSizeBytes: number | null;
  chromiumExecutablePath: string | null;
  environmentDiagnostic: string;
}

export interface ArtifactPaths {
  html: string;
  pdf: string;
  previewScreenshot: string;
  metrics: string;
}

export interface FixtureEvidence {
  id: CoreFixtureId;
  title: string;
  automatedStatus: Status;
  manualStatus: ManualStatus;
  finalStatus: FinalStatus;
  automatedFindings: string[];
  diagnostics: string[];
  artifactPaths: ArtifactPaths;
  manualChecklist: string[];
  knownLimitation: string;
  pdfAnalysis: PdfAnalysis | null;
  domDiagnostics: DomDiagnostics | null;
  networkDiagnostics: NetworkDiagnostics;
  measurements: FixtureMeasurements;
}

export interface ChromiumInfo {
  executablePath: string | null;
  executableSizeBytes: number | null;
  browserCachePath: string;
  installSizeBytes: number | null;
  playwrightPackageVersion: string | null;
  browserRevision: string | null;
  browserVersion: string | null;
  browserInstallSucceeded: boolean;
  diagnostic: string | null;
}

export interface RenderContext {
  browser: Browser;
  chromiumInfo: ChromiumInfo;
  browserPid: number | null;
}

export interface PageReadyResult {
  page: Page;
  domDiagnostics: DomDiagnostics;
  networkDiagnostics: NetworkDiagnostics;
}
