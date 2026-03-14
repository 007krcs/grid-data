---
title: GridApi
description: Complete reference for the GridApi interface providing programmatic control over a GridStorm data grid.
---

The `GridApi<TData>` is the runtime interface for interacting with a GridStorm grid. Obtain it from `createGrid()` as `engine.api`, from the `onGridReady` callback, or in React via the `useGridApi()` hook.

```ts title="Obtaining the API"
// Via createGrid
const engine = createGrid(config);
const api = engine.api;

// Via onGridReady callback
const config: GridConfig = {
  columns,
  rowData,
  onGridReady: (api) => {
    api.setSortModel([{ colId: 'name', sort: 'asc' }]);
  },
};
```

## Data Methods

### setRowData

Replaces the entire row dataset. Clears selection and triggers a full reprocess (sort, filter, group).

| Parameter | Type | Description |
|---|---|---|
| `data` | `TData[]` | The new row data array. |

**Returns:** `void`

```ts title="setRowData"
api.setRowData(await fetchEmployees());
```

### addRows

Adds rows incrementally without replacing existing data.

| Parameter | Type | Description |
|---|---|---|
| `data` | `TData[]` | Array of row data objects to add. |
| `index` | `number` (optional) | Insertion index. Rows are appended if omitted. |

**Returns:** `void`

```ts title="addRows"
api.addRows([{ id: 3, name: 'Carol', salary: 72000 }]);
api.addRows([{ id: 4, name: 'Dave', salary: 68000 }], 0); // insert at top
```

### removeRows

Removes rows by their IDs. Also removes them from selection.

| Parameter | Type | Description |
|---|---|---|
| `rowIds` | `string[]` | Array of row IDs to remove. |

**Returns:** `void`

```ts title="removeRows"
api.removeRows(['row-1', 'row-5']);
```

### updateRows

Merges partial data into existing rows. Emits `cell:valueChanged` for each changed field.

| Parameter | Type | Description |
|---|---|---|
| `updates` | `Array<{ id: string; data: Partial<TData> }>` | Array of objects with `id` and partial `data` to merge. |

**Returns:** `void`

```ts title="updateRows"
api.updateRows([
  { id: 'emp-1', data: { salary: 95000 } },
  { id: 'emp-2', data: { department: 'Engineering' } },
]);
```

### getRowNode

Retrieves a row node by its unique ID.

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | The row node's unique identifier. |

**Returns:** `RowNode<TData> | undefined`

```ts title="getRowNode"
const node = api.getRowNode('emp-123');
if (node) {
  console.log(node.data?.name, node.selected);
}
```

### forEachNode

Iterates over every row node in the grid, including group nodes and non-displayed nodes.

| Parameter | Type | Description |
|---|---|---|
| `callback` | `(node: RowNode<TData>, index: number) => void` | Function called for each node. |

**Returns:** `void`

```ts title="forEachNode"
api.forEachNode((node, index) => {
  console.log(`Row ${index}: ${node.data?.name}`);
});
```

### getDisplayedRowCount

Returns the number of rows currently displayed after filtering, sorting, and pagination.

**Returns:** `number`

```ts title="getDisplayedRowCount"
const count = api.getDisplayedRowCount();
```

### getDisplayedRowAtIndex

Retrieves the row node at a specific display index.

| Parameter | Type | Description |
|---|---|---|
| `index` | `number` | Zero-based display index. |

**Returns:** `RowNode<TData> | undefined`

```ts title="getDisplayedRowAtIndex"
const firstRow = api.getDisplayedRowAtIndex(0);
const lastRow = api.getDisplayedRowAtIndex(api.getDisplayedRowCount() - 1);
```

## Column Methods

### setColumnDefs

Replaces all column definitions. Triggers a full column rebuild and re-render.

| Parameter | Type | Description |
|---|---|---|
| `defs` | `ColumnDef<TData>[]` | The new column definition array. |

**Returns:** `void`

```ts title="setColumnDefs"
api.setColumnDefs([
  { field: 'name', sortable: true },
  { field: 'email', flex: 1 },
]);
```

### getColumn

Retrieves the resolved state of a single column by its ID.

| Parameter | Type | Description |
|---|---|---|
| `colId` | `string` | The column's unique identifier. |

**Returns:** `ColumnState | undefined`

### getAllColumns

Returns the resolved state of all columns, including hidden ones.

**Returns:** `ColumnState[]`

### getVisibleColumns

Returns only columns that are currently visible (not hidden), in display order.

**Returns:** `ColumnState[]`

### setColumnVisible

Shows or hides a column.

| Parameter | Type | Description |
|---|---|---|
| `colId` | `string` | The column's unique identifier. |
| `visible` | `boolean` | `true` to show, `false` to hide. |

**Returns:** `void`

```ts title="setColumnVisible"
api.setColumnVisible('email', false); // hide
api.setColumnVisible('email', true);  // show
```

### setColumnPinned

Pins or unpins a column to the left or right side of the grid.

| Parameter | Type | Description |
|---|---|---|
| `colId` | `string` | The column's unique identifier. |
| `pinned` | `'left' \| 'right' \| null` | Pin direction, or `null` to unpin. |

**Returns:** `void`

```ts title="setColumnPinned"
api.setColumnPinned('name', 'left');
api.setColumnPinned('name', null); // unpin
```

### setColumnWidth

Sets the width of a column in pixels. The value is clamped to the column's min/max bounds.

| Parameter | Type | Description |
|---|---|---|
| `colId` | `string` | The column's unique identifier. |
| `width` | `number` | Desired width in pixels. |

**Returns:** `void`

### moveColumn

Moves a column to a new position in the display order.

| Parameter | Type | Description |
|---|---|---|
| `colId` | `string` | The column's unique identifier. |
| `toIndex` | `number` | Target zero-based display index. |

**Returns:** `void`

```ts title="moveColumn"
api.moveColumn('email', 0); // move to first position
```

### autoSizeColumn

Auto-sizes a single column to fit its content. Delegated to the DOM renderer.

| Parameter | Type | Description |
|---|---|---|
| `colId` | `string` | The column's unique identifier. |

**Returns:** `void`

### autoSizeAllColumns

Auto-sizes all columns to fit their content. Delegated to the DOM renderer.

**Returns:** `void`

### getColumnState

Returns a snapshot of all column states for persistence or restoration.

**Returns:** `ColumnState[]`

### applyColumnState

Applies partial column state updates. Only provided properties are applied.

| Parameter | Type | Description |
|---|---|---|
| `state` | `Partial<ColumnState>[]` | Array of partial column states. Each must include `colId`. |

**Returns:** `void`

```ts title="applyColumnState"
api.applyColumnState([
  { colId: 'name', width: 200, pinned: 'left' },
  { colId: 'email', hide: true },
]);
```

## Sort Methods

### setSortModel

Sets the sort model, replacing any existing sort configuration. Triggers row reprocessing.

| Parameter | Type | Description |
|---|---|---|
| `model` | `SortModelItem[]` | Array of sort items specifying column and direction. |

**Returns:** `void`

```ts title="setSortModel"
api.setSortModel([
  { colId: 'department', sort: 'asc' },
  { colId: 'salary', sort: 'desc' },
]);
```

### getSortModel

Returns the current sort model.

**Returns:** `SortModelItem[]`

```ts title="getSortModel"
const model = api.getSortModel();
// [{ colId: 'name', sort: 'asc' }]
```

## Filter Methods

### setFilterModel

Sets the filter model, replacing all active filters. Triggers row reprocessing.

| Parameter | Type | Description |
|---|---|---|
| `model` | `Record<string, FilterModel>` | Object keyed by column ID, each value being a filter configuration. |

**Returns:** `void`

```ts title="setFilterModel"
api.setFilterModel({
  name: { filterType: 'text', type: 'contains', filter: 'Smith' },
  salary: { filterType: 'number', type: 'greaterThan', filter: 50000 },
});
```

### getFilterModel

Returns the current filter model for all columns.

**Returns:** `Record<string, FilterModel>`

### setQuickFilter

Applies a quick filter across all columns. Rows not matching the text in any column are hidden.

| Parameter | Type | Description |
|---|---|---|
| `text` | `string` | The filter text. Pass an empty string to clear. |

**Returns:** `void`

```ts title="setQuickFilter"
api.setQuickFilter('engineering');
api.setQuickFilter(''); // clear
```

### isAnyFilterPresent

Checks whether any column filter or quick filter is currently active.

**Returns:** `boolean`

```ts title="isAnyFilterPresent"
if (api.isAnyFilterPresent()) {
  console.log('Filters are active');
}
```

## Selection Methods

### selectAll

Selects all rows that pass the current filter.

**Returns:** `void`

### deselectAll

Deselects all currently selected rows.

**Returns:** `void`

### getSelectedRows

Returns the data objects of all currently selected rows.

**Returns:** `TData[]`

### getSelectedNodes

Returns the row nodes of all currently selected rows.

**Returns:** `RowNode<TData>[]`

```ts title="Selection"
api.selectAll();
const rows = api.getSelectedRows();
const nodes = api.getSelectedNodes();
console.log(rows.length, 'rows selected');
api.deselectAll();
```

## Editing Methods

### startEditingCell

Starts editing a specific cell. The cell's value is resolved via `valueGetter` or the field path.

| Parameter | Type | Description |
|---|---|---|
| `params` | `CellPosition` | Cell position with `rowIndex` and `colId`. |

**Returns:** `void`

```ts title="startEditingCell"
api.startEditingCell({ rowIndex: 0, colId: 'name' });
```

### stopEditing

Stops the current cell or row edit. When cancelling, the cell reverts to its original value. When committing, the value pipeline (`valueParser` then `valueSetter`) is applied.

| Parameter | Type | Description |
|---|---|---|
| `cancel` | `boolean` (optional) | `true` to revert, `false` or omitted to commit. Default: `false`. |

**Returns:** `void`

```ts title="stopEditing"
api.stopEditing();       // commit the edit
api.stopEditing(true);   // cancel and revert
```

## Row Group Methods

### expandAll

Expands all group rows at every level. Triggers row reprocessing.

**Returns:** `void`

### collapseAll

Collapses all group rows at every level. Triggers row reprocessing.

**Returns:** `void`

### setRowNodeExpanded

Sets the expanded/collapsed state of a specific group row node.

| Parameter | Type | Description |
|---|---|---|
| `node` | `RowNode<TData>` | The group row node. |
| `expanded` | `boolean` | `true` to expand, `false` to collapse. |

**Returns:** `void`

```ts title="Row groups"
api.expandAll();
api.collapseAll();

const node = api.getRowNode('group-Engineering');
if (node) api.setRowNodeExpanded(node, false);
```

## Scroll Methods

### ensureIndexVisible

Scrolls the grid vertically to ensure a row at the given index is visible.

| Parameter | Type | Description |
|---|---|---|
| `index` | `number` | The display index of the row. |
| `position` | `'top' \| 'middle' \| 'bottom'` (optional) | Where to position the row in the viewport. Default: `'middle'`. |

**Returns:** `void`

```ts title="ensureIndexVisible"
api.ensureIndexVisible(50, 'middle');
api.ensureIndexVisible(0, 'top');
```

### ensureColumnVisible

Scrolls the grid horizontally to ensure a column is visible.

| Parameter | Type | Description |
|---|---|---|
| `colId` | `string` | The column's unique identifier. |

**Returns:** `void`

```ts title="ensureColumnVisible"
api.ensureColumnVisible('email');
```

## Rendering Methods

### refreshCells

Triggers a targeted refresh of specific cells or all cells.

| Parameter | Type | Description |
|---|---|---|
| `params` | `object` (optional) | Filter for which cells to refresh. When omitted, all visible cells are refreshed. |
| `params.rowIds` | `string[]` (optional) | Specific row IDs to refresh. |
| `params.colIds` | `string[]` (optional) | Specific column IDs to refresh. |
| `params.force` | `boolean` (optional) | When `true`, re-renders even if the value has not changed. |

**Returns:** `void`

```ts title="refreshCells"
api.refreshCells({ rowIds: ['row-1'], colIds: ['salary'], force: true });
api.refreshCells(); // refresh all
```

### redrawRows

Forces a complete redraw of all rendered rows. More expensive than `refreshCells`.

**Returns:** `void`

## Pagination Methods

### paginationGoToPage

Navigates to a specific page. The page number is clamped to valid bounds.

| Parameter | Type | Description |
|---|---|---|
| `page` | `number` | Zero-based page number. |

**Returns:** `void`

### paginationGetCurrentPage

Returns the current page number (zero-based).

**Returns:** `number`

### paginationGetTotalPages

Returns the total number of pages.

**Returns:** `number`

```ts title="Pagination"
api.paginationGoToPage(0); // first page
api.paginationGoToPage(api.paginationGetTotalPages() - 1); // last page

const current = api.paginationGetCurrentPage();
const total = api.paginationGetTotalPages();
```

## Configuration Methods

### setGridOption

Updates a single grid configuration option at runtime. Handles special cases for `rowData`, `columns`, `rowHeight`, `headerHeight`, and `paginationPageSize`.

| Parameter | Type | Description |
|---|---|---|
| `key` | `keyof GridConfig<TData>` | The configuration property name. |
| `value` | `GridConfig<TData>[K]` | The new value. |

**Returns:** `void`

```ts title="setGridOption"
api.setGridOption('rowHeight', 60);
api.setGridOption('paginationPageSize', 25);
api.setGridOption('theme', 'gridstorm-dark');
```

### getGridOption

Reads a single grid configuration option.

| Parameter | Type | Description |
|---|---|---|
| `key` | `keyof GridConfig<TData>` | The configuration property name. |

**Returns:** `GridConfig<TData>[K]`

```ts title="getGridOption"
const height = api.getGridOption('rowHeight');
const pageSize = api.getGridOption('paginationPageSize');
```

## Event Methods

### addEventListener

Registers a typed event listener. Returns an unsubscribe function.

| Parameter | Type | Description |
|---|---|---|
| `event` | `keyof GridEventMap<TData>` | The event name. |
| `listener` | `(payload: GridEventMap<TData>[K]) => void` | Callback invoked when the event fires. |

**Returns:** `() => void` -- Unsubscribe function.

```ts title="addEventListener"
const unsub = api.addEventListener('selection:changed', (e) => {
  console.log('Selected:', e.selectedNodes.length);
});

// Later: unsubscribe
unsub();
```

### removeEventListener

Removes a previously registered event listener by reference.

| Parameter | Type | Description |
|---|---|---|
| `event` | `keyof GridEventMap<TData>` | The event name. |
| `listener` | `(payload) => void` | The exact listener function reference to remove. |

**Returns:** `void`

```ts title="removeEventListener"
const handler = (e) => console.log(e.sortModel);
api.addEventListener('column:sort:changed', handler);
api.removeEventListener('column:sort:changed', handler);
```

## Plugin Methods

### getPluginApi

Retrieves a plugin's custom API by its plugin ID.

| Parameter | Type | Description |
|---|---|---|
| `pluginId` | `string` | The unique plugin identifier. |

**Returns:** `T | undefined`

```ts title="getPluginApi"
const clipboardApi = api.getPluginApi<ClipboardApi>('clipboard');
clipboardApi?.copyToClipboard();
```

## State Methods

### getState

Returns a readonly snapshot of the complete grid state.

**Returns:** `GridState<TData>`

```ts title="getState"
const state = api.getState();
console.log('Total nodes:', state.rowNodes.size);
console.log('Displayed:', state.displayedRowIds.length);
console.log('Sort:', state.sortModel);
console.log('Selection:', state.selection.selectedRowIds.size);
```

## Lifecycle Methods

### destroy

Destroys the grid instance. Cleans up all DOM elements, event listeners, plugins, and internal state. The API must not be used after calling this method.

**Returns:** `void`

```ts title="destroy"
engine.destroy();
// or
api.destroy();
```

:::caution
After calling `destroy()`, the GridApi is no longer usable. In React, destruction is handled automatically when the `<GridStorm>` component unmounts.
:::
