# @gridstorm/plugin-column-pinning

Pin columns to the left or right edge of the grid in GridStorm.

## Install

```bash
npm install @gridstorm/plugin-column-pinning @gridstorm/core
```

## Usage

```typescript
import { createGridEngine } from '@gridstorm/core';
import { ColumnPinningPlugin } from '@gridstorm/plugin-column-pinning';

const engine = createGridEngine({
  columnDefs: [
    { field: 'id', pinned: 'left' },
    { field: 'name' },
    { field: 'email' },
    { field: 'actions', pinned: 'right' },
  ],
  rowData: myData,
  plugins: [ColumnPinningPlugin()],
});

// Pin a column programmatically
engine.dispatchCommand('columnPinning:pin', { field: 'name', side: 'left' });
```

## Features

- Pin columns to left or right via column definitions
- Programmatic pin/unpin API
- Pinned columns stay fixed while scrolling horizontally
- Visual separator between pinned and scrollable areas

## Documentation

[Column Pinning Guide](https://grid-data-analytics-explorer.vercel.app//docs/column-pinning) | [API Reference](https://grid-data-analytics-explorer.vercel.app//api/plugin-column-pinning)

## License

MIT
