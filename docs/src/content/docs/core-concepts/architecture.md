---
title: Architecture
description: Deep dive into GridStorm's headless core engine, reactive store, event system, and plugin lifecycle.
---

GridStorm is built on a layered architecture that separates the data engine from rendering and framework integration. This separation enables framework-agnostic operation, deterministic testing, and the ability to swap or extend any layer independently.

## Layered Design

```
+-------------------------------------------------------+
|          Framework Adapter  (@gridstorm/react)         |
|   Hooks, controlled state, portal renderers, events    |
+-------------------------------------------------------+
|          DOM Renderer  (@gridstorm/dom-renderer)       |
|   Virtual scroll, row/cell elements, scroll sync,      |
|   keyboard navigation, ARIA attributes                 |
+-------------------------------------------------------+
|          Core Engine  (@gridstorm/core)                |
|   GridEngine   Store   EventBus   CommandBus           |
|   PluginManager   RowModel   ColumnModel               |
+-------------------------------------------------------+
|          Plugins                                       |
|   sorting  filtering  selection  editing  pagination   |
|   column-pinning  column-resize  column-reorder        |
|   context-menu  grouping  aggregation  clipboard       |
+-------------------------------------------------------+
|          Theme  (@gridstorm/theme-default)             |
|   CSS custom properties, light/dark/high-contrast      |
+-------------------------------------------------------+
```

### Core Engine

The `@gridstorm/core` package contains no DOM or framework dependencies. It is pure TypeScript and can run in Node.js, web workers, or any JavaScript environment.

The engine is created with `createGrid(config)`, which returns a `GridEngine` object containing:

- **`api`** -- The public `GridApi` for programmatic grid control.
- **`store`** -- A reactive state container holding all grid state.
- **`eventBus`** -- A typed publish/subscribe system for grid events.
- **`commandBus`** -- A dispatch system for state mutations.
- **`pluginManager`** -- Manages plugin registration, dependency resolution, installation, and destruction.

```ts title="Creating the engine"
import { createGrid } from '@gridstorm/core';

const engine = createGrid({
  columns: [{ field: 'name' }, { field: 'age' }],
  rowData: [{ name: 'Alice', age: 30 }],
  plugins: [SortingPlugin()],
});
```

### DOM Renderer

The `@gridstorm/dom-renderer` receives the engine and a container element. It constructs the grid DOM structure, manages virtual scrolling (rendering only visible rows), handles scroll synchronization for pinned columns, and attaches keyboard navigation listeners.

```ts title="Mounting the renderer"
import { DomRenderer } from '@gridstorm/dom-renderer';

const renderer = new DomRenderer({ container: document.getElementById('grid')!, engine });
renderer.mount();
```

### Framework Adapters

Framework adapters provide idiomatic wrappers around the engine and renderer. The React adapter (`@gridstorm/react`) manages the engine lifecycle with hooks, bridges events to React callbacks, enables React components as cell/header renderers via portals, and supports controlled state for sort model, filter model, selection, and pagination.

## Unidirectional Data Flow

All state mutations flow in one direction:

```
User Interaction / API Call
        |
        v
   CommandBus.dispatch('sort:toggle', { colId: 'age' })
        |
        v
   Command Handler (registered by plugin)
        |
        v
   Store.setState(updater)
        |
        v
   Store notifies subscribers
        |
        v
   EventBus.emit('column:sort:changed', { sortModel })
        |
        v
   Renderer updates DOM  /  React re-renders via hooks
```

**Commands are the only way to mutate state.** This constraint makes state changes predictable, traceable, and easy to intercept (for logging, undo/redo, or controlled mode in React).

## The Store

The store is a lightweight reactive state container purpose-built for grid operations. It holds the entire `GridState` as a single immutable snapshot, with targeted mutable internals on `RowNode` objects for performance.

```ts title="GridState shape"
interface GridState<TData> {
  columns: ColumnState[];
  rowNodes: Map<string, RowNode<TData>>;
  displayedRowIds: string[];
  sortModel: SortModelItem[];
  filterModel: Record<string, FilterModel>;
  selection: {
    selectedRowIds: Set<string>;
    rangeSelections: CellRange[];
  };
  editing: EditingState | null;
  scroll: { top: number; left: number };
  focusedCell: CellPosition | null;
  pagination: { currentPage: number; pageSize: number; totalRows: number };
  quickFilterText: string;
  pluginState: Record<string, unknown>;
}
```

Key store capabilities:

- **Immutable state slices** -- Top-level state properties (columns, sortModel, filterModel, etc.) are replaced immutably when they change.
- **Mutable RowNode internals** -- For performance, individual `RowNode` properties (`selected`, `expanded`, `rowTop`, `version`) are mutated in place. A `version` counter tracks changes for targeted re-renders.
- **Batched updates** -- `store.batch(fn)` groups multiple state changes into a single subscriber notification, preventing unnecessary re-renders.
- **Subscriptions** -- `store.subscribe(listener)` notifies listeners on any state change. The React adapter uses `useSyncExternalStore` for tear-free reads.

## EventBus

The EventBus is a typed publish/subscribe system. Every significant state change emits an event that plugins, the renderer, and application code can subscribe to.

```ts title="Subscribing to events"
engine.eventBus.on('column:sort:changed', ({ sortModel }) => {
  console.log('Sort changed:', sortModel);
});

engine.eventBus.on('selection:changed', ({ selectedNodes, source }) => {
  console.log(`${selectedNodes.length} rows selected via ${source}`);
});
```

Events are read-only notifications. They describe what happened, not what should happen. To cause state changes, dispatch commands instead.

## CommandBus

The CommandBus is the mutation layer. Dispatching a command invokes all registered handlers for that command type. Plugins register handlers during installation.

```ts title="Dispatching commands"
engine.commandBus.dispatch('sort:toggle', {
  colId: 'age',
  multiSort: true,
});
```

Built-in commands registered by the engine:

| Command | Payload | Effect |
|---|---|---|
| `rows:reprocess` | `{}` | Re-runs filter, sort, and display position pipeline |
| `sort:set` | `{ sortModel }` | Sets the sort model and reprocesses rows |
| `filter:set` | `{ filterModel }` | Sets the filter model and reprocesses rows |

Plugins register additional commands during their `install()` phase. See the individual plugin pages for their command references.

## Plugin Lifecycle

Plugins go through a well-defined lifecycle:

1. **Registration** -- `pluginManager.register(plugin)` adds the plugin to the registry. Must happen before `installAll()`.
2. **Dependency resolution** -- `installAll()` performs a topological sort on all registered plugins, resolving `dependencies` arrays. Circular dependencies throw an error.
3. **Installation** -- Each plugin's `install(context)` method is called in dependency order. The `PluginContext` provides access to the API, store, event bus, command bus, and utilities for registering state slices, cell renderers, and cell editors.
4. **Runtime** -- Plugins respond to events and commands throughout the grid's lifetime.
5. **Destruction** -- When `engine.destroy()` is called, plugins are destroyed in reverse installation order. Each plugin's disposer function (returned from `install()`) is invoked to clean up event listeners, DOM elements, and other resources.

```ts title="Plugin interface"
interface GridPlugin<TData = any> {
  id: string;
  name: string;
  version: string;
  dependencies?: string[];
  install(context: PluginContext<TData>): void | PluginDisposer;
}
```

## Row Processing Pipeline

When data changes or sort/filter state changes, the engine runs a processing pipeline:

1. **Collect** -- Gather all non-pinned `RowNode`s from the store.
2. **Filter** -- Apply column filters and quick filter to produce a filtered subset.
3. **Sort** -- Sort the filtered rows according to the active sort model.
4. **Assign display positions** -- Set `displayIndex` and `rowTop` on each surviving row.
5. **Update store** -- Write the new `displayedRowIds` array and update pagination totals.

When the grouping plugin is active, the pipeline is extended to build a group tree, compute aggregations, and flatten visible rows based on expand/collapse state.

## Next Steps

- **[Events & Commands](/core-concepts/events-commands/)** -- Full event and command reference tables.
- **[Plugin System](/plugins/plugin-system/)** -- How to build your own plugins.
- **[Columns](/core-concepts/columns/)** -- Column definition and state model.
