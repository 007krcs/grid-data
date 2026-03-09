// ─── Vue Adapter Types ───
// Central type definitions for all Vue-specific interfaces.

import type {
  ColumnDef,
  GridApi,
  GridConfig,
  GridEngine,
  GridEventMap,
  GridPlugin,
  SortModelItem,
  FilterModel,
  RowNode,
} from '@gridstorm/core';
import type { PropType } from 'vue';

// ── Grid Context ──

/**
 * Context value provided to child composables via Vue provide/inject.
 */
export interface GridContextValue<TData = any> {
  /** The grid engine instance. */
  engine: GridEngine<TData>;
  /** The public grid API. */
  api: GridApi<TData>;
}

// ── Component Props ──

/**
 * Props interface for the GridStorm Vue component.
 *
 * @typeParam TData - The type of each row data object.
 */
export interface GridStormProps<TData = any> {
  /** Column definitions. */
  columns: ColumnDef<TData>[];
  /** Row data array. */
  rowData: TData[];
  /** Plugins to install. */
  plugins?: GridPlugin<TData>[];
  /** Row ID getter function. */
  getRowId?: GridConfig<TData>['getRowId'];
  /** Row height in pixels. */
  rowHeight?: number;
  /** Header height in pixels. */
  headerHeight?: number;
  /** Theme identifier (e.g., 'light', 'dark'). */
  theme?: string;
  /** Density mode (e.g., 'compact', 'normal', 'comfortable'). */
  density?: string;
  /** Default column definition applied to all columns. */
  defaultColDef?: Partial<ColumnDef<TData>>;
  /** Number of rows per page when pagination is enabled. */
  paginationPageSize?: number;
  /** Enable client-side pagination. */
  pagination?: boolean;
  /** Row selection mode. */
  rowSelection?: 'single' | 'multiple' | false;
  /** Edit type mode. */
  editType?: 'cell' | 'fullRow';
  /** ARIA label for the grid root element. */
  ariaLabel?: string;
  /** Container height. Default: '100%'. */
  height?: number | string;
  /** Container width. Default: '100%'. */
  width?: number | string;
  /** Additional CSS class for the container. */
  containerClass?: string;
}

/**
 * Vue prop definitions for the GridStorm component.
 * Used with defineComponent's props option.
 */
export const gridStormPropDefs = {
  columns: {
    type: Array as PropType<ColumnDef[]>,
    required: true as const,
  },
  rowData: {
    type: Array as PropType<any[]>,
    required: true as const,
  },
  plugins: {
    type: Array as PropType<GridPlugin[]>,
    default: () => [],
  },
  getRowId: {
    type: Function as PropType<GridConfig['getRowId']>,
    default: undefined,
  },
  rowHeight: {
    type: Number,
    default: 40,
  },
  headerHeight: {
    type: Number,
    default: undefined,
  },
  theme: {
    type: String,
    default: 'light',
  },
  density: {
    type: String,
    default: 'normal',
  },
  defaultColDef: {
    type: Object as PropType<Partial<ColumnDef>>,
    default: undefined,
  },
  paginationPageSize: {
    type: Number,
    default: undefined,
  },
  pagination: {
    type: Boolean,
    default: undefined,
  },
  rowSelection: {
    type: [String, Boolean] as PropType<'single' | 'multiple' | false>,
    default: undefined,
  },
  editType: {
    type: String as PropType<'cell' | 'fullRow'>,
    default: undefined,
  },
  ariaLabel: {
    type: String,
    default: undefined,
  },
  height: {
    type: [Number, String] as PropType<number | string>,
    default: '100%',
  },
  width: {
    type: [Number, String] as PropType<number | string>,
    default: '100%',
  },
  containerClass: {
    type: String,
    default: undefined,
  },
} as const;

// ── Event Types ──

/**
 * All events emitted by the GridStorm Vue component.
 */
export interface GridStormEmits<TData = any> {
  /** Fired when the grid engine is ready and the API is available. */
  gridReady: [api: GridApi<TData>];
  /** Fired when row data changes. */
  rowDataChanged: [event: GridEventMap<TData>['rowData:changed']];
  /** Fired when the selection changes. */
  selectionChanged: [event: GridEventMap<TData>['selection:changed']];
  /** Fired when the sort model changes. */
  sortChanged: [event: GridEventMap<TData>['column:sort:changed']];
  /** Fired when the filter model changes. */
  filterChanged: [event: GridEventMap<TData>['filter:changed']];
  /** Fired when a cell value is changed via editing. */
  cellValueChanged: [event: GridEventMap<TData>['cell:valueChanged']];
  /** Fired when a cell is clicked. */
  cellClicked: [event: GridEventMap<TData>['cell:clicked']];
  /** Fired when a cell is double-clicked. */
  cellDoubleClicked: [event: GridEventMap<TData>['cell:doubleClicked']];
  /** Fired when a row is clicked. */
  rowClicked: [event: GridEventMap<TData>['row:clicked']];
  /** Fired when pagination state changes. */
  paginationChanged: [event: GridEventMap<TData>['pagination:changed']];
  /** Fired when a column is resized. */
  columnResized: [event: GridEventMap<TData>['column:resized']];
}

// ── Exposed API ──

/**
 * Public methods exposed by the GridStorm component via template refs.
 *
 * @typeParam TData - The type of each row data object.
 */
export interface GridStormExposed<TData = any> {
  /** Get the GridApi instance. */
  getApi(): GridApi<TData> | undefined;
  /** Get the GridEngine instance. */
  getEngine(): GridEngine<TData> | undefined;
}

// ── Composable Return Types ──

/**
 * Return type for the useGridSort composable.
 */
export interface GridSortResult {
  /** Current sort model (reactive). */
  sortModel: SortModelItem[];
  /** Whether any sort is active (reactive). */
  isSorted: boolean;
  /** Set the sort model directly. */
  setSortModel: (model: SortModelItem[]) => void;
  /** Toggle sort on a column. */
  toggleSort: (colId: string, multiSort?: boolean) => void;
  /** Clear all sorting. */
  clearSort: () => void;
}

/**
 * Return type for the useGridFilter composable.
 */
export interface GridFilterResult {
  /** Current filter model keyed by column ID (reactive). */
  filterModel: Record<string, FilterModel>;
  /** Current quick filter text (reactive). */
  quickFilterText: string;
  /** Whether any filter is active (reactive). */
  isFiltered: boolean;
  /** Set the filter model. */
  setFilterModel: (model: Record<string, FilterModel>) => void;
  /** Set quick filter text. */
  setQuickFilter: (text: string) => void;
  /** Clear all filters. */
  clearFilters: () => void;
}

/**
 * Return type for the useGridSelection composable.
 */
export interface GridSelectionResult<TData = any> {
  /** Set of selected row IDs (reactive). */
  selectedRowIds: Set<string>;
  /** Number of selected rows (reactive). */
  selectedCount: number;
  /** Get selected row data objects. */
  getSelectedRows: () => TData[];
  /** Get selected RowNode objects. */
  getSelectedNodes: () => RowNode<TData>[];
  /** Check if a specific row is selected. */
  isRowSelected: (rowId: string) => boolean;
  /** Select all visible rows. */
  selectAll: () => void;
  /** Deselect all rows. */
  deselectAll: () => void;
}

/**
 * Return type for the useGridPagination composable.
 */
export interface GridPaginationResult {
  /** Current page (0-indexed, reactive). */
  currentPage: number;
  /** Total number of pages (reactive). */
  totalPages: number;
  /** Rows per page (reactive). */
  pageSize: number;
  /** Total row count after filtering (reactive). */
  totalRows: number;
  /** Whether there is a next page (reactive). */
  hasNextPage: boolean;
  /** Whether there is a previous page (reactive). */
  hasPreviousPage: boolean;
  /** Go to a specific page. */
  goToPage: (page: number) => void;
  /** Go to next page. */
  nextPage: () => void;
  /** Go to previous page. */
  previousPage: () => void;
  /** Go to first page. */
  firstPage: () => void;
  /** Go to last page. */
  lastPage: () => void;
}
