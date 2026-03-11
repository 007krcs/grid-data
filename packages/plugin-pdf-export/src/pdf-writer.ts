// ─── PDF Writer ───
// Minimal PDF 1.4 writer that generates valid PDF binary output.
// Uses built-in Helvetica font (one of the standard 14 PDF fonts).
// Zero external dependencies.

/**
 * Escapes special PDF string characters: ( ) \
 */
function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Converts an RGB hex color string (e.g., '#cccccc') to PDF color values (0-1 range).
 * Returns a string like '0.8 0.8 0.8'.
 */
function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

/**
 * A minimal PDF 1.4 writer that produces valid PDF binary.
 *
 * Supports:
 * - Text drawing with Helvetica (regular and bold)
 * - Line drawing with configurable width
 * - Rectangle fills and strokes
 * - Multi-page documents
 *
 * PDF coordinate system: origin at bottom-left, Y increases upward.
 */
export class PdfWriter {
  private objects: string[] = [];
  private pages: number[] = [];
  private currentPage: string[] = [];
  private pageWidth: number;
  private pageHeight: number;
  private _pageStarted = false;

  constructor(width: number, height: number) {
    this.pageWidth = width;
    this.pageHeight = height;
  }

  /**
   * Starts a new page. The previous page (if any) is finalized.
   */
  newPage(): void {
    if (this._pageStarted) {
      this._finalizePage();
    }
    this.currentPage = [];
    this._pageStarted = true;
  }

  /**
   * Draw text at (x, y) in PDF coordinates (origin bottom-left).
   * Uses Helvetica; set `bold` to true for Helvetica-Bold.
   */
  drawText(text: string, x: number, y: number, fontSize: number, bold?: boolean): void {
    const fontName = bold ? '/F2' : '/F1';
    const escaped = escapePdfText(text);
    this.currentPage.push('BT');
    this.currentPage.push(`${fontName} ${fontSize} Tf`);
    this.currentPage.push(`${x.toFixed(2)} ${y.toFixed(2)} Td`);
    this.currentPage.push(`(${escaped}) Tj`);
    this.currentPage.push('ET');
  }

  /**
   * Draw a line from (x1, y1) to (x2, y2).
   */
  drawLine(x1: number, y1: number, x2: number, y2: number, lineWidth?: number): void {
    const lw = lineWidth ?? 0.5;
    this.currentPage.push(`${lw.toFixed(2)} w`);
    this.currentPage.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m`);
    this.currentPage.push(`${x2.toFixed(2)} ${y2.toFixed(2)} l`);
    this.currentPage.push('S');
  }

  /**
   * Draw a rectangle at (x, y) with width w and height h.
   * Optionally fill with a hex color and/or stroke the border.
   */
  drawRect(x: number, y: number, w: number, h: number, fill?: string, stroke?: boolean): void {
    if (fill) {
      const rgb = hexToRgb(fill);
      this.currentPage.push(`${rgb} rg`);
      this.currentPage.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
      if (stroke) {
        this.currentPage.push('0 0 0 RG');
        this.currentPage.push('B'); // fill and stroke
      } else {
        this.currentPage.push('f'); // fill only
      }
    } else if (stroke) {
      this.currentPage.push('0 0 0 RG');
      this.currentPage.push(`0.5 w`);
      this.currentPage.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
      this.currentPage.push('S'); // stroke only
    }
  }

  /**
   * Generate the complete PDF file as a Uint8Array.
   *
   * Builds:
   * - %PDF-1.4 header
   * - Catalog (obj 1), Pages (obj 2), Font resources (obj 3 Helvetica, obj 4 Helvetica-Bold)
   * - Page objects and their content streams
   * - Cross-reference table
   * - Trailer with %%EOF
   */
  generate(): Uint8Array {
    // Finalize last page if open
    if (this._pageStarted) {
      this._finalizePage();
    }

    // If no pages were created, add an empty page
    if (this.pages.length === 0) {
      this.newPage();
      this._finalizePage();
    }

    // Reset objects array to build the full PDF
    this.objects = [];

    // Object 1: Catalog
    this.objects.push(
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    );

    // Object 2: Pages (placeholder — will be filled after page objects are created)
    // Reserve slot
    this.objects.push(''); // placeholder for Pages object

    // Object 3: Helvetica font
    this.objects.push(
      '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    );

    // Object 4: Helvetica-Bold font
    this.objects.push(
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj',
    );

    // Build page objects and content streams
    // Each page needs 2 objects: the Page dict and the content stream
    const pageObjNumbers: number[] = [];
    let nextObjNum = 5;

    for (let i = 0; i < this._pageContents.length; i++) {
      const contentObjNum = nextObjNum;
      const pageObjNum = nextObjNum + 1;
      nextObjNum += 2;

      // Content stream object
      const streamData = this._pageContents[i]!;
      this.objects.push(
        `${contentObjNum} 0 obj\n<< /Length ${streamData.length} >>\nstream\n${streamData}\nendstream\nendobj`,
      );

      // Page object
      this.objects.push(
        `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth.toFixed(2)} ${this.pageHeight.toFixed(2)}] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>\nendobj`,
      );

      pageObjNumbers.push(pageObjNum);
    }

    // Now fill in the Pages object (object 2)
    const kidsStr = pageObjNumbers.map((n) => `${n} 0 R`).join(' ');
    this.objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${pageObjNumbers.length} >>\nendobj`;

    // Build the final PDF binary
    const totalObjects = this.objects.length;
    const lines: string[] = [];
    lines.push('%PDF-1.4');

    // Binary comment to signal binary content (recommended by PDF spec)
    lines.push('%\xE2\xE3\xCF\xD3');

    // Write objects and track byte offsets for xref
    const offsets: number[] = [];
    let currentOffset = lines.join('\n').length + 1; // +1 for the newline after the last header line

    for (let i = 0; i < totalObjects; i++) {
      offsets.push(currentOffset);
      const objStr = this.objects[i]!;
      lines.push(objStr);
      currentOffset += objStr.length + 1; // +1 for newline
    }

    // Cross-reference table
    const xrefOffset = currentOffset;
    lines.push('xref');
    lines.push(`0 ${totalObjects + 1}`);
    lines.push('0000000000 65535 f ');

    for (let i = 0; i < totalObjects; i++) {
      const offset = offsets[i]!;
      lines.push(`${String(offset).padStart(10, '0')} 00000 n `);
    }

    // Trailer
    lines.push('trailer');
    lines.push(`<< /Size ${totalObjects + 1} /Root 1 0 R >>`);
    lines.push('startxref');
    lines.push(String(xrefOffset));
    lines.push('%%EOF');

    const pdfString = lines.join('\n');

    // Convert string to Uint8Array (Latin-1 encoding for PDF binary safety)
    const bytes = new Uint8Array(pdfString.length);
    for (let i = 0; i < pdfString.length; i++) {
      bytes[i] = pdfString.charCodeAt(i) & 0xff;
    }
    return bytes;
  }

  // ── Internal ──

  private _pageContents: string[] = [];

  private _finalizePage(): void {
    const content = this.currentPage.join('\n');
    this._pageContents.push(content);
    this.pages.push(this._pageContents.length - 1);
    this.currentPage = [];
    this._pageStarted = false;
  }
}
