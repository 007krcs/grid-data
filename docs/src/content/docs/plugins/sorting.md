---
title: Sorting
description: Add single and multi-column sorting to your GridStorm data grid.
---

The Sorting plugin provides single and multi-column sorting through header click interactions. It manages the sort model state and cycles through configurable sort directions (ascending, descending, unsorted).

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-sorting
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { SortingPlugin } from '@gridstorm/plugin-sorting';

const grid = createGrid({
  columns: [
    { colId: 'name', field: 'name', headerName: 'Name', sortable: true },
    { colId: 'age', field: 'age', headerName: 'Age', sortable: true },
    { colId: 'email', field: 'email', headerName: 'Email', sortable: true },
  ],
  rowData: [],
  plugins: [
    SortingPlugin({
      multiSort: true,
      maxSortColumns: 3,
      sortCycle: ['asc', 'desc', null],
      autoApply: true,
    }),
  ],
});
```

:::example{title="Live Sorting Demo" href="/cookbook/#sorting-basic"}
Try sorting with single and multi-column configurations. Click column headers to sort ascending, descending, or unsorted.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `multiSort` | `boolean` | `true` | Allow multiple columns to be sorted simultaneously. |
| `maxSortColumns` | `number` | `Infinity` | Maximum number of columns allowed in multi-sort. |
| `sortCycle` | `SortDirection[]` | `['asc', 'desc', null]` | Sort cycle order. Each click advances to the next direction. `null` removes the sort. |
| `autoApply` | `boolean` | `true` | Trigger row reprocessing after a sort change. |

## Usage Examples

### Single-Column Sort

Toggle sorting on a column by dispatching the `sort:toggle` command. When `multiSort` is disabled or the user clicks without holding a modifier key, only one column is sorted at a time.

```typescript title="single-sort.ts"
// Sort by the "name" column
grid.commandBus.dispatch('sort:toggle', { colId: 'name' });

// Clicking again cycles to the next direction (desc)
grid.commandBus.dispatch('sort:toggle', { colId: 'name' });

// A third click removes the sort (null in the cycle)
grid.commandBus.dispatch('sort:toggle', { colId: 'name' });
```

### Multi-Column Sort

Pass `multiSort: true` in the payload to add a column to the existing sort model without replacing it. This mirrors the behavior of holding Shift and clicking a header.

```typescript title="multi-sort.ts"
// Sort by name first
grid.commandBus.dispatch('sort:toggle', { colId: 'name' });

// Then add age as a secondary sort
grid.commandBus.dispatch('sort:toggle', { colId: 'age', multiSort: true });
```

When `maxSortColumns` is reached, the oldest sort entry is removed to make room for the new one.

### Clear All Sorting

```typescript title="clear-sort.ts"
grid.commandBus.dispatch('sort:clear', {});
```

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `sort:toggle` | `{ colId: string; multiSort?: boolean }` | Toggle the sort direction on a column. Pass `multiSort: true` to add to the existing sort model instead of replacing it. Only sorts columns with `sortable: true`. |
| `sort:clear` | `{}` | Remove all sort entries and revert to the original row order. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `column:sort:changed` | `{ sortModel: SortModelItem[] }` | Emitted by the core API after the sort model is updated via `api.setSortModel()`. |

## React Integration

```tsx title="SortableGrid.tsx"
import { GridStorm, useGridApi } from '@gridstorm/react';
import { SortingPlugin } from '@gridstorm/plugin-sorting';

function SortableGrid({ rowData, columns }) {
  const apiRef = useGridApi();

  const clearSort = () => {
    apiRef.current?.commandBus.dispatch('sort:clear', {});
  };

  return (
    <>
      <button onClick={clearSort}>Clear Sort</button>
      <GridStorm
        rowData={rowData}
        columns={columns}
        plugins={[SortingPlugin({ multiSort: true, maxSortColumns: 3 })]}
      />
    </>
  );
}
```

## Next Steps

- [Filtering Plugin](/plugins/filtering/) -- combine sorting with column filters.
- [Grouping Plugin](/plugins/grouping/) -- sorted rows within groups respect the active sort model.
- [Selection Plugin](/plugins/selection/) -- select sorted rows.
