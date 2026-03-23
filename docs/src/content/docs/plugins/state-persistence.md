---
title: State Persistence
description: Save and restore grid state to localStorage or a custom storage adapter with debounced auto-save.
---

The State Persistence plugin captures a snapshot of your grid's column widths, sort model, filter model, pagination, column order, and scroll position, then persists it to localStorage or a custom storage backend. Changes are auto-saved with a configurable debounce interval, and state is automatically restored when the grid initializes.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-state-persistence
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { StatePersistencePlugin } from '@gridstorm/plugin-state-persistence';

const grid = createGrid({
  columns: [
    { colId: 'name', field: 'name', headerName: 'Name' },
    { colId: 'email', field: 'email', headerName: 'Email' },
    { colId: 'status', field: 'status', headerName: 'Status' },
  ],
  rowData: [],
  plugins: [
    StatePersistencePlugin({
      storageKey: 'my-app-grid-state',
      autoSave: true,
      debounceMs: 500,
    }),
  ],
});
```

:::example{title="Live State Persistence Demo" href="/cookbook/#state-persistence-basic"}
Resize columns, apply sorting, then refresh the page to see the grid restore its previous state automatically.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `storageKey` | `string` | `'gridstorm-state'` | Key used for the storage backend. |
| `storage` | `StorageAdapter` | `localStorage` | Custom storage adapter with `getItem`, `setItem`, `removeItem` methods. Supports async implementations. |
| `autoSave` | `boolean` | `true` | Automatically save state when columns, sorting, filtering, or pagination changes. |
| `debounceMs` | `number` | `500` | Debounce interval in milliseconds for auto-save writes. |
| `include` | `(keyof GridStateSnapshot)[]` | all keys | Whitelist of state keys to persist. Only these keys are saved when set. |
| `exclude` | `(keyof GridStateSnapshot)[]` | none | Blacklist of state keys to exclude from persistence. |

### GridStateSnapshot Keys

The following keys can be used in `include` and `exclude` arrays:

| Key | Description |
| --- | --- |
| `columnState` | Column widths, visibility, pinned state, sort direction. |
| `sortModel` | Active sort entries. |
| `filterModel` | Active filter configuration. |
| `pagination` | Current page and page size. |
| `columnOrder` | Order of columns in the grid. |
| `scrollPosition` | Vertical and horizontal scroll offsets. |

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `state:save` | `{}` | Manually save the current grid state to storage. |
| `state:restore` | `{}` | Restore saved state from storage and apply it to the grid. |
| `state:clear` | `{}` | Remove the saved state from storage. |
| `state:export` | `{ callback: (json: string) => void }` | Serialize the current state and pass it to the callback as a JSON string. |
| `state:import` | `{ state: string }` | Apply a previously exported JSON state string to the grid. |

## Usage Examples

### Persist Only Sorting and Filtering

```typescript title="selective-persistence.ts"
const grid = createGrid({
  columns: [...],
  rowData: [...],
  plugins: [
    StatePersistencePlugin({
      storageKey: 'grid-sort-filter',
      include: ['sortModel', 'filterModel'],
    }),
  ],
});
```

### Custom Storage Adapter (sessionStorage)

```typescript title="session-storage.ts"
const grid = createGrid({
  columns: [...],
  rowData: [...],
  plugins: [
    StatePersistencePlugin({
      storageKey: 'grid-session',
      storage: {
        getItem: (key) => sessionStorage.getItem(key),
        setItem: (key, value) => sessionStorage.setItem(key, value),
        removeItem: (key) => sessionStorage.removeItem(key),
      },
    }),
  ],
});
```

### Export and Import State

```typescript title="export-import.ts"
// Export current state to a variable
let savedState: string;
grid.commandBus.dispatch('state:export', {
  callback: (json) => { savedState = json; },
});

// Later, import it back
grid.commandBus.dispatch('state:import', { state: savedState });
```

### Manual Save with Reset Button

```typescript title="manual-save.ts"
document.getElementById('saveBtn')?.addEventListener('click', () => {
  grid.commandBus.dispatch('state:save', {});
});

document.getElementById('resetBtn')?.addEventListener('click', () => {
  grid.commandBus.dispatch('state:clear', {});
  location.reload();
});
```

## Next Steps

- [Sorting Plugin](/plugins/sorting/) -- sort state is automatically captured and restored.
- [Filtering Plugin](/plugins/filtering/) -- filter model is persisted across sessions.
- [Column Resize Plugin](/plugins/column-resize/) -- column widths survive page reloads.
