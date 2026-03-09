# @gridstorm/plugin-selection

Row, cell, and range selection for GridStorm.

## Install

```bash
npm install @gridstorm/plugin-selection @gridstorm/core
```

## Usage

```typescript
import { createGridEngine } from '@gridstorm/core';
import { SelectionPlugin } from '@gridstorm/plugin-selection';

const engine = createGridEngine({
  columnDefs: columns,
  rowData: myData,
  plugins: [SelectionPlugin({ mode: 'multiRow' })],
});

// Select rows programmatically
engine.dispatchCommand('selection:selectRows', { rowIds: ['1', '3'] });
```

## Features

- Single and multi-row selection
- Cell selection
- Range selection with Shift+click
- Checkbox selection column
- Programmatic selection API

## Documentation

[Selection Guide](https://gridstorm.dev/docs/selection) | [API Reference](https://gridstorm.dev/api/plugin-selection)

## License

MIT
