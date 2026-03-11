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
