---
title: Store
description: Understand GridStorm's reactive store, state shape, selectors, batched updates, and re-entrancy protection.
---

GridStorm uses a lightweight reactive store purpose-built for grid state management. The store holds the entire `GridState` object and notifies subscribers whenever state changes. It supports batched updates to coalesce multiple mutations into a single notification cycle, memoized selectors for efficient derived data, and re-entrancy protection to prevent infinite update loops.

## How the Store Works

The store follows a simple pattern: state lives in a single immutable-by-convention object. You read state with `getState()`, update it with `setState()`, and react to changes with `subscribe()` or `select()`. Every call to `setState` increments an internal version counter and notifies all listeners -- unless the update is inside a `batch()`, in which case listeners fire once at the end.

Commands are the only sanctioned way to mutate state in production code. Plugins and the engine dispatch commands, and command handlers call `store.setState()` internally. You rarely call `setState` directly unless you are writing a plugin.

## Installation

The store is part of `@gridstorm/core` and is created automatically when you initialize a grid engine. You do not install it separately.

```bash title="Install core"
pnpm add @gridstorm/core
```

## State Shape (GridState)

The `GridState` interface represents the complete internal state of a grid instance:

| Property | Type | Description |
|---|---|---|
| `columns` | `ColumnState[]` | Resolved column states derived from column definitions |
| `rowNodes` | `Map<string, RowNode>` | All row nodes keyed by unique ID |
| `displayedRowIds` | `string[]` | Ordered row IDs after sort, filter, group, and pagination |
| `sortModel` | `SortModelItem[]` | Current sort configuration |
| `filterModel` | `Record<string, FilterModel>` | Active filters keyed by column ID |
| `selection` | `{ selectedRowIds, rangeSelections }` | Row and range selection state |
| `editing` | `EditingState \| null` | Current cell editing state |
| `scroll` | `{ top, left }` | Viewport scroll position in pixels |
| `focusedCell` | `CellPosition \| null` | Currently focused cell |
| `pagination` | `{ currentPage, pageSize, totalRows }` | Pagination state |
| `quickFilterText` | `string` | Quick filter search text |
| `columnGroups` | `ColumnGroupInfo[]` | Multi-level header group hierarchy |
| `columnGroupDepth` | `number` | Max nesting depth of column groups |
| `pluginState` | `Record<string, unknown>` | Plugin-managed state slices |

## Reading State

Use `getState()` to read the current state snapshot:

```ts title="Reading state"
const state = engine.store.getState();

console.log('Displayed rows:', state.displayedRowIds.length);
console.log('Sort model:', state.sortModel);
console.log('Selected row count:', state.selection.selectedRowIds.size);
```

From the public API, use `api.getState()`:

```ts title="Reading state via API"
const state = api.getState();
const visibleColumns = state.columns.filter((c) => !c.hide);
```

## Updating State

Pass an updater function to `setState()`. The updater receives the previous state and must return a new state object. If the returned object is referentially identical to the previous state, no notification occurs:

```ts title="Updating state"
engine.store.setState((prev) => ({
  ...prev,
  quickFilterText: 'engineering',
}));
```

In plugin code, you access the store through the `PluginContext`:

```ts title="Plugin state update"
install(ctx) {
  ctx.store.setState((prev) => ({
    ...prev,
    sortModel: [{ colId: 'name', sort: 'asc' }],
  }));
}
```

## Subscribing to Changes

`subscribe()` registers a listener that fires after every state change. It returns an unsubscribe function:

```ts title="Basic subscription"
const unsub = engine.store.subscribe(() => {
  const state = engine.store.getState();
  console.log('State version:', engine.store.getVersion());
  console.log('Row count:', state.displayedRowIds.length);
});

// Later: clean up
unsub();
```

## Selectors

The `select()` method has two overloads. Without a listener, it runs a selector function against the current state and returns the result immediately:

```ts title="One-shot select"
const sortModel = engine.store.select((state) => state.sortModel);
console.log('Current sort:', sortModel);
```

With a listener, it subscribes to a specific slice of state. The listener only fires when the selected value changes by reference equality -- much more efficient than subscribing to every state change:

```ts title="Selective subscription"
const unsub = engine.store.select(
  (state) => state.selection.selectedRowIds,
  (next, prev) => {
    console.log('Selection changed from', prev.size, 'to', next.size);
  },
);
```

## Memoized Selectors with createSelector

For derived data that depends on multiple state slices, use `createSelector`. It only recomputes when its dependencies change (shallow reference equality):

```ts title="Memoized selector"
import { createSelector } from '@gridstorm/core';

const selectVisibleSelectedCount = createSelector(
  [
    (state) => state.displayedRowIds,
    (state) => state.selection.selectedRowIds,
  ],
  (displayedIds, selectedIds) => {
    return displayedIds.filter((id) => selectedIds.has(id)).length;
  },
);

// Use it:
const count = engine.store.select(selectVisibleSelectedCount);
console.log('Visible selected rows:', count);
```

You can also combine `createSelector` with the subscription overload of `select()`:

```ts title="Subscribe to derived data"
const unsub = engine.store.select(
  selectVisibleSelectedCount,
  (next, prev) => {
    console.log('Visible selection changed:', prev, '->', next);
  },
);
```

## Batched Updates

When you need to make multiple state changes that should result in a single notification cycle, wrap them in `batch()`:

```ts title="Batched updates"
engine.store.batch(() => {
  engine.store.setState((prev) => ({
    ...prev,
    sortModel: [{ colId: 'name', sort: 'asc' }],
  }));
  engine.store.setState((prev) => ({
    ...prev,
    filterModel: {},
  }));
});
// Listeners fire only once here, with both changes applied
```

Batches can be nested. Listeners only fire when the outermost batch completes:

```ts title="Nested batches"
engine.store.batch(() => {
  engine.store.setState(/* ... */);
  engine.store.batch(() => {
    engine.store.setState(/* ... */);
  });
  // inner batch does NOT trigger listeners yet
});
// listeners fire once here
```

## Re-Entrancy Protection

If a listener calls `setState()` during notification (re-entrant update), the update is queued and applied after the current notification cycle completes. This prevents stack overflows and ensures all listeners see a consistent state during each notification pass.

The store limits queued re-entrant updates to 100 iterations. If this limit is reached, it logs an error and breaks the cycle to prevent infinite loops.

```ts title="Safe re-entrant update"
engine.store.subscribe(() => {
  const state = engine.store.getState();
  if (state.quickFilterText === 'trigger') {
    // This setState is queued, not applied immediately
    engine.store.setState((prev) => ({
      ...prev,
      quickFilterText: 'resolved',
    }));
  }
});
```

## Version Counter

Every state change increments an internal version counter. Use `getVersion()` to cheaply detect whether state has changed since you last checked:

```ts title="Version check"
let lastVersion = engine.store.getVersion();

function checkForChanges() {
  const currentVersion = engine.store.getVersion();
  if (currentVersion !== lastVersion) {
    lastVersion = currentVersion;
    console.log('State changed!');
  }
}
```

## Next Steps

- **[Events & Commands](/core-concepts/events-commands/)** -- How the EventBus and CommandBus interact with the store.
- **[Plugin System](/core-concepts/plugin-system/)** -- Managing plugin-owned state slices.
- **[Architecture](/core-concepts/architecture/)** -- How the store fits into the engine lifecycle.
