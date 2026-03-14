// ─── Grid Configuration & API Types ───

import type { ColumnDef, ColumnState, SortModelItem } from './column';
import type { EditType } from './editing';
import type { GridEventMap } from './events';
import type { FilterModel } from './filter';
import type { GridPlugin } from './plugin';
import type { DataSource, GetRowIdParams, RowModelType, RowNode } from './row';
import type { CellPosition, CellRange, RowSelectionMode } from './selection';

// ─── GridConfig ───

/**
 * Primary configuration object for initializing a GridStorm instance.
 *
 * Defines column structure, row data, plugins, and behavioral options for the grid.
 * Pass this to the grid engine constructor or framework adapter to create a grid.
 *
 * @typeParam TData - The type of each row data object.
 *
 * @example
 * ```ts
 * const config: GridConfig<Employee> = {
 *   columns: [{ field: 'name' }, { field: 'salary', sortable: true }],
 *   rowData: employees,
 *   rowSelection: 'multiple',
 * };
 * ```
 *
 * @see {@link GridApi} for the runtime API returned after initialization.
 * @see {@link GridPlugin} for extending grid behavior with plugins.
 */
export interface GridConfig<TData = any> {
  /**
   * Array of column definitions that describe the columns to render.
   *
   * Each entry configures one column's header, width, sorting, filtering,
   * rendering, and editing behavior. Order determines initial display order.
   *
   * @see {@link ColumnDef} for the full set of column options.
   *
   * @example
   * ```ts
   * columns: [
   *   { field: 'name', headerName: 'Full Name', sortable: true },
   *   { field: 'age', width: 100, filter: true },
   * ]
   * ```
   */
  columns: ColumnDef<TData>[];

  /**
   * Client-side row data array. Mutually exclusive with {@link dataSource}.
   *
   * When provided, the grid operates in client-side mode, performing all sorting,
   * filtering, and grouping in the browser. Update row data at runtime via
   * {@link GridApi.setRowData}.
   *
   * @remarks
   * For large datasets (100k+ rows), consider using server-side row model with
   * {@link dataSource} instead.
   *
   * @example
   * ```ts
   * rowData: [
   *   { id: 1, name: 'Alice', salary: 80000 },
   *   { id: 2, name: 'Bob', salary: 95000 },
   * ]
   * ```
   */
  rowData?: TData[];

  /**
   * Server-side or infinite data source for fetching rows on demand.
   * Mutually exclusive with {@link rowData}.
   *
   * When provided, the grid delegates data fetching, sorting, and filtering
   * to the data source implementation.
   *
   * @see {@link DataSource} for the interface to implement.
   */
  dataSource?: DataSource<TData>;

  /**
   * Determines how the grid fetches and manages row data.
   *
   * - `'client'` - All data is loaded upfront and processed in-browser.
   * - `'server'` - Data is fetched from a server in pages, with server-side sorting/filtering.
   * - `'infinite'` - Rows are lazily loaded as the user scrolls.
   * - `'viewport'` - Only rows visible in the viewport are fetched.
   *
   * @default 'client'
   * @see {@link RowModelType}
   */
  rowModelType?: RowModelType;

  /**
   * Callback to generate a unique string ID for each row.
   *
   * When not provided, the grid uses the array index as the row ID.
   * Providing a stable ID function is recommended for optimal update
   * performance and correct selection behavior across data refreshes.
   *
   * @param params - Contains the row data, index, and optional parent keys for grouped data.
   * @returns A unique string identifier for the row.
   *
   * @example
   * ```ts
   * getRowId: (params) => String(params.data.id)
   * ```
   *
   * @see {@link GetRowIdParams}
   */
  getRowId?: (params: GetRowIdParams<TData>) => string;

  /**
   * Array of plugins to install during grid initialization.
   *
   * Plugins extend grid functionality (sorting, filtering, editing, etc.)
   * and are installed in dependency-resolved order via topological sort.
   *
   * @example
   * ```ts
   * import { sortingPlugin } from '@gridstorm/plugin-sorting';
   * import { filterPlugin } from '@gridstorm/plugin-filtering';
   *
   * plugins: [sortingPlugin(), filterPlugin()]
   * ```
   *
   * @see {@link GridPlugin} for creating custom plugins.
   */
  plugins?: GridPlugin<TData>[];

  // ── Defaults ──

  /**
   * Default column definition applied to all columns.
   *
   * Properties defined here act as fallbacks for individual {@link ColumnDef} entries.
   * Individual column definitions override these defaults.
   *
   * @example
   * ```ts
   * defaultColDef: { sortable: true, resizable: true, width: 150 }
   * ```
   */
  defaultColDef?: Partial<ColumnDef<TData>>;

  // ── Sizing ──

  /**
   * Height of each data row in pixels, or a function that returns per-row height.
   *
   * Use a number for uniform row heights (better virtual scroll performance)
   * or a function for variable-height rows.
   *
   * @default 40
   *
   * @example
   * ```ts
   * // Fixed height
   * rowHeight: 48
   *
   * // Variable height
   * rowHeight: ({ data }) => data.hasDetails ? 80 : 40
   * ```
   */
  rowHeight?: number | ((params: { data: TData; index: number }) => number);

  /**
   * Height of the column header row in pixels.
   *
   * @default 40
   */
  headerHeight?: number;

  // ── Layout ──

  /**
   * Controls how the grid's DOM height is determined.
   *
   * - `'normal'` - Grid fills its container and uses virtual scrolling.
   * - `'autoHeight'` - Grid expands vertically to fit all rows (no vertical scroll).
   * - `'print'` - Renders all rows for print layout.
   *
   * @default 'normal'
   *
   * @remarks
   * `'autoHeight'` disables virtual scrolling and may cause performance issues
   * with large datasets.
   */
  domLayout?: 'normal' | 'autoHeight' | 'print';

  // ── Pinned rows ──

  /**
   * Row data to display as pinned rows at the top of the grid.
   *
   * Pinned rows are not affected by sorting, filtering, or scrolling.
   * Commonly used for summary/total rows.
   *
   * @default undefined
   */
  pinnedTopRowData?: TData[];

  /**
   * Row data to display as pinned rows at the bottom of the grid.
   *
   * Pinned rows are not affected by sorting, filtering, or scrolling.
   * Commonly used for summary/total rows.
   *
   * @default undefined
   */
  pinnedBottomRowData?: TData[];

  // ── Scrolling ──

  /**
   * When `true`, suppresses horizontal scrolling.
   * Columns will be forced to fit within the grid's width.
   *
   * @default false
   */
  suppressScrollX?: boolean;

  /**
   * When `true`, suppresses vertical scrolling.
   * Use with `domLayout: 'autoHeight'` for full-height rendering.
   *
   * @default false
   */
  suppressScrollY?: boolean;

  // ── Selection ──

  /**
   * Configures row selection behavior.
   *
   * - `'single'` - Only one row can be selected at a time.
   * - `'multiple'` - Multiple rows can be selected using Ctrl/Shift + click.
   * - `false` - Row selection is disabled.
   *
   * @default false
   * @see {@link RowSelectionMode}
   */
  rowSelection?: RowSelectionMode;

  // ── Editing ──

  /**
   * Controls the editing mode for the grid.
   *
   * - `'cell'` - Only one cell is editable at a time.
   * - `'fullRow'` - The entire row becomes editable when editing starts.
   *
   * @default 'cell'
   * @see {@link EditType}
   */
  editType?: EditType;

  /**
   * When `true`, enables undo/redo for cell edits via Ctrl+Z / Ctrl+Y.
   *
   * @default false
   */
  undoRedoCellEditing?: boolean;

  // ── Pagination ──

  /**
   * When `true`, enables client-side pagination.
   *
   * @default false
   * @see {@link paginationPageSize}
   */
  pagination?: boolean;

  /**
   * Number of rows per page when pagination is enabled.
   *
   * @default 100
   * @see {@link pagination}
   */
  paginationPageSize?: number;

  // ── Animation ──

  /**
   * When `true`, enables row transition animations during sorting,
   * filtering, and other operations that reorder rows.
   *
   * @default true
   */
  animateRows?: boolean;

  // ── Accessibility ──

  /**
   * ARIA label applied to the grid's root element for screen readers.
   *
   * @default undefined
   *
   * @example
   * ```ts
   * ariaLabel: 'Employee data table'
   * ```
   */
  ariaLabel?: string;

  // ── Locale ──

  /**
   * BCP 47 locale tag for number formatting, date formatting, and text collation.
   *
   * @default 'en-US'
   *
   * @example
   * ```ts
   * locale: 'de-DE'
   * ```
   */
  locale?: string;

  // ── Theme ──

  /**
   * Theme identifier to apply to the grid.
   *
   * Corresponds to a CSS class or theme configuration from `@gridstorm/theme-default`
   * or a custom theme package.
   *
   * @default 'gridstorm-light'
   *
   * @example
   * ```ts
   * theme: 'gridstorm-dark'
   * ```
   */
  theme?: string;

  // ── Event callbacks ──

  /**
   * Called once when the grid has been fully initialized and the API is ready.
   *
   * This is the recommended place to perform initial API calls like
   * setting filters or selecting rows.
   *
   * @param api - The fully initialized grid API.
   *
   * @example
   * ```ts
   * onGridReady: (api) => {
   *   api.setFilterModel({ status: { filterType: 'text', filter: 'active' } });
   * }
   * ```
   */
  onGridReady?: (api: GridApi<TData>) => void;

  /**
   * Called when row data changes, either through {@link GridApi.setRowData}
   * or data source updates.
   *
   * @see {@link GridEventMap}
   */
  onRowDataChanged?: (event: GridEventMap<TData>['rowData:changed']) => void;

  /**
   * Called when the set of selected rows changes.
   *
   * @see {@link GridEventMap}
   */
  onSelectionChanged?: (event: GridEventMap<TData>['selection:changed']) => void;

  /**
   * Called when the sort model changes (columns sorted/unsorted).
   *
   * @see {@link GridEventMap}
   */
  onSortChanged?: (event: GridEventMap<TData>['column:sort:changed']) => void;

  /**
   * Called when the filter model changes (filters applied/removed).
   *
   * @see {@link GridEventMap}
   */
  onFilterChanged?: (event: GridEventMap<TData>['filter:changed']) => void;

  /**
   * Called when a cell value is changed through editing.
   *
   * @see {@link GridEventMap}
   */
  onCellValueChanged?: (event: GridEventMap<TData>['cell:valueChanged']) => void;
}

// ─── GridState ───

/**
 * The complete internal state of a GridStorm instance.
 *
 * This immutable-by-convention object represents every aspect of the grid's
 * current state. It is managed by the internal store and should be read via
 * {@link GridApi.getState}. Direct mutation is only permitted within store
 * updaters (e.g., inside plugin command handlers).
 *
 * @typeParam TData - The type of each row data object.
 *
 * @see {@link GridApi.getState} to read the current state.
 * @see {@link PluginStoreAccess} for plugin-level state access.
 */
export interface GridState<TData = any> {
  /** Resolved column states derived from column definitions and user interactions. */
  columns: ColumnState[];

  /**
   * Map of all row nodes keyed by their unique ID.
   * Includes data rows, group rows, and pinned rows.
   */
  rowNodes: Map<string, RowNode<TData>>;

  /**
   * Ordered array of row IDs currently displayed after sorting, filtering,
   * grouping, and pagination have been applied. Use these IDs to look up
   * nodes in {@link rowNodes}.
   */
  displayedRowIds: string[];

  /**
   * Current sort model describing which columns are sorted and in what direction.
   * @see {@link SortModelItem}
   */
  sortModel: SortModelItem[];

  /**
   * Current filter model keyed by column ID. Each entry describes the
   * active filter for that column.
   * @see {@link FilterModel}
   */
  filterModel: Record<string, FilterModel>;

  /** Current selection state for rows and cell ranges. */
  selection: {
    /** Set of currently selected row IDs. */
    selectedRowIds: Set<string>;
    /** Array of active cell range selections (for range-select / copy). */
    rangeSelections: CellRange[];
  };

  /**
   * Current cell editing state, or `null` when no cell is being edited.
   * @see {@link import('./editing').EditingState}
   */
  editing: import('./editing').EditingState | null;

  /** Current scroll position of the grid viewport in pixels. */
  scroll: { top: number; left: number };

  /**
   * Currently focused cell position, or `null` when no cell has focus.
   * @see {@link CellPosition}
   */
  focusedCell: CellPosition | null;

  /** Pagination state when pagination is enabled. */
  pagination: {
    /** Zero-based index of the current page. */
    currentPage: number;
    /** Number of rows per page. */
    pageSize: number;
    /** Total number of rows before pagination. */
    totalRows: number;
  };

  /** Text used for quick-filter matching across all columns. */
  quickFilterText: string;

  /** Column group hierarchy for multi-level headers. Empty when no groups are defined. */
  columnGroups: import('../engine/column-model').ColumnGroupInfo[];

  /** Max depth of column group nesting. 0 when no groups exist. */
  columnGroupDepth: number;

  /**
   * Plugin-managed state slices keyed by a unique string.
   *
   * Plugins register their own state slices via
   * {@link PluginContext.registerState} and access them via
   * {@link PluginContext.getState} / {@link PluginContext.setState}.
   */
  pluginState: Record<string, unknown>;
}

// ─── GridApi ───

/**
 * Runtime API for interacting with a GridStorm instance.
 *
 * Provides programmatic access to data, columns, selection, editing,
 * scrolling, pagination, and event management. Obtained via the
 * {@link GridConfig.onGridReady} callback or from the grid engine's
 * initialization return value.
 *
 * @typeParam TData - The type of each row data object.
 *
 * @remarks
 * Plugins may dynamically extend this interface at runtime by attaching
 * additional methods to the API object. Use {@link getPluginApi} for
 * type-safe access to plugin-specific APIs.
 *
 * @example
 * ```ts
 * const config: GridConfig<Employee> = {
 *   columns: [{ field: 'name' }],
 *   rowData: employees,
 *   onGridReady: (api) => {
 *     api.setSortModel([{ colId: 'name', sort: 'asc' }]);
 *   },
 * };
 * ```
 *
 * @see {@link GridConfig} for initialization options.
 */
export interface GridApi<TData = any> {
  // ── Data ──

  /**
   * Replaces the grid's row data with a new array.
   *
   * Triggers a full data refresh including sorting, filtering, and re-rendering.
   *
   * @param data - The new row data array.
   *
   * @example
   * ```ts
   * api.setRowData(await fetchEmployees());
   * ```
   */
  setRowData(data: TData[]): void;

  /**
   * Retrieves a row node by its unique ID.
   *
   * @param id - The row node's unique identifier.
   * @returns The matching row node, or `undefined` if not found.
   */
  getRowNode(id: string): RowNode<TData> | undefined;

  /**
   * Iterates over every row node in the grid (including group nodes).
   *
   * @param callback - Function called for each node with its display index.
   *
   * @example
   * ```ts
   * api.forEachNode((node, index) => {
   *   console.log(`Row ${index}: ${node.data?.name}`);
   * });
   * ```
   */
  forEachNode(callback: (node: RowNode<TData>, index: number) => void): void;

  /**
   * Returns the number of rows currently displayed (after filtering, sorting, pagination).
   *
   * @returns The count of visible rows.
   */
  getDisplayedRowCount(): number;

  /**
   * Retrieves the row node at a specific display index.
   *
   * @param index - Zero-based display index.
   * @returns The row node at that index, or `undefined` if out of range.
   */
  getDisplayedRowAtIndex(index: number): RowNode<TData> | undefined;

  /**
   * Adds rows to the grid incrementally without replacing existing data.
   * @param data - Array of row data objects to add.
   * @param index - Optional insertion index. Rows are appended if omitted.
   */
  addRows(data: TData[], index?: number): void;

  /**
   * Removes rows by their IDs without replacing the entire dataset.
   * @param rowIds - Array of row IDs to remove.
   */
  removeRows(rowIds: string[]): void;

  /**
   * Updates existing rows by merging new data into their current data objects.
   * @param updates - Array of objects with `id` and partial `data` to merge.
   */
  updateRows(updates: Array<{ id: string; data: Partial<TData> }>): void;

  // ── Columns ──

  /**
   * Replaces all column definitions. Triggers a full column rebuild and re-render.
   *
   * @param defs - The new column definition array.
   * @see {@link ColumnDef}
   */
  setColumnDefs(defs: ColumnDef<TData>[]): void;

  /**
   * Retrieves the resolved state of a single column by its ID.
   *
   * @param colId - The column's unique identifier.
   * @returns The column state, or `undefined` if not found.
   * @see {@link ColumnState}
   */
  getColumn(colId: string): ColumnState | undefined;

  /**
   * Returns the resolved state of all columns, including hidden ones.
   *
   * @returns Array of all column states in their current order.
   */
  getAllColumns(): ColumnState[];

  /**
   * Returns only columns that are currently visible (not hidden).
   *
   * @returns Array of visible column states in display order.
   */
  getVisibleColumns(): ColumnState[];

  /**
   * Shows or hides a column.
   *
   * @param colId - The column's unique identifier.
   * @param visible - `true` to show, `false` to hide.
   */
  setColumnVisible(colId: string, visible: boolean): void;

  /**
   * Pins or unpins a column to the left or right side of the grid.
   *
   * @param colId - The column's unique identifier.
   * @param pinned - `'left'`, `'right'`, or `null` to unpin.
   */
  setColumnPinned(colId: string, pinned: 'left' | 'right' | null): void;

  /**
   * Sets the width of a column in pixels.
   *
   * @param colId - The column's unique identifier.
   * @param width - The desired width in pixels (clamped to min/max bounds).
   */
  setColumnWidth(colId: string, width: number): void;

  /**
   * Moves a column to a new position in the display order.
   *
   * @param colId - The column's unique identifier.
   * @param toIndex - The target zero-based display index.
   */
  moveColumn(colId: string, toIndex: number): void;

  /**
   * Auto-sizes a single column to fit its content.
   *
   * @param colId - The column's unique identifier.
   */
  autoSizeColumn(colId: string): void;

  /**
   * Auto-sizes all columns to fit their content.
   */
  autoSizeAllColumns(): void;

  /**
   * Returns a snapshot of all column states for persistence or restoration.
   *
   * @returns Array of current column states.
   * @see {@link applyColumnState}
   */
  getColumnState(): ColumnState[];

  /**
   * Applies a partial column state array to restore or update column configuration.
   *
   * @param state - Array of partial column states. Only provided properties are applied.
   * @see {@link getColumnState}
   *
   * @example
   * ```ts
   * // Restore saved column widths
   * api.applyColumnState([
   *   { colId: 'name', width: 200 },
   *   { colId: 'age', hide: true },
   * ]);
   * ```
   */
  applyColumnState(state: Partial<ColumnState>[]): void;

  // ── Sorting ──

  /**
   * Sets the sort model, replacing any existing sort configuration.
   *
   * @param model - Array of sort items specifying column and direction.
   *
   * @example
   * ```ts
   * api.setSortModel([
   *   { colId: 'department', sort: 'asc' },
   *   { colId: 'salary', sort: 'desc' },
   * ]);
   * ```
   *
   * @see {@link SortModelItem}
   */
  setSortModel(model: SortModelItem[]): void;

  /**
   * Returns the current sort model.
   *
   * @returns Array of active sort items.
   */
  getSortModel(): SortModelItem[];

  // ── Filtering ──

  /**
   * Sets the filter model, replacing all active filters.
   *
   * @param model - Object keyed by column ID, each value being a {@link FilterModel}.
   *
   * @example
   * ```ts
   * api.setFilterModel({
   *   name: { filterType: 'text', type: 'contains', filter: 'Smith' },
   * });
   * ```
   */
  setFilterModel(model: Record<string, FilterModel>): void;

  /**
   * Returns the current filter model for all columns.
   *
   * @returns Object keyed by column ID with active filter models.
   */
  getFilterModel(): Record<string, FilterModel>;

  /**
   * Applies a quick filter across all columns. Rows that do not match
   * the text in any column are hidden.
   *
   * @param text - The filter text. Pass an empty string to clear.
   *
   * @example
   * ```ts
   * api.setQuickFilter('engineering');
   * ```
   */
  setQuickFilter(text: string): void;

  /**
   * Checks whether any column filter or quick filter is currently active.
   *
   * @returns `true` if at least one filter is applied.
   */
  isAnyFilterPresent(): boolean;

  // ── Selection ──

  /**
   * Selects all rows that pass the current filter.
   */
  selectAll(): void;

  /**
   * Deselects all currently selected rows.
   */
  deselectAll(): void;

  /**
   * Returns the data objects of all currently selected rows.
   *
   * @returns Array of row data for selected rows.
   */
  getSelectedRows(): TData[];

  /**
   * Returns the row nodes of all currently selected rows.
   *
   * @returns Array of selected row nodes.
   */
  getSelectedNodes(): RowNode<TData>[];

  // ── Editing ──

  /**
   * Starts editing a specific cell.
   *
   * @param params - Cell position identifying the row index and column ID.
   * @see {@link CellPosition}
   */
  startEditingCell(params: CellPosition): void;

  /**
   * Stops the current cell or row edit.
   *
   * @param cancel - When `true`, reverts the cell to its original value.
   *                 When `false` or omitted, commits the edit.
   * @default false
   */
  stopEditing(cancel?: boolean): void;

  // ── Scrolling ──

  /**
   * Scrolls the grid vertically to ensure a row at the given index is visible.
   *
   * @param index - The display index of the row.
   * @param position - Where to position the row in the viewport.
   * @default 'middle'
   */
  ensureIndexVisible(index: number, position?: 'top' | 'middle' | 'bottom'): void;

  /**
   * Scrolls the grid horizontally to ensure a column is visible.
   *
   * @param colId - The column's unique identifier.
   */
  ensureColumnVisible(colId: string): void;

  // ── Row Groups ──

  /**
   * Expands all group rows at every level.
   */
  expandAll(): void;

  /**
   * Collapses all group rows at every level.
   */
  collapseAll(): void;

  /**
   * Sets the expanded/collapsed state of a specific group row node.
   *
   * @param node - The group row node to expand or collapse.
   * @param expanded - `true` to expand, `false` to collapse.
   */
  setRowNodeExpanded(node: RowNode<TData>, expanded: boolean): void;

  // ── Rendering ──

  /**
   * Triggers a targeted refresh of specific cells or all cells.
   *
   * @param params - Optional filter for which cells to refresh.
   *                 When omitted, all visible cells are refreshed.
   * @see {@link RefreshCellsParams}
   */
  refreshCells(params?: { rowIds?: string[]; colIds?: string[]; force?: boolean }): void;

  /**
   * Forces a complete redraw of all rendered rows.
   *
   * @remarks
   * This is more expensive than {@link refreshCells}. Use it only when
   * structural changes require a full re-render.
   */
  redrawRows(): void;

  // ── Pagination ──

  /**
   * Navigates to a specific page (zero-based index).
   *
   * @param page - The zero-based page number to navigate to.
   */
  paginationGoToPage(page: number): void;

  /**
   * Returns the current page number (zero-based).
   *
   * @returns The current page index.
   */
  paginationGetCurrentPage(): number;

  /**
   * Returns the total number of pages.
   *
   * @returns The total page count.
   */
  paginationGetTotalPages(): number;

  // ── Config ──

  /**
   * Updates a single grid configuration option at runtime.
   *
   * @typeParam K - The configuration key type.
   * @param key - The configuration property name.
   * @param value - The new value for the property.
   *
   * @example
   * ```ts
   * api.setGridOption('rowHeight', 60);
   * ```
   */
  setGridOption<K extends keyof GridConfig<TData>>(key: K, value: GridConfig<TData>[K]): void;

  /**
   * Reads a single grid configuration option.
   *
   * @typeParam K - The configuration key type.
   * @param key - The configuration property name.
   * @returns The current value of the configuration property.
   */
  getGridOption<K extends keyof GridConfig<TData>>(key: K): GridConfig<TData>[K];

  // ── Lifecycle ──

  /**
   * Destroys the grid instance, cleaning up all DOM elements, event listeners,
   * plugins, and internal state. The API should not be used after calling this.
   */
  destroy(): void;

  // ── Events ──

  /**
   * Registers an event listener for a specific grid event.
   *
   * @typeParam K - The event key from {@link GridEventMap}.
   * @param event - The event name to listen for.
   * @param listener - Callback invoked when the event fires.
   *
   * @example
   * ```ts
   * api.addEventListener('selection:changed', (e) => {
   *   console.log('Selected:', e.selectedNodes.length);
   * });
   * ```
   *
   * @see {@link GridEventMap} for all available events.
   */
  addEventListener<K extends keyof GridEventMap<TData>>(
    event: K,
    listener: (payload: GridEventMap<TData>[K]) => void,
  ): () => void;

  /**
   * Removes a previously registered event listener.
   *
   * @typeParam K - The event key from {@link GridEventMap}.
   * @param event - The event name.
   * @param listener - The exact listener function reference to remove.
   */
  removeEventListener<K extends keyof GridEventMap<TData>>(
    event: K,
    listener: (payload: GridEventMap<TData>[K]) => void,
  ): void;

  // ── Plugin API extensions ──

  /**
   * Retrieves a plugin's custom API by its plugin ID.
   *
   * @typeParam T - The expected plugin API type.
   * @param pluginId - The unique plugin identifier.
   * @returns The plugin's API object, or `undefined` if not installed.
   *
   * @example
   * ```ts
   * const clipboardApi = api.getPluginApi<ClipboardApi>('clipboard');
   * clipboardApi?.copyToClipboard();
   * ```
   */
  getPluginApi<T>(pluginId: string): T | undefined;

  // ── State ──

  /**
   * Returns a readonly snapshot of the complete grid state.
   *
   * @returns The current {@link GridState} object.
   */
  getState(): GridState<TData>;

  /**
   * Index signature for plugin-injected API methods.
   *
   * Plugins may dynamically attach additional methods to the API at runtime.
   * Use {@link getPluginApi} for type-safe access to plugin APIs.
   */
  [key: string]: any;
}

// ─── Refresh params ──

/**
 * Parameters for targeted cell refresh operations via {@link GridApi.refreshCells}.
 *
 * When no row or column IDs are specified, all visible cells are refreshed.
 *
 * @example
 * ```ts
 * api.refreshCells({ rowIds: ['row-1', 'row-2'], force: true });
 * ```
 */
export interface RefreshCellsParams {
  /**
   * Specific row IDs to refresh. When omitted, all displayed rows are refreshed.
   * @default undefined
   */
  rowIds?: string[];

  /**
   * Specific column IDs to refresh. When omitted, all visible columns are refreshed.
   * @default undefined
   */
  colIds?: string[];

  /**
   * When `true`, forces a re-render even if the cell value has not changed.
   * Useful after external mutations to row data objects.
   * @default false
   */
  force?: boolean;
}
