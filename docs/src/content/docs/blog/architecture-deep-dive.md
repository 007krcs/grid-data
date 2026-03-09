---
title: "Why Plugin-First Architecture Makes Data Grids Better"
description: How GridStorm's headless core and plugin system deliver smaller bundles, cleaner code, and better extensibility than monolithic grids.
---

Most data grid libraries ship as monoliths. You import one package and get sorting, filtering, grouping, editing, clipboard support, and dozens of other features -- whether you use them or not. That bundle weight adds up. AG Grid's community package alone exceeds 300 KB gzipped. For applications that only need sorting and selection, that is a steep tax.

GridStorm takes a different approach. The core engine is a headless orchestrator weighing roughly 35 KB gzipped. Every feature is a separate plugin that you install explicitly.

## The Layered Architecture

GridStorm is built in five layers, each with a single responsibility:

```
+-----------------------------------------------------------+
|                    Framework Adapter                       |
|               (@gridstorm/react, etc.)                     |
+-----------------------------------------------------------+
|                    DOM Renderer                            |
|           (@gridstorm/dom-renderer)                        |
|   Virtual scroll, row/cell rendering, keyboard nav         |
+-----------------------------------------------------------+
|                    Core Engine                             |
|               (@gridstorm/core)                            |
|   GridEngine, Store, EventBus, CommandBus, PluginManager   |
+-----------------------------------------------------------+
|                     Plugins                                |
|   sorting, filtering, selection, editing, pagination, ...  |
+-----------------------------------------------------------+
|                    Theme Layer                             |
|            (@gridstorm/theme-default)                      |
|   CSS custom properties, light/dark/high-contrast          |
+-----------------------------------------------------------+
```

The **Core Engine** owns the reactive store, an event bus for outbound notifications, and a command bus for inbound mutations. It knows nothing about sorting, filtering, or any feature -- those are all plugins.

The **DOM Renderer** handles virtual scrolling, row and cell painting, scroll synchronization, and keyboard navigation. It subscribes to store changes and patches only the DOM nodes that moved or changed.

**Framework Adapters** are thin wrappers. The React adapter, for example, manages the engine lifecycle, bridges core events to React callbacks, and uses portals for custom cell renderers.

## Unidirectional Data Flow

All state mutations flow in one direction:

```
User interaction
      |
      v
  Command (dispatch via CommandBus)
      |
      v
  Plugin handler (mutates Store)
      |
      v
  Store notifies subscribers
      |
      v
  DOM Renderer patches the DOM
      |
      v
  EventBus emits events to listeners
```

Commands are the only way to change state. This makes the system predictable and easy to debug -- you can log every command and replay state transitions deterministically.

## The Plugin API

Every plugin implements a simple interface: an `id`, a `name`, a `version`, optional `dependencies`, and an `install` function that receives a `PluginContext`:

```ts
import type { GridPlugin, PluginContext } from '@gridstorm/core';

export function SortingPlugin(options = {}): GridPlugin {
  return {
    id: 'sorting',
    name: 'Column Sorting',
    version: '0.1.0',

    install(ctx: PluginContext) {
      // Register a command handler
      const unsub = ctx.commandBus.registerHandler(
        'sort:toggle',
        (payload) => {
          const state = ctx.store.getState();
          const newModel = computeNextSort(state.sortModel, payload.colId);
          ctx.api.setSortModel(newModel);
        },
      );

      // Listen for events
      ctx.eventBus.on('column:sort:changed', (e) => {
        console.log('Sort changed:', e.sortModel);
      });

      // Return cleanup function
      return () => unsub();
    },
  };
}
```

The `PluginContext` provides access to the grid API, the internal store, both buses, and helpers for registering custom state slices, cell renderers, and cell editors. Plugins can declare dependencies on other plugins, and the plugin manager resolves the install order using topological sorting.

## Bundle Size Benefits

Because each plugin is a separate package, your bundler tree-shakes everything you do not import:

| Setup | Approximate gzipped size |
|---|---|
| Core only (no plugins) | ~35 KB |
| Core + sorting + selection | ~42 KB |
| Core + all 13 plugins + React adapter | ~65 KB |
| AG Grid Community | ~300 KB+ |

The difference is most dramatic for simple grids. A table with sorting and selection ships less than half the code of the lightest AG Grid setup.

## Writing Your Own Plugin

The plugin contract is intentionally minimal. You can build custom features -- audit logging, analytics hooks, undo/redo -- using the same primitives that the built-in plugins use:

```ts
const AuditPlugin: GridPlugin = {
  id: 'audit-log',
  name: 'Audit Logger',
  version: '1.0.0',

  install(ctx) {
    ctx.eventBus.on('cell:valueChanged', (e) => {
      fetch('/api/audit', {
        method: 'POST',
        body: JSON.stringify({
          rowId: e.node.id,
          column: e.colId,
          oldValue: e.oldValue,
          newValue: e.newValue,
          timestamp: Date.now(),
        }),
      });
    });
  },
};
```

Register it alongside the built-in plugins, and it participates in the same lifecycle and dependency resolution system.

## Trade-offs

Plugin-first is not free. You manage more imports, and the plugin manager adds a small overhead at initialization. For teams that need every feature and do not care about bundle size, a monolith is simpler to set up. GridStorm is designed for teams that value lean bundles, explicit dependencies, and the ability to extend the grid without forking it.
