export function baseStyles(): string {
  return `
    @page {
      size: A4;
      margin: 18mm 16mm 20mm 16mm;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #1f2933;
      background: #ffffff;
      font-size: 10.5pt;
      line-height: 1.45;
    }

    body {
      counter-reset: page;
    }

    .report {
      width: 100%;
    }

    .cover {
      page-break-after: always;
      min-height: 230mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      border-left: 5mm solid #0f766e;
      padding-left: 14mm;
    }

    .brand-line {
      color: #0f766e;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
      font-size: 9pt;
    }

    h1,
    h2,
    h3 {
      color: #12343b;
      margin: 0 0 6mm;
      page-break-after: avoid;
    }

    h1 {
      font-size: 26pt;
      line-height: 1.1;
    }

    h2 {
      font-size: 15pt;
      border-bottom: 0.4mm solid #0f766e;
      padding-bottom: 2mm;
      margin-top: 8mm;
    }

    h3 {
      font-size: 12pt;
      margin-top: 5mm;
    }

    p {
      margin: 0 0 4mm;
      widows: 2;
      orphans: 2;
      overflow-wrap: break-word;
      word-break: break-word;
      hyphens: auto;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 36mm 1fr;
      gap: 2mm 4mm;
      margin: 7mm 0;
      font-size: 9.5pt;
    }

    .meta-label {
      color: #52616b;
      font-weight: 700;
    }

    .section {
      margin-bottom: 7mm;
    }

    .block {
      margin-bottom: 5mm;
      max-width: 100%;
    }

    .card {
      border: 0.3mm solid #c9d6df;
      border-radius: 2mm;
      padding: 4mm;
      break-inside: avoid;
      max-width: 100%;
    }

    .oversized-placeholder {
      min-height: 42mm;
      max-height: 72mm;
      border: 0.5mm dashed #b91c1c;
      background: #fff7ed;
      overflow: hidden;
    }

    .diagnostic {
      border: 0.4mm solid #b91c1c;
      color: #7f1d1d;
      background: #fef2f2;
      padding: 3mm;
      margin: 4mm 0;
      font-weight: 700;
    }

    .page-break {
      break-before: page;
      page-break-before: always;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 8.7pt;
      margin: 4mm 0;
    }

    thead {
      display: table-header-group;
    }

    th {
      background: #0f766e;
      color: white;
      text-align: left;
    }

    th,
    td {
      border: 0.25mm solid #9aa6b2;
      padding: 2mm;
      vertical-align: top;
      overflow-wrap: break-word;
      word-break: break-word;
    }

    tr {
      break-inside: avoid;
    }

    .photo-grid {
      display: grid;
      gap: 4mm;
      margin-top: 4mm;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
      overflow-wrap: anywhere;
    }

    .photo-grid.cols-1 {
      grid-template-columns: repeat(1, minmax(0, 1fr));
    }

    .photo-grid.cols-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .photo-grid.cols-4 {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 1.8mm;
    }

    figure {
      margin: 0;
      break-inside: avoid;
      border: 0.25mm solid #c9d6df;
      padding: 2mm;
      background: #ffffff;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
      overflow-wrap: anywhere;
    }

    .image-frame {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      aspect-ratio: 4 / 3;
      overflow: hidden;
      background: #e5e7eb;
      border: 0.2mm solid #d7dde2;
    }

    .image-frame.tall {
      aspect-ratio: 3 / 4;
    }

    .image-frame.wide {
      aspect-ratio: 16 / 9;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      max-width: 100%;
      min-width: 0;
    }

    figcaption {
      margin-top: 1.5mm;
      font-size: 8pt;
      color: #374151;
      max-width: 100%;
      min-width: 0;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .photo-grid.cols-4 figcaption {
      font-size: 6.8pt;
      line-height: 1.3;
    }

    .fixed-header,
    .fixed-footer {
      position: fixed;
      left: 16mm;
      right: 16mm;
      color: #334e68;
      font-size: 8pt;
      z-index: 2;
    }

    .fixed-header {
      top: 6mm;
      display: flex;
      justify-content: space-between;
      border-bottom: 0.25mm solid #9fb3c8;
      padding-bottom: 2mm;
    }

    .fixed-footer {
      bottom: 6mm;
      display: flex;
      justify-content: space-between;
      border-top: 0.25mm solid #9fb3c8;
      padding-top: 2mm;
    }

    .header-footer-spacer {
      height: 7mm;
    }

    .a4-preview {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
    }

    @media screen {
      body {
        background: #eef2f6;
        padding: 20px;
      }

      .report {
        background: white;
        box-shadow: 0 12px 35px rgba(15, 23, 42, 0.15);
        padding: 18mm 16mm 20mm 16mm;
      }
    }
  `;
}
