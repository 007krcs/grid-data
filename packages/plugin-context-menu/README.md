# @gridstorm/plugin-context-menu

Right-click context menus for cells, rows, and headers in GridStorm.

## Install

```bash
npm install @gridstorm/plugin-context-menu @gridstorm/core
```

## Usage

```typescript
import { createGridEngine } from '@gridstorm/core';
import { ContextMenuPlugin } from '@gridstorm/plugin-context-menu';

const engine = createGridEngine({
  columnDefs: columns,
  rowData: myData,
  plugins: [
    ContextMenuPlugin({
      items: [
        { label: 'Copy', action: 'copy' },
        { label: 'Export Row', action: 'exportRow' },
        { separator: true },
        { label: 'Delete', action: 'delete', className: 'danger' },
      ],
    }),
  ],
});
```

## Features

- Right-click context menus on cells, rows, and headers
- Configurable menu items with labels, icons, and actions
- Separator support for grouping items
- Conditional item visibility
- Custom action handlers

## Documentation

[Context Menu Guide](https://gridstorm.dev/docs/context-menu) | [API Reference](https://gridstorm.dev/api/plugin-context-menu)

## License

MIT
