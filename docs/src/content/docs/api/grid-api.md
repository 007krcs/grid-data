---
title: GridApi
description: Complete reference for the GridApi interface, listing all methods for programmatic grid control.
---

The `GridApi` is the primary interface for programmatic interaction with a GridStorm grid. It is returned by `createGrid()` as `engine.api` and is available in React via the `useGridApi()` hook or the `onGridReady` callback.

## Data Methods

| Method | Signature | Description |
|---|---|---|
| `setRowData` | `(data: TData[]) => void` | Replace all row data. Clears selection and reprocesses rows. |
| `getRowNode` | `(id: string) => RowNode \| undefined` | Get a row node by its unique ID. |
| `forEachNode` | `(callback: (node, index) => void) => void` | Iterate over all row nodes (including non-displayed). |
| `getDisplayedRowCount` | `() => number` | Number of rows currently displayed (after filter/sort). |
| `getDisplayedRowAtIndex` | `(index: number) => RowNode \| undefined` | Get a displayed row by its visible index. |

### setRowData

```ts title="Replace data"
api.setRowData([
  { id: '1', name: 'Alice', age: 30 },
  { id: '2', name: 'Bob', age: 25 },
]);
```

:::note
`setRowData()` replaces the entire dataset. It clears the selection and triggers the `rowData:changed` event. For incremental updates, modify `node.data` directly and call `api.refreshCells()`.
:::

### getRowNode

```ts title="Get row node"
const node = api.getRowNode('emp-123');
if (node) {
  console.log(node.data?.name, node.selected);
}
```

## Column Methods

| Method | Signature | Description |
|---|---|---|
| `setColumnDefs` | `(defs: ColumnDef[]) => void` | Replace all column definitions. |
| `getColumn` | `(colId: string) => ColumnState \| undefined` | Get a column by ID. |
| `getAllColumns` | `() => ColumnState[]` | Get all columns (including hidden). |
| `getVisibleColumns` | `() => ColumnState[]` | Get only visible columns. |
| `setColumnVisible` | `(colId, visible) => void` | Show or hide a column. |
| `setColumnPinned` | `(colId, pinned) => void` | Pin a column to `'left'`, `'right'`, or `null`. |
| `setColumnWidth` | `(colId, width) => void` | Set a column's width in pixels. |
| `moveColumn` | `(colId, toIndex) => void` | Move a column to a new index. |
| `autoSizeColumn` | `(colId) => void` | Auto-size a column to fit content. |
| `autoSizeAllColumns` | `() => void` | Auto-size all columns. |
| `getColumnState` | `() => ColumnState[]` | Get the current column state array. |
| `applyColumnState` | `(state: Partial<ColumnState>[]) => void` | Apply partial column state updates. |

### setColumnVisible

```ts title="Toggle column visibility"
api.setColumnVisible('email', false);  // hide
api.setColumnVisible('email', true);   // show
```

### applyColumnState

Apply multiple column state changes at once:

```ts title="Batch column updates"
api.applyColumnState([
  { colId: 'name', width: 200, pinned: 'left' },
  { colId: 'email', hide: true },
]);
```

## Sorting Methods

| Method | Signature | Description |
|---|---|---|
| `setSortModel` | `(model: SortModelItem[]) => void` | Set the sort model. |
| `getSortModel` | `() => SortModelItem[]` | Get the current sort model. |

```ts title="Sorting"
api.setSortModel([
  { colId: 'name', sort: 'asc' },
  { colId: 'age', sort: 'desc' },
]);

const model = api.getSortModel();
```

## Filtering Methods

| Method | Signature | Description |
|---|---|---|
| `setFilterModel` | `(model: Record<string, FilterModel>) => void` | Set the filter model. |
| `getFilterModel` | `() => Record<string, FilterModel>` | Get the current filter model. |
| `setQuickFilter` | `(text: string) => void` | Set the quick filter text. |
| `isAnyFilterPresent` | `() => boolean` | Check if any filter is active. |

```ts title="Filtering"
api.setFilterModel({
  status: { filterType: 'text', type: 'equals', filter: 'active' },
});

api.setQuickFilter('search term');
const hasFilter = api.isAnyFilterPresent();
```

## Selection Methods

| Method | Signature | Description |
|---|---|---|
| `selectAll` | `() => void` | Select all displayed rows. |
| `deselectAll` | `() => void` | Deselect all rows. |
| `getSelectedRows` | `() => TData[]` | Get selected row data objects. |
| `getSelectedNodes` | `() => RowNode[]` | Get selected row nodes. |

```ts title="Selection"
api.selectAll();
const rows = api.getSelectedRows();
console.log(rows.length, 'rows selected');
api.deselectAll();
```

## Editing Methods

| Method | Signature | Description |
|---|---|---|
| `startEditingCell` | `(params: CellPosition) => void` | Start editing a cell. |
| `stopEditing` | `(cancel?: boolean) => void` | Stop editing. Pass `true` to cancel. |

```ts title="Editing"
api.startEditingCell({ rowIndex: 0, colId: 'name' });
// ... user edits ...
api.stopEditing();       // commit
api.stopEditing(true);   // cancel
```

## Scrolling Methods

| Method | Signature | Description |
|---|---|---|
| `ensureIndexVisible` | `(index, position?) => void` | Scroll to make a row visible. Position: `'top'`, `'middle'`, `'bottom'`. |
| `ensureColumnVisible` | `(colId) => void` | Scroll to make a column visible. |

```ts title="Scrolling"
api.ensureIndexVisible(50, 'middle');
api.ensureColumnVisible('email');
```

## Row Group Methods

| Method | Signature | Description |
|---|---|---|
| `expandAll` | `() => void` | Expand all group rows. |
| `collapseAll` | `() => void` | Collapse all group rows. |
| `setRowNodeExpanded` | `(node, expanded) => void` | Set expand state on a specific group node. |

```ts title="Groups"
api.expandAll();
const node = api.getRowNode('group-Engineering');
if (node) api.setRowNodeExpanded(node, false);
```

## Rendering Methods

| Method | Signature | Description |
|---|---|---|
| `refreshCells` | `(params?) => void` | Refresh specific cells. Params: `{ rowIds?, colIds?, force? }`. |
| `redrawRows` | `() => void` | Force full redraw of all visible rows. |

```ts title="Refresh"
api.refreshCells({ rowIds: ['row-1'], colIds: ['name'], force: true });
api.redrawRows();
```

## Pagination Methods

| Method | Signature | Description |
|---|---|---|
| `paginationGoToPage` | `(page: number) => void` | Navigate to a page (0-indexed). |
| `paginationGetCurrentPage` | `() => number` | Get current page number. |
| `paginationGetTotalPages` | `() => number` | Get total number of pages. |

```ts title="Pagination"
api.paginationGoToPage(0);           // first page
const page = api.paginationGetCurrentPage();
const total = api.paginationGetTotalPages();
```

## Configuration Methods

| Method | Signature | Description |
|---|---|---|
| `setGridOption` | `(key, value) => void` | Set a grid config option at runtime. |
| `getGridOption` | `(key) => value` | Get a grid config option. |

```ts title="Config"
api.setGridOption('rowHeight', 48);
const height = api.getGridOption('rowHeight');
```

## Event Methods

| Method | Signature | Description |
|---|---|---|
| `addEventListener` | `(event, listener) => void` | Subscribe to a typed grid event. |
| `removeEventListener` | `(event, listener) => void` | Unsubscribe from a grid event. |

```ts title="Events"
const handler = (e) => console.log(e.sortModel);
api.addEventListener('column:sort:changed', handler);
api.removeEventListener('column:sort:changed', handler);
```

## Plugin Methods

| Method | Signature | Description |
|---|---|---|
| `getPluginApi` | `(pluginId: string) => T \| undefined` | Get a plugin's registered API. |

## State Methods

| Method | Signature | Description |
|---|---|---|
| `getState` | `() => GridState` | Get the full grid state snapshot. |

## Lifecycle Methods

| Method | Signature | Description |
|---|---|---|
| `destroy` | `() => void` | Destroy the grid engine. Cleans up all plugins, listeners, and resources. |

:::caution
After calling `destroy()`, the GridApi is no longer usable. In React, destruction is handled automatically when the `<GridStorm>` component unmounts.
:::

## Next Steps

- **[GridConfig](/api/grid-config/)** -- Configuration options.
- **[Column Definitions](/api/column-definitions/)** -- ColumnDef property reference.
- **[Row Nodes](/api/row-nodes/)** -- RowNode interface reference.
