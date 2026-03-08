---
title: Plugin System
description: Understand GridStorm's plugin architecture, lifecycle, dependency resolution, and how to build custom plugins.
---

GridStorm's plugin system is the mechanism through which all grid features are delivered. Sorting, filtering, selection, editing, and every other capability is implemented as a plugin. This architecture keeps the core engine minimal and lets you ship only the features your application needs.

## How Plugins Work

A plugin is an object that implements the `GridPlugin` interface:

```ts title="GridPlugin interface"
interface GridPlugin<TData = any> {
  id: string;           // Unique identifier (e.g., 'sorting')
  name: string;         // Human-readable name
  version: string;      // Semver version string
  dependencies?: string[]; // IDs of required plugins
  install(context: PluginContext<TData>): void | PluginDisposer;
}
```

Plugins are provided to the grid at creation time:

```ts title="Installing plugins"
import { createGrid } from '@gridstorm/core';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import { SelectionPlugin } from '@gridstorm/plugin-selection';

const engine = createGrid({
  columns: [...],
  rowData: [...],
  plugins: [
    SortingPlugin({ multiSort: true }),
    FilteringPlugin(),
    SelectionPlugin({ mode: 'multiple' }),
  ],
});
```

Each plugin export is a factory function that accepts configuration options and returns a `GridPlugin` object.

## Plugin Lifecycle

### 1. Registration

When `createGrid()` receives a `plugins` array, each plugin is registered with the `PluginManager`. Registration validates that no duplicate IDs exist.

### 2. Dependency Resolution

Before installation, the PluginManager performs a topological sort on all registered plugins based on their `dependencies` arrays. This ensures plugins are installed in the correct order.

If a circular dependency is detected, an error is thrown:

```
[GridStorm] Circular plugin dependency detected: aggregation -> grouping -> aggregation
```

If a required dependency is missing:

```
[GridStorm] Missing plugin dependency: "grouping" (required by aggregation)
```

### 3. Installation

Each plugin's `install(context)` method is called in dependency order. The `PluginContext` provides everything a plugin needs:

```ts title="PluginContext interface"
interface PluginContext<TData = any> {
  api: GridApi<TData>;           // Public grid API
  store: PluginStoreAccess<TData>; // Read/write grid state
  eventBus: PluginEventBus<TData>; // Emit and subscribe to events
  commandBus: PluginCommandBus;    // Dispatch and register commands
  config: GridConfig<TData>;       // Grid configuration

  getPlugin<T>(id: string): T | undefined;        // Access other plugins
  registerCommand(type: string, handler: CommandHandler): void;
  registerState<S>(key: string, initialState: S): void; // Plugin-owned state slice
  getState<S>(key: string): S;
  setState<S>(key: string, updater: (prev: S) => S): void;
  registerCellRenderer(name: string, renderer: CellRendererFn): void;
  registerCellEditor(name: string, editor: CellEditorDef): void;
}
```

### 4. Runtime

During the grid's lifetime, plugins respond to events and commands. They can:
- Listen for events and react to user interactions
- Register command handlers that mutate state
- Dispatch commands to other plugins
- Read and write their own state slices

### 5. Destruction

When `engine.destroy()` is called, plugins are destroyed in **reverse** installation order. Each plugin's disposer function (returned from `install()`) is invoked to clean up:
- Event listeners
- Command handlers
- DOM elements
- Timers and other resources

## Building a Custom Plugin

Here is a complete example of a custom plugin that logs all cell clicks:

```ts title="cell-logger-plugin.ts"
import type { GridPlugin, PluginContext } from '@gridstorm/core';

interface CellLoggerOptions {
  logToConsole?: boolean;
}

export function CellLoggerPlugin(options: CellLoggerOptions = {}): GridPlugin {
  const { logToConsole = true } = options;

  return {
    id: 'cell-logger',
    name: 'Cell Click Logger',
    version: '1.0.0',

    install(ctx: PluginContext) {
      const log: Array<{ colId: string; value: any; timestamp: number }> = [];

      // Subscribe to cell click events
      const unsubClick = ctx.eventBus.on('cell:clicked', ({ colId, value }) => {
        const entry = { colId, value, timestamp: Date.now() };
        log.push(entry);

        if (logToConsole) {
          console.log('[CellLogger]', entry);
        }
      });

      // Register a command to retrieve the log
      const unregGetLog = ctx.commandBus.registerHandler(
        'cellLogger:getLog',
        (payload: { callback: (log: any[]) => void }) => {
          payload.callback([...log]);
        },
      );

      // Register a command to clear the log
      const unregClear = ctx.commandBus.registerHandler(
        'cellLogger:clear',
        () => {
          log.length = 0;
        },
      );

      // Return disposer
      return () => {
        unsubClick();
        unregGetLog();
        unregClear();
      };
    },
  };
}
```

Use it like any other plugin:

```ts
const engine = createGrid({
  columns: [...],
  rowData: [...],
  plugins: [CellLoggerPlugin({ logToConsole: true })],
});
```

## Plugin State Management

Plugins can register their own state slices that are stored alongside the core grid state:

```ts title="Plugin state"
install(ctx: PluginContext) {
  // Register initial state
  ctx.registerState('myPlugin', { count: 0, lastAction: null });

  // Read state
  const state = ctx.getState<{ count: number; lastAction: string | null }>('myPlugin');

  // Update state
  ctx.setState('myPlugin', (prev) => ({
    ...prev,
    count: prev.count + 1,
    lastAction: 'increment',
  }));
}
```

Plugin state is stored in `gridState.pluginState[key]` and is accessible from the store.

## Registering Cell Renderers and Editors

Plugins can register named cell renderers and editors that columns reference by string name:

```ts title="Registering renderers"
install(ctx: PluginContext) {
  ctx.registerCellRenderer('sparkline', (params) => {
    const canvas = document.createElement('canvas');
    // ... draw sparkline
    return canvas;
  });

  ctx.registerCellEditor('richText', {
    create: (params) => { /* ... */ },
    getValue: (element) => { /* ... */ },
    destroy: (element) => { /* ... */ },
  });
}
```

Columns then reference these by name:

```ts
{ field: 'trend', cellRenderer: 'sparkline' }
{ field: 'description', cellEditor: 'richText' }
```

## Plugin Dependencies

Declare dependencies to ensure installation order:

```ts title="Plugin with dependencies"
export function AggregationPlugin(): GridPlugin {
  return {
    id: 'aggregation',
    name: 'Aggregation',
    version: '0.1.0',
    dependencies: ['grouping'], // Must be installed after grouping

    install(ctx: PluginContext) {
      // Can safely access the grouping plugin
      const groupingPlugin = ctx.getPlugin('grouping');
      // ...
    },
  };
}
```

## Official Plugins

| Plugin | Package | Dependencies |
|---|---|---|
| Sorting | `@gridstorm/plugin-sorting` | None |
| Filtering | `@gridstorm/plugin-filtering` | None |
| Selection | `@gridstorm/plugin-selection` | None |
| Editing | `@gridstorm/plugin-editing` | None |
| Pagination | `@gridstorm/plugin-pagination` | None |
| Column Pinning | `@gridstorm/plugin-column-pinning` | None |
| Column Resize | `@gridstorm/plugin-column-resize` | None |
| Column Reorder | `@gridstorm/plugin-column-reorder` | None |
| Context Menu | `@gridstorm/plugin-context-menu` | None |
| Grouping | `@gridstorm/plugin-grouping` | None |
| Aggregation | `@gridstorm/plugin-aggregation` | `grouping` |
| Clipboard | `@gridstorm/plugin-clipboard` | `selection` |

## Next Steps

- **[Sorting](/plugins/sorting/)** -- First plugin to learn in detail.
- **[Architecture](/core-concepts/architecture/)** -- How plugins fit into the engine.
- **[Events & Commands](/core-concepts/events-commands/)** -- Full command and event reference.
