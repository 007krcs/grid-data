---
title: GridConfig
description: Complete reference for the GridConfig interface used to initialize a GridStorm data grid.
---

The `GridConfig<TData>` interface defines every option for creating a GridStorm grid instance. Pass it to `createGrid()` in vanilla TypeScript or as props to the `<GridStorm>` React component.

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
  onRowDataChanged?: (event: GridEventMap<TData>['rowData:changed']) => void;
  onSelectionChanged?: (event: GridEventMap<TData>['selection:changed']) => void;
  onSortChanged?: (event: GridEventMap<TData>['column:sort:changed']) => void;
  onFilterChanged?: (event: GridEventMap<TData>['filter:changed']) => void;
  onCellValueChanged?: (event: GridEventMap<TData>['cell:valueChanged']) => void;
}
```

## Data Options

| Option | Type | Default | Description |
|---|---|---|---|
| `columns` | `ColumnDef<TData>[]` | **required** | Array of column definitions describing every column to render. Order determines initial display order. |
| `rowData` | `TData[]` | `undefined` | Client-side row data array. Mutually exclusive with `dataSource`. The grid performs all sorting, filtering, and grouping in the browser. |
| `dataSource` | `DataSource<TData>` | `undefined` | Server-side or infinite data source for fetching rows on demand. Mutually exclusive with `rowData`. |
| `rowModelType` | `'client' \| 'server' \| 'infinite' \| 'viewport'` | `'client'` | Determines how the grid fetches and manages row data. |
| `getRowId` | `(params: GetRowIdParams<TData>) => string` | Array index | Callback to generate a unique string ID for each row. Recommended for stable selection and update performance. |

```ts title="Data options"
import { createGrid } from '@gridstorm/core';

const engine = createGrid({
  columns: [{ field: 'name' }, { field: 'email' }],
  rowData: [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
  ],
  rowModelType: 'client',
  getRowId: (params) => String(params.data.id),
});
```

## Column Options

| Option | Type | Default | Description |
|---|---|---|---|
| `defaultColDef` | `Partial<ColumnDef<TData>>` | `{}` | Default column definition applied to all columns. Individual column definitions override these defaults. |

```ts title="Column defaults"
const engine = createGrid({
  columns: [
    { field: 'name', headerName: 'Full Name' },
    { field: 'salary', width: 120 },
  ],
  rowData: employees,
  defaultColDef: {
    sortable: true,
    resizable: true,
    width: 150,
    filterable: true,
  },
});
```

## Layout Options

| Option | Type | Default | Description |
|---|---|---|---|
| `rowHeight` | `number \| ((params: { data: TData; index: number }) => number)` | `40` | Height of each data row in pixels. Use a number for uniform heights (better virtual scroll performance) or a function for variable-height rows. |
| `headerHeight` | `number` | `40` | Height of the column header row in pixels. |
| `domLayout` | `'normal' \| 'autoHeight' \| 'print'` | `'normal'` | Controls how the grid DOM height is determined. `'autoHeight'` expands to fit all rows (disables virtual scrolling). `'print'` renders all rows for print layout. |

```ts title="Layout options"
const engine = createGrid({
  columns,
  rowData,
  rowHeight: 48,
  headerHeight: 56,
  domLayout: 'normal',
});

// Variable row heights
const engine2 = createGrid({
  columns,
  rowData,
  rowHeight: ({ data }) => data.hasDetails ? 80 : 40,
});
```

## Pinned Rows

| Option | Type | Default | Description |
|---|---|---|---|
| `pinnedTopRowData` | `TData[]` | `undefined` | Rows pinned at the top of the grid. Not affected by sorting, filtering, or scrolling. |
| `pinnedBottomRowData` | `TData[]` | `undefined` | Rows pinned at the bottom of the grid. Not affected by sorting, filtering, or scrolling. |

```ts title="Pinned rows"
const engine = createGrid({
  columns,
  rowData,
  pinnedTopRowData: [{ name: 'Header Row', salary: null }],
  pinnedBottomRowData: [{ name: 'Total', salary: 1250000 }],
});
```

## Scrolling Options

| Option | Type | Default | Description |
|---|---|---|---|
| `suppressScrollX` | `boolean` | `false` | When `true`, suppresses horizontal scrolling. Columns are forced to fit within the grid width. |
| `suppressScrollY` | `boolean` | `false` | When `true`, suppresses vertical scrolling. Use with `domLayout: 'autoHeight'` for full-height rendering. |

## Pagination Options

| Option | Type | Default | Description |
|---|---|---|---|
| `pagination` | `boolean` | `false` | When `true`, enables client-side pagination. |
| `paginationPageSize` | `number` | `100` | Number of rows per page when pagination is enabled. |

```ts title="Pagination"
const engine = createGrid({
  columns,
  rowData,
  pagination: true,
  paginationPageSize: 25,
});
```

## Selection Options

| Option | Type | Default | Description |
|---|---|---|---|
| `rowSelection` | `'single' \| 'multiple' \| false` | `false` | Configures row selection behavior. `'single'` allows one row at a time. `'multiple'` allows Ctrl/Shift+click multi-select. `false` disables selection. |

```ts title="Selection"
const engine = createGrid({
  columns,
  rowData,
  rowSelection: 'multiple',
});
```

## Editing Options

| Option | Type | Default | Description |
|---|---|---|---|
| `editType` | `'cell' \| 'fullRow'` | `'cell'` | Controls editing mode. `'cell'` edits one cell at a time. `'fullRow'` makes the entire row editable when editing starts. |
| `undoRedoCellEditing` | `boolean` | `false` | When `true`, enables undo/redo for cell edits via Ctrl+Z / Ctrl+Y. |

```ts title="Editing"
const engine = createGrid({
  columns: [
    { field: 'name', editable: true },
    { field: 'salary', editable: true, cellEditor: 'number' },
  ],
  rowData,
  editType: 'cell',
  undoRedoCellEditing: true,
});
```

## Styling Options

| Option | Type | Default | Description |
|---|---|---|---|
| `theme` | `string` | `'gridstorm-light'` | Theme identifier applied to the grid. Corresponds to a CSS class from `@gridstorm/theme-default` or a custom theme package. |
| `animateRows` | `boolean` | `true` | When `true`, enables row transition animations during sorting, filtering, and reordering. |

```ts title="Theming"
const engine = createGrid({
  columns,
  rowData,
  theme: 'gridstorm-dark',
  animateRows: true,
});
```

## Accessibility and Locale

| Option | Type | Default | Description |
|---|---|---|---|
| `ariaLabel` | `string` | `undefined` | ARIA label applied to the grid root element for screen readers. |
| `locale` | `string` | `'en-US'` | BCP 47 locale tag for number formatting, date formatting, and text collation. |

```ts title="Accessibility"
const engine = createGrid({
  columns,
  rowData,
  ariaLabel: 'Employee data table',
  locale: 'de-DE',
});
```

## Callback Options

| Option | Type | Description |
|---|---|---|
| `onGridReady` | `(api: GridApi<TData>) => void` | Called once when the grid is fully initialized and the API is ready. Recommended place for initial API calls. |
| `onRowDataChanged` | `(event: { rowData: TData[] }) => void` | Called when row data changes via `setRowData()` or data source updates. |
| `onSelectionChanged` | `(event: { selectedNodes: RowNode<TData>[]; source: SelectionSource }) => void` | Called when the set of selected rows changes. |
| `onSortChanged` | `(event: { sortModel: SortModelItem[] }) => void` | Called when the sort model changes. |
| `onFilterChanged` | `(event: { filterModel: Record<string, FilterModel> }) => void` | Called when the filter model changes. |
| `onCellValueChanged` | `(event: { node: RowNode<TData>; colId: string; oldValue: any; newValue: any }) => void` | Called when a cell value is changed through editing. |

```ts title="Callbacks"
const engine = createGrid({
  columns,
  rowData,
  onGridReady: (api) => {
    api.setFilterModel({ status: { filterType: 'text', filter: 'active' } });
  },
  onSelectionChanged: (event) => {
    console.log('Selected:', event.selectedNodes.length, 'rows');
  },
  onSortChanged: (event) => {
    console.log('Sort model:', event.sortModel);
  },
  onFilterChanged: (event) => {
    console.log('Filters:', Object.keys(event.filterModel));
  },
  onCellValueChanged: (event) => {
    console.log(`Cell ${event.colId} changed from`, event.oldValue, 'to', event.newValue);
  },
});
```

## Plugins

| Option | Type | Default | Description |
|---|---|---|---|
| `plugins` | `GridPlugin<TData>[]` | `[]` | Array of plugins to install during grid initialization. Plugins are installed in dependency-resolved order via topological sort. |

```ts title="Plugins"
import { sortingPlugin } from '@gridstorm/plugin-sorting';
import { filterPlugin } from '@gridstorm/plugin-filtering';
import { selectionPlugin } from '@gridstorm/plugin-selection';
import { editingPlugin } from '@gridstorm/plugin-editing';

const engine = createGrid({
  columns,
  rowData,
  plugins: [
    sortingPlugin(),
    filterPlugin(),
    selectionPlugin(),
    editingPlugin(),
  ],
});
```

## Supporting Types

### GetRowIdParams

```ts title="GetRowIdParams"
interface GetRowIdParams<TData> {
  data: TData;           // The row data object
  index: number;         // Zero-based index in the input data array
  parentKeys?: string[]; // Parent group keys for grouped/tree data
}
```

### DataSource

```ts title="DataSource"
interface DataSource<TData> {
  getRows(params: DataSourceRequest): Promise<DataSourceResult<TData>>;
  destroy?(): void;
}
```

### DataSourceRequest

```ts title="DataSourceRequest"
interface DataSourceRequest {
  startRow: number;                          // First row index (inclusive, zero-based)
  endRow: number;                            // Last row index (exclusive)
  sortModel: SortModelItem[];                // Current sort model
  filterModel: Record<string, FilterModel>;  // Current filter model
  groupKeys: string[];                       // Expanded group path
  pivotCols: string[];                       // Pivot column IDs
  pivotMode: boolean;                        // Whether pivot mode is active
  valueCols: string[];                       // Value columns for aggregation
  rowGroupCols: string[];                    // Row grouping columns
}
```

### DataSourceResult

```ts title="DataSourceResult"
interface DataSourceResult<TData> {
  rowData: TData[];   // Row data for the requested range
  rowCount: number;   // Number of rows returned
  lastRow?: number;   // Total dataset size (omit for infinite scrolling)
}
```

## Full Example

```ts title="Complete GridConfig"
import { createGrid } from '@gridstorm/core';
import { sortingPlugin } from '@gridstorm/plugin-sorting';
import { selectionPlugin } from '@gridstorm/plugin-selection';
import { paginationPlugin } from '@gridstorm/plugin-pagination';

interface Employee {
  id: number;
  name: string;
  department: string;
  salary: number;
}

const engine = createGrid<Employee>({
  columns: [
    { field: 'name', headerName: 'Full Name', sortable: true, flex: 1 },
    { field: 'department', sortable: true, width: 150 },
    { field: 'salary', sortable: true, width: 120,
      valueFormatter: ({ value }) => `$${value.toLocaleString()}` },
  ],
  rowData: employees,
  getRowId: (params) => String(params.data.id),
  plugins: [sortingPlugin(), selectionPlugin(), paginationPlugin()],
  defaultColDef: { resizable: true, filterable: true },
  rowHeight: 44,
  headerHeight: 48,
  rowSelection: 'multiple',
  pagination: true,
  paginationPageSize: 50,
  animateRows: true,
  ariaLabel: 'Employee directory',
  locale: 'en-US',
  theme: 'gridstorm-light',
  onGridReady: (api) => {
    api.setSortModel([{ colId: 'name', sort: 'asc' }]);
  },
  onSelectionChanged: ({ selectedNodes }) => {
    console.log(selectedNodes.length, 'rows selected');
  },
});
```
