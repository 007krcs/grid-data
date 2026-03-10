// ─── Event Map ───

import type { ColumnState, SortModelItem } from './column';
import type { FilterModel } from './filter';
import type { RowNode } from './row';
import type { CellPosition, CellRange } from './selection';

/**
 * Complete map of all events emitted by the GridStorm engine.
 *
 * Events follow a `namespace:action` naming convention. Subscribe to events
 * via {@link GridApi.addEventListener} or the {@link GridConfig} callback
 * properties (e.g., `onSortChanged`).
 *
 * @typeParam TData - The type of each row data object.
 *
 * @remarks
 * Plugins may extend this interface via TypeScript declaration merging
 * to add custom events.
 *
 * @example
 * ```ts
 * api.addEventListener('selection:changed', (e) => {
 *   console.log('Selected rows:', e.selectedNodes.length);
 * });
 * ```
 *
 * @see {@link GridApi.addEventListener}
 * @see {@link GridApi.removeEventListener}
 */
export interface GridEventMap<TData = any> {
  // ── Lifecycle ──

  /**
   * Fired once when the grid has fully initialized and the API is ready to use.
   *
   * @see {@link GridConfig.onGridReady}
   */
  'grid:ready': GridReadyEvent<TData>;

  /**
   * Fired when the grid instance is destroyed via {@link GridApi.destroy}.
   * All internal state, listeners, and DOM elements have been cleaned up.
   */
  'grid:destroyed': {};

  // ── Data ──

  /**
   * Fired when row data is replaced via {@link GridApi.setRowData}.
   * Contains the new complete row data array.
   */
  'rowData:changed': { rowData: TData[] };

  /**
   * Fired when a single row node's properties have been updated
   * (e.g., after editing, selection change, or expansion toggle).
   */
  'rowNode:updated': { node: RowNode<TData> };

  // ── Columns ──

  /**
   * Fired when a column is moved to a new position via drag-and-drop
   * or {@link GridApi.moveColumn}.
   */
  'column:moved': { column: ColumnState; fromIndex: number; toIndex: number };

  /**
   * Fired during and after column resize operations.
   * The `finished` flag indicates whether the resize drag has completed.
   */
  'column:resized': { column: ColumnState; oldWidth: number; newWidth: number; finished: boolean };

  /**
   * Fired when a column's visibility changes via {@link GridApi.setColumnVisible}
   * or the columns tool panel.
   */
  'column:visible': { column: ColumnState; visible: boolean };

  /**
   * Fired when a column's pinned state changes via {@link GridApi.setColumnPinned}
   * or drag-and-drop.
   */
  'column:pinned': { column: ColumnState; pinned: 'left' | 'right' | null };

  /**
   * Fired when the sort model changes (columns sorted, unsorted, or sort order changed).
   *
   * @see {@link GridConfig.onSortChanged}
   */
  'column:sort:changed': { sortModel: SortModelItem[] };

  /**
   * Fired when the column definitions or column state array changes
   * (e.g., after {@link GridApi.setColumnDefs} or {@link GridApi.applyColumnState}).
   */
  'columns:changed': { columns: ColumnState[] };

  // ── Selection ──

  /**
   * Fired when the set of selected rows changes, regardless of the selection source.
   *
   * @see {@link GridConfig.onSelectionChanged}
   * @see {@link SelectionSource} for possible trigger sources.
   */
  'selection:changed': { selectedNodes: RowNode<TData>[]; source: SelectionSource };

  /**
   * Fired when cell range selections change (used in range-select mode
   * for copy/paste operations).
   */
  'range:selection:changed': { ranges: CellRange[] };

  // ── Editing ──

  /**
   * Fired when a cell enters edit mode via double-click, Enter key,
   * or {@link GridApi.startEditingCell}.
   */
  'cell:editingStarted': { node: RowNode<TData>; colId: string; value: any };

  /**
   * Fired when a cell exits edit mode, either by committing or cancelling the edit.
   * Check the `cancelled` flag to distinguish between the two.
   */
  'cell:editingStopped': {
    node: RowNode<TData>;
    colId: string;
    oldValue: any;
    newValue: any;
    cancelled: boolean;
  };

  /**
   * Fired after a cell's value has been successfully changed through editing.
   * Only fires when the new value differs from the old value.
   *
   * @see {@link GridConfig.onCellValueChanged}
   */
  'cell:valueChanged': { node: RowNode<TData>; colId: string; oldValue: any; newValue: any };

  // ── Filtering ──

  /**
   * Fired when the filter model changes (filters applied, modified, or removed).
   *
   * @see {@link GridConfig.onFilterChanged}
   */
  'filter:changed': { filterModel: Record<string, FilterModel> };

  /**
   * Fired when the quick filter text changes via {@link GridApi.setQuickFilter}.
   */
  'quickFilter:changed': { text: string };

  // ── Scroll ──

  /**
   * Fired when the grid's scroll position changes (user scroll or programmatic scroll).
   * Provides the new scroll offset in pixels from the top-left corner.
   */
  'scroll:changed': { top: number; left: number };

  /**
   * Fired when the visible row range changes due to scrolling.
   * Provides the first and last visible row indices.
   */
  'viewport:changed': { firstRow: number; lastRow: number };

  // ── Row Groups ──

  /**
   * Fired when a group row is expanded or collapsed by the user
   * or via {@link GridApi.setRowNodeExpanded}.
   */
  'row:groupOpened': { node: RowNode<TData>; expanded: boolean };

  // ── Focus ──

  /**
   * Fired when cell focus changes (keyboard navigation or click).
   * Provides both the new and previous focus positions.
   */
  'cell:focused': { position: CellPosition | null; previousPosition: CellPosition | null };

  // ── Pagination ──

  /**
   * Fired when the current page, total pages, or page size changes.
   * Triggered by {@link GridApi.paginationGoToPage} or data changes.
   */
  'pagination:changed': { currentPage: number; totalPages: number; pageSize: number };

  // ── Row interaction ──

  /** Fired when a row is clicked. Includes the native mouse event (if DOM-triggered). */
  'row:clicked': { node: RowNode<TData>; event: MouseEvent | null };

  /** Fired when a row is double-clicked. */
  'row:doubleClicked': { node: RowNode<TData>; event: MouseEvent | null };

  /** Fired when a cell is clicked. Includes the cell value and native mouse event. */
  'cell:clicked': { node: RowNode<TData>; colId: string; value: any; event: MouseEvent | null };

  /** Fired when a cell is double-clicked. */
  'cell:doubleClicked': {
    node: RowNode<TData>;
    colId: string;
    value: any;
    event: MouseEvent | null;
  };

  // ── Grouping ──

  /**
   * Fired when the set of row grouping columns changes
   * (columns added to or removed from the group).
   */
  'grouping:changed': { groupColumns: string[] };

  // ── Aggregation ──

  /**
   * Fired after aggregation values have been recomputed for group nodes.
   * Contains the IDs of group nodes whose aggregation data was updated.
   */
  'aggregation:computed': { groupNodeIds: string[] };

  // ── Pivoting ──

  /**
   * Fired when the pivot configuration changes (pivot columns or pivot mode toggled).
   */
  'pivot:changed': { pivotColumns: string[]; pivotMode: boolean };

  // ── Context Menu ──

  /**
   * Fired when a context menu is opened via right-click on the grid.
   * Provides the target row node, column, and mouse coordinates.
   */
  'contextMenu:opened': { node: RowNode<TData> | null; colId: string | null; x: number; y: number };

  /**
   * Fired when the context menu is closed.
   */
  'contextMenu:closed': {};

  // ── DOM Renderer ──

  /**
   * Fired by the DOM renderer after the header row has been fully
   * (re-)rendered. Plugins that inject DOM elements into header cells
   * (e.g., column-resize handles, drag-and-drop handlers) should
   * listen for this event to re-attach their elements.
   */
  'dom:headerRendered': {};

  // ── Clipboard ──

  /** Fired when data is copied to the clipboard from the grid. */
  'clipboard:copy': { data: string };

  /** Fired when data is pasted into the grid from the clipboard. */
  'clipboard:paste': { data: string };

  /** Fired when data is cut from the grid to the clipboard. */
  'clipboard:cut': { data: string };
}

/**
 * Payload for the `grid:ready` event.
 *
 * @typeParam TData - The row data type.
 * @see {@link GridEventMap}
 */
export interface GridReadyEvent<TData = any> {
  /** The fully initialized grid API. */
  api: import('./grid').GridApi<TData>;
}

/**
 * Identifies the source that triggered a selection change.
 *
 * - `'api'` - Selection changed via API call (e.g., `selectAll()`).
 * - `'checkbox'` - User clicked a selection checkbox.
 * - `'click'` - User clicked on a row.
 * - `'keyboard'` - User navigated and selected via keyboard (Space/Enter).
 * - `'selectAll'` - User used a "select all" header checkbox.
 */
export type SelectionSource = 'api' | 'checkbox' | 'click' | 'keyboard' | 'selectAll';

/**
 * Utility type to extract the payload type for a specific event key.
 *
 * @typeParam K - An event key from {@link GridEventMap}.
 *
 * @example
 * ```ts
 * type SortPayload = EventPayload<'column:sort:changed'>;
 * // { sortModel: SortModelItem[] }
 * ```
 */
export type EventPayload<K extends keyof GridEventMap> = GridEventMap[K];
