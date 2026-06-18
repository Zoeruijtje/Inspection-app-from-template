import type { Page } from 'playwright';
import type { DomDiagnostics, ImageDiagnostic } from './types.js';

export async function collectDomDiagnostics(page: Page): Promise<DomDiagnostics> {
  return page.evaluate(async () => {
    let fontsReady = false;
    try {
      await document.fonts.ready;
      fontsReady = true;
    } catch {
      fontsReady = false;
    }

    const images = Array.from(document.querySelectorAll('img'));
    const imageDiagnostics: ImageDiagnostic[] = await Promise.all(images.map(async (image) => {
      let decoded = false;
      let decodeError: string | null = null;
      try {
        await image.decode();
        decoded = true;
      } catch (error) {
        decodeError = error instanceof Error ? error.message : String(error);
      }
      return {
        src: image.getAttribute('src'),
        alt: image.getAttribute('alt') ?? '',
        assetId: image.getAttribute('data-asset-id'),
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        decoded,
        placeholder: image.getAttribute('data-placeholder') === 'true',
        decodeError
      };
    }));

    const bodyHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const a4CssPxAt96Dpi = 1122.52;
    const scrollWidth = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth);
    const clientWidth = document.documentElement.clientWidth;
    const horizontalOverflow = scrollWidth > clientWidth + 1;
    const widestElement = Array.from(document.querySelectorAll('body *')).reduce<DomDiagnostics['widestElement']>((current, element) => {
      const htmlElement = element as HTMLElement;
      if (htmlElement.scrollWidth <= htmlElement.clientWidth + 1) return current;
      if (current && current.scrollWidth >= htmlElement.scrollWidth) return current;

      return {
        tagName: htmlElement.tagName.toLowerCase(),
        className: typeof htmlElement.className === 'string' ? htmlElement.className : '',
        assetId: htmlElement.getAttribute('data-asset-id'),
        scrollWidth: htmlElement.scrollWidth,
        clientWidth: htmlElement.clientWidth
      };
    }, null);

    return {
      fontsReady,
      rowCount: document.querySelectorAll('tbody tr').length,
      blockCount: document.querySelectorAll('[data-block-id], .block, .card, figure, table').length,
      overflowDiagnostics: Array.from(document.querySelectorAll('[data-overflow-diagnostic]')).map((element) => element.textContent?.trim() ?? ''),
      imageDiagnostics,
      horizontalOverflow,
      scrollWidth,
      clientWidth,
      widestElement,
      pageEstimate: Math.max(1, Math.ceil(bodyHeight / a4CssPxAt96Dpi)),
      pageEstimateMethod: 'Heuristic only: DOM scrollHeight divided by A4 CSS pixel height at 96dpi; generated PDF page count is authoritative.'
    };
  });
}
