import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { analyzePdf } from './pdfAnalysis.js';
import { artifactPath, browserCachePath, metricsDir, projectDir } from './config.js';
import { collectDomDiagnostics } from './comparePreview.js';
import { evaluateFixture } from './assertions.js';
import { installNetworkGuard } from './networkGuard.js';
import { launchChromium, resolveChromiumInfo } from './chromium.js';
import { loadAssetManifest, ensureOutputDirs } from './assetGenerator.js';
import { MemorySampler, getFileSizeBytes, nowMs } from './measurements.js';
import { coreFixtures } from './fixturesCore.js';
import { writeJson, writeSummary } from './evidence.js';
import type { Browser, Page } from 'playwright';
import type { FixtureAsset, FixtureDefinition, FixtureEvidence, MemoryMeasurement, RunMeasurements } from './types.js';

export async function renderCoreFixtures(): Promise<{ evidence: FixtureEvidence[]; runMeasurements: RunMeasurements }> {
  await ensureOutputDirs();
  const assets = await loadAssetManifest();
  const { browser, launchMs, browserPid } = await launchChromium();
  const evidence: FixtureEvidence[] = [];
  let firstRenderMs: number | null = null;
  let warmRenderWithBrowserReuseMs: number | null = null;

  try {
    for (const [index, fixture] of coreFixtures.entries()) {
      const renderStart = nowMs();
      const fixtureEvidence = await renderFixture(fixture, { assets, browser, browserPid });
      const renderDuration = nowMs() - renderStart;

      if (index === 0) {
        firstRenderMs = renderDuration;
      } else if (index === 1) {
        warmRenderWithBrowserReuseMs = renderDuration;
      }

      evidence.push(fixtureEvidence);
      await writeJson(fixtureEvidence.artifactPaths.metrics, fixtureEvidence);
    }
  } finally {
    await browser.close();
  }

  const refreshedChromiumInfo = await resolveChromiumInfo();
  const runMeasurements: RunMeasurements = {
    playwrightPackageVersion: refreshedChromiumInfo.playwrightPackageVersion,
    browserRevision: refreshedChromiumInfo.browserRevision,
    browserVersion: refreshedChromiumInfo.browserVersion,
    browserInstallSucceeded: refreshedChromiumInfo.browserInstallSucceeded,
    chromiumLaunchSucceeded: true,
    browserProcessColdLaunchMs: launchMs,
    firstRenderMs,
    warmRenderWithBrowserReuseMs,
    playwrightInstallSizeBytes: refreshedChromiumInfo.installSizeBytes,
    chromiumExecutableSizeBytes: refreshedChromiumInfo.executableSizeBytes,
    chromiumExecutablePath: refreshedChromiumInfo.executablePath,
    environmentDiagnostic: [
      `platform=${process.platform}`,
      `arch=${process.arch}`,
      `node=${process.version}`,
      `release=${os.release()}`,
      `PLAYWRIGHT_BROWSERS_PATH=${process.env.PLAYWRIGHT_BROWSERS_PATH ?? '(not set; expected .cache/ms-playwright)'}`,
      `configuredBrowserCachePath=${browserCachePath}`,
      refreshedChromiumInfo.diagnostic ?? 'Chromium executable resolved.'
    ].join('; ')
  };

  await writeSummary(evidence, runMeasurements);
  return { evidence, runMeasurements };
}

export async function measureDeploymentOnly(): Promise<void> {
  await ensureOutputDirs();
  const chromiumInfo = await resolveChromiumInfo();
  await writeJson(path.join(metricsDir, 'deployment-measurements.json'), {
    playwrightPackageVersion: chromiumInfo.playwrightPackageVersion,
    browserRevision: chromiumInfo.browserRevision,
    browserVersion: chromiumInfo.browserVersion,
    browserInstallSucceeded: chromiumInfo.browserInstallSucceeded,
    chromiumLaunchSucceeded: null,
    chromiumExecutablePath: chromiumInfo.executablePath,
    chromiumExecutableSizeBytes: chromiumInfo.executableSizeBytes,
    playwrightInstallSizeBytes: chromiumInfo.installSizeBytes,
    browserCachePath: chromiumInfo.browserCachePath,
    diagnostic: chromiumInfo.diagnostic,
    environment: {
      platform: process.platform,
      arch: process.arch,
      node: process.version,
      release: os.release(),
      playwrightBrowsersPath: process.env.PLAYWRIGHT_BROWSERS_PATH ?? null
    }
  });
}

export async function checkSpikeArtifacts(): Promise<void> {
  const required = [
    path.join(metricsDir, 'manual-review.md'),
    path.join(metricsDir, 'core-summary.json'),
    path.join(metricsDir, 'core-summary.md')
  ];

  for (const filePath of required) {
    await fs.access(filePath);
  }

  const summary = JSON.parse(await fs.readFile(path.join(metricsDir, 'core-summary.json'), 'utf8')) as { fixtures?: FixtureEvidence[] };
  if (!Array.isArray(summary.fixtures) || summary.fixtures.length !== 12) {
    throw new Error('Expected core-summary.json to contain exactly 12 fixture evidence records.');
  }

  const invalidStatus = summary.fixtures.filter((fixture) => {
    if (fixture.automatedStatus === 'BLOCKED') {
      return fixture.manualStatus !== 'NOT_REQUIRED' || fixture.finalStatus !== 'BLOCKED';
    }
    if (fixture.automatedStatus === 'PASS') {
      const preReview = fixture.manualStatus === 'PENDING' && fixture.finalStatus === 'PENDING';
      const postReviewPass = fixture.manualStatus === 'PASS' && fixture.finalStatus === 'PASS';
      return !preReview && !postReviewPass;
    }
    return fixture.finalStatus !== 'PENDING';
  });
  if (invalidStatus.length > 0) {
    throw new Error(`Fixture statuses are invalid before user review: ${invalidStatus.map((fixture) => fixture.id).join(', ')}`);
  }
}

async function renderFixture(
  fixture: FixtureDefinition,
  context: {
    assets: Record<string, FixtureAsset>;
    browser: Browser;
    browserPid: number | null;
  }
): Promise<FixtureEvidence> {
  const htmlPath = artifactPath('html', fixture.id);
  const pdfPath = artifactPath('pdf', fixture.id);
  const screenshotPath = artifactPath('screenshot', fixture.id);
  const metricsPath = artifactPath('metrics', fixture.id);
  const html = fixture.buildHtml({ assets: context.assets });
  await fs.mkdir(path.dirname(htmlPath), { recursive: true });
  await fs.writeFile(htmlPath, html);

  const page = await context.browser.newPage({ viewport: { width: 1200, height: 1600 } });
  const networkDiagnostics = await installNetworkGuard(page);
  const diagnostics: string[] = [];

  let domDiagnostics = null;
  let pdfAnalysis = null;
  let pdfGenerationMs: number | null = null;
  let pdfSizeBytes: number | null = null;
  let physicalPageCount: number | null = null;
  let memoryMeasurement: MemoryMeasurement = {
    peakProcessTreeRssBytes: null,
    measurementMethod: 'Linux/WSL best-effort ps -eo pid,ppid,rss,comm,args; descend from Playwright browser process PID and sum RSS.',
    samplingIntervalMs: null,
    diagnostic: 'PDF generation did not start.'
  };

  try {
    await page.setContent(html, { waitUntil: 'load' });
    await page.emulateMedia({ media: 'screen' });
    domDiagnostics = await collectDomDiagnostics(page);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await page.emulateMedia({ media: 'print' });

    const sampler = new MemorySampler(context.browserPid, 100);
    sampler.start();
    const pdfStart = nowMs();
    const pdfBuffer = await page.pdf(pdfOptionsFor(fixture.id, context.assets));
    pdfGenerationMs = nowMs() - pdfStart;
    memoryMeasurement = await sampler.stop();

    await fs.mkdir(path.dirname(pdfPath), { recursive: true });
    await fs.writeFile(pdfPath, pdfBuffer);
    pdfSizeBytes = await getFileSizeBytes(pdfPath);
    pdfAnalysis = await analyzePdf(pdfPath);
    physicalPageCount = pdfAnalysis.pageCount;
  } catch (error) {
    diagnostics.push(error instanceof Error ? error.message : String(error));
  } finally {
    await page.close();
  }

  const baseEvidence: FixtureEvidence = {
    id: fixture.id,
    title: fixture.title,
    automatedStatus: diagnostics.length > 0 ? 'BLOCKED' : 'PASS',
    manualStatus: 'PENDING',
    finalStatus: 'PENDING',
    automatedFindings: [],
    diagnostics,
    artifactPaths: {
      html: htmlPath,
      pdf: pdfPath,
      previewScreenshot: screenshotPath,
      metrics: metricsPath
    },
    manualChecklist: fixture.manualChecklist,
    knownLimitation: fixture.knownLimitation,
    pdfAnalysis,
    domDiagnostics,
    networkDiagnostics,
    measurements: {
      pdfGenerationMs,
      pdfSizeBytes,
      physicalPageCount,
      memoryMeasurement
    }
  };

  if (diagnostics.length > 0) {
    return baseEvidence;
  }

  return evaluateFixture(fixture, baseEvidence);
}

function pdfOptionsFor(fixtureId: string, assets: Record<string, FixtureAsset>): NonNullable<Parameters<Page['pdf']>[0]> {
  const base = {
    format: 'A4' as const,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '18mm', right: '16mm', bottom: '20mm', left: '16mm' }
  };

  if (fixtureId === 'core-05-header-footer-pages') {
    const logo = assets['logo-png'];
    const logoMarkup = logo
      ? `<img src="${logo.dataUrl}" style="height:20px;width:54px;object-fit:contain;vertical-align:middle;margin-left:8px;" alt="logo-png">`
      : '';
    return {
      ...base,
      displayHeaderFooter: true,
      margin: { top: '24mm', right: '16mm', bottom: '24mm', left: '16mm' },
      headerTemplate: `<div style="width:100%;font-size:8px;color:#12343b;padding:0 16mm;display:flex;justify-content:space-between;align-items:center;"><span>CORE05_STATIC_HEADER</span>${logoMarkup}</div>`,
      footerTemplate: '<div style="width:100%;font-size:8px;color:#12343b;padding:0 16mm;text-align:center;"><span>CORE05_STATIC_FOOTER</span> Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>'
    };
  }

  return base;
}

export async function buildBlockedSummary(error: unknown): Promise<void> {
  await ensureOutputDirs();
  const chromiumInfo = await resolveChromiumInfo().catch(() => null);
  const diagnostic = error instanceof Error ? error.message : String(error);
  const runMeasurements: RunMeasurements = {
    playwrightPackageVersion: chromiumInfo?.playwrightPackageVersion ?? null,
    browserRevision: chromiumInfo?.browserRevision ?? null,
    browserVersion: chromiumInfo?.browserVersion ?? null,
    browserInstallSucceeded: chromiumInfo?.browserInstallSucceeded ?? false,
    chromiumLaunchSucceeded: false,
    browserProcessColdLaunchMs: null,
    firstRenderMs: null,
    warmRenderWithBrowserReuseMs: null,
    playwrightInstallSizeBytes: chromiumInfo?.installSizeBytes ?? null,
    chromiumExecutableSizeBytes: chromiumInfo?.executableSizeBytes ?? null,
    chromiumExecutablePath: chromiumInfo?.executablePath ?? null,
    environmentDiagnostic: `Gate 1 render blocked: ${diagnostic}; projectDir=${projectDir}`
  };
  const evidence = coreFixtures.map((fixture): FixtureEvidence => ({
    id: fixture.id,
    title: fixture.title,
    automatedStatus: 'BLOCKED',
    manualStatus: 'NOT_REQUIRED',
    finalStatus: 'BLOCKED',
    automatedFindings: [],
    diagnostics: [diagnostic],
    artifactPaths: {
      html: artifactPath('html', fixture.id),
      pdf: artifactPath('pdf', fixture.id),
      previewScreenshot: artifactPath('screenshot', fixture.id),
      metrics: artifactPath('metrics', fixture.id)
    },
    manualChecklist: fixture.manualChecklist,
    knownLimitation: fixture.knownLimitation,
    pdfAnalysis: null,
    domDiagnostics: null,
    networkDiagnostics: { unexpectedRequests: [], blockedRequests: [] },
    measurements: {
      pdfGenerationMs: null,
      pdfSizeBytes: null,
      physicalPageCount: null,
      memoryMeasurement: {
        peakProcessTreeRssBytes: null,
        measurementMethod: 'Not measured because rendering was blocked.',
        samplingIntervalMs: null,
        diagnostic
      }
    }
  }));
  await writeSummary(evidence, runMeasurements);
}
