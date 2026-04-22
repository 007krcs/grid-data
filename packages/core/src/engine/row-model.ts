// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Client-Side Row Model ───
// Transforms raw data into RowNode[] and manages the display pipeline:
// raw data → RowNodes → filter → sort → group → flatten → paginate → display

import type { RowNode } from '../types/row';
import type { ColumnState, SortModelItem } from '../types/column';
import type { FilterModel, FilterPredicate } from '../types/filter';
import { resolveRowId } from '../utils/id';

const DEFAULT_ROW_HEIGHT = 40;

/**
 * Create RowNode[] from raw data.
 */
export function createRowNodes<TData>(
  data: TData[],
  getRowId?: (params: { data: TData; index: number }) => string,
  rowHeight: number = DEFAULT_ROW_HEIGHT,
): RowNode<TData>[] {
  return data.map((item, index) => ({
    id: resolveRowId(item, index, getRowId),
    data: item,
    sourceIndex: index,
    displayIndex: index,
    level: 0,
    rowHeight,
    rowTop: index * rowHeight,
    parent: null,
    children: null,
    expanded: false,
    group: false,
    groupField: null,
    groupValue: null,
    leafChildrenCount: 0,
    aggData: null,
    selected: false,
    selectable: true,
    detail: false,
    rowPinned: null,
    version: 0,
  }));
}

/**
 * Get a field value from row data. Supports dot-notation paths.
 */
export function getValueFromData(data: any, field: string | undefined): any {
  if (!data || !field) return undefined;

  // Fast path: no dots
  if (!field.includes('.')) return data[field];

  // Dot-notation path
  const parts = field.split('.');
  let current = data;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Apply sorting to row nodes.
 * Mutates the array order (sorts in-place for performance).
 */
export function sortRowNodes<TData>(
  nodes: RowNode<TData>[],
  sortModel: SortModelItem[],
  columns: ColumnState[],
): RowNode<TData>[] {
  if (sortModel.length === 0) return nodes;

  const sortedNodes = [...nodes]; // shallow copy to avoid mutating original

  sortedNodes.sort((a, b) => {
    for (const sortItem of sortModel) {
      const col = columns.find((c) => c.colId === sortItem.colId);
      if (!col) continue;

      const valueA = getValueFromData(a.data, col.field);
      const valueB = getValueFromData(b.data, col.field);
      const isDesc = sortItem.sort === 'desc';

      // Use custom comparator if provided
      const comparator = col.originalDef.comparator;
      let result: number;

      if (comparator) {
        result = comparator(valueA, valueB, a, b, isDesc);
      } else {
        result = defaultComparator(valueA, valueB);
      }

      if (result !== 0) {
        return isDesc ? -result : result;
      }
    }
    return 0;
  });

  return sortedNodes;
}

/**
 * Default value comparator. Handles null/undefined, strings, numbers, dates.
 */
export function defaultComparator(a: any, b: any): number {
  // Null/undefined always sorts to the end
  const aNull = a == null;
  const bNull = b == null;
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;

  // Numeric comparison
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  // String comparison (case-insensitive)
  const strA = String(a).toLowerCase();
  const strB = String(b).toLowerCase();
  if (strA < strB) return -1;
  if (strA > strB) return 1;
  return 0;
}

/**
 * Apply filters to row nodes. Returns filtered subset.
 */
export function filterRowNodes<TData>(
  nodes: RowNode<TData>[],
  filterModel: Record<string, FilterModel>,
  columns: ColumnState[],
  quickFilterText: string,
): RowNode<TData>[] {
  const filterEntries = Object.entries(filterModel);
  const hasFilters = filterEntries.length > 0;
  const hasQuickFilter = quickFilterText.length > 0;

  if (!hasFilters && !hasQuickFilter) return nodes;

  // Compile filter predicates
  const predicates: Array<{ colId: string; field: string | undefined; predicate: FilterPredicate }> =
    [];

  for (const [colId, model] of filterEntries) {
    const col = columns.find((c) => c.colId === colId);
    const predicate = compileFilter(model);
    if (predicate) {
      predicates.push({ colId, field: col?.field, predicate });
    }
  }

  const quickFilterLower = quickFilterText.toLowerCase();

  return nodes.filter((node) => {
    if (!node.data) return false;

    // Column filters
    for (const { field, predicate } of predicates) {
      const value = getValueFromData(node.data, field);
      if (!predicate(value)) return false;
    }

    // Quick filter — matches any visible column value
    if (hasQuickFilter) {
      let matches = false;
      for (const col of columns) {
        if (col.hide) continue;
        const value = getValueFromData(node.data, col.field);
        if (value != null && String(value).toLowerCase().includes(quickFilterLower)) {
          matches = true;
          break;
        }
      }
      if (!matches) return false;
    }

    return true;
  });
}

/**
 * Compile a FilterModel into a predicate function.
 */
function compileFilter(model: FilterModel): FilterPredicate | null {
  if (!model.type && !model.values && !model.conditions) return null;

  // Set filter
  if (model.filterType === 'set' && model.values) {
    const valueSet = new Set(model.values);
    return (value: any) => valueSet.has(value);
  }

  // Compound filter (AND/OR)
  if (model.conditions && model.conditions.length > 0) {
    const subPredicates = model.conditions
      .map(compileFilter)
      .filter((p): p is FilterPredicate => p !== null);

    if (model.operator === 'OR') {
      return (value: any) => subPredicates.some((p) => p(value));
    }
    return (value: any) => subPredicates.every((p) => p(value));
  }

  // Single condition
  return compileSingleFilter(model);
}

function compileSingleFilter(model: FilterModel): FilterPredicate | null {
  const { type, filter } = model;
  if (!type) return null;

  switch (type) {
    case 'equals':
      return (v) => v == filter;
    case 'notEqual':
      return (v) => v != filter;
    case 'contains':
      return (v) => v != null && String(v).toLowerCase().includes(String(filter).toLowerCase());
    case 'notContains':
      return (v) => v == null || !String(v).toLowerCase().includes(String(filter).toLowerCase());
    case 'startsWith':
      return (v) => v != null && String(v).toLowerCase().startsWith(String(filter).toLowerCase());
    case 'endsWith':
      return (v) => v != null && String(v).toLowerCase().endsWith(String(filter).toLowerCase());
    case 'lessThan':
      return (v) => v != null && v < filter!;
    case 'lessThanOrEqual':
      return (v) => v != null && v <= filter!;
    case 'greaterThan':
      return (v) => v != null && v > filter!;
    case 'greaterThanOrEqual':
      return (v) => v != null && v >= filter!;
    case 'inRange':
      return (v) => v != null && v >= filter! && v <= model.filterTo!;
    case 'blank':
      return (v) => v == null || v === '';
    case 'notBlank':
      return (v) => v != null && v !== '';
    default:
      return null;
  }
}

/**
 * Assign display indices and rowTop positions to displayed nodes.
 */
export function assignDisplayPositions<TData>(
  nodes: RowNode<TData>[],
  startIndex = 0,
): void {
  let top = 0;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    node.displayIndex = startIndex + i;
    node.rowTop = top;
    top += node.rowHeight;
    node.version++;
  }
}

/**
 * Calculate total height of all displayed rows.
 */
export function calculateTotalHeight<TData>(nodes: RowNode<TData>[]): number {
  let total = 0;
  for (const node of nodes) {
    total += node.rowHeight;
  }
  return total;
}
