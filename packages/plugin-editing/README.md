# @gridstorm/plugin-editing

Cell and full-row editing with built-in editors for GridStorm.

## Install

```bash
npm install @gridstorm/plugin-editing @gridstorm/core
```

## Usage

```typescript
import { createGridEngine } from '@gridstorm/core';
import { EditingPlugin } from '@gridstorm/plugin-editing';

const engine = createGridEngine({
  columnDefs: [
    { field: 'name', editable: true },
    { field: 'age', editable: true, cellEditor: 'number' },
  ],
  rowData: myData,
  plugins: [EditingPlugin()],
});

// Start editing programmatically
engine.dispatchCommand('editing:startCell', { rowId: '1', field: 'name' });
```

## Features

- Double-click or Enter to start editing
- Built-in text, number, and select editors
- Full-row editing mode
- Value validation and cancel support
- Custom editor components

## Documentation

[Editing Guide](https://grid-data-analytics-explorer.vercel.app//docs/editing) | [API Reference](https://grid-data-analytics-explorer.vercel.app//api/plugin-editing)

## License

MIT
