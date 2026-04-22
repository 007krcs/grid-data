// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── ID Generation Utilities ───

let counter = 0;

/** Generate a unique ID with an optional prefix. */
export function generateId(prefix = 'gs'): string {
  return `${prefix}-${++counter}`;
}

/** Reset counter (for testing). */
export function resetIdCounter(): void {
  counter = 0;
}

/** Generate a row ID from data, using the configured getRowId or index fallback. */
export function resolveRowId<TData>(
  data: TData,
  index: number,
  getRowId?: (params: { data: TData; index: number }) => string,
): string {
  if (getRowId) {
    return getRowId({ data, index });
  }
  return `row-${index}`;
}
