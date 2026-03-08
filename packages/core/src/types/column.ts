// ─── Column Definition Types ───

export interface ColumnDef<TData = any, TValue = any> {
  /** Unique column identifier. Auto-generated from `field` if not provided. */
  colId?: string;

  /** Property path on the row data object. */
  field?: string & keyof TData;

  /** Display name in the header. Defaults to `field`. */
  headerName?: string;

  // ── Sizing ──
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  flex?: number;
  resizable?: boolean;

  // ── Pinning ──
  pinned?: PinnedPosition;
  lockPinned?: boolean;
  lockPosition?: boolean;

  // ── Visibility ──
  hide?: boolean;
  suppressColumnsToolPanel?: boolean;

  // ── Sorting ──
  sortable?: boolean;
  sort?: SortDirection;
  sortIndex?: number;
  comparator?: ColumnComparator<TData, TValue>;

  // ── Filtering ──
  filterable?: boolean;
  filter?: string | boolean;
  filterParams?: Record<string, unknown>;
  floatingFilter?: boolean;

  // ── Editing ──
  editable?: boolean | ((params: CellCallbackParams<TData, TValue>) => boolean);
  cellEditor?: string;
  cellEditorParams?: Record<string, unknown>;

  // ── Rendering ──
  cellRenderer?: CellRendererFn<TData, TValue>;
  cellClass?: string | string[] | ((params: CellCallbackParams<TData, TValue>) => string | string[]);
  cellStyle?:
    | Record<string, string>
    | ((params: CellCallbackParams<TData, TValue>) => Record<string, string>);
  headerRenderer?: HeaderRendererFn<TData>;
  headerClass?: string | string[];

  // ── Value Pipeline ──
  valueGetter?: (params: ValueGetterParams<TData>) => TValue;
  valueSetter?: (params: ValueSetterParams<TData, TValue>) => boolean;
  valueFormatter?: (params: ValueFormatterParams<TData, TValue>) => string;
  valueParser?: (params: ValueParserParams<TData>) => TValue;

  // ── Aggregation ──
  aggFunc?: string | AggFunc<TValue>;
  allowedAggFuncs?: string[];

  // ── Row Grouping ──
  rowGroup?: boolean;
  rowGroupIndex?: number;
  showRowGroup?: boolean;

  // ── Pivot ──
  pivot?: boolean;
  pivotIndex?: number;

  // ── Column Groups ──
  children?: ColumnDef<TData>[];
  groupId?: string;
  marryChildren?: boolean;
  openByDefault?: boolean;

  // ── Tooltips ──
  tooltipField?: string;
  tooltipValueGetter?: (params: CellCallbackParams<TData, TValue>) => string;

  // ── Spanning ──
  colSpan?: (params: CellCallbackParams<TData, TValue>) => number;
  rowSpan?: (params: CellCallbackParams<TData, TValue>) => number;
}

// ── Supporting Types ──

export type PinnedPosition = 'left' | 'right' | null;
export type SortDirection = 'asc' | 'desc' | null;

export interface SortModelItem {
  colId: string;
  sort: 'asc' | 'desc';
}

export type ColumnComparator<TData = any, TValue = any> = (
  valueA: TValue,
  valueB: TValue,
  nodeA: import('./row').RowNode<TData>,
  nodeB: import('./row').RowNode<TData>,
  isDescending: boolean,
) => number;

export interface CellCallbackParams<TData = any, TValue = any> {
  data: TData | undefined;
  value: TValue;
  node: import('./row').RowNode<TData>;
  colDef: ColumnDef<TData, TValue>;
  colId: string;
  rowIndex: number;
}

export interface ValueGetterParams<TData = any> {
  data: TData | undefined;
  node: import('./row').RowNode<TData>;
  colDef: ColumnDef<TData>;
  colId: string;
}

export interface ValueSetterParams<TData = any, TValue = any> {
  data: TData;
  newValue: TValue;
  oldValue: TValue;
  node: import('./row').RowNode<TData>;
  colDef: ColumnDef<TData, TValue>;
}

export interface ValueFormatterParams<TData = any, TValue = any> {
  value: TValue;
  data: TData | undefined;
  node: import('./row').RowNode<TData>;
  colDef: ColumnDef<TData, TValue>;
}

export interface ValueParserParams<TData = any> {
  newValue: string;
  oldValue: any;
  data: TData;
  node: import('./row').RowNode<TData>;
  colDef: ColumnDef<TData>;
}

export type CellRendererFn<TData = any, TValue = any> = (
  params: CellCallbackParams<TData, TValue>,
) => string | HTMLElement;

export type HeaderRendererFn<TData = any> = (params: {
  colDef: ColumnDef<TData>;
  colId: string;
  displayName: string;
  sortDirection: SortDirection;
  sortIndex: number | null;
}) => string | HTMLElement;

export type AggFunc<TValue = any> = (values: TValue[]) => any;

/** Resolved internal column state (derived from ColumnDef + user interactions). */
export interface ColumnState {
  colId: string;
  field: string | undefined;
  headerName: string;
  width: number;
  minWidth: number;
  maxWidth: number;
  flex: number | null;
  hide: boolean;
  pinned: PinnedPosition;
  sort: SortDirection;
  sortIndex: number | null;
  sortable: boolean;
  filterable: boolean;
  resizable: boolean;
  editable: boolean | ((params: CellCallbackParams) => boolean);
  rowGroup: boolean;
  rowGroupIndex: number | null;
  pivot: boolean;
  pivotIndex: number | null;
  aggFunc: string | AggFunc | null;
  // Original definition reference
  originalDef: ColumnDef;
}
