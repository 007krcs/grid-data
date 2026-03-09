# @gridstorm/plugin-pagination

Client-side page navigation for GridStorm.

## Install

```bash
npm install @gridstorm/plugin-pagination @gridstorm/core
```

## Usage

```typescript
import { createGridEngine } from '@gridstorm/core';
import { PaginationPlugin } from '@gridstorm/plugin-pagination';

const engine = createGridEngine({
  columnDefs: columns,
  rowData: myData,
  plugins: [PaginationPlugin({ pageSize: 25 })],
});

// Navigate pages
engine.dispatchCommand('pagination:goToPage', { page: 2 });
engine.dispatchCommand('pagination:nextPage', {});
```

## Features

- Configurable page size
- Page navigation commands (next, previous, first, last, go-to)
- Page count and current page state
- Works with sorting and filtering

## Documentation

[Pagination Guide](https://gridstorm.dev/docs/pagination) | [API Reference](https://gridstorm.dev/api/plugin-pagination)

## License

MIT
