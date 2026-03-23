# @gridstorm/plugin-column-resize

Drag-to-resize columns with visual indicators for GridStorm.

## Install

```bash
npm install @gridstorm/plugin-column-resize @gridstorm/core
```

## Usage

```typescript
import { createGridEngine } from '@gridstorm/core';
import { ColumnResizePlugin } from '@gridstorm/plugin-column-resize';

const engine = createGridEngine({
  columnDefs: [
    { field: 'name', resizable: true, minWidth: 100 },
    { field: 'email', resizable: true },
  ],
  rowData: myData,
  plugins: [ColumnResizePlugin()],
});

// Resize a column programmatically
engine.dispatchCommand('columnResize:set', { field: 'name', width: 200 });
```

## Features

- Drag column borders to resize
- Minimum and maximum width constraints
- Auto-size columns to fit content
- Visual resize indicator during drag
- Programmatic resize API

## Documentation

[Column Resize Guide](https://grid-data-analytics-explorer.vercel.app//docs/column-resize) | [API Reference](https://grid-data-analytics-explorer.vercel.app//api/plugin-column-resize)

## License

MIT
