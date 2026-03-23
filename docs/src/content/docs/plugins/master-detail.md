---
title: Master Detail
description: Add expandable detail rows beneath master rows with async data fetching and caching to your GridStorm data grid.
---

The Master Detail plugin provides expandable detail rows beneath master rows. When a master row is expanded, a detail row is inserted below it with configurable height. The plugin supports async data fetching, detail row caching, and full display integration with the virtual scroll system. This is an enterprise plugin that requires a license for production use.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-master-detail
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { MasterDetailPlugin } from '@gridstorm/plugin-master-detail';

const grid = createGrid({
  columns: [
    { colId: 'orderId', field: 'orderId', headerName: 'Order ID' },
    { colId: 'customer', field: 'customer', headerName: 'Customer' },
    { colId: 'total', field: 'total', headerName: 'Total' },
  ],
  rowData: [],
  plugins: [
    MasterDetailPlugin({
      getDetailRowData: ({ node, data, successCallback }) => {
        // Return data synchronously
        return data.lineItems;
      },
      detailRowHeight: 200,
      keepDetailRows: false,
      embedFullWidthRows: true,
    }),
  ],
});
```

:::example{title="Master Detail Demo" href="/cookbook/#master-detail"}
Expand rows to reveal detail grids with async data fetching, configurable row heights, and optional caching of detail data.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `getDetailRowData` | `(params: DetailDataParams) => any[] \| Promise<any[]>` | **required** | Fetches the detail data for a master row. Can return data synchronously, via the `successCallback`, or as a Promise. |
| `detailGridOptions` | `(params: DetailGridParams) => any` | `undefined` | Factory returning grid configuration for the detail grid (columns, plugins, etc.). |
| `detailRowHeight` | `number \| (params: DetailHeightParams) => number` | `200` | Height of the detail row in pixels. Use a function for per-row dynamic heights. |
| `keepDetailRows` | `boolean` | `false` | When `true`, detail row data and DOM nodes are cached when collapsed. When `false`, they are destroyed on collapse. |
| `embedFullWidthRows` | `boolean` | `true` | When `true`, detail rows span the full width of the grid. |

## Data Fetching

The `getDetailRowData` callback supports three patterns:

```typescript title="sync-return.ts"
// 1. Synchronous return
getDetailRowData: ({ data }) => data.lineItems;

// 2. Promise return
getDetailRowData: async ({ data }) => {
  const response = await fetch(`/api/orders/${data.orderId}/items`);
  return response.json();
};

// 3. Callback pattern
getDetailRowData: ({ node, successCallback }) => {
  fetch(`/api/orders/${node.id}/items`)
    .then((res) => res.json())
    .then((items) => successCallback(items));
};
```

Fetched data is cached by master row ID. Subsequent expansions of the same row use the cache unless the detail was destroyed on collapse (`keepDetailRows: false`).

## Usage Examples

### Expand and Collapse Master Rows

```typescript title="expand-collapse.ts"
// Expand a master row
grid.commandBus.dispatch('detail:expand', { nodeId: 'order-1' });

// Collapse a master row
grid.commandBus.dispatch('detail:collapse', { nodeId: 'order-1' });

// Toggle (expand if collapsed, collapse if expanded)
grid.commandBus.dispatch('detail:toggle', { nodeId: 'order-1' });
```

### Expand and Collapse All

```typescript title="expand-collapse-all.ts"
// Expand all master rows (fetches data for each asynchronously)
grid.commandBus.dispatch('detail:expandAll', {});

// Collapse all master rows
grid.commandBus.dispatch('detail:collapseAll', {});
```

### Refresh Detail Data

Force a re-fetch of detail data for a specific master row by clearing the cache.

```typescript title="refresh-detail.ts"
grid.commandBus.dispatch('detail:refreshDetail', { nodeId: 'order-1' });
```

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `detail:expand` | `{ nodeId: string }` | Expand a master row. Inserts a detail row and fetches data asynchronously. |
| `detail:collapse` | `{ nodeId: string }` | Collapse a master row. Removes the detail row (and cache unless `keepDetailRows` is `true`). |
| `detail:toggle` | `{ nodeId: string }` | Toggle a master row between expanded and collapsed. |
| `detail:expandAll` | `{}` | Expand all displayed master rows. Fetches data for each in parallel. |
| `detail:collapseAll` | `{}` | Collapse all expanded master rows. |
| `detail:refreshDetail` | `{ nodeId: string }` | Clear cached data for a master row and re-fetch if currently expanded. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `detail:opened` | `{ nodeId: string; node: RowNode }` | Emitted when a master row is expanded. |
| `detail:closed` | `{ nodeId: string; node: RowNode }` | Emitted when a master row is collapsed. |

## React Integration

```tsx title="MasterDetailGrid.tsx"
import { GridStorm, useGridApi } from '@gridstorm/react';
import { MasterDetailPlugin } from '@gridstorm/plugin-master-detail';

function MasterDetailGrid({ rowData, columns }) {
  const apiRef = useGridApi();

  const expandAll = () => apiRef.current?.commandBus.dispatch('detail:expandAll', {});
  const collapseAll = () => apiRef.current?.commandBus.dispatch('detail:collapseAll', {});

  return (
    <>
      <button onClick={expandAll}>Expand All</button>
      <button onClick={collapseAll}>Collapse All</button>
      <GridStorm
        rowData={rowData}
        columns={columns}
        plugins={[
          MasterDetailPlugin({
            getDetailRowData: async ({ data }) => {
              const res = await fetch(`/api/orders/${data.id}/items`);
              return res.json();
            },
            detailRowHeight: 250,
            keepDetailRows: true,
          }),
        ]}
      />
    </>
  );
}
```

## Next Steps

- [Grouping Plugin](/plugins/grouping/) -- combine grouping with master-detail for multi-level hierarchies.
- [Selection Plugin](/plugins/selection/) -- select master rows.
- [Row Reorder Plugin](/plugins/row-reorder/) -- reorder master rows via drag-and-drop.
