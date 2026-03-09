# @gridstorm/core

Framework-agnostic data grid engine with state management, event/command bus, and plugin system.

## Install

```bash
npm install @gridstorm/core
```

## Usage

```typescript
import { createGridEngine } from '@gridstorm/core';

const engine = createGridEngine({
  columnDefs: [
    { field: 'name', headerName: 'Name' },
    { field: 'age', headerName: 'Age', type: 'number' },
  ],
  rowData: [
    { id: 1, name: 'Alice', age: 32 },
    { id: 2, name: 'Bob', age: 28 },
  ],
  plugins: [],
});

const rows = engine.getDisplayedRows();
```

## Key Concepts

- **Store** -- Immutable state slices with batched updates
- **CommandBus** -- Unidirectional data flow; commands are the only way to mutate state
- **EventBus** -- Subscribe to state changes and grid lifecycle events
- **PluginManager** -- Topological dependency resolution and lifecycle hooks
- **GridEngine** -- Orchestrates everything into a single API surface

## Documentation

[Full API Reference](https://gridstorm.dev/api/core) | [Architecture Guide](https://gridstorm.dev/docs/architecture)

## License

MIT
