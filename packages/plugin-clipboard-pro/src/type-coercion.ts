// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * Coerce a raw string value to its likely JavaScript type.
 * Returns the coerced value.
 */
export function coerceValue(raw: string): unknown {
  // Empty → null
  if (raw === '' || raw === null || raw === undefined) return null;

  const trimmed = raw.trim();

  // Boolean
  if (trimmed.toLowerCase() === 'true') return true;
  if (trimmed.toLowerCase() === 'false') return false;

  // Null/undefined text
  if (trimmed.toLowerCase() === 'null') return null;
  if (trimmed.toLowerCase() === 'undefined') return undefined;

  // Percentage (e.g., "45%", "12.5%")
  const pctMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*%$/);
  if (pctMatch) return parseFloat(pctMatch[1]!) / 100;

  // Currency (e.g., "$1,234.56", "€100", "£50.00")
  const currencyMatch = trimmed.match(/^[$€£¥₹]?\s*(-?[\d,]+(?:\.\d+)?)\s*[$€£¥₹]?$/);
  if (currencyMatch) {
    const cleaned = currencyMatch[1]!.replace(/,/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num)) return num;
  }

  // Number (integer or float, with optional commas)
  const numMatch = trimmed.match(/^-?[\d,]+(?:\.\d+)?$/);
  if (numMatch) {
    const cleaned = trimmed.replace(/,/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num)) return num;
  }

  // Scientific notation (e.g., "1.5e10")
  const sciMatch = trimmed.match(/^-?\d+(?:\.\d+)?[eE][+-]?\d+$/);
  if (sciMatch) {
    const num = parseFloat(trimmed);
    if (!isNaN(num) && isFinite(num)) return num;
  }

  // ISO date (e.g., "2024-03-15", "2024-03-15T10:30:00")
  const isoDateMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?)?/);
  if (isoDateMatch) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Common date formats (e.g., "03/15/2024", "15-Mar-2024")
  const dateSlashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dateSlashMatch) {
    const [, m, d, y] = dateSlashMatch as RegExpMatchArray;
    const year = y!.length === 2 ? 2000 + parseInt(y!) : parseInt(y!);
    const date = new Date(year, parseInt(m!) - 1, parseInt(d!));
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  // Return as string
  return trimmed;
}

/**
 * Coerce a 2D array of string values.
 */
export function coerceGrid(grid: string[][], enabled: boolean): unknown[][] {
  if (!enabled) return grid;
  return grid.map((row) => row.map((cell) => coerceValue(cell)));
}
