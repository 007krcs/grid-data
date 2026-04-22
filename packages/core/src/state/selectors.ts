// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Built-in Selectors ───

import type { GridState } from '../types/grid';
import type { ColumnState } from '../types/column';
import type { RowNode } from '../types/row';
import type { Selector } from './store';

// ── Column Selectors ──

export const selectAllColumns: Selector<GridState, ColumnState[]> = (state) => state.columns;

export const selectVisibleColumns: Selector<GridState, ColumnState[]> = (state) =>
  state.columns.filter((c) => !c.hide);

export const selectPinnedLeftColumns: Selector<GridState, ColumnState[]> = (state) =>
  state.columns.filter((c) => !c.hide && c.pinned === 'left');

export const selectPinnedRightColumns: Selector<GridState, ColumnState[]> = (state) =>
  state.columns.filter((c) => !c.hide && c.pinned === 'right');

export const selectCenterColumns: Selector<GridState, ColumnState[]> = (state) =>
  state.columns.filter((c) => !c.hide && c.pinned === null);

export const selectTotalColumnWidth: Selector<GridState, number> = (state) =>
  state.columns.filter((c) => !c.hide).reduce((sum, c) => sum + c.width, 0);

// ── Row Selectors ──

export const selectDisplayedRowIds: Selector<GridState, string[]> = (state) =>
  state.displayedRowIds;

export const selectRowNodes: Selector<GridState, Map<string, RowNode>> = (state) =>
  state.rowNodes;

export const selectDisplayedRowCount: Selector<GridState, number> = (state) =>
  state.displayedRowIds.length;

export const selectDisplayedRows: Selector<GridState, RowNode[]> = (state) => {
  const result: RowNode[] = [];
  for (const id of state.displayedRowIds) {
    const node = state.rowNodes.get(id);
    if (node) result.push(node);
  }
  return result;
};

// ── Sort / Filter ──

export const selectSortModel = (state: GridState) => state.sortModel;
export const selectFilterModel = (state: GridState) => state.filterModel;
export const selectQuickFilterText = (state: GridState) => state.quickFilterText;

// ── Selection ──

export const selectSelectedRowIds = (state: GridState) => state.selection.selectedRowIds;

export const selectSelectedNodes: Selector<GridState, RowNode[]> = (state) => {
  const result: RowNode[] = [];
  for (const id of state.selection.selectedRowIds) {
    const node = state.rowNodes.get(id);
    if (node) result.push(node);
  }
  return result;
};

// ── Scroll ──

export const selectScrollState = (state: GridState) => state.scroll;

// ── Focus ──

export const selectFocusedCell = (state: GridState) => state.focusedCell;

// ── Pagination ──

export const selectPagination = (state: GridState) => state.pagination;
