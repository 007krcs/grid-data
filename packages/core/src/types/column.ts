// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Column Definition Types ───

/**
 * Defines the configuration for a single grid column.
 *
 * Column definitions control everything about a column: its data binding,
 * header display, sizing, sorting, filtering, editing, rendering, and grouping.
 * Definitions are passed via {@link GridConfig.columns} and can be updated at
 * runtime via {@link GridApi.setColumnDefs}.
 *
 * @typeParam TData - The type of each row data object.
 * @typeParam TValue - The type of the cell value for this column.
 *
 * @example
 * ```ts
 * const col: ColumnDef<Employee> = {
 *   field: 'salary',
 *   headerName: 'Annual Salary',
 *   sortable: true,
 *   valueFormatter: ({ value }) => `$${value.toLocaleString()}`,
 * };
 * ```
 *
 * @see {@link GridConfig.columns}
 * @see {@link GridConfig.defaultColDef} for shared defaults.
 */
export interface ColumnDef<TData = any, TValue = any> {
  /**
   * Unique column identifier. Auto-generated from {@link field} if not provided.
   *
   * Must be unique across all columns. Used by the API to reference
   * specific columns (e.g., in sort/filter models).
   *
   * @default field value or auto-generated
   */
  colId?: string;

  /**
   * Property path on the row data object to bind this column to.
   *
   * The grid reads cell values from `data[field]`. For computed columns,
   * use {@link valueGetter} instead.
   *
   * @example
   * ```ts
   * { field: 'name' }     // reads data.name
   * { field: 'salary' }   // reads data.salary
   * ```
   */
  field?: string & keyof TData;

  /**
   * Display name shown in the column header.
   *
   * When not provided, the grid uses the {@link field} value with
   * title-case formatting.
   *
   * @default field (title-cased)
   */
  headerName?: string;

  // ── Sizing ──

  /**
   * Initial width of the column in pixels.
   *
   * @default 200
   * @see {@link minWidth}, {@link maxWidth}, {@link flex}
   */
  width?: number;

  /**
   * Minimum width in pixels. The column cannot be resized below this value.
   *
   * @default 50
   */
  minWidth?: number;

  /**
   * Maximum width in pixels. The column cannot be resized above this value.
   *
   * @default undefined (no maximum)
   */
  maxWidth?: number;

  /**
   * Flex factor for distributing remaining space among flex columns.
   *
   * Columns with `flex` set will share available space proportionally.
   * A column with `flex: 2` gets twice the space of `flex: 1`.
   *
   * @remarks
   * When `flex` is set, {@link width} is used as the initial width
   * before flex distribution is calculated.
   *
   * @default undefined (no flex)
   *
   * @example
   * ```ts
   * { field: 'name', flex: 2 }   // gets 2/3 of remaining space
   * { field: 'age', flex: 1 }    // gets 1/3 of remaining space
   * ```
   */
  flex?: number;

  /**
   * When `true`, the column can be resized by dragging its header border.
   *
   * @default true
   */
  resizable?: boolean;

  // ── Pinning ──

  /**
   * Pins the column to the left or right side of the grid.
   *
   * Pinned columns remain visible while horizontal scrolling occurs.
   *
   * @default null (not pinned)
   * @see {@link PinnedPosition}
   */
  pinned?: PinnedPosition;

  /**
   * When `true`, prevents the user from changing the column's pinned state
   * via drag-and-drop or the column menu.
   *
   * @default false
   */
  lockPinned?: boolean;

  /**
   * When `true`, prevents the column from being moved/reordered by the user.
   *
   * @default false
   */
  lockPosition?: boolean;

  // ── Visibility ──

  /**
   * When `true`, the column is initially hidden.
   * It can be shown later via the API or columns tool panel.
   *
   * @default false
   */
  hide?: boolean;

  /**
   * When `true`, hides this column from the columns tool panel,
   * preventing users from toggling its visibility.
   *
   * @default false
   */
  suppressColumnsToolPanel?: boolean;

  // ── Sorting ──

  /**
   * When `true`, enables sorting on this column via header click.
   *
   * @default false (unless set via defaultColDef)
   */
  sortable?: boolean;

  /**
   * Initial sort direction for this column.
   *
   * @default null (unsorted)
   * @see {@link SortDirection}
   */
  sort?: SortDirection;

  /**
   * Sort priority when multiple columns are sorted.
   * Lower index means higher priority (sorted first).
   *
   * @default undefined
   */
  sortIndex?: number;

  /**
   * Custom comparator function for sorting this column.
   *
   * Return a negative number if `valueA` should come before `valueB`,
   * a positive number if after, or zero if equal.
   *
   * @example
   * ```ts
   * comparator: (a, b) => a.localeCompare(b)
   * ```
   *
   * @see {@link ColumnComparator}
   */
  comparator?: ColumnComparator<TData, TValue>;

  // ── Filtering ──

  /**
   * When `true`, enables filtering on this column.
   *
   * @default false
   */
  filterable?: boolean;

  /**
   * Filter type or component to use. Pass `true` for the default filter
   * based on column data type, or a string identifier for a custom filter.
   *
   * @default false (no filter)
   */
  filter?: string | boolean;

  /**
   * Additional parameters passed to the filter component.
   *
   * @default undefined
   */
  filterParams?: Record<string, unknown>;

  /**
   * When `true`, shows a floating filter input below the column header
   * for quick inline filtering.
   *
   * @default false
   */
  floatingFilter?: boolean;

  // ── Editing ──

  /**
   * Enables cell editing for this column.
   *
   * Pass `true` to always allow editing, or a callback function that
   * returns `true`/`false` per cell for conditional editing.
   *
   * @default false
   *
   * @example
   * ```ts
   * // Always editable
   * editable: true
   *
   * // Conditionally editable
   * editable: (params) => params.data?.role === 'admin'
   * ```
   */
  editable?: boolean | ((params: CellCallbackParams<TData, TValue>) => boolean);

  /**
   * Registered cell editor name to use when editing cells in this column.
   *
   * Built-in editors include `'text'`, `'number'`, `'select'`, `'date'`.
   * Custom editors can be registered via {@link PluginContext.registerCellEditor}.
   *
   * @default 'text'
   * @see {@link CellEditorDef}
   */
  cellEditor?: string;

  /**
   * Additional parameters passed to the cell editor component.
   *
   * @default undefined
   */
  cellEditorParams?: Record<string, unknown>;

  // ── Rendering ──

  /**
   * Custom cell renderer function that returns an HTML string or element.
   *
   * Use this for custom cell content beyond simple text display.
   *
   * @example
   * ```ts
   * cellRenderer: (params) => {
   *   const badge = document.createElement('span');
   *   badge.className = `status-${params.value}`;
   *   badge.textContent = params.value;
   *   return badge;
   * }
   * ```
   *
   * @see {@link CellRendererFn}
   */
  cellRenderer?: CellRendererFn<TData, TValue>;

  /**
   * CSS class(es) applied to every cell in this column.
   *
   * Can be a static string, array of strings, or a callback function
   * that returns class names per cell.
   *
   * @example
   * ```ts
   * cellClass: (params) => params.value > 100000 ? 'high-value' : 'normal-value'
   * ```
   */
  cellClass?: string | string[] | ((params: CellCallbackParams<TData, TValue>) => string | string[]);

  /**
   * Inline CSS styles applied to every cell in this column.
   *
   * Can be a static style object or a callback that returns styles per cell.
   *
   * @example
   * ```ts
   * cellStyle: (params) => ({
   *   color: params.value < 0 ? 'red' : 'green'
   * })
   * ```
   */
  cellStyle?:
    | Record<string, string>
    | ((params: CellCallbackParams<TData, TValue>) => Record<string, string>);

  /**
   * Custom header renderer function that returns an HTML string or element.
   *
   * @see {@link HeaderRendererFn}
   */
  headerRenderer?: HeaderRendererFn<TData>;

  /**
   * CSS class(es) applied to this column's header cell.
   *
   * @default undefined
   */
  headerClass?: string | string[];

  // ── Value Pipeline ──

  /**
   * Custom function to extract the cell value from the row data.
   *
   * Use instead of {@link field} for computed or derived values.
   * The returned value flows through {@link valueFormatter} for display.
   *
   * @example
   * ```ts
   * valueGetter: (params) => {
   *   return `${params.data?.firstName} ${params.data?.lastName}`;
   * }
   * ```
   *
   * @see {@link ValueGetterParams}
   */
  valueGetter?: (params: ValueGetterParams<TData>) => TValue;

  /**
   * Custom function to write a new cell value back to the row data.
   *
   * Called after cell editing completes. Return `true` if the value
   * was successfully set, `false` to reject the edit.
   *
   * @example
   * ```ts
   * valueSetter: (params) => {
   *   params.data.fullName = params.newValue;
   *   return true;
   * }
   * ```
   *
   * @see {@link ValueSetterParams}
   */
  valueSetter?: (params: ValueSetterParams<TData, TValue>) => boolean;

  /**
   * Formats a cell value for display. The formatted string is what
   * the user sees; the underlying value remains unchanged.
   *
   * @example
   * ```ts
   * valueFormatter: (params) => `$${params.value.toLocaleString()}`
   * ```
   *
   * @see {@link ValueFormatterParams}
   */
  valueFormatter?: (params: ValueFormatterParams<TData, TValue>) => string;

  /**
   * Parses user input from the cell editor back into the data type.
   *
   * Called during editing to convert the string input into the correct
   * value type before passing to {@link valueSetter}.
   *
   * @example
   * ```ts
   * valueParser: (params) => parseFloat(params.newValue)
   * ```
   *
   * @see {@link ValueParserParams}
   */
  valueParser?: (params: ValueParserParams<TData>) => TValue;

  // ── Aggregation ──

  /**
   * Aggregation function applied to this column when row grouping is active.
   *
   * Pass a built-in function name (`'sum'`, `'min'`, `'max'`, `'avg'`, `'count'`)
   * or a custom aggregation function.
   *
   * @example
   * ```ts
   * aggFunc: 'sum'
   * // or
   * aggFunc: (values) => values.reduce((a, b) => a + b, 0)
   * ```
   *
   * @see {@link AggFunc}
   */
  aggFunc?: string | AggFunc<TValue>;

  /**
   * Restricts which aggregation functions are available for this column
   * in the column menu or tool panel.
   *
   * @default undefined (all built-in functions available)
   */
  allowedAggFuncs?: string[];

  // ── Row Grouping ──

  /**
   * When `true`, this column is used as a row grouping column.
   * Rows are grouped by this column's values.
   *
   * @default false
   */
  rowGroup?: boolean;

  /**
   * Order of this column in the row grouping hierarchy.
   * Lower index means higher (outer) grouping level.
   *
   * @default undefined
   */
  rowGroupIndex?: number;

  /**
   * When `true`, this column displays the group hierarchy
   * (expand/collapse icons and group values).
   *
   * @default false
   */
  showRowGroup?: boolean;

  // ── Pivot ──

  /**
   * When `true`, this column is used as a pivot column.
   * Unique values in this column become new column headers.
   *
   * @default false
   */
  pivot?: boolean;

  /**
   * Order of this column in the pivot hierarchy.
   *
   * @default undefined
   */
  pivotIndex?: number;

  // ── Column Groups ──

  /**
   * Child column definitions for creating a column group (multi-level headers).
   *
   * When `children` is provided, this definition becomes a column group
   * header spanning all its child columns.
   *
   * @example
   * ```ts
   * {
   *   headerName: 'Contact',
   *   children: [
   *     { field: 'email' },
   *     { field: 'phone' },
   *   ],
   * }
   * ```
   */
  children?: ColumnDef<TData>[];

  /**
   * Unique identifier for the column group. Required when using column groups.
   *
   * @default undefined
   */
  groupId?: string;

  /**
   * When `true`, prevents columns in this group from being separated
   * (e.g., by dragging one column out of the group).
   *
   * @default false
   */
  marryChildren?: boolean;

  /**
   * When `true`, the column group is expanded by default,
   * showing all child columns.
   *
   * @default false
   */
  openByDefault?: boolean;

  // ── Tooltips ──

  /**
   * Field name on the row data to use as tooltip text.
   *
   * @default undefined
   */
  tooltipField?: string;

  /**
   * Custom function to compute tooltip text for cells in this column.
   *
   * @example
   * ```ts
   * tooltipValueGetter: (params) => `Row ID: ${params.node.id}`
   * ```
   */
  tooltipValueGetter?: (params: CellCallbackParams<TData, TValue>) => string;

  // ── Spanning ──

  /**
   * Returns the number of columns this cell should span.
   * Return `1` for normal single-column cells.
   *
   * @default undefined (no spanning)
   *
   * @example
   * ```ts
   * colSpan: (params) => params.data?.isHeader ? 3 : 1
   * ```
   */
  colSpan?: (params: CellCallbackParams<TData, TValue>) => number;

  /**
   * Returns the number of rows this cell should span.
   * Return `1` for normal single-row cells.
   *
   * @default undefined (no spanning)
   */
  rowSpan?: (params: CellCallbackParams<TData, TValue>) => number;

  /** When true, cellRenderer string results are set via innerHTML. Default: false (uses textContent for XSS safety). */
  dangerouslySetInnerHTML?: boolean;
}

// ── Supporting Types ──

/**
 * Describes the pinned position of a column.
 *
 * - `'left'` - Column is pinned to the left side.
 * - `'right'` - Column is pinned to the right side.
 * - `null` - Column is not pinned.
 */
export type PinnedPosition = 'left' | 'right' | null;

/**
 * Describes the sort direction of a column.
 *
 * - `'asc'` - Ascending order.
 * - `'desc'` - Descending order.
 * - `null` - No sort applied.
 */
export type SortDirection = 'asc' | 'desc' | null;

/**
 * Describes a single column's sort configuration within the sort model.
 *
 * @see {@link GridApi.setSortModel}
 * @see {@link GridApi.getSortModel}
 *
 * @example
 * ```ts
 * const sortModel: SortModelItem[] = [
 *   { colId: 'department', sort: 'asc' },
 *   { colId: 'salary', sort: 'desc' },
 * ];
 * ```
 */
export interface SortModelItem {
  /** The unique identifier of the column to sort. */
  colId: string;

  /** The sort direction: ascending or descending. */
  sort: 'asc' | 'desc';
}

/**
 * Custom comparator function for column sorting.
 *
 * Return a negative number if `valueA` should come before `valueB`,
 * a positive number if `valueA` should come after `valueB`, or zero
 * if they are equal.
 *
 * @typeParam TData - The row data type.
 * @typeParam TValue - The cell value type.
 *
 * @param valueA - The cell value from the first row.
 * @param valueB - The cell value from the second row.
 * @param nodeA - The row node for the first row.
 * @param nodeB - The row node for the second row.
 * @param isDescending - `true` when the column is sorted in descending order.
 * @returns A comparison result: negative, zero, or positive.
 *
 * @example
 * ```ts
 * const dateComparator: ColumnComparator<any, string> = (a, b) =>
 *   new Date(a).getTime() - new Date(b).getTime();
 * ```
 */
export type ColumnComparator<TData = any, TValue = any> = (
  valueA: TValue,
  valueB: TValue,
  nodeA: import('./row').RowNode<TData>,
  nodeB: import('./row').RowNode<TData>,
  isDescending: boolean,
) => number;

/**
 * Parameters passed to cell-level callback functions such as
 * {@link ColumnDef.cellClass}, {@link ColumnDef.cellStyle},
 * {@link ColumnDef.editable}, and {@link ColumnDef.tooltipValueGetter}.
 *
 * @typeParam TData - The row data type.
 * @typeParam TValue - The cell value type.
 */
export interface CellCallbackParams<TData = any, TValue = any> {
  /** The row data object. `undefined` for group or filler rows. */
  data: TData | undefined;

  /** The resolved cell value (from field or valueGetter). */
  value: TValue;

  /** The row node containing metadata and tree/group information. */
  node: import('./row').RowNode<TData>;

  /** The column definition for this cell's column. */
  colDef: ColumnDef<TData, TValue>;

  /** The unique column identifier. */
  colId: string;

  /** The display index of this row in the rendered grid. */
  rowIndex: number;
}

/**
 * Parameters passed to the {@link ColumnDef.valueGetter} callback.
 *
 * @typeParam TData - The row data type.
 */
export interface ValueGetterParams<TData = any> {
  /** The row data object. `undefined` for group or filler rows. */
  data: TData | undefined;

  /** The row node for this cell's row. */
  node: import('./row').RowNode<TData>;

  /** The column definition for this cell's column. */
  colDef: ColumnDef<TData>;

  /** The unique column identifier. */
  colId: string;
}

/**
 * Parameters passed to the {@link ColumnDef.valueSetter} callback.
 *
 * @typeParam TData - The row data type.
 * @typeParam TValue - The cell value type.
 */
export interface ValueSetterParams<TData = any, TValue = any> {
  /** The row data object being edited. */
  data: TData;

  /** The new value from the cell editor. */
  newValue: TValue;

  /** The previous cell value before the edit. */
  oldValue: TValue;

  /** The row node for this cell's row. */
  node: import('./row').RowNode<TData>;

  /** The column definition for this cell's column. */
  colDef: ColumnDef<TData, TValue>;
}

/**
 * Parameters passed to the {@link ColumnDef.valueFormatter} callback.
 *
 * @typeParam TData - The row data type.
 * @typeParam TValue - The cell value type.
 */
export interface ValueFormatterParams<TData = any, TValue = any> {
  /** The raw cell value to format for display. */
  value: TValue;

  /** The row data object. `undefined` for group or filler rows. */
  data: TData | undefined;

  /** The row node for this cell's row. */
  node: import('./row').RowNode<TData>;

  /** The column definition for this cell's column. */
  colDef: ColumnDef<TData, TValue>;
}

/**
 * Parameters passed to the {@link ColumnDef.valueParser} callback.
 *
 * @typeParam TData - The row data type.
 */
export interface ValueParserParams<TData = any> {
  /** The raw string value entered by the user in the cell editor. */
  newValue: string;

  /** The previous cell value before the edit. */
  oldValue: any;

  /** The row data object being edited. */
  data: TData;

  /** The row node for this cell's row. */
  node: import('./row').RowNode<TData>;

  /** The column definition for this cell's column. */
  colDef: ColumnDef<TData>;
}

/**
 * Function type for custom cell renderers.
 *
 * Returns either an HTML string or an `HTMLElement` to render in the cell.
 *
 * @typeParam TData - The row data type.
 * @typeParam TValue - The cell value type.
 *
 * @example
 * ```ts
 * const statusRenderer: CellRendererFn<Employee, string> = (params) => {
 *   return `<span class="badge badge-${params.value}">${params.value}</span>`;
 * };
 * ```
 *
 * @see {@link ColumnDef.cellRenderer}
 */
export type CellRendererFn<TData = any, TValue = any> = (
  params: CellCallbackParams<TData, TValue>,
) => string | HTMLElement;

/**
 * Function type for custom header renderers.
 *
 * Returns either an HTML string or an `HTMLElement` to render in the header cell.
 *
 * @typeParam TData - The row data type.
 *
 * @see {@link ColumnDef.headerRenderer}
 */
export type HeaderRendererFn<TData = any> = (params: {
  /** The column definition for this header. */
  colDef: ColumnDef<TData>;
  /** The unique column identifier. */
  colId: string;
  /** The display name for the header. */
  displayName: string;
  /** Current sort direction of this column, or `null` if unsorted. */
  sortDirection: SortDirection;
  /** Sort priority index when multi-sorting, or `null` if not sorted. */
  sortIndex: number | null;
}) => string | HTMLElement;

/**
 * Custom aggregation function that reduces an array of cell values
 * into a single aggregated value.
 *
 * @typeParam TValue - The cell value type.
 *
 * @example
 * ```ts
 * const avgFunc: AggFunc<number> = (values) =>
 *   values.reduce((a, b) => a + b, 0) / values.length;
 * ```
 *
 * @see {@link ColumnDef.aggFunc}
 */
export type AggFunc<TValue = any> = (values: TValue[]) => any;

/**
 * Resolved internal column state derived from {@link ColumnDef} and user interactions.
 *
 * This is the runtime representation of a column, combining the original definition
 * with any changes made via the API or user interaction (resizing, reordering, etc.).
 * Retrieved via {@link GridApi.getColumnState} and restored via
 * {@link GridApi.applyColumnState}.
 *
 * @see {@link ColumnDef} for the original column configuration.
 * @see {@link GridApi.getColumnState}
 * @see {@link GridApi.applyColumnState}
 */
export interface ColumnState {
  /** Unique column identifier. */
  colId: string;

  /** Data field path from the original column definition, or `undefined` for computed columns. */
  field: string | undefined;

  /** Display name shown in the column header. */
  headerName: string;

  /** Current column width in pixels. */
  width: number;

  /** Minimum allowed width in pixels. */
  minWidth: number;

  /** Maximum allowed width in pixels. */
  maxWidth: number;

  /** Flex factor for proportional sizing, or `null` if not using flex. */
  flex: number | null;

  /** Whether the column is currently hidden. */
  hide: boolean;

  /** Current pinned position, or `null` if not pinned. */
  pinned: PinnedPosition;

  /** Current sort direction, or `null` if unsorted. */
  sort: SortDirection;

  /** Sort priority index when multi-sorting, or `null` if not sorted. */
  sortIndex: number | null;

  /** Whether sorting is enabled for this column. */
  sortable: boolean;

  /** Whether filtering is enabled for this column. */
  filterable: boolean;

  /** Whether the column can be resized by the user. */
  resizable: boolean;

  /** Whether editing is enabled, or a callback for conditional editing. */
  editable: boolean | ((params: CellCallbackParams) => boolean);

  /** Whether this column is used for row grouping. */
  rowGroup: boolean;

  /** Position in the row grouping hierarchy, or `null` if not a group column. */
  rowGroupIndex: number | null;

  /** Whether this column is used for pivoting. */
  pivot: boolean;

  /** Position in the pivot hierarchy, or `null` if not a pivot column. */
  pivotIndex: number | null;

  /** Active aggregation function name or custom function, or `null` if none. */
  aggFunc: string | AggFunc | null;

  /**
   * Reference to the original {@link ColumnDef} that produced this state.
   *
   * @remarks
   * This is read-only and should not be mutated. It provides access to
   * callback functions (renderers, getters, etc.) that are not serializable
   * in column state snapshots.
   */
  originalDef: ColumnDef;
}
