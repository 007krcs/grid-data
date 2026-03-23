# @gridstorm/plugin-grouping

Row grouping with expand/collapse for GridStorm.

## Install

```bash
npm install @gridstorm/plugin-grouping @gridstorm/core
```

## Usage

```typescript
import { createGridEngine } from '@gridstorm/core';
import { GroupingPlugin } from '@gridstorm/plugin-grouping';

const engine = createGridEngine({
  columnDefs: [
    { field: 'department', enableRowGroup: true },
    { field: 'name' },
    { field: 'salary', type: 'number' },
  ],
  rowData: myData,
  plugins: [GroupingPlugin()],
});

// Group by a column
engine.dispatchCommand('grouping:setColumns', { columns: ['department'] });
```

## Features

- Group rows by one or more columns
- Expand/collapse group rows
- Nested multi-level grouping
- Group row customization
- Programmatic expand/collapse API

## Documentation

[Grouping Guide](https://grid-data-analytics-explorer.vercel.app//docs/grouping) | [API Reference](https://grid-data-analytics-explorer.vercel.app//api/plugin-grouping)

## License

MIT
