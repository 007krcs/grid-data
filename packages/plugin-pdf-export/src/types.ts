// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── PDF Export Types ───

export type PageSize = 'a4' | 'letter' | 'legal' | 'a3';
export type Orientation = 'portrait' | 'landscape';

export interface PdfExportOptions {
  /** Output file name (without extension). Default: 'gridstorm-export'. */
  fileName?: string;
  /** Page size preset. Default: 'a4'. */
  pageSize?: PageSize;
  /** Page orientation. Default: 'portrait'. */
  orientation?: Orientation;
  /** Include column headers in the export. Default: true. */
  includeHeaders?: boolean;
  /** Specific column IDs to export (default: all visible). */
  columnKeys?: string[];
  /** Export only selected rows. Default: false. */
  onlySelected?: boolean;
  /** Include hidden columns in the export. Default: false. */
  includeHiddenColumns?: boolean;
  /** Header text displayed at the top of each page. */
  headerText?: string;
  /** Footer text displayed at the bottom of each page. */
  footerText?: string;
  /** Font size for data cells in points. Default: 10. */
  fontSize?: number;
  /** Font size for column headers in points. Default: 12. */
  headerFontSize?: number;
  /** Page margins in PDF points. */
  margins?: { top: number; right: number; bottom: number; left: number };
  /** Custom cell value processor for export. */
  processCellCallback?: (params: PdfProcessCellParams) => string;
  /** Custom header value processor for export. */
  processHeaderCallback?: (params: PdfProcessHeaderParams) => string;
  /**
   * Maximum rows to export. Default: 25_000.
   *
   * The PDF builder allocates the full document byte array in memory before
   * triggering download. At ~100–200 bytes per cell (drawing operators plus
   * font/positioning metadata), 25k rows is the largest "safe for any
   * browser" value — past that, mid-range devices OOM and even when they
   * don't, the resulting PDF is effectively unusable (thousands of pages
   * nobody will scroll through).
   *
   * Set to `Infinity` to disable (not recommended).
   */
  maxRows?: number;
  /**
   * Maximum total cells (rows × resolved-column-count). Default: 1_000_000.
   * Whichever of `maxRows` / `maxCells` is hit first wins.
   */
  maxCells?: number;
}

/**
 * Thrown when a PDF export would exceed the configured `maxRows`/`maxCells`.
 */
export class PdfExportLimitExceededError extends Error {
  readonly name = 'PdfExportLimitExceededError';
  constructor(
    readonly reason: 'rows' | 'cells',
    readonly rows: number,
    readonly cells: number,
    readonly maxRows: number,
    readonly maxCells: number,
  ) {
    super(
      `[GridStorm pdf export] ${reason} limit exceeded: ` +
        (reason === 'rows'
          ? `would export ${rows} rows, configured maxRows is ${maxRows}.`
          : `would export ${cells} cells (${rows} rows × cols), configured maxCells is ${maxCells}.`) +
        ` Filter rows before export, or raise the limit via the maxRows/maxCells` +
        ` option after measuring memory headroom on your target device. Note that` +
        ` PDFs past ~25k rows are typically unusable for end-users regardless of` +
        ` whether the browser can build them.`,
    );
  }
}

export interface PdfProcessCellParams {
  /** The raw cell value. */
  value: any;
  /** The row node. */
  node: any;
  /** The column state. */
  column: any;
  /** Zero-based row index in the export output. */
  rowIndex: number;
  /** Zero-based column index in the export output. */
  colIndex: number;
}

export interface PdfProcessHeaderParams {
  /** The column state. */
  column: any;
  /** Zero-based column index in the export output. */
  colIndex: number;
}

/** Standard page sizes in PDF points (1 point = 1/72 inch). */
export const PAGE_SIZES: Record<PageSize, { width: number; height: number }> = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
  legal: { width: 612, height: 1008 },
  a3: { width: 841.89, height: 1190.55 },
};
