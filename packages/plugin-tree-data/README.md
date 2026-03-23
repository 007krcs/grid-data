# @gridstorm/plugin-tree-data

Hierarchical parent-child row display for GridStorm.

> **Enterprise Plugin** -- Requires a [GridStorm license key](https://grid-data-analytics-explorer.vercel.app//pricing).

## Install

```bash
npm install @gridstorm/plugin-tree-data @gridstorm/core @gridstorm/license
```

## Usage

```typescript
import { setLicenseKey } from '@gridstorm/license';
import { createGridEngine } from '@gridstorm/core';
import { TreeDataPlugin } from '@gridstorm/plugin-tree-data';

setLicenseKey('YOUR_LICENSE_KEY');

const engine = createGridEngine({
  columnDefs: [
    { field: 'name' },
    { field: 'size', type: 'number' },
  ],
  rowData: fileSystemData,
  plugins: [TreeDataPlugin({ childrenField: 'children' })],
});
```

## Features

- Display hierarchical data with expand/collapse
- Configurable children field
- Indentation based on nesting depth
- Programmatic expand/collapse all
- Lazy loading of child nodes

## Documentation

[Tree Data Guide](https://grid-data-analytics-explorer.vercel.app//docs/tree-data) | [API Reference](https://grid-data-analytics-explorer.vercel.app//api/plugin-tree-data)

## License

Commercial -- [Enterprise License Required](https://grid-data-analytics-explorer.vercel.app//pricing)
