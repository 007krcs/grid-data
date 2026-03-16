---
title: Filtering
description: Add column-level and quick-filter text filtering to your GridStorm data grid.
---

The Filtering plugin provides column-level filtering and a global quick filter. It registers command handlers for setting, clearing, and querying filters while the core engine handles the actual predicate evaluation via `filterRowNodes()`.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-filtering
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';

const grid = createGrid({
  columns: [
    { colId: 'name', field: 'name', headerName: 'Name' },
    { colId: 'status', field: 'status', headerName: 'Status' },
    { colId: 'age', field: 'age', headerName: 'Age' },
  ],
  rowData: [],
  plugins: [
    FilteringPlugin({
      quickFilterDebounce: 300,
      keepFilterOnColumnsChange: true,
      caseSensitive: false,
    }),
  ],
});
```

:::example{title="Live Filtering Demo" href="/cookbook/#filtering-text"}
See text, number, and date filters in action. Type in the filter input to filter rows in real-time.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `quickFilterDebounce` | `number` | `300` | Debounce delay in milliseconds for quick filter input. |
| `keepFilterOnColumnsChange` | `boolean` | `true` | Preserve filter state when column definitions change. When `false`, stale filters for removed columns are pruned automatically on the `columns:changed` event. |
| `caseSensitive` | `boolean` | `false` | Enable case-sensitive filtering. |

## Usage Examples

### Set a Column Filter

Apply a filter model to a specific column using the `filter:set` command with a `colId` and `model` payload. Pass `model: null` to remove the filter for that column.

```typescript title="column-filter.ts"
// Set a filter on the "status" column
grid.commandBus.dispatch('filter:set', {
  colId: 'status',
  model: { type: 'equals', filter: 'active' },
});

// Remove the filter for "status"
grid.commandBus.dispatch('filter:set', {
  colId: 'status',
  model: null,
});
```

### Quick Filter (Global Text Search)

The quick filter searches across all columns using a single text input.

```typescript title="quick-filter.ts"
grid.commandBus.dispatch('filter:quickFilter', { text: 'search term' });

// Clear the quick filter
grid.commandBus.dispatch('filter:quickFilter', { text: '' });
```

### Check if a Column Has an Active Filter

```typescript title="check-filter.ts"
grid.commandBus.dispatch('filter:isActive', {
  colId: 'status',
  callback: (isActive) => {
    console.log('Status filter active:', isActive);
  },
});
```

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `filter:set` | `{ colId: string; model: FilterModel \| null }` | Set or remove a filter on a specific column. Pass `model: null` to remove. |
| `filter:setColumn` | `{ colId: string; model: FilterModel }` | Convenience command to set a filter on a column (merges with existing filters). |
| `filter:removeColumn` | `{ colId: string }` | Remove the filter for a specific column. |
| `filter:clear` | `{}` | Clear all column filters at once. |
| `filter:quickFilter` | `{ text: string }` | Set the global quick filter text. Pass an empty string to clear. |
| `filter:isActive` | `{ colId: string; callback: (active: boolean) => void }` | Query whether a column has an active filter. Result is returned via the callback. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `filter:changed` | `{ filterModel: Record<string, FilterModel> }` | Emitted by the core API after the filter model is updated. |
| `columns:changed` | `{ columns: ColumnState[] }` | Listened to internally when `keepFilterOnColumnsChange` is `false` to prune stale filters. |

## React Integration

```tsx title="FilterableGrid.tsx"
import { GridStorm, useGridApi } from '@gridstorm/react';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';

function FilterableGrid({ rowData, columns }) {
  const apiRef = useGridApi();

  const onQuickFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
    apiRef.current?.commandBus.dispatch('filter:quickFilter', {
      text: e.target.value,
    });
  };

  const clearAll = () => {
    apiRef.current?.commandBus.dispatch('filter:clear', {});
  };

  return (
    <>
      <input placeholder="Search..." onChange={onQuickFilter} />
      <button onClick={clearAll}>Clear Filters</button>
      <GridStorm
        rowData={rowData}
        columns={columns}
        plugins={[FilteringPlugin({ quickFilterDebounce: 200 })]}
      />
    </>
  );
}
```

## Next Steps

- [Sorting Plugin](/plugins/sorting/) -- sort filtered results.
- [Pagination Plugin](/plugins/pagination/) -- paginate filtered rows.
- [Grouping Plugin](/plugins/grouping/) -- grouped views respect active filters automatically.
