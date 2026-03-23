# @gridstorm/plugin-filtering

Column filters, quick filter, and compound conditions for GridStorm.

## Install

```bash
npm install @gridstorm/plugin-filtering @gridstorm/core
```

## Usage

```typescript
import { createGridEngine } from '@gridstorm/core';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';

const engine = createGridEngine({
  columnDefs: [
    { field: 'name', filterable: true },
    { field: 'age', filterable: true, type: 'number' },
  ],
  rowData: myData,
  plugins: [FilteringPlugin()],
});

// Apply a filter programmatically
engine.dispatchCommand('filter:set', {
  field: 'age',
  operator: 'greaterThan',
  value: 30,
});
```

## Features

- Text, number, and date column filters
- Quick filter (search across all columns)
- Compound conditions with AND/OR logic
- Custom filter functions
- Programmatic filter API via commands

## Documentation

[Filtering Guide](https://grid-data-analytics-explorer.vercel.app//docs/filtering) | [API Reference](https://grid-data-analytics-explorer.vercel.app//api/plugin-filtering)

## License

MIT
