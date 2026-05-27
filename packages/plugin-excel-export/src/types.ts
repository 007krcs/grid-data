// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
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
  /**
   * Maximum rows to export. Default: 100_000.
   *
   * The Excel and CSV builders concatenate the entire document into a single
   * JavaScript string before triggering download. At ~10–50 bytes per cell,
   * exports past ~100k rows × wide column counts approach V8's per-string
   * ceiling (~512 MB) and OOM the tab. The default is the largest "safe for
   * any browser" value; tune up only if you've measured your worst case.
   *
   * Set to `Infinity` to disable (not recommended — see SECURITY.md note on
   * unbounded resource consumption).
   */
  maxRows?: number;
  /**
   * Maximum total cells (rows × resolved-column-count). Default: 5_000_000.
   *
   * Complements `maxRows` for wide datasets — 100k rows × 200 columns is
   * 20M cells, well past the ~5M cell threshold where the resulting string
   * starts to OOM mid-range devices. Whichever limit is hit first wins.
   */
  maxCells?: number;
}

/**
 * Thrown when an export would exceed the configured `maxRows` or `maxCells`.
 * Inspect `reason` to distinguish row vs cell overflow, and `rows` / `cells`
 * for the actual size that would have been produced.
 */
export class ExportLimitExceededError extends Error {
  readonly name = 'ExportLimitExceededError';
  constructor(
    readonly format: 'csv' | 'excel',
    readonly reason: 'rows' | 'cells',
    readonly rows: number,
    readonly cells: number,
    readonly maxRows: number,
    readonly maxCells: number,
  ) {
    super(
      `[GridStorm ${format} export] ${reason} limit exceeded: ` +
        (reason === 'rows'
          ? `would export ${rows} rows, configured maxRows is ${maxRows}.`
          : `would export ${cells} cells (${rows} rows × cols), configured maxCells is ${maxCells}.`) +
        ` Filter rows before export, or raise the limit via the maxRows/maxCells` +
        ` option after measuring memory headroom on your target device.`,
    );
  }
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
