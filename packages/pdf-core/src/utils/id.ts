// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── ID Generation Utilities ───

let counter = 0;

/** Generate a unique ID with an optional prefix. */
export function generateId(prefix = 'pdf'): string {
  return `${prefix}-${++counter}`;
}

/** Reset counter (for testing). */
export function resetIdCounter(): void {
  counter = 0;
}
