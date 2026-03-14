---
title: Plugin System
description: Build custom plugins, manage dependencies, register commands and state, and extend GridStorm with the full plugin lifecycle.
---

GridStorm's plugin system is the primary extension mechanism for the grid. Every feature beyond the core engine -- sorting, filtering, editing, selection, grouping, clipboard -- is implemented as a plugin. You can write your own plugins using the same APIs that the built-in plugins use.

## Plugin Lifecycle

A plugin goes through three phases:

1. **Register** -- The plugin is added to the plugin manager before the grid initializes.
2. **Install** -- The plugin manager installs all registered plugins in dependency-resolved order. Each plugin's `install()` method receives a `PluginContext` with full access to the grid internals.
3. **Destroy** -- When the grid is destroyed, all plugins are torn down in reverse installation order. Tracked subscriptions are automatically cleaned up, and the optional disposer function is called.

## Installation

Plugins are part of the GridStorm ecosystem. Install the ones you need:

```bash title="Install plugins"
pnpm add @gridstorm/core @gridstorm/plugin-sorting @gridstorm/plugin-filtering
```

Pass them to the grid configuration:

```ts title="Using plugins"
import { GridEngine } from '@gridstorm/core';
import { sortingPlugin } from '@gridstorm/plugin-sorting';
import { filterPlugin } from '@gridstorm/plugin-filtering';

const engine = new GridEngine({
  columns: [{ field: 'name', sortable: true }],
  rowData: data,
  plugins: [sortingPlugin(), filterPlugin()],
});
```

## The GridPlugin Interface

Every plugin implements the `GridPlugin` interface:

```ts title="GridPlugin interface"
interface GridPlugin<TData = any> {
  /** Unique identifier for dependency resolution and API lookups. */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Semantic version string. */
  version: string;
  /** IDs of plugins that must be installed first. */
  dependencies?: string[];
  /** Called during initialization. Return an optional cleanup function. */
  install(context: PluginContext<TData>): void | PluginDisposer;
}
```

## PluginContext API

The `install()` method receives a `PluginContext` object that provides access to every grid subsystem:

| Property / Method | Description |
|---|---|
| `api` | The public `GridApi` for interacting with the grid |
| `store` | Low-level store access: `getState()`, `setState()`, `subscribe()`, `batch()`, `select()` |
| `eventBus` | Typed event bus: `on()` and `emit()` |
| `commandBus` | Command bus: `dispatch()`, `dispatchAsync()`, `registerHandler()`, `registerAsyncHandler()` |
| `config` | Read-only reference to the original `GridConfig` |
| `getPlugin(id)` | Retrieve another installed plugin by its ID |
| `registerCommand(type, handler)` | Register a command handler (auto-tracked for cleanup) |
| `registerState(key, initialState)` | Register a plugin-owned state slice |
| `getState(key)` | Read a plugin-owned state slice |
| `setState(key, updater)` | Update a plugin-owned state slice |
| `registerCellRenderer(name, fn)` | Register a named cell renderer |
| `registerCellEditor(name, def)` | Register a named cell editor |

## Writing a Custom Plugin

Here is a complete example of a custom plugin that tracks row click counts:

```ts title="Click counter plugin"
import type { GridPlugin, PluginContext } from '@gridstorm/core';

interface ClickCounterState {
  counts: Record<string, number>;
}

export function clickCounterPlugin(): GridPlugin {
  return {
    id: 'click-counter',
    name: 'Click Counter',
    version: '1.0.0',

    install(ctx: PluginContext) {
      // Register plugin-owned state
      ctx.registerState<ClickCounterState>('click-counter', {
        counts: {},
      });

      // Register a command handler
      ctx.registerCommand('clickCounter:reset', () => {
        ctx.setState<ClickCounterState>('click-counter', () => ({
          counts: {},
        }));
      });

      // Listen to row click events
      ctx.eventBus.on('row:clicked', (event) => {
        const rowId = event.node.id;
        ctx.setState<ClickCounterState>('click-counter', (prev) => ({
          counts: {
            ...prev.counts,
            [rowId]: (prev.counts[rowId] ?? 0) + 1,
          },
        }));
      });

      // Return a cleanup function (optional)
      return () => {
        console.log('Click counter plugin destroyed');
      };
    },
  };
}
```

Use it like any other plugin:

```ts title="Using the custom plugin"
const engine = new GridEngine({
  columns: [{ field: 'name' }],
  rowData: data,
  plugins: [clickCounterPlugin()],
});
```

## Plugin Dependencies and Topological Sort

Plugins can declare dependencies on other plugins using the `dependencies` array. The plugin manager performs a topological sort to ensure dependencies are installed before dependents:

```ts title="Plugin with dependencies"
const myPlugin: GridPlugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  dependencies: ['sorting', 'filtering'],

  install(ctx) {
    // Safe to access sorting and filtering plugins here
    const sorting = ctx.getPlugin('sorting');
    // ...
  },
};
```

The plugin manager enforces several rules:

- **Missing dependencies** throw an error at install time.
- **Circular dependencies** are detected and throw an error with the full cycle path.
- **Duplicate plugin IDs** throw an error at registration time.
- **Late registration** (after `installAll()`) throws an error.

In development mode (`__GRIDSTORM_DEV__`), accessing a plugin that is not declared as a dependency logs a warning.

## Plugin State Management

Plugins register their own state slices inside the grid's `pluginState` map. Each key is owned by exactly one plugin -- attempting to register a key already owned by another plugin throws an error.

```ts title="Plugin state lifecycle"
install(ctx) {
  // Register initial state
  ctx.registerState<{ searchTerm: string }>('search', {
    searchTerm: '',
  });

  // Read state
  const current = ctx.getState<{ searchTerm: string }>('search');
  console.log(current.searchTerm); // ''

  // Update state with an updater function
  ctx.setState<{ searchTerm: string }>('search', (prev) => ({
    ...prev,
    searchTerm: 'hello',
  }));
}
```

Plugin state updates flow through the same store as core state, so they participate in batching and trigger subscriber notifications.

## Registering Commands

Use `registerCommand()` to add a command handler. The handler is automatically tracked for cleanup when the plugin is destroyed:

```ts title="Registering commands"
install(ctx) {
  ctx.registerCommand('myPlugin:doSomething', (payload) => {
    console.log('Received:', payload);
    ctx.store.setState((prev) => ({
      ...prev,
      // ... state changes
    }));
  });
}
```

For more control, use `commandBus.registerHandler()` or `commandBus.registerAsyncHandler()` directly. These also track unsubscribes automatically when called through the plugin context:

```ts title="Async command handler"
install(ctx) {
  ctx.commandBus.registerAsyncHandler('myPlugin:fetchData', async (payload) => {
    const data = await fetch('/api/data');
    ctx.store.setState((prev) => ({ ...prev, /* ... */ }));
  });
}
```

## Registering Cell Renderers and Editors

Plugins can register named cell renderers and editors that columns reference by string:

```ts title="Custom cell renderer"
install(ctx) {
  ctx.registerCellRenderer('sparkline', (params) => {
    const el = document.createElement('canvas');
    // ... draw sparkline
    return el;
  });

  ctx.registerCellEditor('datePicker', {
    create: (params) => { /* ... */ },
    getValue: (el) => { /* ... */ },
    destroy: (el) => { /* ... */ },
  });
}
```

Then reference them in column definitions:

```ts title="Using registered renderers"
const columns = [
  { field: 'trend', cellRenderer: 'sparkline' },
  { field: 'startDate', cellEditor: 'datePicker', editable: true },
];
```

## Cleanup and Resource Tracking

The plugin manager automatically tracks all event bus subscriptions and command handler registrations made through the `PluginContext`. When the grid is destroyed, these are cleaned up in reverse order before the plugin's disposer function is called.

You do not need to manually unsubscribe from events or commands registered through the context. However, if you create external resources (timers, DOM elements, WebSocket connections), clean them up in the disposer:

```ts title="Resource cleanup"
install(ctx) {
  const interval = setInterval(() => {
    ctx.commandBus.dispatch('myPlugin:poll', {});
  }, 5000);

  // Event subscriptions are auto-tracked
  ctx.eventBus.on('filter:changed', (e) => { /* ... */ });

  // Return disposer for external resources
  return () => {
    clearInterval(interval);
  };
}
```

## Extending the Grid API

Plugins can attach methods to the public `GridApi` at runtime:

```ts title="Extending the API"
install(ctx) {
  (ctx.api as any).getClickCount = (rowId: string): number => {
    const state = ctx.getState<ClickCounterState>('click-counter');
    return state.counts[rowId] ?? 0;
  };
}
```

For type-safe access, consumers use `api.getPluginApi()`:

```ts title="Type-safe plugin API"
interface ClickCounterApi {
  getClickCount(rowId: string): number;
}

const clickApi = api.getPluginApi<ClickCounterApi>('click-counter');
const count = clickApi?.getClickCount('row-1');
```

## Next Steps

- **[Store](/core-concepts/store/)** -- Deep dive into the reactive store that plugins read and write.
- **[Events & Commands](/core-concepts/events-commands/)** -- Full reference for events and commands.
- **[Architecture](/core-concepts/architecture/)** -- How plugins fit into the engine lifecycle.
