// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * Interface for pluggable PDF parsing backends.
 * Phase 2 will provide a pdf.js implementation.
 */
export interface PdfParser {
  /** Load and parse a PDF document from raw bytes */
  loadDocument(source: ArrayBuffer | Uint8Array): Promise<ParsedDocument>;
  /** Extract text content from a specific page */
  getPageText(pageIndex: number): Promise<PageTextContent>;
  /** Get page dimensions and metadata */
  getPageInfo(pageIndex: number): PageInfo;
  /** Get total number of pages */
  getPageCount(): number;
  /** Release resources */
  destroy(): void;
}

export interface ParsedDocument {
  pageCount: number;
  metadata: Record<string, string>;
  pages: PageInfo[];
}

export interface PageInfo {
  width: number;
  height: number;
  rotation: number;
}

export interface PageTextContent {
  items: TextItem[];
}

export interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName?: string;
  fontSize?: number;
}

/**
 * Error thrown when no PDF parser is configured.
 * Users must install pdfjs-dist and configure it.
 */
export class NoPdfParserError extends Error {
  constructor() {
    super(
      '[GridStorm PDF] No PDF parser configured. ' +
      'Install pdfjs-dist and pass a parser to the PDF engine options. ' +
      'See documentation for setup instructions.'
    );
    this.name = 'NoPdfParserError';
  }
}
