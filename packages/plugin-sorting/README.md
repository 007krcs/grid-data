# @gridstorm/plugin-sorting

Single and multi-column sorting for GridStorm.

## Install

```bash
npm install @gridstorm/plugin-sorting @gridstorm/core
```

## Usage

```typescript
import { createGridEngine } from '@gridstorm/core';
import { SortingPlugin } from '@gridstorm/plugin-sorting';

const engine = createGridEngine({
  columnDefs: [
    { field: 'name', sortable: true },
    { field: 'age', sortable: true, type: 'number' },
  ],
  rowData: myData,
  plugins: [SortingPlugin()],
});

// Sort programmatically
engine.dispatchCommand('sort:set', { field: 'name', direction: 'asc' });
```

## Features

- Click column headers to cycle through asc/desc/none
- Multi-column sort with Shift+click
- Custom comparator functions
- Programmatic sort API via commands

## Documentation

[Sorting Guide](https://grid-data-analytics-explorer.vercel.app//docs/sorting) | [API Reference](https://grid-data-analytics-explorer.vercel.app//api/plugin-sorting)

## License

MIT
