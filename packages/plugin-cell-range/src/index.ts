// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── @gridstorm/plugin-cell-range — Public API ───

export { CellRangePlugin } from './cell-range-plugin';
export type { CellRangePluginOptions, CellRangeState, CellPosition, RangeSelection, RangeBounds, DetectedPattern, FillOperation, FillResult } from './types';
export { createRange, expandRange, isInRange, getRangeCells, normalizeRange, mergeRanges } from './range-model';
export { detectPattern } from './pattern-detector';
export { generateFillValues } from './fill-engine';
