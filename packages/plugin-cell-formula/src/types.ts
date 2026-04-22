// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
export interface FormulaDefinition<TData = Record<string, unknown>> {
  /** Column ID this formula is attached to */
  columnId: string;
  /** Other column IDs this formula reads from */
  dependencies: string[];
  /** Function that receives the row data and returns the computed value */
  compute: (row: TData) => unknown;
  /** Optional display format for numbers */
  format?: (value: unknown) => string;
}

export interface FormulaError {
  columnId: string;
  rowId: string;
  message: string;
}

export interface FormulaState {
  definitions: Map<string, FormulaDefinition>;
  errors: FormulaError[];
  computedValues: Map<string, Map<string, unknown>>; // columnId -> rowId -> value
}

export interface CellFormulaOptions {
  /** Error handling: 'silent' hides errors, 'report' emits events, 'throw' throws. Default: 'report' */
  onError?: 'silent' | 'report' | 'throw';
}
