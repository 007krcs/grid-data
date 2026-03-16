---
title: Pagination
description: Add client-side pagination with page navigation and configurable page sizes to your GridStorm data grid.
---

The Pagination plugin provides client-side pagination with full page navigation commands, configurable page sizes, and a page size selector. It manages the pagination state slice and resets to page 0 when the page size changes.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-pagination
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { PaginationPlugin } from '@gridstorm/plugin-pagination';

const grid = createGrid({
  columns: [
    { colId: 'name', field: 'name', headerName: 'Name' },
    { colId: 'email', field: 'email', headerName: 'Email' },
  ],
  rowData: [],
  plugins: [
    PaginationPlugin({
      pageSize: 50,
      pageSizeOptions: [25, 50, 100, 250],
      showPageSizeSelector: true,
    }),
  ],
});
```

:::example{title="Live Pagination Demo" href="/cookbook/#pagination-basic"}
Navigate through pages with configurable page sizes. See page controls with first, prev, next, last buttons.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `pageSize` | `number` | `100` | Number of rows displayed per page. Set on the pagination state during plugin install. |
| `pageSizeOptions` | `number[]` | `[25, 50, 100, 250]` | Available page size options for the page size selector dropdown. |
| `showPageSizeSelector` | `boolean` | `true` | Show the page size selector in the pagination bar. |

## Usage Examples

### Navigate Between Pages

All page indices are zero-based. The `nextPage` and `prevPage` commands automatically guard against going out of bounds.

```typescript title="page-navigation.ts"
// Go to a specific page (zero-based)
grid.commandBus.dispatch('pagination:goToPage', { page: 2 });

// Go to next / previous page
grid.commandBus.dispatch('pagination:nextPage', {});
grid.commandBus.dispatch('pagination:prevPage', {});

// Jump to first / last page
grid.commandBus.dispatch('pagination:firstPage', {});
grid.commandBus.dispatch('pagination:lastPage', {});
```

### Change Page Size

Changing the page size resets the current page to 0 and emits a `pagination:changed` event with the new total pages.

```typescript title="page-size.ts"
grid.commandBus.dispatch('pagination:setPageSize', { pageSize: 25 });
```

### Read Current Pagination State

```typescript title="read-state.ts"
const currentPage = grid.api.paginationGetCurrentPage();
const totalPages = grid.api.paginationGetTotalPages();
console.log(`Page ${currentPage + 1} of ${totalPages}`);
```

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `pagination:goToPage` | `{ page: number }` | Navigate to a specific page (zero-based index). |
| `pagination:nextPage` | `{}` | Go to the next page. No-op if already on the last page. |
| `pagination:prevPage` | `{}` | Go to the previous page. No-op if already on the first page. |
| `pagination:firstPage` | `{}` | Jump to the first page (page 0). |
| `pagination:lastPage` | `{}` | Jump to the last page. |
| `pagination:setPageSize` | `{ pageSize: number }` | Change the page size. Resets `currentPage` to 0 and emits `pagination:changed`. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `pagination:changed` | `{ currentPage: number; totalPages: number; pageSize: number }` | Emitted when the page, page size, or total pages changes. |

## React Integration

```tsx title="PaginatedGrid.tsx"
import { GridStorm, useGridApi } from '@gridstorm/react';
import { PaginationPlugin } from '@gridstorm/plugin-pagination';

function PaginatedGrid({ rowData, columns }) {
  const apiRef = useGridApi();

  const nextPage = () => apiRef.current?.commandBus.dispatch('pagination:nextPage', {});
  const prevPage = () => apiRef.current?.commandBus.dispatch('pagination:prevPage', {});

  return (
    <>
      <div>
        <button onClick={prevPage}>Previous</button>
        <button onClick={nextPage}>Next</button>
      </div>
      <GridStorm
        rowData={rowData}
        columns={columns}
        plugins={[PaginationPlugin({ pageSize: 50 })]}
      />
    </>
  );
}
```

## Next Steps

- [Sorting Plugin](/plugins/sorting/) -- sort rows before pagination.
- [Filtering Plugin](/plugins/filtering/) -- paginate filtered results.
- [Server-Side Row Model](/plugins/ssrm/) -- for server-side pagination with lazy block loading.
