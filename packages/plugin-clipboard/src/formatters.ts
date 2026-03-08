// ─── Clipboard Formatters ───
// Serialize/parse grid data for clipboard operations.

import type { ColumnState, RowNode } from '@gridstorm/core';
import { getValueFromData } from '@gridstorm/core';

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
    lines.push(columns.map((c) => c.headerName).join(delimiter));
  }

  for (const node of rows) {
    const cells = columns.map((col) => {
      const value = getValueFromData(node.data, col.field);
      if (options.processCellForClipboard) {
        return options.processCellForClipboard({ value, node, column: col });
      }
      return value != null ? String(value) : '';
    });
    lines.push(cells.join(delimiter));
  }

  return lines.join('\n');
}

export function parseTSV(text: string, delimiter = '\t'): string[][] {
  return text.split('\n').filter((line) => line.length > 0).map((line) => line.split(delimiter));
}
