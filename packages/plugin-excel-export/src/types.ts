// ─── Excel Export Types ───

import type { ColumnState, RowNode } from '@gridstorm/core';

export interface ExcelExportOptions {
  /** Output file name (without extension). Default: 'gridstorm-export'. */
  fileName?: string;
  /** Sheet name for Excel export. Default: 'Sheet1'. */
  sheetName?: string;
  /** Include column headers in the export. Default: true. */
  includeHeaders?: boolean;
  /** Include hidden columns in the export. Default: false. */
  includeHiddenColumns?: boolean;
  /** Specific column IDs to export (default: all visible). */
  columnKeys?: string[];
  /** Export only selected rows. Default: false. */
  onlySelected?: boolean;
  /** Custom cell value processor for export. */
  processCellCallback?: (params: ProcessCellParams) => string;
  /** Custom header value processor for export. */
  processHeaderCallback?: (params: ProcessHeaderParams) => string;
}

export interface ProcessCellParams {
  /** The raw cell value. */
  value: any;
  /** The row node. */
  node: RowNode;
  /** The column state. */
  column: ColumnState;
  /** Zero-based row index in the export output. */
  rowIndex: number;
  /** Zero-based column index in the export output. */
  colIndex: number;
}

export interface ProcessHeaderParams {
  /** The column state. */
  column: ColumnState;
  /** Zero-based column index in the export output. */
  colIndex: number;
}

/** Describes the type of a cell in Excel XML output. */
export type CellType = 'String' | 'Number' | 'DateTime';

/** Represents a single cell value with its type for Excel XML output. */
export interface CellData {
  value: string;
  type: CellType;
}
