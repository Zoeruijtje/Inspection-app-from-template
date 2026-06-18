import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
export const srcDir = path.dirname(currentFile);
export const projectDir = path.resolve(srcDir, '..');
export const artifactsDir = path.join(projectDir, 'artifacts');
export const assetsDir = path.join(artifactsDir, 'assets');
export const htmlDir = path.join(artifactsDir, 'html');
export const pdfDir = path.join(artifactsDir, 'pdf');
export const screenshotDir = path.join(artifactsDir, 'screenshots');
export const metricsDir = path.join(artifactsDir, 'metrics');
export const tmpDir = path.join(artifactsDir, 'tmp');
export const browserCachePath = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '.cache/ms-playwright';

export const generatedAt = '2026-06-18T12:00:00.000Z';
export const a4WidthPt = 595.28;
export const a4HeightPt = 841.89;

export const outputDirs = [assetsDir, htmlDir, pdfDir, screenshotDir, metricsDir, tmpDir];

export function artifactPath(kind: 'html' | 'pdf' | 'screenshot' | 'metrics', fixtureId: string): string {
  switch (kind) {
    case 'html':
      return path.join(htmlDir, `${fixtureId}.html`);
    case 'pdf':
      return path.join(pdfDir, `${fixtureId}.pdf`);
    case 'screenshot':
      return path.join(screenshotDir, `${fixtureId}-preview.png`);
    case 'metrics':
      return path.join(metricsDir, `${fixtureId}.json`);
  }
}

export function toFileUrl(filePath: string): string {
  const absolute = path.resolve(filePath);
  return `file://${absolute}`;
}
