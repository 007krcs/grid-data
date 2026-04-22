// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
export interface ClipboardProPluginOptions {
  /** Process cell value before copy. */
  processCellForClipboard?: (params: ProcessCellParams) => string;
  /** Process cell value after paste. */
  processCellFromClipboard?: (params: ProcessCellParams) => unknown;
  /** Enable automatic type coercion on paste. Default: true */
  typeCoercion?: boolean;
  /** Enable paste validation (requires validation plugin). Default: true */
  pasteValidation?: boolean;
  /** Detect formulas in pasted text (requires formula plugin). Default: true */
  formulaAwarePaste?: boolean;
  /** Create undo snapshots (requires time-travel plugin). Default: true */
  undoSupport?: boolean;
  /** Include headers when copying. Default: false */
  includeHeaders?: boolean;
  /** Column delimiter. Default: '\t' */
  delimiter?: string;
}

export interface ProcessCellParams {
  value: unknown;
  node: any;
  column: any;
  rowIndex: number;
  colIndex: number;
}

export interface PasteOperation {
  rawText: string;
  parsed: string[][];
  startRowIndex: number;
  startColId: string;
  pastedCells: PastedCell[];
  rejectedCells: RejectedCell[];
}

export interface PastedCell {
  rowId: string;
  colId: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface RejectedCell {
  rowIndex: number;
  colIndex: number;
  value: string;
  reason: string;
}

export interface CutRange {
  startRowIndex: number;
  endRowIndex: number;
  columns: string[];
  data: Map<string, Map<string, unknown>>;
}

export interface ClipboardProState {
  lastOperation: 'copy' | 'cut' | 'paste' | null;
  lastPasteResult: PasteOperation | null;
  cutRange: CutRange | null;
}
