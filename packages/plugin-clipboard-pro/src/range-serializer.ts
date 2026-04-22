// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
import type { ClipboardProPluginOptions } from './types';

/**
 * Serialize a cell range to TSV format.
 * @param getState - Function returning grid state
 * @param range - { startRow, endRow, startCol, endCol } indices
 * @param options - Plugin options
 */
export function serializeRangeToTSV(
  getState: () => any,
  range: { startRow: number; endRow: number; startCol: number; endCol: number },
  options: ClipboardProPluginOptions,
): string {
  const state = getState();
  const delimiter = options.delimiter ?? '\t';
  const lines: string[] = [];

  // Include headers if requested
  if (options.includeHeaders) {
    const headerCells: string[] = [];
    for (let c = range.startCol; c <= range.endCol; c++) {
      const col = state.columns[c];
      headerCells.push(escapeTSV(col?.headerName ?? col?.colId ?? '', delimiter));
    }
    lines.push(headerCells.join(delimiter));
  }

  // Data rows
  for (let r = range.startRow; r <= range.endRow; r++) {
    const rowId = state.displayedRowIds[r];
    if (!rowId) continue;
    const node = state.rowNodes.get(rowId);
    if (!node) continue;

    const cells: string[] = [];
    for (let c = range.startCol; c <= range.endCol; c++) {
      const col = state.columns[c];
      if (!col) { cells.push(''); continue; }

      let value = col.field ? node.data?.[col.field] : undefined;

      if (options.processCellForClipboard) {
        value = options.processCellForClipboard({
          value, node, column: col, rowIndex: r, colIndex: c,
        });
      }

      cells.push(escapeTSV(value == null ? '' : String(value), delimiter));
    }
    lines.push(cells.join(delimiter));
  }

  return lines.join('\n');
}

/**
 * Serialize selected rows to TSV (fallback when no range selection).
 */
export function serializeSelectedRowsToTSV(
  getState: () => any,
  options: ClipboardProPluginOptions,
): string {
  const state = getState();
  const delimiter = options.delimiter ?? '\t';
  const selectedIds = state.selection?.selectedRowIds;
  if (!selectedIds || selectedIds.size === 0) return '';

  const visibleCols = state.columns.filter((c: any) => !c.hide);
  const lines: string[] = [];

  if (options.includeHeaders) {
    lines.push(visibleCols.map((c: any) => escapeTSV(c.headerName ?? c.colId, delimiter)).join(delimiter));
  }

  for (const rowId of state.displayedRowIds) {
    if (!selectedIds.has(rowId)) continue;
    const node = state.rowNodes.get(rowId);
    if (!node) continue;

    const cells = visibleCols.map((col: any, colIndex: number) => {
      let value = col.field ? node.data?.[col.field] : undefined;
      if (options.processCellForClipboard) {
        const rowIndex = state.displayedRowIds.indexOf(rowId);
        value = options.processCellForClipboard({
          value, node, column: col, rowIndex, colIndex,
        });
      }
      return escapeTSV(value == null ? '' : String(value), delimiter);
    });
    lines.push(cells.join(delimiter));
  }

  return lines.join('\n');
}

/**
 * Advanced TSV parser that handles:
 * - Quoted values with embedded delimiters
 * - Embedded newlines in quoted values
 * - Excel double-quote escaping ("")
 * - Empty cells
 */
export function parseTSVAdvanced(text: string, delimiter: string = '\t'): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          // Escaped quote
          currentCell += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        currentCell += ch;
        i++;
      }
    } else {
      if (ch === '"' && currentCell === '') {
        // Start of quoted field
        inQuotes = true;
        i++;
      } else if (ch === delimiter) {
        currentRow.push(currentCell);
        currentCell = '';
        i++;
      } else if (ch === '\r') {
        // Handle \r\n
        if (i + 1 < text.length && text[i + 1] === '\n') i++;
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i++;
      } else if (ch === '\n') {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i++;
      } else {
        currentCell += ch;
        i++;
      }
    }
  }

  // Flush remaining
  currentRow.push(currentCell);
  if (currentRow.length > 0 && !(currentRow.length === 1 && currentRow[0] === '')) {
    rows.push(currentRow);
  }

  return rows;
}

function escapeTSV(value: string, delimiter: string): string {
  if (value.includes(delimiter) || value.includes('\n') || value.includes('"')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}
