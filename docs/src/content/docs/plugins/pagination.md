---
title: Pagination
description: Configure client-side pagination with page sizes, navigation commands, and React hooks.
---

The Pagination plugin provides client-side pagination, splitting displayed rows into pages with configurable page sizes and full navigation controls.

## Installation

```bash
npm install @gridstorm/plugin-pagination
```

```ts title="Setup"
import { PaginationPlugin } from '@gridstorm/plugin-pagination';

const engine = createGrid({
  columns: [...],
  rowData: [...],
  plugins: [PaginationPlugin({ pageSize: 25 })],
});
```

## Plugin Options

```ts title="PaginationPluginOptions"
interface PaginationPluginOptions {
  pageSize?: number;              // Rows per page (default: 100)
  pageSizeOptions?: number[];     // Selectable page sizes (default: [25, 50, 100, 250])
  showPageSizeSelector?: boolean; // Show size selector (default: true)
}
```

## Pagination API

### Navigate Between Pages

```ts
api.paginationGoToPage(0);       // Go to first page (0-indexed)
api.paginationGoToPage(3);       // Go to page 4
```

### Get Current State

```ts
const currentPage = api.paginationGetCurrentPage();  // 0-indexed
const totalPages = api.paginationGetTotalPages();
```

### Page Navigation Commands

| Command | Payload | Description |
|---|---|---|
| `pagination:goToPage` | `{ page }` | Navigate to specific page |
| `pagination:nextPage` | `{}` | Go to next page |
| `pagination:prevPage` | `{}` | Go to previous page |
| `pagination:firstPage` | `{}` | Go to first page |
| `pagination:lastPage` | `{}` | Go to last page |
| `pagination:setPageSize` | `{ pageSize }` | Change page size (resets to page 0) |

```ts title="Using commands"
engine.commandBus.dispatch('pagination:nextPage', {});
engine.commandBus.dispatch('pagination:setPageSize', { pageSize: 50 });
```

## Events

| Event | Payload | Description |
|---|---|---|
| `pagination:changed` | `{ currentPage, totalPages, pageSize }` | Pagination state changed |

## React Integration

Use the `useGridPagination` hook for reactive pagination state:

```tsx title="useGridPagination"
import { useGridPagination } from '@gridstorm/react';

function PaginationBar() {
  const {
    currentPage,
    totalPages,
    pageSize,
    totalRows,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
  } = useGridPagination();

  return (
    <div className="pagination">
      <button onClick={firstPage} disabled={!hasPreviousPage}>First</button>
      <button onClick={previousPage} disabled={!hasPreviousPage}>Prev</button>
      <span>
        Page {currentPage + 1} of {totalPages}
        ({totalRows} rows, {pageSize}/page)
      </span>
      <button onClick={nextPage} disabled={!hasNextPage}>Next</button>
      <button onClick={lastPage} disabled={!hasNextPage}>Last</button>
    </div>
  );
}
```

### Controlled Pagination

Control the current page from React state:

```tsx title="Controlled pagination"
const [page, setPage] = useState(0);

<GridStorm
  columns={columns}
  rowData={data}
  plugins={plugins}
  currentPage={page}
  onCurrentPageChange={setPage}
/>
```

## Interaction with Sorting and Filtering

Pagination operates on the **displayed** row set. When sorting or filtering changes the displayed rows, the total page count is recalculated and the current page is clamped to a valid range. Filtering reduces the total rows, which may reduce the number of pages.

## Next Steps

- **[Sorting](/plugins/sorting/)** -- Sorting interacts with pagination.
- **[Filtering](/plugins/filtering/)** -- Filtering changes the row count for pagination.
