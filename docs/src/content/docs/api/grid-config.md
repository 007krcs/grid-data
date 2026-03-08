---
title: GridConfig
description: Complete reference for the GridConfig interface used to initialize a GridStorm data grid.
---

The `GridConfig` interface defines all options for creating a GridStorm grid. It is passed to `createGrid()` in vanilla JavaScript or as props to the `<GridStorm>` React component.

## Interface

```ts title="GridConfig<TData>"
interface GridConfig<TData = any> {
  columns: ColumnDef<TData>[];
  rowData?: TData[];
  dataSource?: DataSource<TData>;
  rowModelType?: RowModelType;
  getRowId?: (params: GetRowIdParams<TData>) => string;
  plugins?: GridPlugin<TData>[];
  defaultColDef?: Partial<ColumnDef<TData>>;
  rowHeight?: number | ((params: { data: TData; index: number }) => number);
  headerHeight?: number;
  domLayout?: 'normal' | 'autoHeight' | 'print';
  pinnedTopRowData?: TData[];
  pinnedBottomRowData?: TData[];
  suppressScrollX?: boolean;
  suppressScrollY?: boolean;
  rowSelection?: RowSelectionMode;
  editType?: EditType;
  undoRedoCellEditing?: boolean;
  pagination?: boolean;
  paginationPageSize?: number;
  animateRows?: boolean;
  ariaLabel?: string;
  locale?: string;
  theme?: string;
  onGridReady?: (api: GridApi<TData>) => void;
  onRowDataChanged?: (event: { rowData: TData[] }) => void;
  onSelectionChanged?: (event: { selectedNodes: RowNode<TData>[]; source: SelectionSource }) => void;
  onSortChanged?: (event: { sortModel: SortModelItem[] }) => void;
  onFilterChanged?: (event: { filterModel: Record<string, FilterModel> }) => void;
  onCellValueChanged?: (event: { node: RowNode<TData>; colId: string; oldValue: any; newValue: any }) => void;
}
```

## Properties

### Required

| Property | Type | Description |
|---|---|---|
| `columns` | `ColumnDef<TData>[]` | Column definitions. Determines which fields are displayed and how. See [Column Definitions](/api/column-definitions/). |

### Data

| Property | Type | Default | Description |
|---|---|---|---|
| `rowData` | `TData[]` | `undefined` | Client-side row data array. Mutually exclusive with `dataSource`. |
| `dataSource` | `DataSource<TData>` | `undefined` | Server-side or infinite data source for lazy loading. |
| `rowModelType` | `'client' \| 'server' \| 'infinite' \| 'viewport'` | `'client'` | Row model type. |
| `getRowId` | `(params: GetRowIdParams) => string` | Array index | Function to generate unique row IDs from data. |

### Plugins

| Property | Type | Default | Description |
|---|---|---|---|
| `plugins` | `GridPlugin[]` | `[]` | Array of plugin instances to install. |

### Column Defaults

| Property | Type | Default | Description |
|---|---|---|---|
| `defaultColDef` | `Partial<ColumnDef>` | `{}` | Default values applied to all column definitions. Column-level values override defaults. |

### Sizing

| Property | Type | Default | Description |
|---|---|---|---|
| `rowHeight` | `number \| function` | `40` | Row height in pixels. Pass a function for dynamic heights: `(params) => number`. |
| `headerHeight` | `number` | `48` | Header row height in pixels. |

### Layout

| Property | Type | Default | Description |
|---|---|---|---|
| `domLayout` | `'normal' \| 'autoHeight' \| 'print'` | `'normal'` | DOM layout mode. `autoHeight` sizes the grid to fit all rows. `print` optimizes for printing. |

### Pinned Rows

| Property | Type | Default | Description |
|---|---|---|---|
| `pinnedTopRowData` | `TData[]` | `undefined` | Rows pinned to the top of the grid. Not affected by sort/filter/pagination. |
| `pinnedBottomRowData` | `TData[]` | `undefined` | Rows pinned to the bottom of the grid. |

### Scrolling

| Property | Type | Default | Description |
|---|---|---|---|
| `suppressScrollX` | `boolean` | `false` | Disable horizontal scrolling. |
| `suppressScrollY` | `boolean` | `false` | Disable vertical scrolling. |

### Selection

| Property | Type | Default | Description |
|---|---|---|---|
| `rowSelection` | `'single' \| 'multiple'` | `undefined` | Row selection mode. Also configurable via the Selection plugin. |

### Editing

| Property | Type | Default | Description |
|---|---|---|---|
| `editType` | `'cell' \| 'row'` | `undefined` | Editing mode. `cell` edits one cell at a time. `row` edits all cells in a row. |
| `undoRedoCellEditing` | `boolean` | `false` | Enable undo/redo for cell edits. |

### Pagination

| Property | Type | Default | Description |
|---|---|---|---|
| `pagination` | `boolean` | `false` | Enable pagination. Also configurable via the Pagination plugin. |
| `paginationPageSize` | `number` | `100` | Number of rows per page. |

### Animation

| Property | Type | Default | Description |
|---|---|---|---|
| `animateRows` | `boolean` | `false` | Animate row transitions during sort/filter changes. |

### Accessibility

| Property | Type | Default | Description |
|---|---|---|---|
| `ariaLabel` | `string` | `undefined` | ARIA label for the grid root element. |

### Localization

| Property | Type | Default | Description |
|---|---|---|---|
| `locale` | `string` | `undefined` | Locale string for number/date formatting. |

### Theme

| Property | Type | Default | Description |
|---|---|---|---|
| `theme` | `string` | `undefined` | Theme name applied as `data-theme` attribute. |

### Event Callbacks

| Property | Type | Description |
|---|---|---|
| `onGridReady` | `(api: GridApi) => void` | Called when the grid engine is initialized. |
| `onRowDataChanged` | `(event) => void` | Called when `setRowData()` is invoked. |
| `onSelectionChanged` | `(event) => void` | Called when row selection changes. |
| `onSortChanged` | `(event) => void` | Called when the sort model changes. |
| `onFilterChanged` | `(event) => void` | Called when the filter model changes. |
| `onCellValueChanged` | `(event) => void` | Called when a cell value is committed after editing. |

## GetRowIdParams

```ts
interface GetRowIdParams<TData> {
  data: TData;           // The row data object
  index: number;         // Array index
  parentKeys?: string[]; // Parent group keys (for grouped data)
}
```

## DataSource

```ts
interface DataSource<TData> {
  getRows(params: DataSourceRequest): Promise<DataSourceResult<TData>>;
  destroy?(): void;
}

interface DataSourceRequest {
  startRow: number;
  endRow: number;
  sortModel: SortModelItem[];
  filterModel: Record<string, FilterModel>;
  groupKeys: string[];
  pivotCols: string[];
  pivotMode: boolean;
  valueCols: string[];
  rowGroupCols: string[];
}

interface DataSourceResult<TData> {
  rowData: TData[];
  rowCount: number;
  lastRow?: number;
}
```

## Usage Example

```ts title="Full config example"
import { createGrid } from '@gridstorm/core';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { SelectionPlugin } from '@gridstorm/plugin-selection';

const engine = createGrid({
  columns: [
    { field: 'name', headerName: 'Name', sortable: true },
    { field: 'age', headerName: 'Age', width: 80, sortable: true },
    { field: 'email', headerName: 'Email', flex: 1 },
  ],
  rowData: employees,
  getRowId: (params) => params.data.id,
  plugins: [
    SortingPlugin({ multiSort: true }),
    SelectionPlugin({ mode: 'multiple' }),
  ],
  defaultColDef: { resizable: true, filterable: true },
  rowHeight: 44,
  headerHeight: 48,
  pagination: true,
  paginationPageSize: 50,
  ariaLabel: 'Employee directory',
  theme: 'light',
  onGridReady: (api) => {
    console.log('Grid ready with', api.getDisplayedRowCount(), 'rows');
  },
});
```

## Next Steps

- **[GridApi](/api/grid-api/)** -- Methods available on the API object.
- **[Column Definitions](/api/column-definitions/)** -- Full ColumnDef reference.
