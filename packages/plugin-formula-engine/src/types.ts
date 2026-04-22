// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Formula Engine Plugin Types ───

export interface FormulaEnginePluginOptions {
  /** Initial named ranges */
  namedRanges?: Record<string, string>;
  /** Enable array formula support. Default: true */
  arrayFormulas?: boolean;
  /** Maximum array spill size. Default: 1000 */
  maxArraySize?: number;
}

export interface NamedRange {
  name: string;
  /** Range string like "A1:B10" */
  range: string;
}

export interface ArrayFormulaEntry {
  /** Cell key of the formula origin */
  originKey: string;
  /** Raw formula text without braces */
  formula: string;
  /** Cell keys where results spill to */
  spillRange: string[];
  /** 2D results array */
  results: unknown[][];
}

export interface FormulaEngineState {
  namedRanges: Map<string, NamedRange>;
  arrayFormulas: Map<string, ArrayFormulaEntry>;
}

export type ExtendedErrorType = '#NULL!' | '#NUM!' | '#CALC!' | '#REF!' | '#VALUE!' | '#DIV/0!' | '#N/A' | '#NAME?';

export interface ExtendedFormulaError {
  type: ExtendedErrorType;
  message: string;
}
