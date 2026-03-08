---
title: Row Data
description: Set row data, understand row nodes, manage updates, and handle large datasets.
---

Row data is the array of objects that populates the grid. Each object in the array becomes one row, and the grid's column definitions determine which properties are displayed.

## Setting Row Data

### At Initialization

Pass row data through the grid config:

```ts title="Initial data"
const engine = createGrid({
  columns: [{ field: 'name' }, { field: 'age' }],
  rowData: [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 },
  ],
});
```

### After Initialization

Update row data at any time through the API:

```ts title="API update"
api.setRowData([
  { name: 'Alice', age: 31 },
  { name: 'Bob', age: 26 },
  { name: 'Carol', age: 28 },
]);
```

In React, pass `rowData` as a prop. The adapter syncs changes automatically:

```tsx title="React prop"
<GridStorm columns={columns} rowData={data} />
```

:::note
Calling `setRowData()` replaces the entire dataset. It clears the current selection and reprocesses all rows through the filter/sort pipeline.
:::

## Row Nodes

Internally, GridStorm wraps each data object in a `RowNode`. A RowNode tracks metadata needed for rendering and interaction:

```ts title="RowNode interface"
interface RowNode<TData> {
  id: string;               // Unique identifier
  data: TData | undefined;  // Your data object (undefined for group rows)
  sourceIndex: number;       // Index in the original data array
  displayIndex: number;      // Index in the displayed (post-filter/sort) list
  level: number;             // Nesting level (0 = top level)
  rowHeight: number;         // Height in pixels
  rowTop: number;            // Vertical offset for virtual scroll
  parent: RowNode | null;    // Parent group node
  children: RowNode[] | null;// Child rows (for group nodes)
  expanded: boolean;         // Is this group expanded?
  group: boolean;            // Is this a group row?
  groupField: string | null; // Which field is this grouped by?
  groupValue: any;           // The group key value
  leafChildrenCount: number; // Count of leaf descendants
  aggData: Record<string, any> | null; // Aggregated values
  selected: boolean;         // Is this row selected?
  selectable: boolean;       // Can this row be selected?
  rowPinned: 'top' | 'bottom' | null; // Pinned row position
  version: number;           // Change counter for re-rendering
}
```

### Accessing Row Nodes

Retrieve a single row node by ID:

```ts
const node = api.getRowNode('row-123');
```

Iterate over all row nodes:

```ts
api.forEachNode((node, index) => {
  console.log(node.id, node.data);
});
```

Get a displayed row by its visible index:

```ts
const node = api.getDisplayedRowAtIndex(0); // first visible row
```

Get the total displayed count (after filters):

```ts
const count = api.getDisplayedRowCount();
```

## Row IDs

By default, GridStorm generates row IDs from the array index (`"0"`, `"1"`, `"2"`, ...). For datasets where rows have a natural unique key, provide a `getRowId` function:

```ts title="Custom row IDs"
const engine = createGrid({
  columns: [...],
  rowData: employees,
  getRowId: (params) => params.data.employeeId,
});
```

:::tip
Always provide `getRowId` when your data has a natural unique identifier. This ensures correct behavior when:
- Updating data (GridStorm can match old and new rows)
- Using selection (selected row IDs persist across data updates)
- Working with grouping (group row IDs include parent keys)
:::

The `getRowId` callback receives:

```ts
interface GetRowIdParams<TData> {
  data: TData;         // The row data object
  index: number;       // Array index
  parentKeys?: string[]; // Parent group keys (for grouped data)
}
```

## Row Height

### Fixed Row Height

Set a uniform row height (default is 40 pixels):

```ts
const engine = createGrid({
  columns: [...],
  rowData: [...],
  rowHeight: 48,
});
```

### Dynamic Row Height

Provide a function to compute row height per row:

```ts title="Variable row heights"
const engine = createGrid({
  columns: [...],
  rowData: [...],
  rowHeight: (params) => {
    return params.data.hasNotes ? 80 : 40;
  },
});
```

## Pinned Rows

Pin rows to the top or bottom of the grid so they remain visible during scrolling:

```ts title="Pinned rows"
const engine = createGrid({
  columns: [...],
  rowData: employees,
  pinnedTopRowData: [{ name: 'TOTAL', age: null }],
  pinnedBottomRowData: [{ name: 'Average', age: 32 }],
});
```

Pinned rows are excluded from sorting, filtering, and pagination. They always display at their designated position.

## Updating Individual Cells

While `setRowData()` replaces the entire dataset, you can update individual cells by modifying the data object on a row node and refreshing:

```ts title="Cell-level update"
const node = api.getRowNode('emp-123');
if (node && node.data) {
  node.data.salary = 75000;
  node.version++;
  api.refreshCells({ rowIds: ['emp-123'], colIds: ['salary'] });
}
```

:::caution
Mutating `node.data` directly bypasses the command bus. For auditable state changes, dispatch an editing command instead.
:::

## Performance with Large Datasets

GridStorm is designed to handle large datasets efficiently:

- **Virtual scrolling** -- Only rows visible in the viewport are rendered to the DOM. A dataset of 100,000 rows creates the same number of DOM elements as a dataset of 50 rows.
- **Batched state updates** -- Multiple state changes within a `store.batch()` call produce a single subscriber notification.
- **Incremental row node updates** -- The `version` counter on RowNode allows the renderer to skip unchanged rows.
- **Efficient sort and filter** -- The row processing pipeline operates on arrays in memory without DOM involvement.

For datasets with 100,000+ rows, ensure you provide a `getRowId` function so GridStorm can efficiently match rows across updates.

## Next Steps

- **[Row Nodes API](/api/row-nodes/)** -- Complete RowNode interface reference.
- **[Selection](/plugins/selection/)** -- Selecting rows by click, keyboard, or API.
- **[Grouping](/plugins/grouping/)** -- Organizing rows into expandable groups.
