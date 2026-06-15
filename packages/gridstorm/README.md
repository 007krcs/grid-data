# GridStorm

> The complete enterprise data grid — one package, everything included.

[![npm](https://img.shields.io/npm/v/gridstorm)](https://www.npmjs.com/package/gridstorm)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Install

```bash
npm install gridstorm
```

## Quick Start

```ts
import { createGrid, SortingPlugin, FilteringPlugin } from 'gridstorm';

const grid = createGrid({
  container: document.getElementById('grid'),
  columnDefs: [
    { field: 'name', headerName: 'Name' },
    { field: 'age', headerName: 'Age' },
    { field: 'email', headerName: 'Email' },
  ],
  rowData: [
    { name: 'Alice', age: 30, email: 'alice@example.com' },
    { name: 'Bob', age: 25, email: 'bob@example.com' },
  ],
  plugins: [SortingPlugin(), FilteringPlugin()],
});
```

## React

```tsx
import { GridStorm } from 'gridstorm/react';
import { SortingPlugin } from 'gridstorm';

function App() {
  return (
    <GridStorm
      columnDefs={[{ field: 'name' }, { field: 'age' }]}
      rowData={data}
      plugins={[SortingPlugin()]}
    />
  );
}
```

## What's Included

### Core
- **Engine** — Headless core with store, event bus, command bus, plugin manager
- **DOM Renderer** — Virtual scrolling, keyboard navigation, accessibility
- **Theming** — CSS custom properties, light/dark/high-contrast, density modes
- **i18n** — Internationalization support

### 40+ Plugins

| Category | Plugins |
|----------|---------|
| **Core** | Sorting, Filtering, Selection, Editing, Pagination, Column Pinning, Column Resize, Column Reorder, Context Menu, Clipboard |
| **Enterprise** | Grouping, Aggregation, Pivoting, Master-Detail, Tree Data, Row Reorder, Excel Export, PDF Export, Sparklines, Charts, SSRM |
| **Next-Gen** | Status Bar, State Persistence, Column AutoSize, Row Pinning, Conditional Formatting, Streaming, AI |

### PDF Toolkit
- PDF rendering, form filling, text extraction, PII detection, intelligence

## Sub-path Imports

```ts
// Everything (core + all plugins + renderer)
import { createGrid, SortingPlugin } from 'gridstorm';

// Plugins only (tree-shakeable)
import { SortingPlugin, AIPlugin } from 'gridstorm/plugins';

// React adapter
import { GridStorm, useGridApi } from 'gridstorm/react';

// PDF toolkit
import { PDFDocument } from 'gridstorm/pdf';
```

## Individual Packages

Need just one plugin? Install individually:

```bash
npm install @gridstorm/core @gridstorm/plugin-sorting
```

## Links

- [Live Demos](https://grid-data-analytics-explorer.vercel.app/)
- [GitHub](https://github.com/nicktesh/gridstorm)
- [Documentation](https://grid-data-analytics-explorer.vercel.app/#/docs)

## License

MIT
