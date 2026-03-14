---
title: Column Definitions
description: Complete reference for the ColumnDef interface covering all properties for configuring GridStorm columns.
---

The `ColumnDef<TData, TValue>` interface defines how a column behaves, what data it displays, and what interactions it supports. Column definitions are passed via `GridConfig.columns` and can be updated at runtime via `GridApi.setColumnDefs`.

```ts title="ColumnDef<TData, TValue>"
interface ColumnDef<TData = any, TValue = any> {
  colId?: string;
  field?: string & keyof TData;
  headerName?: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  flex?: number;
  resizable?: boolean;
  pinned?: PinnedPosition;
  lockPinned?: boolean;
  lockPosition?: boolean;
  hide?: boolean;
  suppressColumnsToolPanel?: boolean;
  sortable?: boolean;
  sort?: SortDirection;
  sortIndex?: number;
  comparator?: ColumnComparator<TData, TValue>;
  filterable?: boolean;
  filter?: string | boolean;
  filterParams?: Record<string, unknown>;
  floatingFilter?: boolean;
  editable?: boolean | ((params: CellCallbackParams<TData, TValue>) => boolean);
  cellEditor?: string;
  cellEditorParams?: Record<string, unknown>;
  cellRenderer?: CellRendererFn<TData, TValue>;
  cellClass?: string | string[] | ((params: CellCallbackParams) => string | string[]);
  cellStyle?: Record<string, string> | ((params: CellCallbackParams) => Record<string, string>);
  headerRenderer?: HeaderRendererFn<TData>;
  headerClass?: string | string[];
  valueGetter?: (params: ValueGetterParams<TData>) => TValue;
  valueSetter?: (params: ValueSetterParams<TData, TValue>) => boolean;
  valueFormatter?: (params: ValueFormatterParams<TData, TValue>) => string;
  valueParser?: (params: ValueParserParams<TData>) => TValue;
  aggFunc?: string | AggFunc<TValue>;
  allowedAggFuncs?: string[];
  rowGroup?: boolean;
  rowGroupIndex?: number;
  showRowGroup?: boolean;
  pivot?: boolean;
  pivotIndex?: number;
  children?: ColumnDef<TData>[];
  groupId?: string;
  marryChildren?: boolean;
  openByDefault?: boolean;
  tooltipField?: string;
  tooltipValueGetter?: (params: CellCallbackParams<TData, TValue>) => string;
  colSpan?: (params: CellCallbackParams<TData, TValue>) => number;
  rowSpan?: (params: CellCallbackParams<TData, TValue>) => number;
  dangerouslySetInnerHTML?: boolean;
}
```

## Basic Properties

| Option | Type | Default | Description |
|---|---|---|---|
| `colId` | `string` | Auto from `field` | Unique column identifier. Auto-generated from `field` if not provided. Must be unique across all columns. |
| `field` | `string & keyof TData` | `undefined` | Property path on the row data object. The grid reads cell values from `data[field]`. For computed columns, use `valueGetter` instead. |
| `headerName` | `string` | `field` (title-cased) | Display name shown in the column header. |

```ts title="Basic column"
const columns: ColumnDef<Employee>[] = [
  { field: 'name', headerName: 'Full Name' },
  { colId: 'fullAddress', headerName: 'Address',
    valueGetter: ({ data }) => `${data?.street}, ${data?.city}` },
];
```

## Display Properties

| Option | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | `200` | Initial column width in pixels. |
| `minWidth` | `number` | `50` | Minimum width in pixels. Column cannot be resized below this. |
| `maxWidth` | `number` | `undefined` (no max) | Maximum width in pixels. Column cannot be resized above this. |
| `flex` | `number` | `undefined` | Flex factor for distributing remaining space. A column with `flex: 2` gets twice the space of `flex: 1`. |
| `resizable` | `boolean` | `true` | When `true`, the column can be resized by dragging its header border. |
| `hide` | `boolean` | `false` | When `true`, the column is initially hidden. Can be shown via API or tool panel. |
| `suppressColumnsToolPanel` | `boolean` | `false` | When `true`, hides this column from the columns tool panel. |

```ts title="Display options"
const columns: ColumnDef[] = [
  { field: 'name', flex: 2 },               // gets 2/3 of remaining space
  { field: 'age', flex: 1, minWidth: 80 },  // gets 1/3, min 80px
  { field: 'secret', hide: true },           // initially hidden
  { field: 'notes', width: 300, maxWidth: 500, resizable: true },
];
```

## Sorting Properties

| Option | Type | Default | Description |
|---|---|---|---|
| `sortable` | `boolean` | `false` | When `true`, enables sorting via header click. |
| `sort` | `'asc' \| 'desc' \| null` | `null` | Initial sort direction for this column. |
| `sortIndex` | `number` | `undefined` | Sort priority when multiple columns are sorted. Lower index means higher priority. |
| `comparator` | `ColumnComparator<TData, TValue>` | Default string compare | Custom comparator for sorting. |

The `ColumnComparator` signature:

```ts title="ColumnComparator"
type ColumnComparator<TData, TValue> = (
  valueA: TValue,
  valueB: TValue,
  nodeA: RowNode<TData>,
  nodeB: RowNode<TData>,
  isDescending: boolean,
) => number;
```

```ts title="Sorting examples"
const columns: ColumnDef[] = [
  { field: 'name', sortable: true, sort: 'asc', sortIndex: 0 },
  { field: 'salary', sortable: true, sort: 'desc', sortIndex: 1 },
  {
    field: 'startDate',
    sortable: true,
    comparator: (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  },
];
```

## Filtering Properties

| Option | Type | Default | Description |
|---|---|---|---|
| `filterable` | `boolean` | `false` | When `true`, enables filtering on this column. |
| `filter` | `string \| boolean` | `false` | Filter type or component. `true` for auto-detect based on data type, or a string for a custom filter. |
| `filterParams` | `Record<string, unknown>` | `undefined` | Additional parameters passed to the filter component. |
| `floatingFilter` | `boolean` | `false` | When `true`, shows a floating filter input below the column header. |

```ts title="Filtering examples"
const columns: ColumnDef[] = [
  { field: 'name', filterable: true, filter: true, floatingFilter: true },
  { field: 'status', filter: 'select', filterParams: { values: ['active', 'inactive'] } },
];
```

## Editing Properties

| Option | Type | Default | Description |
|---|---|---|---|
| `editable` | `boolean \| ((params: CellCallbackParams) => boolean)` | `false` | Enables cell editing. Pass `true` to always allow, or a function for conditional editing. |
| `cellEditor` | `string` | `'text'` | Registered editor name: `'text'`, `'number'`, `'select'`, `'date'`, or a custom-registered editor. |
| `cellEditorParams` | `Record<string, unknown>` | `undefined` | Configuration passed to the editor component. |

```ts title="Editing examples"
const columns: ColumnDef<Employee>[] = [
  { field: 'name', editable: true },
  { field: 'salary', editable: true, cellEditor: 'number' },
  {
    field: 'department',
    editable: true,
    cellEditor: 'select',
    cellEditorParams: { values: ['Engineering', 'Sales', 'HR'] },
  },
  {
    field: 'notes',
    editable: (params) => params.data?.role === 'admin',
  },
];
```

## Pinning Properties

| Option | Type | Default | Description |
|---|---|---|---|
| `pinned` | `'left' \| 'right' \| null` | `null` | Pins the column to the left or right side. Pinned columns stay visible during horizontal scroll. |
| `lockPinned` | `boolean` | `false` | Prevents the user from changing the pinned state. |
| `lockPosition` | `boolean` | `false` | Prevents the column from being moved or reordered by the user. |

```ts title="Pinning examples"
const columns: ColumnDef[] = [
  { field: 'id', pinned: 'left', lockPinned: true, lockPosition: true, width: 80 },
  { field: 'name', pinned: 'left' },
  { field: 'actions', pinned: 'right', width: 100 },
];
```

## Grouping Properties

| Option | Type | Default | Description |
|---|---|---|---|
| `rowGroup` | `boolean` | `false` | When `true`, this column is used as a row grouping column. |
| `rowGroupIndex` | `number` | `undefined` | Nesting order in the grouping hierarchy. Lower index means higher (outer) level. |
| `showRowGroup` | `boolean` | `false` | When `true`, this column displays the group hierarchy with expand/collapse icons. |

```ts title="Grouping examples"
const columns: ColumnDef[] = [
  { field: 'department', rowGroup: true, rowGroupIndex: 0 },
  { field: 'team', rowGroup: true, rowGroupIndex: 1 },
  { field: 'name', showRowGroup: true },
  { field: 'salary', aggFunc: 'sum' },
];
```

## Aggregation Properties

| Option | Type | Default | Description |
|---|---|---|---|
| `aggFunc` | `string \| AggFunc<TValue>` | `undefined` | Aggregation function for grouped data. Built-in: `'sum'`, `'min'`, `'max'`, `'avg'`, `'count'`. Or a custom function. |
| `allowedAggFuncs` | `string[]` | `undefined` | Restricts which aggregation functions are available in the column menu. |

```ts title="Aggregation"
const columns: ColumnDef[] = [
  { field: 'salary', aggFunc: 'sum' },
  { field: 'age', aggFunc: 'avg' },
  { field: 'name', aggFunc: 'count' },
  {
    field: 'rating',
    aggFunc: (values) => values.reduce((a, b) => a + b, 0) / values.length,
    allowedAggFuncs: ['sum', 'avg'],
  },
];
```

## Value Pipeline

The value pipeline controls how data flows through a column:

```
data[field] or valueGetter --> valueFormatter --> cellRenderer --> display
user input --> valueParser --> valueSetter --> data[field]
```

| Option | Type | Description |
|---|---|---|
| `valueGetter` | `(params: ValueGetterParams<TData>) => TValue` | Extracts or computes the cell value from row data. Use instead of `field` for derived values. |
| `valueSetter` | `(params: ValueSetterParams<TData, TValue>) => boolean` | Writes an edited value back to the row data. Return `true` to accept, `false` to reject. |
| `valueFormatter` | `(params: ValueFormatterParams<TData, TValue>) => string` | Formats the value for display. Does not change the underlying data. |
| `valueParser` | `(params: ValueParserParams<TData>) => TValue` | Parses user input from the editor back into the correct data type. |

### valueGetter

```ts title="valueGetter"
{
  colId: 'fullName',
  headerName: 'Full Name',
  valueGetter: (params) => {
    return `${params.data?.firstName} ${params.data?.lastName}`;
  },
}
```

**ValueGetterParams:**

| Field | Type | Description |
|---|---|---|
| `data` | `TData \| undefined` | The row data object. `undefined` for group rows. |
| `node` | `RowNode<TData>` | The row node. |
| `colDef` | `ColumnDef<TData>` | The column definition. |
| `colId` | `string` | The column ID. |

### valueFormatter

```ts title="valueFormatter"
{
  field: 'salary',
  valueFormatter: (params) => `$${params.value.toLocaleString()}`,
}

{
  field: 'startDate',
  valueFormatter: (params) =>
    new Date(params.value).toLocaleDateString('en-US'),
}
```

**ValueFormatterParams:**

| Field | Type | Description |
|---|---|---|
| `value` | `TValue` | The raw cell value to format. |
| `data` | `TData \| undefined` | The row data object. |
| `node` | `RowNode<TData>` | The row node. |
| `colDef` | `ColumnDef<TData, TValue>` | The column definition. |

### cellRenderer

```ts title="cellRenderer"
{
  field: 'status',
  cellRenderer: (params) => {
    const badge = document.createElement('span');
    badge.className = `status-badge status-${params.value}`;
    badge.textContent = params.value;
    return badge;
  },
}

// String return (requires dangerouslySetInnerHTML for HTML)
{
  field: 'progress',
  dangerouslySetInnerHTML: true,
  cellRenderer: (params) =>
    `<div class="progress-bar" style="width: ${params.value}%"></div>`,
}
```

### valueParser

```ts title="valueParser"
{
  field: 'salary',
  editable: true,
  cellEditor: 'text',
  valueParser: (params) => parseFloat(params.newValue.replace(/[,$]/g, '')),
}
```

**ValueParserParams:**

| Field | Type | Description |
|---|---|---|
| `newValue` | `string` | The raw string entered by the user. |
| `oldValue` | `any` | The previous cell value. |
| `data` | `TData` | The row data object. |
| `node` | `RowNode<TData>` | The row node. |
| `colDef` | `ColumnDef<TData>` | The column definition. |

### valueSetter

```ts title="valueSetter"
{
  colId: 'fullName',
  headerName: 'Full Name',
  valueGetter: (params) => `${params.data?.firstName} ${params.data?.lastName}`,
  valueSetter: (params) => {
    const [first, ...rest] = params.newValue.split(' ');
    params.data.firstName = first;
    params.data.lastName = rest.join(' ');
    return true;
  },
}
```

**ValueSetterParams:**

| Field | Type | Description |
|---|---|---|
| `data` | `TData` | The row data object being edited. |
| `newValue` | `TValue` | The new value from the editor. |
| `oldValue` | `TValue` | The previous cell value. |
| `node` | `RowNode<TData>` | The row node. |
| `colDef` | `ColumnDef<TData, TValue>` | The column definition. |

## Rendering Properties

| Option | Type | Default | Description |
|---|---|---|---|
| `cellRenderer` | `CellRendererFn<TData, TValue>` | Default text renderer | Custom cell rendering function. Returns `string \| HTMLElement`. |
| `cellClass` | `string \| string[] \| ((params) => string \| string[])` | `undefined` | CSS class(es) for cell elements. Static or dynamic per cell. |
| `cellStyle` | `Record<string, string> \| ((params) => Record<string, string>)` | `undefined` | Inline CSS styles for cell elements. Static or dynamic per cell. |
| `headerRenderer` | `HeaderRendererFn<TData>` | Default header renderer | Custom header rendering function. Returns `string \| HTMLElement`. |
| `headerClass` | `string \| string[]` | `undefined` | CSS class(es) for the header cell element. |
| `dangerouslySetInnerHTML` | `boolean` | `false` | When `true`, string results from `cellRenderer` are set via `innerHTML`. Default uses `textContent` for XSS safety. |

```ts title="Rendering examples"
const columns: ColumnDef<Employee>[] = [
  {
    field: 'salary',
    cellClass: (params) => params.value > 100000 ? 'high-value' : 'normal',
    cellStyle: (params) => ({
      color: params.value > 100000 ? '#16a34a' : '#1e293b',
      fontWeight: params.value > 100000 ? 'bold' : 'normal',
    }),
  },
  {
    field: 'department',
    headerRenderer: (params) => {
      const el = document.createElement('div');
      el.textContent = params.displayName;
      el.className = 'custom-header';
      return el;
    },
    headerClass: 'department-header',
  },
];
```

## Column Group Properties

| Option | Type | Default | Description |
|---|---|---|---|
| `children` | `ColumnDef<TData>[]` | `undefined` | Child column definitions. Turns this into a column group with multi-level headers. |
| `groupId` | `string` | `undefined` | Unique identifier for the column group. |
| `marryChildren` | `boolean` | `false` | Prevents child columns from being separated by reordering. |
| `openByDefault` | `boolean` | `false` | When `true`, the column group starts expanded. |

```ts title="Column groups"
const columns: ColumnDef[] = [
  { field: 'name' },
  {
    headerName: 'Contact',
    groupId: 'contact',
    marryChildren: true,
    children: [
      { field: 'email' },
      { field: 'phone' },
    ],
  },
  {
    headerName: 'Employment',
    groupId: 'employment',
    openByDefault: true,
    children: [
      { field: 'department' },
      { field: 'title' },
      { field: 'salary' },
    ],
  },
];
```

## Tooltip Properties

| Option | Type | Default | Description |
|---|---|---|---|
| `tooltipField` | `string` | `undefined` | Field name on the row data to use as tooltip text. |
| `tooltipValueGetter` | `(params: CellCallbackParams) => string` | `undefined` | Custom function to compute tooltip text. |

```ts title="Tooltips"
const columns: ColumnDef[] = [
  { field: 'name', tooltipField: 'fullBio' },
  {
    field: 'status',
    tooltipValueGetter: (params) =>
      `Row ${params.node.id}: status is ${params.value}`,
  },
];
```

## Spanning Properties

| Option | Type | Default | Description |
|---|---|---|---|
| `colSpan` | `(params: CellCallbackParams) => number` | `1` | Returns the number of columns this cell should span. |
| `rowSpan` | `(params: CellCallbackParams) => number` | `1` | Returns the number of rows this cell should span. |

```ts title="Spanning"
const columns: ColumnDef[] = [
  {
    field: 'name',
    colSpan: (params) => params.data?.isHeader ? 3 : 1,
  },
  {
    field: 'category',
    rowSpan: (params) => params.data?.categorySpan ?? 1,
  },
];
```

## Pivot Properties

| Option | Type | Default | Description |
|---|---|---|---|
| `pivot` | `boolean` | `false` | When `true`, this column is used as a pivot column. Unique values become new column headers. |
| `pivotIndex` | `number` | `undefined` | Order of this column in the pivot hierarchy. |

## CellCallbackParams

Passed to `cellClass`, `cellStyle`, `editable`, `tooltipValueGetter`, `colSpan`, and `rowSpan`.

```ts title="CellCallbackParams"
interface CellCallbackParams<TData, TValue> {
  data: TData | undefined;              // Row data (undefined for group rows)
  value: TValue;                        // Resolved cell value
  node: RowNode<TData>;                 // The row node
  colDef: ColumnDef<TData, TValue>;     // The column definition
  colId: string;                        // Column ID
  rowIndex: number;                     // Display index
}
```

## ColumnState

The resolved internal column state, combining the original `ColumnDef` with runtime changes (resizing, reordering, etc.). Retrieved via `GridApi.getColumnState()` and restored via `GridApi.applyColumnState()`.

| Field | Type | Description |
|---|---|---|
| `colId` | `string` | Unique column identifier. |
| `field` | `string \| undefined` | Data field path, or `undefined` for computed columns. |
| `headerName` | `string` | Display name in the header. |
| `width` | `number` | Current width in pixels. |
| `minWidth` | `number` | Minimum allowed width. |
| `maxWidth` | `number` | Maximum allowed width. |
| `flex` | `number \| null` | Flex factor, or `null`. |
| `hide` | `boolean` | Whether the column is hidden. |
| `pinned` | `'left' \| 'right' \| null` | Pinned position. |
| `sort` | `'asc' \| 'desc' \| null` | Current sort direction. |
| `sortIndex` | `number \| null` | Sort priority index. |
| `sortable` | `boolean` | Whether sorting is enabled. |
| `filterable` | `boolean` | Whether filtering is enabled. |
| `resizable` | `boolean` | Whether resize is enabled. |
| `editable` | `boolean \| function` | Whether editing is enabled. |
| `rowGroup` | `boolean` | Whether used for row grouping. |
| `rowGroupIndex` | `number \| null` | Position in grouping hierarchy. |
| `pivot` | `boolean` | Whether used for pivoting. |
| `pivotIndex` | `number \| null` | Position in pivot hierarchy. |
| `aggFunc` | `string \| AggFunc \| null` | Active aggregation function. |
| `originalDef` | `ColumnDef` | Reference to the original column definition. |

## Supporting Types

### SortModelItem

```ts title="SortModelItem"
interface SortModelItem {
  colId: string;          // Column identifier
  sort: 'asc' | 'desc';  // Sort direction
}
```

### PinnedPosition

```ts title="PinnedPosition"
type PinnedPosition = 'left' | 'right' | null;
```

### SortDirection

```ts title="SortDirection"
type SortDirection = 'asc' | 'desc' | null;
```

### AggFunc

```ts title="AggFunc"
type AggFunc<TValue = any> = (values: TValue[]) => any;
```

### CellRendererFn

```ts title="CellRendererFn"
type CellRendererFn<TData, TValue> = (
  params: CellCallbackParams<TData, TValue>,
) => string | HTMLElement;
```

### HeaderRendererFn

```ts title="HeaderRendererFn"
type HeaderRendererFn<TData> = (params: {
  colDef: ColumnDef<TData>;
  colId: string;
  displayName: string;
  sortDirection: SortDirection;
  sortIndex: number | null;
}) => string | HTMLElement;
```
