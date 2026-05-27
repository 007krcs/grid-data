// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Clipboard Formatters ───
// Serialize/parse grid data for clipboard operations.
//
// Quoting follows RFC 4180 semantics (used by Excel, Google Sheets, and most
// CSV/TSV consumers):
//   - A field is quoted if it contains the delimiter, a double quote, CR, or LF.
//   - Inside a quoted field, embedded double quotes are doubled ("" represents ").
//   - Newlines and delimiters inside quoted fields are preserved as data.
// We apply the same rules to TSV (tab-delimited) because real-world consumers
// expect them. The previous naive `join(delimiter)` / `split(delimiter)` lost
// any cell containing the delimiter, a quote, or a newline — the round-trip
// silently corrupted multi-line and quote-bearing cells.

import type { ColumnState, RowNode } from '@gridstorm/core';
import { getValueFromData } from '@gridstorm/core';

/** True if `cell` needs to be quoted under RFC 4180 rules for `delimiter`. */
function needsQuoting(cell: string, delimiter: string): boolean {
  if (cell.length === 0) return false;
  if (cell.includes(delimiter)) return true;
  if (cell.includes('"')) return true;
  if (cell.includes('\n') || cell.includes('\r')) return true;
  return false;
}

/** Wrap `cell` in double quotes and double any embedded quotes. */
function quoteCell(cell: string): string {
  return '"' + cell.replace(/"/g, '""') + '"';
}

/** Serialize a single field according to RFC 4180 quoting rules. */
function formatField(cell: string, delimiter: string): string {
  return needsQuoting(cell, delimiter) ? quoteCell(cell) : cell;
}

export function serializeToTSV(
  rows: RowNode[],
  columns: ColumnState[],
  options: {
    delimiter?: string;
    copyHeaders?: boolean;
    processCellForClipboard?: (params: { value: any; node: RowNode; column: ColumnState }) => string;
  } = {},
): string {
  const delimiter = options.delimiter ?? '\t';
  const lines: string[] = [];

  if (options.copyHeaders) {
    lines.push(
      columns.map((c) => formatField(c.headerName ?? '', delimiter)).join(delimiter),
    );
  }

  for (const node of rows) {
    const cells = columns.map((col) => {
      const value = getValueFromData(node.data, col.field);
      let raw: string;
      if (options.processCellForClipboard) {
        raw = options.processCellForClipboard({ value, node, column: col });
      } else {
        raw = value != null ? String(value) : '';
      }
      return formatField(raw, delimiter);
    });
    lines.push(cells.join(delimiter));
  }

  return lines.join('\n');
}

/**
 * Parse RFC 4180-style delimited text into a 2D array of strings.
 *
 * Handles:
 *   - Quoted fields containing the delimiter, embedded quotes ("" → "), CR, LF
 *   - CRLF, LF, and bare CR line endings outside quoted fields
 *   - Empty cells between consecutive delimiters
 *   - Trailing newline (does not produce an empty trailing row)
 */
export function parseTSV(text: string, delimiter = '\t'): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    // The parser appends a trailing field at every newline; if the line had
    // any content, that field is real and `row` already includes it via the
    // pushField call below. A line that ends cleanly with no trailing data
    // still produces one empty field — we treat a single-empty-field row as
    // a no-op (skips spurious empty rows from trailing newlines).
    if (!(row.length === 1 && row[0] === '')) {
      rows.push(row);
    }
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // Doubled quote inside a quoted field is a literal quote.
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          // Closing quote.
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    // Outside quotes.
    if (ch === '"' && field.length === 0) {
      // Opening quote — only honored at the start of a field. A bare " in the
      // middle of an unquoted field is treated as a literal character (matches
      // Excel's lenient behavior on malformed input).
      inQuotes = true;
    } else if (ch === delimiter) {
      pushField();
    } else if (ch === '\r') {
      // Treat CRLF as a single line terminator; bare CR also ends the row.
      pushField();
      pushRow();
      if (text[i + 1] === '\n') i++;
    } else if (ch === '\n') {
      pushField();
      pushRow();
    } else {
      field += ch;
    }
  }

  // Flush the final field/row if the input didn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }

  return rows;
}
