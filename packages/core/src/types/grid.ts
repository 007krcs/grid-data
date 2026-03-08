// ─── Grid Configuration & API Types ───

import type { ColumnDef, ColumnState, SortModelItem } from './column';
import type { EditType } from './editing';
import type { GridEventMap } from './events';
import type { FilterModel } from './filter';
import type { GridPlugin } from './plugin';
import type { DataSource, GetRowIdParams, RowModelType, RowNode } from './row';
import type { CellPosition, CellRange, RowSelectionMode } from './selection';

// ─── GridConfig ───

export interface GridConfig<TData = any> {
  /** Column definitions. */
  columns: ColumnDef<TData>[];

  /** Client-side row data. Mutually exclusive with `dataSource`. */
  rowData?: TData[];

  /** Server-side / infinite data source. */
  dataSource?: DataSource<TData>;

  /** Row model type. Default: 'client'. */
  rowModelType?: RowModelType;

  /** Generate unique row IDs. Default: uses array index. */
  getRowId?: (params: GetRowIdParams<TData>) => string;

  /** Plugins to install. */
  plugins?: GridPlugin<TData>[];

  // ── Defaults ──
  defaultColDef?: Partial<ColumnDef<TData>>;

  // ── Sizing ──
  rowHeight?: number | ((params: { data: TData; index: number }) => number);
  headerHeight?: number;

  // ── Layout ──
  domLayout?: 'normal' | 'autoHeight' | 'print';

  // ── Pinned rows ──
  pinnedTopRowData?: TData[];
  pinnedBottomRowData?: TData[];

  // ── Scrolling ──
  suppressScrollX?: boolean;
  suppressScrollY?: boolean;

  // ── Selection ──
  rowSelection?: RowSelectionMode;

  // ── Editing ──
  editType?: EditType;
  undoRedoCellEditing?: boolean;

  // ── Pagination ──
  pagination?: boolean;
  paginationPageSize?: number;

  // ── Animation ──
  animateRows?: boolean;

  // ── Accessibility ──
  ariaLabel?: string;

  // ── Locale ──
  locale?: string;

  // ── Theme ──
  theme?: string;

  // ── Event callbacks ──
  onGridReady?: (api: GridApi<TData>) => void;
  onRowDataChanged?: (event: GridEventMap<TData>['rowData:changed']) => void;
  onSelectionChanged?: (event: GridEventMap<TData>['selection:changed']) => void;
  onSortChanged?: (event: GridEventMap<TData>['column:sort:changed']) => void;
  onFilterChanged?: (event: GridEventMap<TData>['filter:changed']) => void;
  onCellValueChanged?: (event: GridEventMap<TData>['cell:valueChanged']) => void;
}

// ─── GridState ───

export interface GridState<TData = any> {
  columns: ColumnState[];
  rowNodes: Map<string, RowNode<TData>>;
  displayedRowIds: string[];
  sortModel: SortModelItem[];
  filterModel: Record<string, FilterModel>;
  selection: {
    selectedRowIds: Set<string>;
    rangeSelections: CellRange[];
  };
  editing: import('./editing').EditingState | null;
  scroll: { top: number; left: number };
  focusedCell: CellPosition | null;
  pagination: {
    currentPage: number;
    pageSize: number;
    totalRows: number;
  };
  quickFilterText: string;
  // Plugin-managed state slices
  pluginState: Record<string, unknown>;
}

// ─── GridApi ───

export interface GridApi<TData = any> {
  // ── Data ──
  setRowData(data: TData[]): void;
  getRowNode(id: string): RowNode<TData> | undefined;
  forEachNode(callback: (node: RowNode<TData>, index: number) => void): void;
  getDisplayedRowCount(): number;
  getDisplayedRowAtIndex(index: number): RowNode<TData> | undefined;

  // ── Columns ──
  setColumnDefs(defs: ColumnDef<TData>[]): void;
  getColumn(colId: string): ColumnState | undefined;
  getAllColumns(): ColumnState[];
  getVisibleColumns(): ColumnState[];
  setColumnVisible(colId: string, visible: boolean): void;
  setColumnPinned(colId: string, pinned: 'left' | 'right' | null): void;
  setColumnWidth(colId: string, width: number): void;
  moveColumn(colId: string, toIndex: number): void;
  autoSizeColumn(colId: string): void;
  autoSizeAllColumns(): void;
  getColumnState(): ColumnState[];
  applyColumnState(state: Partial<ColumnState>[]): void;

  // ── Sorting ──
  setSortModel(model: SortModelItem[]): void;
  getSortModel(): SortModelItem[];

  // ── Filtering ──
  setFilterModel(model: Record<string, FilterModel>): void;
  getFilterModel(): Record<string, FilterModel>;
  setQuickFilter(text: string): void;
  isAnyFilterPresent(): boolean;

  // ── Selection ──
  selectAll(): void;
  deselectAll(): void;
  getSelectedRows(): TData[];
  getSelectedNodes(): RowNode<TData>[];

  // ── Editing ──
  startEditingCell(params: CellPosition): void;
  stopEditing(cancel?: boolean): void;

  // ── Scrolling ──
  ensureIndexVisible(index: number, position?: 'top' | 'middle' | 'bottom'): void;
  ensureColumnVisible(colId: string): void;

  // ── Row Groups ──
  expandAll(): void;
  collapseAll(): void;
  setRowNodeExpanded(node: RowNode<TData>, expanded: boolean): void;

  // ── Rendering ──
  refreshCells(params?: { rowIds?: string[]; colIds?: string[]; force?: boolean }): void;
  redrawRows(): void;

  // ── Pagination ──
  paginationGoToPage(page: number): void;
  paginationGetCurrentPage(): number;
  paginationGetTotalPages(): number;

  // ── Config ──
  setGridOption<K extends keyof GridConfig<TData>>(key: K, value: GridConfig<TData>[K]): void;
  getGridOption<K extends keyof GridConfig<TData>>(key: K): GridConfig<TData>[K];

  // ── Lifecycle ──
  destroy(): void;

  // ── Events ──
  addEventListener<K extends keyof GridEventMap<TData>>(
    event: K,
    listener: (payload: GridEventMap<TData>[K]) => void,
  ): void;
  removeEventListener<K extends keyof GridEventMap<TData>>(
    event: K,
    listener: (payload: GridEventMap<TData>[K]) => void,
  ): void;

  // ── Plugin API extensions ──
  getPluginApi<T>(pluginId: string): T | undefined;

  // ── State ──
  getState(): GridState<TData>;

  // Dynamically extended by plugins at runtime
  [key: string]: any;
}

// ─── Refresh params ──

export interface RefreshCellsParams {
  rowIds?: string[];
  colIds?: string[];
  force?: boolean;
}
