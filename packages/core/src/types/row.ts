// ─── Row Node Types ───

export interface RowNode<TData = any> {
  /** Unique row identifier. */
  id: string;

  /** Reference to the row data object. `undefined` for group/filler rows. */
  data: TData | undefined;

  /** Index in the full (unfiltered, unsorted) data array. -1 for group rows. */
  sourceIndex: number;

  /** Index in the displayed (post-filter/sort/group) list. */
  displayIndex: number;

  /** Nesting level for tree/group data. 0 = top level. */
  level: number;

  // ── Display geometry ──
  /** Row height in pixels. */
  rowHeight: number;
  /** Vertical offset from top of the virtual container. */
  rowTop: number;

  // ── Tree / Group ──
  parent: RowNode<TData> | null;
  children: RowNode<TData>[] | null;
  expanded: boolean;
  group: boolean;
  groupField: string | null;
  groupValue: any;
  leafChildrenCount: number;

  // ── Aggregation ──
  aggData: Record<string, any> | null;

  // ── Selection ──
  selected: boolean;
  selectable: boolean;

  // ── Detail (master-detail) ──
  detail: boolean;

  // ── Pinning ──
  rowPinned: 'top' | 'bottom' | null;

  // ── Dirty tracking ──
  /** Incremented when properties change. Used for targeted re-renders. */
  version: number;
}

export type RowModelType = 'client' | 'server' | 'infinite' | 'viewport';

/** Factory parameters for `getRowId`. */
export interface GetRowIdParams<TData = any> {
  data: TData;
  index: number;
  parentKeys?: string[];
}

/** Request payload for server-side / infinite data sources. */
export interface DataSourceRequest {
  startRow: number;
  endRow: number;
  sortModel: import('./column').SortModelItem[];
  filterModel: Record<string, import('./filter').FilterModel>;
  groupKeys: string[];
  pivotCols: string[];
  pivotMode: boolean;
  valueCols: string[];
  rowGroupCols: string[];
}

export interface DataSourceResult<TData = any> {
  rowData: TData[];
  rowCount: number;
  lastRow?: number;
}

export interface DataSource<TData = any> {
  getRows(params: DataSourceRequest): Promise<DataSourceResult<TData>>;
  destroy?(): void;
}
