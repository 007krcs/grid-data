// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Array Formula Support ───

import type { ArrayFormulaEntry } from './types';

/**
 * Detect if a formula text is an array formula (wrapped in braces: {=...})
 */
export function isArrayFormula(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith('{=') && trimmed.endsWith('}');
}

/**
 * Extract the inner formula from array formula syntax
 */
export function unwrapArrayFormula(text: string): string {
  const trimmed = text.trim();
  return trimmed.slice(1, -1); // Remove { and }
}

/**
 * Calculate spill range cell keys from origin and 2D results
 */
export function calculateSpillRange(
  originRow: number,
  originCol: number,
  results: unknown[][],
  cellKeyFn: (row: number, col: number) => string,
): string[] {
  const keys: string[] = [];
  for (let r = 0; r < results.length; r++) {
    const row = results[r]!;
    for (let c = 0; c < row.length; c++) {
      if (r === 0 && c === 0) continue; // Skip origin
      keys.push(cellKeyFn(originRow + r, originCol + c));
    }
  }
  return keys;
}

/**
 * Create an array formula entry
 */
export function createArrayFormulaEntry(
  originKey: string,
  formula: string,
  spillRange: string[],
  results: unknown[][],
): ArrayFormulaEntry {
  return { originKey, formula, spillRange, results };
}
