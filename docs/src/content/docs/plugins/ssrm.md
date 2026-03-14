---
title: Server-Side Row Model (SSRM)
description: Load rows lazily from a server data source with block-based caching, viewport-driven fetching, and automatic cache invalidation.
---

The Server-Side Row Model plugin delegates data loading to a remote server. Instead of loading all rows into the browser, it fetches blocks on demand as the user scrolls, and automatically refetches when sort or filter state changes. This is an enterprise plugin that requires a license for production use.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-ssrm
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { SSRMPlugin } from '@gridstorm/plugin-ssrm';

const grid = createGrid({
  columns: [
    { colId: 'name', field: 'name', headerName: 'Name', sortable: true },
    { colId: 'email', field: 'email', headerName: 'Email' },
    { colId: 'age', field: 'age', headerName: 'Age', sortable: true },
  ],
  plugins: [
    SSRMPlugin({
      dataSource: {
        getRows: async (request) => {
          const response = await fetch('/api/rows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
          });
          const data = await response.json();
          return { rowData: data.rows, rowCount: data.total };
        },
        destroy: () => {
          // Optional cleanup
        },
      },
      blockSize: 100,
      maxBlocks: 10,
      showLoading: true,
    }),
  ],
});
```

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `dataSource` | `ServerDataSource` | **required** | Object with a `getRows` method and optional `destroy` method. |
| `blockSize` | `number` | `100` | Number of rows fetched per block. |
| `maxBlocks` | `number` | `10` | Maximum number of blocks to cache. Oldest blocks are evicted when the limit is reached. |
| `showLoading` | `boolean` | `true` | Show a loading overlay while fetching blocks. |

## Data Source Interface

```typescript title="data-source.ts"
interface ServerDataSource {
  getRows(params: ServerRequest): Promise<ServerResult>;
  destroy?(): void;
}

interface ServerRequest {
  startRow: number;          // Starting row index
  endRow: number;            // Ending row index (exclusive)
  sortModel: Array<{ colId: string; sort: 'asc' | 'desc' }>;
  filterModel: Record<string, any>;
  groupKeys: string[];       // Group keys for grouped server-side data
}

interface ServerResult {
  rowData: any[];            // The fetched row data
  rowCount?: number;         // Total row count for scroll sizing
  lastRow?: number;          // Alternative to rowCount
}
```

## Usage Examples

### Viewport-Driven Fetching

The plugin automatically listens to `viewport:changed` events and fetches any missing blocks within the visible range. You can also request blocks explicitly.

```typescript title="ensure-rows.ts"
grid.commandBus.dispatch('ssrm:ensureRows', {
  startRow: 0,
  endRow: 200,
});
```

### Refresh Data

Clear the cache and re-fetch from block 0.

```typescript title="refresh.ts"
grid.commandBus.dispatch('ssrm:refresh', {});
```

### Sort and Filter Integration

When sort or filter state changes (via `column:sort:changed` or `filter:changed` events), the plugin automatically clears all cached blocks and re-fetches starting from block 0. The new sort/filter state is included in the `ServerRequest`.

```typescript title="server-sort.ts"
// Sorting is passed through to the server automatically
grid.commandBus.dispatch('sort:toggle', { colId: 'name' });
// The SSRM plugin detects the sort change, clears its cache,
// and re-fetches with the updated sortModel
```

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `ssrm:ensureRows` | `{ startRow: number; endRow: number }` | Ensure rows in the given range are loaded. Fetches any missing blocks. |
| `ssrm:refresh` | `{}` | Clear the block cache and re-fetch from the beginning. |
| `ssrm:getCacheInfo` | `{}` | Returns cache metadata: `{ totalRowCount, loading, blockSize, maxBlocks }`. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `rowData:changed` | `{ rowData: any[] }` | Emitted after a block is successfully loaded and the store is updated. |
| `viewport:changed` | `{ firstRow: number; lastRow: number }` | Listened to internally to trigger block fetching as the user scrolls. |
| `column:sort:changed` | `{ sortModel: SortModelItem[] }` | Listened to internally to invalidate cache and re-fetch on sort changes. |
| `filter:changed` | `{ filterModel: Record<string, FilterModel> }` | Listened to internally to invalidate cache and re-fetch on filter changes. |

## React Integration

```tsx title="ServerGrid.tsx"
import { GridStorm, useGridApi } from '@gridstorm/react';
import { SSRMPlugin } from '@gridstorm/plugin-ssrm';

function ServerGrid({ columns }) {
  const apiRef = useGridApi();

  const refresh = () => apiRef.current?.commandBus.dispatch('ssrm:refresh', {});

  return (
    <>
      <button onClick={refresh}>Refresh Data</button>
      <GridStorm
        columns={columns}
        plugins={[
          SSRMPlugin({
            dataSource: {
              getRows: async (request) => {
                const res = await fetch('/api/data', {
                  method: 'POST',
                  body: JSON.stringify(request),
                });
                return res.json();
              },
            },
            blockSize: 50,
            maxBlocks: 20,
          }),
        ]}
      />
    </>
  );
}
```

## Next Steps

- [Sorting Plugin](/plugins/sorting/) -- server-side sorting via sort model passthrough.
- [Filtering Plugin](/plugins/filtering/) -- server-side filtering via filter model passthrough.
- [Pagination Plugin](/plugins/pagination/) -- for client-side pagination as an alternative approach.
