---
title: Sorting
description: Configure column sorting with single sort, multi-sort, custom comparators, and programmatic sort control.
---

The Sorting plugin enables sorting rows by one or more columns. Users click column headers to cycle through sort directions, and the sort model can be controlled programmatically.

## Installation

```bash
npm install @gridstorm/plugin-sorting
```

```ts title="Setup"
import { SortingPlugin } from '@gridstorm/plugin-sorting';

const engine = createGrid({
  columns: [
    { field: 'name', sortable: true },
    { field: 'age', sortable: true },
    { field: 'email', sortable: true },
  ],
  rowData: [...],
  plugins: [SortingPlugin()],
});
```

:::note
Columns must have `sortable: true` to participate in sorting. Use `defaultColDef` to enable sorting on all columns at once.
:::

## Plugin Options

```ts title="SortingPluginOptions"
interface SortingPluginOptions {
  multiSort?: boolean;         // Allow multi-column sort (default: true)
  maxSortColumns?: number;     // Max columns in multi-sort (default: Infinity)
  sortCycle?: SortDirection[];  // Sort cycle order (default: ['asc', 'desc', null])
  autoApply?: boolean;         // Reprocess rows after sort change (default: true)
}
```

### Multi-Sort

Multi-sort is enabled by default. Users hold Shift and click to add secondary sort columns:

```ts
SortingPlugin({ multiSort: true, maxSortColumns: 3 })
```

To disable multi-sort and only allow single-column sorting:

```ts
SortingPlugin({ multiSort: false })
```

### Custom Sort Cycle

The default sort cycle is `asc -> desc -> clear`. Customize it:

```ts title="Two-state cycle (no clear)"
SortingPlugin({ sortCycle: ['asc', 'desc'] })
```

```ts title="Descending first"
SortingPlugin({ sortCycle: ['desc', 'asc', null] })
```

## Sort Model

The sort model is an array of `SortModelItem` objects:

```ts title="SortModelItem"
interface SortModelItem {
  colId: string;
  sort: 'asc' | 'desc';
}
```

### Initial Sort

Set initial sort through column definitions:

```ts title="Pre-sorted column"
{
  field: 'name',
  sortable: true,
  sort: 'asc',       // Initial sort direction
  sortIndex: 0,      // Priority in multi-sort
}
```

### Get Current Sort Model

```ts
const model = api.getSortModel();
// [{ colId: 'name', sort: 'asc' }]
```

### Set Sort Model Programmatically

```ts title="Programmatic sort"
api.setSortModel([
  { colId: 'department', sort: 'asc' },
  { colId: 'salary', sort: 'desc' },
]);
```

### Clear Sort

```ts
api.setSortModel([]);
```

Or via command:

```ts
engine.commandBus.dispatch('sort:clear', {});
```

## Custom Comparators

Provide a `comparator` function on the column definition for custom sort logic:

```ts title="Custom comparator"
{
  field: 'date',
  sortable: true,
  comparator: (valueA, valueB, nodeA, nodeB, isDescending) => {
    const dateA = new Date(valueA).getTime();
    const dateB = new Date(valueB).getTime();
    return dateA - dateB;
  },
}
```

The comparator receives:

| Parameter | Type | Description |
|---|---|---|
| `valueA` | `TValue` | Value of cell A |
| `valueB` | `TValue` | Value of cell B |
| `nodeA` | `RowNode` | Row node for row A |
| `nodeB` | `RowNode` | Row node for row B |
| `isDescending` | `boolean` | Whether current sort is descending |

Return a negative number if A should come first, positive if B should come first, or zero if equal.

## Commands

| Command | Payload | Description |
|---|---|---|
| `sort:toggle` | `{ colId, multiSort? }` | Toggle sort on a column (cycles through sortCycle) |
| `sort:clear` | `{}` | Clear all sort |

## Events

| Event | Payload | Description |
|---|---|---|
| `column:sort:changed` | `{ sortModel }` | Sort model changed |

## React Integration

Use the `useGridSort` hook:

```tsx title="useGridSort"
import { useGridSort } from '@gridstorm/react';

function SortControls() {
  const { sortModel, isSorted, toggleSort, clearSort } = useGridSort();

  return (
    <div>
      <p>Sorted: {isSorted ? 'Yes' : 'No'}</p>
      <button onClick={() => toggleSort('name')}>Sort by Name</button>
      <button onClick={() => toggleSort('age', true)}>Add Age Sort</button>
      <button onClick={clearSort}>Clear Sort</button>
    </div>
  );
}
```

## Next Steps

- **[Filtering](/plugins/filtering/)** -- Filter rows by column values.
- **[Events & Commands](/core-concepts/events-commands/)** -- Full event reference.
