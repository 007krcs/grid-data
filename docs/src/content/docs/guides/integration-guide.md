---
title: Integration Guide
description: Step-by-step guide for integrating GridStorm into React, Next.js, Vite, and vanilla TypeScript projects with data loading, SSR, and error handling patterns.
---

This guide covers adding GridStorm to your existing project, loading data from APIs, handling large datasets, and configuring TypeScript. Whether you use React with Vite, Next.js, or vanilla TypeScript, the setup follows the same pattern: create a grid engine, mount a renderer, and optionally add plugins.

## React with Vite

```bash title="Install packages"
pnpm add @gridstorm/core @gridstorm/dom-renderer @gridstorm/react @gridstorm/theme-default
```

```tsx title="src/App.tsx"
import { GridStorm } from '@gridstorm/react';
import '@gridstorm/theme-default/styles.css';

const columns = [
  { field: 'name', headerName: 'Name', sortable: true, filter: true },
  { field: 'email', headerName: 'Email', flex: 1 },
  { field: 'revenue', headerName: 'Revenue', type: 'number' },
];

const rowData = [
  { name: 'Alice', email: 'alice@example.com', revenue: 50000 },
  { name: 'Bob', email: 'bob@example.com', revenue: 75000 },
];

export default function App() {
  return (
    <GridStorm
      columns={columns}
      rowData={rowData}
      height={600}
      width="100%"
      onGridReady={(api) => console.log('Grid ready', api)}
    />
  );
}
```

## React with Next.js

GridStorm's DOM renderer requires browser APIs. Use dynamic imports to prevent SSR errors.

```tsx title="components/DataGrid.tsx"
'use client';

import { GridStorm } from '@gridstorm/react';
import '@gridstorm/theme-default/styles.css';

export function DataGrid({ columns, rowData }) {
  return (
    <GridStorm
      columns={columns}
      rowData={rowData}
      height={600}
    />
  );
}
```

```tsx title="app/page.tsx"
import dynamic from 'next/dynamic';

const DataGrid = dynamic(() =>
  import('../components/DataGrid').then(m => ({ default: m.DataGrid })),
  { ssr: false }
);

export default function Page() {
  return <DataGrid columns={columns} rowData={rowData} />;
}
```

## React with Create React App

```bash title="Install packages"
pnpm add @gridstorm/core @gridstorm/dom-renderer @gridstorm/react @gridstorm/theme-default
```

The setup is the same as Vite. Import the theme CSS at the top of your entry file:

```typescript title="src/index.tsx"
import '@gridstorm/theme-default/styles.css';
```

## Vanilla TypeScript

You can use GridStorm without React by creating the engine and renderer directly.

```bash title="Install packages"
pnpm add @gridstorm/core @gridstorm/dom-renderer @gridstorm/theme-default
```

```typescript title="src/main.ts"
import { createGrid } from '@gridstorm/core';
import { DomRenderer } from '@gridstorm/dom-renderer';
import '@gridstorm/theme-default/styles.css';

const engine = createGrid({
  columns: [
    { field: 'name', headerName: 'Name', sortable: true },
    { field: 'price', headerName: 'Price', type: 'number' },
  ],
  rowData: [
    { name: 'Widget', price: 29.99 },
    { name: 'Gadget', price: 49.99 },
  ],
});

const renderer = new DomRenderer({
  container: document.getElementById('grid')!,
  engine,
});

renderer.mount();
```

```html title="index.html"
<div id="grid" style="height: 400px; width: 100%;"></div>
```

## Bundle Size and Tree-Shaking

GridStorm is designed for tree-shaking. Each plugin is a separate package, so you only pay for what you import.

```typescript title="Only import what you need"
// Full import -- pulls in everything
import { createGrid, SortingPlugin, FilteringPlugin } from '@gridstorm/core';

// Tree-shakeable -- import plugins individually
import { createGrid } from '@gridstorm/core';
import { createSortingPlugin } from '@gridstorm/plugin-sorting';
import { createFilteringPlugin } from '@gridstorm/plugin-filtering';

const engine = createGrid({
  columns,
  rowData,
  plugins: [
    createSortingPlugin(),
    createFilteringPlugin(),
  ],
});
```

Approximate package sizes (minified + gzipped):

| Package | Size |
|---------|------|
| `@gridstorm/core` | ~12 KB |
| `@gridstorm/dom-renderer` | ~8 KB |
| `@gridstorm/react` | ~4 KB |
| `@gridstorm/theme-default` | ~3 KB |
| Each plugin | ~1-3 KB |

## Loading Data from REST APIs

```typescript title="Fetch data from a REST API"
import { useState, useEffect } from 'react';
import { GridStorm } from '@gridstorm/react';

function OrdersGrid() {
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        setRowData(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <GridStorm
      columns={[
        { field: 'orderId', headerName: 'Order ID' },
        { field: 'customer', headerName: 'Customer' },
        { field: 'total', headerName: 'Total', type: 'number' },
      ]}
      rowData={rowData}
      height={600}
    />
  );
}
```

## Loading Data from GraphQL

```typescript title="GraphQL data loading"
import { useQuery, gql } from '@apollo/client';
import { GridStorm } from '@gridstorm/react';

const GET_PRODUCTS = gql`
  query GetProducts {
    products {
      id
      name
      price
      category
    }
  }
`;

function ProductsGrid() {
  const { data, loading, error } = useQuery(GET_PRODUCTS);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <GridStorm
      columns={[
        { field: 'name', headerName: 'Name' },
        { field: 'price', headerName: 'Price', type: 'number' },
        { field: 'category', headerName: 'Category' },
      ]}
      rowData={data.products}
      getRowId={(row) => row.id}
      height={600}
    />
  );
}
```

## Handling Large Datasets

### Virtual Scrolling (Client-Side)

GridStorm virtualizes rows by default. Only visible rows plus an overscan buffer are rendered to the DOM. This handles datasets up to ~100K rows efficiently on the client.

```typescript title="Large dataset with virtual scrolling"
<GridStorm
  columns={columns}
  rowData={largeDataset}  // 50,000+ rows
  rowHeight={40}          // Fixed height enables fast calculation
  height={800}
/>
```

### Server-Side Row Model (SSRM)

For datasets beyond 100K rows, use the server-side row model. The grid fetches data in blocks as the user scrolls.

```typescript title="Server-side row model"
<GridStorm
  columns={columns}
  rowModelType="serverSide"
  dataSource={{
    getRows: async (params) => {
      const response = await fetch(
        `/api/data?start=${params.startRow}&end=${params.endRow}`
        + `&sort=${JSON.stringify(params.sortModel)}`
        + `&filter=${JSON.stringify(params.filterModel)}`
      );
      const { rows, totalCount } = await response.json();
      return { rows, totalCount };
    },
  }}
  height={800}
/>
```

## SSR Considerations

GridStorm's core engine runs in any JavaScript environment, but the DOM renderer and React adapter require a browser. Follow these rules for SSR compatibility:

1. **Use dynamic imports** for the `<GridStorm>` component in Next.js (shown above).
2. **Do not import `@gridstorm/dom-renderer` on the server.** It references `document` and `window`.
3. **The core engine is SSR-safe.** You can create a grid engine on the server for data processing (sorting, filtering, aggregation) without a DOM renderer.
4. **Theme CSS** can be imported globally in your layout -- CSS imports are handled by your bundler.

```typescript title="Server-side data processing (no DOM)"
import { createGrid } from '@gridstorm/core';

// This runs on the server -- no DOM needed
const engine = createGrid({ columns, rowData });
engine.api.setSortModel([{ colId: 'revenue', sort: 'desc' }]);

const state = engine.store.getState();
const topRows = state.displayedRowIds.slice(0, 10).map(id => {
  const node = state.rowNodes.get(id);
  return node?.data;
});

engine.destroy();
```

## Error Handling

The React adapter includes a built-in error boundary. For vanilla usage, listen for errors on the event bus:

```typescript title="Error handling in vanilla mode"
engine.eventBus.on('error', (event) => {
  console.error(`Grid error from ${event.source}:`, event.error);
});
```

```tsx title="Error handling in React"
import { GridStorm } from '@gridstorm/react';

// The built-in GridErrorBoundary catches render errors automatically.
// For custom error UI, wrap with your own error boundary:
<ErrorBoundary fallback={<div>Grid failed to load</div>}>
  <GridStorm columns={columns} rowData={rowData} height={600} />
</ErrorBoundary>
```

## TypeScript Configuration

GridStorm requires TypeScript 5.0+ with strict mode. Recommended `tsconfig.json` settings:

```json title="tsconfig.json"
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "jsx": "react-jsx"
  }
}
```

### Typing Row Data

Use generics to get full type safety across columns, row data, and event handlers:

```typescript title="Typed grid"
interface Order {
  orderId: string;
  customer: string;
  total: number;
  status: 'pending' | 'shipped' | 'delivered';
}

const columns: ColumnDef<Order>[] = [
  { field: 'orderId', headerName: 'Order ID' },
  { field: 'customer', headerName: 'Customer' },
  { field: 'total', headerName: 'Total', type: 'number' },
  { field: 'status', headerName: 'Status' },
];

<GridStorm<Order>
  columns={columns}
  rowData={orders}
  onCellClicked={(e) => {
    // e.data is typed as Order
    console.log(e.data.customer);
  }}
/>
```

## Next Steps

- [Performance Guide](/guides/performance) -- Optimize for large datasets and complex rendering
- [Custom Plugins](/guides/custom-plugins) -- Extend GridStorm with your own plugins
- [Accessibility](/guides/accessibility) -- ARIA roles, keyboard navigation, and screen reader support
