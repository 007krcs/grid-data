# @gridstorm/react

React 18+ adapter for GridStorm with hooks, error boundaries, and portal-based overlays.

## Install

```bash
npm install @gridstorm/react @gridstorm/core @gridstorm/dom-renderer
```

## Usage

```tsx
import { GridStorm } from '@gridstorm/react';
import { SortingPlugin } from '@gridstorm/plugin-sorting';

const columns = [
  { field: 'name', headerName: 'Name' },
  { field: 'age', headerName: 'Age' },
];

export default function App() {
  return (
    <GridStorm
      rowData={[{ id: 1, name: 'Alice', age: 32 }]}
      columnDefs={columns}
      plugins={[SortingPlugin()]}
      height={400}
    />
  );
}
```

## Features

- `<GridStorm>` component with declarative props
- React hooks for grid state access
- Error boundary for graceful error handling
- Portal-based overlays for editors and menus

## Documentation

[Full API Reference](https://grid-data-analytics-explorer.vercel.app//api/react) | [React Guide](https://grid-data-analytics-explorer.vercel.app//docs/react)

## License

MIT
