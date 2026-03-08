---
title: Quick Start
description: Get a GridStorm data grid on screen in under a minute.
---

This guide walks you through the fastest path to a working GridStorm data grid. You will install the packages, define columns and data, and render a fully functional grid with sorting.

## React Quick Start

### 1. Install packages

```bash title="Terminal"
npm install @gridstorm/core @gridstorm/dom-renderer @gridstorm/react @gridstorm/theme-default
```

### 2. Import the theme

Add the GridStorm CSS to your application entry point (e.g., `main.tsx` or `App.tsx`):

```ts title="main.tsx"
import '@gridstorm/theme-default/css';
```

### 3. Render the grid

```tsx title="App.tsx"
import { GridStorm } from '@gridstorm/react';

const columns = [
  { field: 'name', headerName: 'Name' },
  { field: 'age', headerName: 'Age', width: 100 },
  { field: 'email', headerName: 'Email', flex: 1 },
];

const rowData = [
  { name: 'Alice Johnson', age: 32, email: 'alice@example.com' },
  { name: 'Bob Smith', age: 45, email: 'bob@example.com' },
  { name: 'Carol White', age: 28, email: 'carol@example.com' },
];

export default function App() {
  return (
    <GridStorm
      columns={columns}
      rowData={rowData}
      height={400}
    />
  );
}
```

That is a fully working grid with header rendering, virtual scrolling, keyboard navigation, and ARIA accessibility attributes.

## Add Sorting

Install the sorting plugin:

```bash title="Terminal"
npm install @gridstorm/plugin-sorting
```

Then add it to the grid:

```tsx title="App.tsx"
import { GridStorm } from '@gridstorm/react';
import { SortingPlugin } from '@gridstorm/plugin-sorting';

const columns = [
  { field: 'name', headerName: 'Name', sortable: true },
  { field: 'age', headerName: 'Age', width: 100, sortable: true },
  { field: 'email', headerName: 'Email', flex: 1, sortable: true },
];

const rowData = [
  { name: 'Alice Johnson', age: 32, email: 'alice@example.com' },
  { name: 'Bob Smith', age: 45, email: 'bob@example.com' },
  { name: 'Carol White', age: 28, email: 'carol@example.com' },
];

const plugins = [SortingPlugin({ multiSort: true })];

export default function App() {
  return (
    <GridStorm
      columns={columns}
      rowData={rowData}
      plugins={plugins}
      height={400}
    />
  );
}
```

Click any column header to sort ascending. Click again for descending. Click a third time to clear the sort. Hold Shift and click to sort by multiple columns simultaneously.

## Vanilla JavaScript Quick Start

You do not need React to use GridStorm. The core engine and DOM renderer work with plain JavaScript:

```ts title="main.ts"
import { createGrid } from '@gridstorm/core';
import { DomRenderer } from '@gridstorm/dom-renderer';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import '@gridstorm/theme-default/css';

const container = document.getElementById('grid')!;

const engine = createGrid({
  columns: [
    { field: 'name', headerName: 'Name', sortable: true },
    { field: 'age', headerName: 'Age', width: 100, sortable: true },
    { field: 'email', headerName: 'Email', sortable: true },
  ],
  rowData: [
    { name: 'Alice Johnson', age: 32, email: 'alice@example.com' },
    { name: 'Bob Smith', age: 45, email: 'bob@example.com' },
    { name: 'Carol White', age: 28, email: 'carol@example.com' },
  ],
  plugins: [SortingPlugin({ multiSort: true })],
});

const renderer = new DomRenderer({ container, engine });
renderer.mount();
```

```html title="index.html"
<div id="grid" style="height: 400px;"></div>
```

## What to Read Next

- **[Installation](/getting-started/installation/)** -- All packages, peer dependencies, and TypeScript configuration.
- **[Columns](/core-concepts/columns/)** -- Column definition options in depth.
- **[Plugin System](/plugins/plugin-system/)** -- How the plugin architecture works.
- **[React Guide](/frameworks/react/)** -- Hooks, controlled state, custom renderers, and more.
