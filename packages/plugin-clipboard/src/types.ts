// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Clipboard Types ───

import type { ColumnState, RowNode } from '@gridstorm/core';

export interface ClipboardPluginOptions {
  /** Include column headers when copying. Default: false. */
  copyHeaders?: boolean;
  /** Delimiter for clipboard text. Default: '\t' (TSV). */
  delimiter?: string;
  /** Custom cell value processor for copy. */
  processCellForClipboard?: (params: ProcessCellParams) => string;
  /**
   * Prefix cells that start with `=`, `+`, `-`, `@`, tab or CR with an
   * apostrophe so spreadsheets paste them as text instead of evaluating
   * them (CSV injection, CWE-1236). Default: true. Disable only when the
   * clipboard target is never a spreadsheet.
   */
  neutralizeFormulas?: boolean;
  /** Custom cell value processor for paste. */
  processCellFromClipboard?: (params: { value: string; column: ColumnState }) => any;
  /** Suppress paste operations. Default: false. */
  suppressPaste?: boolean;
  /** Suppress cut operations. Default: false. */
  suppressCut?: boolean;
}

export interface ProcessCellParams {
  value: any;
  node: RowNode;
  column: ColumnState;
}
