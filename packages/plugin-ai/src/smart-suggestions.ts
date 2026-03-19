// ─── Smart Suggestions Engine ───
// Analyzes grid data and current state to suggest useful actions.
// Works entirely locally — no API calls required.

import type { ColumnInfo, GridAction, Suggestion } from './ai-plugin';

// ─── Types ───

export interface CurrentState {
  sorted: boolean;
  filtered: boolean;
  grouped: boolean;
}

// ─── Helpers ───

let suggestionCounter = 0;

function makeSuggestionId(): string {
  return `suggestion-${++suggestionCounter}`;
}

/**
 * Check if a value is numeric (number or numeric string).
 */
function isNumeric(value: unknown): value is number {
  if (typeof value === 'number') return !isNaN(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed !== '' && !isNaN(Number(trimmed));
  }
  return false;
}

/**
 * Check if a value looks like a date.
 */
function isDateLike(value: unknown): boolean {
  if (value instanceof Date) return true;
  if (typeof value === 'string') {
    // Match ISO dates, common date formats
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return true;
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(value)) return true;
    const parsed = Date.parse(value);
    return !isNaN(parsed);
  }
  return false;
}

/**
 * Count unique values in an array of unknowns.
 */
function countUnique(values: unknown[]): number {
  const set = new Set<string>();
  for (const v of values) {
    set.add(String(v));
  }
  return set.size;
}

/**
 * Calculate coefficient of variation for numeric values.
 */
function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  const avg = sum / values.length;
  if (avg === 0) return 0;

  let sumSqDiff = 0;
  for (const v of values) {
    const diff = v - avg;
    sumSqDiff += diff * diff;
  }
  const stdDev = Math.sqrt(sumSqDiff / values.length);
  return stdDev / Math.abs(avg);
}

// ─── Suggestion Generation ───

/**
 * Analyze grid data and current state to generate smart suggestions.
 *
 * @param columns - Available column information.
 * @param data - Sample of row data to analyze.
 * @param currentState - Current grid state (sorted, filtered, grouped).
 * @returns Array of suggestions sorted by confidence (highest first).
 */
export function generateSuggestions(
  columns: ColumnInfo[],
  data: Record<string, unknown>[],
  currentState: CurrentState,
): Suggestion[] {
  if (data.length === 0 || columns.length === 0) return [];

  const suggestions: Suggestion[] = [];

  for (const col of columns) {
    const values = data.map((row) => row[col.field]).filter((v) => v != null);
    if (values.length === 0) continue;

    // Collect numeric values for this column
    const numericValues: number[] = [];
    for (const v of values) {
      if (isNumeric(v)) numericValues.push(Number(v));
    }

    const isNumericColumn = numericValues.length > values.length * 0.8;
    const isDateColumn = values.length > 0 && values.slice(0, 10).some(isDateLike);
    const uniqueCount = countUnique(values);
    const uniqueRatio = uniqueCount / values.length;

    // --- Suggestion: Sort high-variance numeric column ---
    if (isNumericColumn && !currentState.sorted && numericValues.length > 5) {
      const cv = coefficientOfVariation(numericValues);
      if (cv > 0.5) {
        suggestions.push({
          id: makeSuggestionId(),
          type: 'sort',
          description: `Sort by "${col.headerName || col.field}" — high variance detected (CV: ${(cv * 100).toFixed(0)}%)`,
          action: { type: 'sort', colId: col.id, direction: 'desc' } as GridAction,
          confidence: Math.min(0.9, 0.5 + cv * 0.3),
        });
      }
    }

    // --- Suggestion: Group by low-cardinality string column ---
    if (!isNumericColumn && !isDateColumn && !currentState.grouped) {
      if (uniqueRatio < 0.3 && uniqueCount >= 2 && uniqueCount <= 20) {
        suggestions.push({
          id: makeSuggestionId(),
          type: 'group',
          description: `Group by "${col.headerName || col.field}" — ${uniqueCount} unique values detected`,
          action: { type: 'group', colIds: [col.id] } as GridAction,
          confidence: 0.7 + (1 - uniqueRatio) * 0.2,
        });
      }
    }

    // --- Suggestion: Sort by date column ---
    if (isDateColumn && !currentState.sorted) {
      suggestions.push({
        id: makeSuggestionId(),
        type: 'sort',
        description: `Sort by "${col.headerName || col.field}" — date column detected`,
        action: { type: 'sort', colId: col.id, direction: 'desc' } as GridAction,
        confidence: 0.75,
      });
    }

    // --- Suggestion: Aggregate numeric columns ---
    if (isNumericColumn && numericValues.length > 10) {
      suggestions.push({
        id: makeSuggestionId(),
        type: 'format',
        description: `Aggregate "${col.headerName || col.field}" — numeric column with ${numericValues.length} values`,
        action: { type: 'aggregate', colId: col.id, func: 'avg' } as GridAction,
        confidence: 0.5,
      });
    }
  }

  // --- Suggestion: Filter when many rows visible ---
  if (data.length > 100 && !currentState.filtered) {
    suggestions.push({
      id: makeSuggestionId(),
      type: 'filter',
      description: `Consider filtering — ${data.length} rows displayed`,
      action: { type: 'none', reason: 'Suggest applying a filter to reduce visible rows' } as GridAction,
      confidence: 0.4,
    });
  }

  // Sort by confidence descending and return
  suggestions.sort((a, b) => b.confidence - a.confidence);

  return suggestions;
}
