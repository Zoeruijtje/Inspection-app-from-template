import path from 'node:path';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { browserCachePath, projectDir } from './config.js';
import { getDirectorySizeBytes, getFileSizeBytes, nowMs } from './measurements.js';
import type { Browser } from 'playwright';
import type { ChromiumInfo } from './types.js';

export async function resolveChromiumInfo(): Promise<ChromiumInfo> {
  const executablePath = chromium.executablePath();
  const absoluteCachePath = path.resolve(projectDir, browserCachePath);
  const executableSizeBytes = await getFileSizeBytes(executablePath);
  const browserInstallSucceeded = executableSizeBytes !== null;
  const packageMetadata = await readPlaywrightMetadata();
  return {
    executablePath,
    executableSizeBytes,
    browserCachePath,
    installSizeBytes: browserInstallSucceeded ? await getDirectorySizeBytes(absoluteCachePath) : null,
    playwrightPackageVersion: packageMetadata.playwrightPackageVersion,
    browserRevision: packageMetadata.browserRevision,
    browserVersion: packageMetadata.browserVersion,
    browserInstallSucceeded,
    diagnostic: browserInstallSucceeded
      ? null
      : `Playwright resolved Chromium executable path but it does not exist or is not readable: ${executablePath}`
  };
}

export async function launchChromium(): Promise<{ browser: Browser; chromiumInfo: ChromiumInfo; launchMs: number; browserPid: number | null }> {
  const chromiumInfo = await resolveChromiumInfo();
  const start = nowMs();
  const browser = await chromium.launch({ headless: true });
  const launchMs = nowMs() - start;
  const browserPid = getBrowserPid(browser);
  return { browser, chromiumInfo, launchMs, browserPid };
}

function getBrowserPid(browser: Browser): number | null {
  const maybeProcess = (browser as unknown as { process?: () => { pid?: number } | null }).process?.();
  return typeof maybeProcess?.pid === 'number' ? maybeProcess.pid : null;
}

async function readPlaywrightMetadata(): Promise<{
  playwrightPackageVersion: string | null;
  browserRevision: string | null;
  browserVersion: string | null;
}> {
  try {
    const packageJsonPath = path.join(projectDir, 'node_modules', 'playwright', 'package.json');
    const browsersJsonPath = path.join(projectDir, 'node_modules', 'playwright-core', 'browsers.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8')) as { version?: string };
    const browsersJson = JSON.parse(await fs.readFile(browsersJsonPath, 'utf8')) as {
      browsers?: Array<{ name: string; revision?: string; browserVersion?: string }>;
    };
    const chromiumMetadata = browsersJson.browsers?.find((browser) => browser.name === 'chromium') ?? null;
    return {
      playwrightPackageVersion: packageJson.version ?? null,
      browserRevision: chromiumMetadata?.revision ?? null,
      browserVersion: chromiumMetadata?.browserVersion ?? null
    };
  } catch {
    return {
      playwrightPackageVersion: null,
      browserRevision: null,
      browserVersion: null
    };
  }
}
