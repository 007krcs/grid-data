# @gridstorm/plugin-master-detail

Enterprise master-detail plugin for GridStorm. Expand rows to reveal detail data, with support for async data fetching, caching, and nested grid configurations.

## Installation

```bash
pnpm add @gridstorm/plugin-master-detail
```

## Quick Start

```ts
import { createGrid } from '@gridstorm/core';
import { MasterDetailPlugin } from '@gridstorm/plugin-master-detail';

const grid = createGrid({
  columns: [
    { field: 'name', headerName: 'Employee' },
    { field: 'department', headerName: 'Department' },
  ],
  rowData: [
    { id: 'e1', name: 'Alice', department: 'Engineering' },
    { id: 'e2', name: 'Bob', department: 'Marketing' },
  ],
  getRowId: (params) => params.data.id,
  plugins: [
    MasterDetailPlugin({
      getDetailRowData: async (params) => {
        const response = await fetch(`/api/tasks?employeeId=${params.node.id}`);
        const tasks = await response.json();
        params.successCallback(tasks);
        return tasks;
      },
      detailRowHeight: 250,
      keepDetailRows: true,
    }),
  ],
});

// Expand a master row
grid.commandBus.dispatch('detail:expand', { nodeId: 'e1' });

// Collapse a master row
grid.commandBus.dispatch('detail:collapse', { nodeId: 'e1' });

// Toggle
grid.commandBus.dispatch('detail:toggle', { nodeId: 'e1' });
```

## Commands

| Command | Payload | Description |
|---------|---------|-------------|
| `detail:expand` | `{ nodeId }` | Expands a master row to show its detail row |
| `detail:collapse` | `{ nodeId }` | Collapses a master row, hiding the detail row |
| `detail:toggle` | `{ nodeId }` | Toggles the expanded state of a master row |
| `detail:expandAll` | `{}` | Expands all master rows |
| `detail:collapseAll` | `{}` | Collapses all master rows |
| `detail:refreshDetail` | `{ nodeId }` | Clears cached data and re-fetches for a master row |

## Events

| Event | Description |
|-------|-------------|
| `detail:opened` | Emitted when a detail row is expanded |
| `detail:closed` | Emitted when a detail row is collapsed |

## Options

```ts
interface MasterDetailOptions {
  getDetailRowData: (params: DetailDataParams) => any[] | Promise<any[]>;
  detailGridOptions?: (params: DetailGridParams) => any;
  detailRowHeight?: number | ((params: DetailHeightParams) => number);
  keepDetailRows?: boolean;     // Default: false
  embedFullWidthRows?: boolean; // Default: true
}
```

## Detail Row Behavior

- Detail rows are inserted in `displayedRowIds` directly after their master row
- Detail row nodes have `detail: true` and `selectable: false`
- Detail row IDs are prefixed with `__detail__` followed by the master row ID
- When `keepDetailRows` is true, cached data and row nodes persist across collapse/expand cycles
- When `keepDetailRows` is false (default), detail data is cleared on collapse and re-fetched on expand

## License

Enterprise license required. See LICENSE.md for details.
