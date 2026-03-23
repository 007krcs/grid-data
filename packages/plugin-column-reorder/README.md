# @gridstorm/plugin-column-reorder

Drag-and-drop column reordering for GridStorm.

## Install

```bash
npm install @gridstorm/plugin-column-reorder @gridstorm/core
```

## Usage

```typescript
import { createGridEngine } from '@gridstorm/core';
import { ColumnReorderPlugin } from '@gridstorm/plugin-column-reorder';

const engine = createGridEngine({
  columnDefs: [
    { field: 'name' },
    { field: 'age' },
    { field: 'email' },
  ],
  rowData: myData,
  plugins: [ColumnReorderPlugin()],
});

// Reorder columns programmatically
engine.dispatchCommand('columnReorder:move', { field: 'email', toIndex: 0 });
```

## Features

- Drag column headers to reorder
- Visual drop indicator during drag
- Programmatic reorder API
- Respects pinned column boundaries

## Documentation

[Column Reorder Guide](https://grid-data-analytics-explorer.vercel.app//docs/column-reorder) | [API Reference](https://grid-data-analytics-explorer.vercel.app//api/plugin-column-reorder)

## License

MIT
