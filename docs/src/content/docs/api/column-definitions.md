---
title: Column Definitions
description: Complete reference for the ColumnDef interface, covering all properties for column configuration.
---

The `ColumnDef` interface defines how a column behaves, what data it displays, and what interactions are available. Column definitions are passed to the grid via the `columns` property of `GridConfig`.

## Interface

```ts title="ColumnDef<TData, TValue>"
interface ColumnDef<TData = any, TValue = any> {
  // Identity
  colId?: string;
  field?: string & keyof TData;
  headerName?: string;

  // Sizing
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  flex?: number;
  resizable?: boolean;

  // Pinning
  pinned?: 'left' | 'right' | null;
  lockPinned?: boolean;
  lockPosition?: boolean;

  // Visibility
  hide?: boolean;
  suppressColumnsToolPanel?: boolean;

  // Sorting
  sortable?: boolean;
  sort?: 'asc' | 'desc' | null;
  sortIndex?: number;
  comparator?: ColumnComparator<TData, TValue>;

  // Filtering
  filterable?: boolean;
  filter?: string | boolean;
  filterParams?: Record<string, unknown>;
  floatingFilter?: boolean;

  // Editing
  editable?: boolean | ((params: CellCallbackParams) => boolean);
  cellEditor?: string;
  cellEditorParams?: Record<string, unknown>;

  // Rendering
  cellRenderer?: CellRendererFn<TData, TValue>;
  cellClass?: string | string[] | ((params: CellCallbackParams) => string | string[]);
  cellStyle?: Record<string, string> | ((params: CellCallbackParams) => Record<string, string>);
  headerRenderer?: HeaderRendererFn<TData>;
  headerClass?: string | string[];

  // Value Pipeline
  valueGetter?: (params: ValueGetterParams) => TValue;
  valueSetter?: (params: ValueSetterParams) => boolean;
  valueFormatter?: (params: ValueFormatterParams) => string;
  valueParser?: (params: ValueParserParams) => TValue;

  // Aggregation
  aggFunc?: string | AggFunc<TValue>;
  allowedAggFuncs?: string[];

  // Row Grouping
  rowGroup?: boolean;
  rowGroupIndex?: number;
  showRowGroup?: boolean;

  // Pivot
  pivot?: boolean;
  pivotIndex?: number;

  // Column Groups
  children?: ColumnDef<TData>[];
  groupId?: string;
  marryChildren?: boolean;
  openByDefault?: boolean;

  // Tooltips
  tooltipField?: string;
  tooltipValueGetter?: (params: CellCallbackParams) => string;

  // Spanning
  colSpan?: (params: CellCallbackParams) => number;
  rowSpan?: (params: CellCallbackParams) => number;
}
```

## Property Reference

### Identity

| Property | Type | Default | Description |
|---|---|---|---|
| `colId` | `string` | Auto from `field` | Unique column identifier. Auto-generated from `field` if not set. |
| `field` | `string & keyof TData` | `undefined` | Property name on the row data object. Type-checked against `TData`. |
| `headerName` | `string` | Value of `field` | Display text in the column header. |

### Sizing

| Property | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | `200` | Column width in pixels. |
| `minWidth` | `number` | `50` | Minimum width during resize. |
| `maxWidth` | `number` | `Infinity` | Maximum width during resize. |
| `flex` | `number` | `undefined` | Flex factor for distributing remaining space. |
| `resizable` | `boolean` | `false` | Allow drag-to-resize from header border. |

### Pinning

| Property | Type | Default | Description |
|---|---|---|---|
| `pinned` | `'left' \| 'right' \| null` | `null` | Pin column to left or right edge. |
| `lockPinned` | `boolean` | `false` | Prevent unpinning by the user. |
| `lockPosition` | `boolean` | `false` | Prevent column from being reordered. |

### Visibility

| Property | Type | Default | Description |
|---|---|---|---|
| `hide` | `boolean` | `false` | Hide the column from the grid. |
| `suppressColumnsToolPanel` | `boolean` | `false` | Hide from column tool panel. |

### Sorting

| Property | Type | Default | Description |
|---|---|---|---|
| `sortable` | `boolean` | `false` | Allow sorting by clicking the header. |
| `sort` | `'asc' \| 'desc' \| null` | `null` | Initial sort direction. |
| `sortIndex` | `number` | `undefined` | Priority in multi-sort (lower = higher priority). |
| `comparator` | `ColumnComparator` | Default string compare | Custom sort comparator function. |

### Filtering

| Property | Type | Default | Description |
|---|---|---|---|
| `filterable` | `boolean` | `false` | Allow filtering this column. |
| `filter` | `string \| boolean` | `undefined` | Filter component name or `true` for auto-detect. |
| `filterParams` | `Record<string, unknown>` | `undefined` | Configuration passed to the filter component. |
| `floatingFilter` | `boolean` | `false` | Show a floating filter input below the header. |

### Editing

| Property | Type | Default | Description |
|---|---|---|---|
| `editable` | `boolean \| function` | `false` | Allow editing. Function receives `CellCallbackParams` and returns boolean. |
| `cellEditor` | `string` | `'text'` | Editor name: `'text'`, `'number'`, `'select'`, or a custom-registered editor. |
| `cellEditorParams` | `Record<string, unknown>` | `undefined` | Configuration passed to the editor (e.g., `{ values: [...] }` for select). |

### Rendering

| Property | Type | Default | Description |
|---|---|---|---|
| `cellRenderer` | `CellRendererFn` | Default text renderer | Custom cell rendering function. Returns `string \| HTMLElement`. |
| `cellClass` | `string \| string[] \| function` | `undefined` | CSS class(es) for cell elements. |
| `cellStyle` | `object \| function` | `undefined` | Inline CSS styles for cell elements. |
| `headerRenderer` | `HeaderRendererFn` | Default header renderer | Custom header rendering function. |
| `headerClass` | `string \| string[]` | `undefined` | CSS class(es) for header cell elements. |

### Value Pipeline

| Property | Type | Description |
|---|---|---|
| `valueGetter` | `(params: ValueGetterParams) => TValue` | Compute or extract cell value from row data. |
| `valueSetter` | `(params: ValueSetterParams) => boolean` | Write edited value back to row data. Return `true` to accept, `false` to reject. |
| `valueFormatter` | `(params: ValueFormatterParams) => string` | Format value for display (does not change data). |
| `valueParser` | `(params: ValueParserParams) => TValue` | Parse user input during editing. |

### Aggregation

| Property | Type | Default | Description |
|---|---|---|---|
| `aggFunc` | `string \| AggFunc` | `undefined` | Aggregation function name (`'sum'`, `'avg'`, `'count'`, `'min'`, `'max'`) or custom function. |
| `allowedAggFuncs` | `string[]` | `undefined` | Restrict which agg functions are available for this column. |

### Row Grouping

| Property | Type | Default | Description |
|---|---|---|---|
| `rowGroup` | `boolean` | `false` | Include this column in row grouping. |
| `rowGroupIndex` | `number` | `undefined` | Nesting order for grouping (lower = higher level). |
| `showRowGroup` | `boolean` | `false` | Show the group column in group rows. |

### Pivot

| Property | Type | Default | Description |
|---|---|---|---|
| `pivot` | `boolean` | `false` | Include this column in pivot. |
| `pivotIndex` | `number` | `undefined` | Pivot order. |

### Column Groups

| Property | Type | Default | Description |
|---|---|---|---|
| `children` | `ColumnDef[]` | `undefined` | Child columns for a column group header. |
| `groupId` | `string` | `undefined` | Unique ID for the column group. |
| `marryChildren` | `boolean` | `false` | Prevent child columns from being separated by reordering. |
| `openByDefault` | `boolean` | `false` | Start the column group expanded. |

### Tooltips

| Property | Type | Default | Description |
|---|---|---|---|
| `tooltipField` | `string` | `undefined` | Data field to use as tooltip text. |
| `tooltipValueGetter` | `function` | `undefined` | Function to compute tooltip text. |

### Spanning

| Property | Type | Default | Description |
|---|---|---|---|
| `colSpan` | `(params) => number` | `1` | Number of columns this cell spans. |
| `rowSpan` | `(params) => number` | `1` | Number of rows this cell spans. |

## Callback Parameter Types

### CellCallbackParams

```ts
interface CellCallbackParams<TData, TValue> {
  data: TData | undefined;
  value: TValue;
  node: RowNode<TData>;
  colDef: ColumnDef<TData, TValue>;
  colId: string;
  rowIndex: number;
}
```

### ValueGetterParams

```ts
interface ValueGetterParams<TData> {
  data: TData | undefined;
  node: RowNode<TData>;
  colDef: ColumnDef<TData>;
  colId: string;
}
```

### ValueSetterParams

```ts
interface ValueSetterParams<TData, TValue> {
  data: TData;
  newValue: TValue;
  oldValue: TValue;
  node: RowNode<TData>;
  colDef: ColumnDef<TData, TValue>;
}
```

### ValueFormatterParams

```ts
interface ValueFormatterParams<TData, TValue> {
  value: TValue;
  data: TData | undefined;
  node: RowNode<TData>;
  colDef: ColumnDef<TData, TValue>;
}
```

### ValueParserParams

```ts
interface ValueParserParams<TData> {
  newValue: string;
  oldValue: any;
  data: TData;
  node: RowNode<TData>;
  colDef: ColumnDef<TData>;
}
```

## ColumnState

The resolved internal column state, derived from `ColumnDef` plus runtime interactions:

```ts
interface ColumnState {
  colId: string;
  field: string | undefined;
  headerName: string;
  width: number;
  minWidth: number;
  maxWidth: number;
  flex: number | null;
  hide: boolean;
  pinned: 'left' | 'right' | null;
  sort: 'asc' | 'desc' | null;
  sortIndex: number | null;
  sortable: boolean;
  filterable: boolean;
  resizable: boolean;
  editable: boolean | function;
  rowGroup: boolean;
  rowGroupIndex: number | null;
  pivot: boolean;
  pivotIndex: number | null;
  aggFunc: string | AggFunc | null;
  originalDef: ColumnDef;
}
```

## Next Steps

- **[GridConfig](/api/grid-config/)** -- Where column definitions are provided.
- **[Columns concept](/core-concepts/columns/)** -- Usage guide with examples.
- **[Row Nodes](/api/row-nodes/)** -- RowNode interface reference.
