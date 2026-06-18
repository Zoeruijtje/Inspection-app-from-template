import type { Page } from 'playwright';
import type { NetworkDiagnostics } from './types.js';

export async function installNetworkGuard(page: Page): Promise<NetworkDiagnostics> {
  const diagnostics: NetworkDiagnostics = {
    unexpectedRequests: [],
    blockedRequests: []
  };

  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = request.url();

    if (url.startsWith('http://') || url.startsWith('https://')) {
      diagnostics.unexpectedRequests.push(url);
      diagnostics.blockedRequests.push(url);
      await route.abort('blockedbyclient');
      return;
    }

    await route.continue();
  });

  return diagnostics;
}
