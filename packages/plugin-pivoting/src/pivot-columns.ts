// ─── Pivot Column Generator ───
// Generates secondary columns from pivot values.

import type { ColumnDef, ColumnState, RowNode } from '@gridstorm/core';
import { getValueFromData } from '@gridstorm/core';

/**
 * Generate pivot columns from distinct values in pivot source columns.
 * For each pivot value x each value column, creates a ColumnDef.
 */
export function generatePivotColumns<TData = any>(
  rows: RowNode<TData>[],
  pivotColumns: ColumnState[],
  valueColumns: ColumnState[],
  maxColumns = 1000,
): ColumnDef<TData>[] {
  const generated: ColumnDef<TData>[] = [];

  for (const pivotCol of pivotColumns) {
    // Get distinct values for this pivot column
    const distinctValues = new Set<any>();
    for (const row of rows) {
      if (row.group) continue;
      const val = getValueFromData(row.data, pivotCol.field);
      if (val != null) distinctValues.add(val);
    }

    const sortedValues = Array.from(distinctValues).sort();

    for (const pivotValue of sortedValues) {
      for (const valueCol of valueColumns) {
        if (generated.length >= maxColumns) return generated;

        const colId = `pivot_${pivotCol.colId}_${String(pivotValue)}_${valueCol.colId}`;

        const pivotField = pivotCol.field;
        const valueField = valueCol.field;
        const pv = pivotValue;

        generated.push({
          colId,
          headerName: `${String(pivotValue)} — ${valueCol.headerName}`,
          field: colId,
          valueGetter: ({ node, data }) => {
            // Group nodes: use pre-computed pivot aggData
            if (node?.aggData && colId in node.aggData) {
              return node.aggData[colId];
            }
            // Leaf rows: show value only if this row's pivot field matches
            if (data && pivotField && valueField) {
              const rowPivotValue = (data as any)[pivotField];
              if (rowPivotValue === pv) {
                return (data as any)[valueField];
              }
            }
            return null;
          },
          sortable: true,
          filterable: true,
          width: valueCol.width,
        } as ColumnDef<TData>);
      }
    }
  }

  return generated;
}

/**
 * Compute pivot values for a group node.
 * For each pivot value x value column, compute the aggregated value.
 */
export function computePivotValues<TData = any>(
  groupNode: RowNode<TData>,
  pivotColumns: ColumnState[],
  valueColumns: ColumnState[],
): Record<string, any> {
  const result: Record<string, any> = {};
  if (!groupNode.children) return result;

  for (const pivotCol of pivotColumns) {
    // Group children by pivot column value
    const byPivotValue = new Map<any, RowNode<TData>[]>();
    for (const child of groupNode.children) {
      const val = child.group
        ? child.groupValue
        : getValueFromData(child.data, pivotCol.field);
      const key = val ?? '__null__';
      if (!byPivotValue.has(key)) byPivotValue.set(key, []);
      byPivotValue.get(key)!.push(child);
    }

    for (const [pivotValue, children] of byPivotValue) {
      for (const valueCol of valueColumns) {
        const colId = `pivot_${pivotCol.colId}_${String(pivotValue === '__null__' ? null : pivotValue)}_${valueCol.colId}`;

        // Sum the values (default agg for pivot)
        let sum = 0;
        for (const child of children) {
          const val = child.group
            ? (child.aggData?.[valueCol.colId] ?? 0)
            : getValueFromData(child.data, valueCol.field) ?? 0;
          sum += Number(val) || 0;
        }

        result[colId] = sum;
      }
    }
  }

  return result;
}
