// ─── Clipboard Types ───

import type { ColumnState, RowNode } from '@gridstorm/core';

export interface ClipboardPluginOptions {
  /** Include column headers when copying. Default: false. */
  copyHeaders?: boolean;
  /** Delimiter for clipboard text. Default: '\t' (TSV). */
  delimiter?: string;
  /** Custom cell value processor for copy. */
  processCellForClipboard?: (params: ProcessCellParams) => string;
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
