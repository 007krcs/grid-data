---
title: Time Travel
description: Git-for-grids state history with undo/redo, named checkpoints, state diffing, and branches.
---

The Time Travel plugin provides full state history management for your grid. It captures snapshots on every state change, supports unlimited undo/redo, named checkpoints for marking important states, state diffing to visualize what changed between two points, and branches for exploring what-if scenarios without losing your current state.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-time-travel
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { TimeTravelPlugin } from '@gridstorm/plugin-time-travel';

const grid = createGrid({
  columns: [
    { colId: 'name', field: 'name', headerName: 'Name' },
    { colId: 'value', field: 'value', headerName: 'Value' },
    { colId: 'status', field: 'status', headerName: 'Status' },
  ],
  rowData: [],
  plugins: [
    TimeTravelPlugin({
      maxSnapshots: 200,
      autoCapture: true,
      maxBranches: 10,
    }),
  ],
});
```

:::example{title="Live Time Travel Demo" href="/cookbook/#time-travel-basic"}
Edit grid data, then use undo/redo and branch to explore alternative states. View diffs between any two checkpoints.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `maxSnapshots` | `number` | `100` | Maximum number of snapshots retained in history. Oldest snapshots are pruned when the limit is exceeded. |
| `autoCapture` | `boolean` | `true` | Automatically capture a snapshot after every state-changing command. When `false`, snapshots must be created manually. |
| `maxBranches` | `number` | `5` | Maximum number of concurrent branches. Creating a new branch when at the limit removes the oldest branch. |

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `timeTravel:snapshot` | `{ label?: string }` | Capture the current grid state as a named checkpoint. |
| `timeTravel:restore` | `{ snapshotId: string }` | Restore the grid to a previously captured snapshot. |
| `timeTravel:undo` | `{}` | Revert to the previous state in history. |
| `timeTravel:redo` | `{}` | Advance to the next state in history after an undo. |
| `timeTravel:diff` | `{ from: string; to: string }` | Compute the differences between two snapshots, returning added, removed, and modified rows. |
| `timeTravel:branch` | `{ name: string; from?: string }` | Create a new branch from the current state or a specific snapshot for what-if analysis. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `timeTravel:snapshot:created` | `{ snapshotId: string; label?: string }` | Emitted when a new snapshot is captured. |
| `timeTravel:restored` | `{ snapshotId: string }` | Emitted after the grid state is restored from a snapshot. |
| `timeTravel:branch:created` | `{ name: string; snapshotId: string }` | Emitted when a new branch is created. |

## Usage Examples

### Undo and Redo

Standard undo/redo navigation through state history.

```typescript title="undo-redo.ts"
// Make some edits...
grid.commandBus.dispatch('edit:commit', {
  rowId: 'row-1', colId: 'value', value: 42,
});

// Undo the last change
grid.commandBus.dispatch('timeTravel:undo', {});

// Redo it
grid.commandBus.dispatch('timeTravel:redo', {});
```

### Named Checkpoints

Save important states with descriptive labels for easy recall.

```typescript title="checkpoints.ts"
// Mark the current state before a bulk operation
grid.commandBus.dispatch('timeTravel:snapshot', {
  label: 'Before Q4 import',
});

// ... perform bulk data import ...

// Something went wrong — restore the checkpoint
grid.commandBus.dispatch('timeTravel:restore', {
  snapshotId: 'before-q4-import',
});
```

### Branches and Diffing

Create branches to explore alternative scenarios, then compare the results.

```typescript title="branches.ts"
// Create a what-if branch
grid.commandBus.dispatch('timeTravel:branch', {
  name: 'optimistic-forecast',
});

// Make speculative edits on the branch...

// Compare the branch state against the main timeline
grid.commandBus.dispatch('timeTravel:diff', {
  from: 'main',
  to: 'optimistic-forecast',
});

// Listen for diff results
grid.eventBus.on('timeTravel:diff:computed', (event) => {
  console.log(`${event.added} added, ${event.removed} removed, ${event.modified} modified`);
});
```

## Next Steps

- [Editing Plugin](/plugins/editing/) -- edits automatically generate snapshots when `autoCapture` is enabled.
- [State Persistence Plugin](/plugins/state-persistence/) -- persist checkpoints across sessions.
- [Selection Plugin](/plugins/selection/) -- undo/redo includes selection state changes.
