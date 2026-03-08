// ─── Event Map ───

import type { ColumnState, SortModelItem } from './column';
import type { FilterModel } from './filter';
import type { RowNode } from './row';
import type { CellPosition, CellRange } from './selection';

/** All events emitted by the grid engine. Plugins may extend via declaration merging. */
export interface GridEventMap<TData = any> {
  // ── Lifecycle ──
  'grid:ready': GridReadyEvent<TData>;
  'grid:destroyed': {};

  // ── Data ──
  'rowData:changed': { rowData: TData[] };
  'rowNode:updated': { node: RowNode<TData> };

  // ── Columns ──
  'column:moved': { column: ColumnState; fromIndex: number; toIndex: number };
  'column:resized': { column: ColumnState; oldWidth: number; newWidth: number; finished: boolean };
  'column:visible': { column: ColumnState; visible: boolean };
  'column:pinned': { column: ColumnState; pinned: 'left' | 'right' | null };
  'column:sort:changed': { sortModel: SortModelItem[] };
  'columns:changed': { columns: ColumnState[] };

  // ── Selection ──
  'selection:changed': { selectedNodes: RowNode<TData>[]; source: SelectionSource };
  'range:selection:changed': { ranges: CellRange[] };

  // ── Editing ──
  'cell:editingStarted': { node: RowNode<TData>; colId: string; value: any };
  'cell:editingStopped': {
    node: RowNode<TData>;
    colId: string;
    oldValue: any;
    newValue: any;
    cancelled: boolean;
  };
  'cell:valueChanged': { node: RowNode<TData>; colId: string; oldValue: any; newValue: any };

  // ── Filtering ──
  'filter:changed': { filterModel: Record<string, FilterModel> };
  'quickFilter:changed': { text: string };

  // ── Scroll ──
  'scroll:changed': { top: number; left: number };
  'viewport:changed': { firstRow: number; lastRow: number };

  // ── Row Groups ──
  'row:groupOpened': { node: RowNode<TData>; expanded: boolean };

  // ── Focus ──
  'cell:focused': { position: CellPosition | null; previousPosition: CellPosition | null };

  // ── Pagination ──
  'pagination:changed': { currentPage: number; totalPages: number; pageSize: number };

  // ── Row interaction ──
  'row:clicked': { node: RowNode<TData>; event: MouseEvent | null };
  'row:doubleClicked': { node: RowNode<TData>; event: MouseEvent | null };
  'cell:clicked': { node: RowNode<TData>; colId: string; value: any; event: MouseEvent | null };
  'cell:doubleClicked': {
    node: RowNode<TData>;
    colId: string;
    value: any;
    event: MouseEvent | null;
  };

  // ── Grouping ──
  'grouping:changed': { groupColumns: string[] };

  // ── Aggregation ──
  'aggregation:computed': { groupNodeIds: string[] };

  // ── Pivoting ──
  'pivot:changed': { pivotColumns: string[]; pivotMode: boolean };

  // ── Context Menu ──
  'contextMenu:opened': { node: RowNode<TData> | null; colId: string | null; x: number; y: number };
  'contextMenu:closed': {};

  // ── Clipboard ──
  'clipboard:copy': { data: string };
  'clipboard:paste': { data: string };
  'clipboard:cut': { data: string };
}

export interface GridReadyEvent<TData = any> {
  api: import('./grid').GridApi<TData>;
}

export type SelectionSource = 'api' | 'checkbox' | 'click' | 'keyboard' | 'selectAll';

/** Utility: extract the payload type for a specific event key. */
export type EventPayload<K extends keyof GridEventMap> = GridEventMap[K];
