// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Named Ranges ───

import type { NamedRange } from './types';

const RANGE_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function isValidRangeName(name: string): boolean {
  // Must not look like a cell reference (e.g., A1, BC99)
  if (/^[A-Z]{1,3}[0-9]+$/i.test(name)) return false;
  return RANGE_NAME_RE.test(name);
}

export function createNamedRange(name: string, range: string): NamedRange {
  return { name: name.toUpperCase(), range };
}

/**
 * Preprocess a formula string, replacing named range identifiers with their cell range references.
 * This runs BEFORE the base formula parser sees the text.
 */
export function preprocessFormula(
  formula: string,
  namedRanges: Map<string, NamedRange>,
): string {
  if (namedRanges.size === 0) return formula;

  let result = formula;
  // Sort by length descending to avoid partial replacements
  const sorted = [...namedRanges.entries()].sort((a, b) => b[0].length - a[0].length);

  for (const [name, range] of sorted) {
    // Replace occurrences not inside quotes and not part of a larger identifier
    const regex = new RegExp(`\\b${escapeRegex(name)}\\b`, 'gi');
    result = result.replace(regex, range.range);
  }

  return result;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
