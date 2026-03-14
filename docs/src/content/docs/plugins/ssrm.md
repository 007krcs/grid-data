---
title: Server-Side Row Model (SSRM)
description: Load, sort, filter, and group data on the server with lazy-loading and infinite scroll support.
---

The Server-Side Row Model plugin delegates data operations to a remote server. Instead of loading all rows into the browser, it fetches blocks on demand as the user scrolls, sorts, or filters.

## Installation

```bash
npm install @gridstorm/plugin-ssrm
```

```ts title="Setup"
import { SSRMPlugin } from '@gridstorm/plugin-ssrm';

const engine = createGrid({
  columns: [...],
  plugins: [
    SSRMPlugin({
      datasource: {
        getRows: async (params) => {
          const res = await fetch('/api/rows', {
            method: 'POST',
            body: JSON.stringify(params.request),
          });
          const data = await res.json();
          params.success({ rowData: data.rows, rowCount: data.total });
        },
      },
    }),
  ],
});
```

## Plugin Options

| Option | Type | Default | Description |
|---|---|---|---|
| `datasource` | `IServerSideDatasource` | required | Object with `getRows` method |
| `blockSize` | `number` | `100` | Rows fetched per block |
| `maxBlocksInCache` | `number` | `10` | Max cached blocks before eviction |
| `cacheOverflowSize` | `number` | `1` | Extra blocks to keep beyond viewport |

## Datasource Interface

The `getRows` callback receives a params object containing the current sort model, filter model, group keys, and row range. Return `params.success()` with the data or `params.fail()` on error.

## Commands

| Command | Payload | Description |
|---|---|---|
| `ssrm:refresh` | `{ purge? }` | Refresh data from server |
| `ssrm:setDatasource` | `{ datasource }` | Swap the datasource at runtime |

## Events

| Event | Payload | Description |
|---|---|---|
| `ssrm:blockLoaded` | `{ startRow, endRow }` | Block fetched successfully |
| `ssrm:blockFailed` | `{ startRow, error }` | Block request failed |

## Next Steps

- **[Sorting](/plugins/sorting/)** -- Server-side sorting via sort model passthrough.
- **[Filtering](/plugins/filtering/)** -- Server-side filtering via filter model passthrough.
