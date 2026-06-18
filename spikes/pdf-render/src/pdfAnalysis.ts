import fs from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import type { PdfAnalysis } from './types.js';

export async function analyzePdf(pdfPath: string): Promise<PdfAnalysis> {
  const bytes = await fs.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(bytes);
  const pages = pdfDoc.getPages().map((page, index) => {
    const size = page.getSize();
    return {
      pageNumber: index + 1,
      widthPt: size.width,
      heightPt: size.height
    };
  });

  const textResult = await extractText(bytes);

  return {
    pageCount: pages.length,
    pages,
    extractedText: textResult.text,
    textExtractionMethod: textResult.method,
    textExtractionDiagnostic: textResult.diagnostic
  };
}

async function extractText(bytes: Buffer): Promise<{ text: string; method: string; diagnostic: string | null }> {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const documentParams = {
      data: new Uint8Array(bytes),
      useSystemFonts: true
    } as unknown as Parameters<typeof pdfjs.getDocument>[0];
    const loadingTask = pdfjs.getDocument(documentParams);
    const document = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const strings = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .filter(Boolean);
      pageTexts.push(strings.join(' '));
    }

    await document.destroy();

    return {
      text: pageTexts.join('\n'),
      method: 'pdfjs-dist/legacy/build/pdf.mjs in Node CLI; legacy build used for Node compatibility and no custom worker file configured',
      diagnostic: null
    };
  } catch (error) {
    return {
      text: '',
      method: 'pdfjs-dist text extraction attempted',
      diagnostic: error instanceof Error ? error.message : String(error)
    };
  }
}
