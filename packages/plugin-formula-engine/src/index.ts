// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── @gridstorm/plugin-formula-engine — Public API ───

export { FormulaEnginePlugin } from './formula-engine-plugin';
export { createExtendedFunctions } from './extended-functions';
export { createNamedRange, isValidRangeName, preprocessFormula } from './named-ranges';
export { isArrayFormula, unwrapArrayFormula, calculateSpillRange, createArrayFormulaEntry } from './array-formula';
export { makeError, isFormulaError } from './error-types';
export type {
  FormulaEnginePluginOptions,
  FormulaEngineState,
  NamedRange,
  ArrayFormulaEntry,
  ExtendedErrorType,
  ExtendedFormulaError,
} from './types';
