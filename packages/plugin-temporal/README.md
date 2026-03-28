# @gridstorm/plugin-temporal

Time-travel for the data grid — take named snapshots of sort, filter, and column state, then navigate an undo/redo history or jump directly to any saved snapshot.

## Install

```sh
pnpm add @gridstorm/plugin-temporal
```

## Quick Usage

```typescript
import { createGrid } from '@gridstorm/core';
import { TemporalPlugin } from '@gridstorm/plugin-temporal';

const grid = createGrid({
  columns: [{ field: 'name' }, { field: 'age' }],
  rowData: [...],
  plugins: [
    TemporalPlugin({
      maxHistory: 50,
      autoSnapshot: false,
    }),
  ],
});

// Take a named snapshot of the current grid state
grid.commandBus.dispatch('temporal:snapshot', { label: 'Before filter' });

// Apply a filter, then snapshot again
grid.commandBus.dispatch('temporal:snapshot', { label: 'After filter' });

// Undo back to 'Before filter'
grid.commandBus.dispatch('temporal:undo', undefined);

// Redo to 'After filter'
grid.commandBus.dispatch('temporal:redo', undefined);

// Jump to any snapshot by ID
const { snapshots } = grid.store.getPluginState('temporal');
grid.commandBus.dispatch('temporal:goto', { id: snapshots[0].id });
```

## Commands

| Command | Payload | Description |
|---|---|---|
| `temporal:snapshot` | `{ label?: string }` | Capture the current sort/filter state as a named snapshot |
| `temporal:undo` | `undefined` | Restore the previous snapshot (moves current to redo stack) |
| `temporal:redo` | `undefined` | Re-apply the most recently undone snapshot |
| `temporal:goto` | `{ id: string }` | Jump directly to a specific snapshot by its ID |

## Events

| Event | Payload | Description |
|---|---|---|
| `temporal:snapshot-taken` | `{ snapshot: TemporalSnapshot }` | Emitted after a new snapshot is created |
| `temporal:restored` | `{ snapshot: TemporalSnapshot; direction: 'undo' \| 'redo' \| 'goto' }` | Emitted whenever a snapshot is restored |
