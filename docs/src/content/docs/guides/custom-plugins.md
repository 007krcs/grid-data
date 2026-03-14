---
title: Custom Plugins
description: Complete guide to building, testing, and publishing custom GridStorm plugins with the PluginContext API, command handlers, state management, and cell renderers.
---

GridStorm's plugin system is the primary extension mechanism for both the data grid and the PDF toolkit. Plugins register command handlers, listen to events, manage their own state slices, and contribute custom cell renderers and editors. This guide walks you through the full plugin lifecycle with two complete examples.

## Plugin Interface

Every GridStorm plugin implements the `GridPlugin` interface:

```typescript title="GridPlugin interface"
interface GridPlugin<TData = any> {
  id: string;              // Unique identifier for dependency resolution
  name: string;            // Human-readable display name
  version: string;         // Semantic version string
  dependencies?: string[]; // IDs of required plugins
  install(context: PluginContext<TData>): void | PluginDisposer;
}
```

The `install` method receives a `PluginContext` and optionally returns a cleanup function that runs when the grid is destroyed.

```typescript title="Minimal plugin"
import type { GridPlugin } from '@gridstorm/core';

const myPlugin: GridPlugin = {
  id: 'my-plugin',
  name: 'My Custom Plugin',
  version: '1.0.0',

  install(ctx) {
    console.log('Plugin installed');
    return () => console.log('Plugin destroyed');
  },
};
```

## Plugin Lifecycle

1. **Registration** -- You pass plugins in the `GridConfig.plugins` array. The plugin manager stores them but does not install them yet.
2. **Topological sort** -- The plugin manager resolves dependencies and determines installation order. Circular dependencies throw an error.
3. **Installation** -- Each plugin's `install` method is called in dependency order with a `PluginContext`.
4. **Runtime** -- Plugins respond to commands, emit events, and manage state.
5. **Destruction** -- When `engine.destroy()` is called, disposer functions run in reverse installation order, and all event/command subscriptions are automatically cleaned up.

## PluginContext API Reference

The `PluginContext` object provides everything a plugin needs to interact with the grid.

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `api` | `GridApi<TData>` | Public grid API for reading data and dispatching high-level operations |
| `store` | `PluginStoreAccess<TData>` | Low-level state store access (getState, setState, subscribe, batch, select) |
| `eventBus` | `PluginEventBus<TData>` | Emit and subscribe to typed grid events |
| `commandBus` | `PluginCommandBus` | Dispatch and handle commands (sync and async) |
| `config` | `GridConfig<TData>` | Read-only reference to the grid configuration |
| `getPlugin(id)` | `<T>(id: string) => T \| undefined` | Access another installed plugin by ID |
| `registerCommand(type, handler)` | `(string, CommandHandler) => void` | Register a command handler (auto-cleaned up on destroy) |
| `registerState(key, initial)` | `<S>(string, S) => void` | Register a plugin-owned state slice |
| `getState(key)` | `<S>(string) => S` | Read current plugin state |
| `setState(key, updater)` | `<S>(string, (prev: S) => S) => void` | Update plugin state immutably |
| `registerCellRenderer(name, fn)` | `(string, CellRendererFn) => void` | Register a named cell renderer |
| `registerCellEditor(name, def)` | `(string, CellEditorDef) => void` | Register a named cell editor |

### Store Access

The `store` property gives you direct access to the grid's internal state:

```typescript title="Store methods"
interface PluginStoreAccess<TData> {
  getState(): GridState<TData>;
  setState(updater: (prev: GridState<TData>) => GridState<TData>): void;
  subscribe(listener: () => void): () => void;
  batch(fn: () => void): void;
  select<T>(
    selector: (state: GridState<TData>) => T,
    listener: (value: T, prevValue: T) => void,
  ): () => void;
}
```

Use `batch` when you need multiple state updates to apply as a single re-render. Use `select` to subscribe to specific state slices efficiently.

### Command Bus

Commands are the only way to mutate grid state, enforcing unidirectional data flow:

```typescript title="Command bus methods"
interface PluginCommandBus {
  dispatch(commandType: string, payload: any): void;
  dispatchAsync(commandType: string, payload: any): Promise<void>;
  registerHandler(commandType: string, handler: Function): () => void;
  registerAsyncHandler(commandType: string, handler: Function): () => void;
}
```

## Registering Commands and Events

```typescript title="Commands and events"
install(ctx) {
  // Register a custom command
  ctx.registerCommand('myPlugin:highlight', (payload) => {
    const { rowId, color } = payload;
    ctx.setState('myPlugin', (prev) => ({
      ...prev,
      highlights: { ...prev.highlights, [rowId]: color },
    }));
    ctx.eventBus.emit('myPlugin:highlighted', { rowId, color });
  });

  // Listen for grid events
  const unsub = ctx.eventBus.on('row:clicked', (event) => {
    console.log('Row clicked:', event.rowId);
  });

  // Dispatch commands from other plugins or application code
  ctx.commandBus.dispatch('myPlugin:highlight', {
    rowId: 'row-1',
    color: '#ffeb3b',
  });

  return () => unsub();
}
```

Event subscriptions and command handlers registered through the context are automatically cleaned up when the plugin is destroyed. You do not need to manually unsubscribe from `registerCommand` -- only from direct `eventBus.on` calls.

## Managing Plugin State

Use `registerState`, `getState`, and `setState` for plugin-specific data that lives in the grid's `pluginState` map:

```typescript title="Plugin state management"
install(ctx) {
  // Register initial state
  ctx.registerState('search', {
    query: '',
    results: [],
    activeIndex: -1,
  });

  // Read state
  const state = ctx.getState('search');

  // Update state immutably
  ctx.setState('search', (prev) => ({
    ...prev,
    query: 'hello',
  }));

  // React to state changes via store.select
  ctx.store.select(
    (s) => s.pluginState['search'],
    (next, prev) => {
      console.log('Search state changed:', next);
    },
  );
}
```

Each state key is owned by one plugin. Attempting to register a key already owned by another plugin throws an error.

## Declaring Dependencies

If your plugin depends on another plugin, declare it in the `dependencies` array. The plugin manager ensures dependencies are installed first.

```typescript title="Declaring dependencies"
const analyticsPlugin: GridPlugin = {
  id: 'analytics',
  name: 'Analytics',
  version: '1.0.0',
  dependencies: ['sorting', 'filtering'],

  install(ctx) {
    // Safe to access sorting plugin -- guaranteed to be installed
    const sorting = ctx.getPlugin('sorting');

    ctx.eventBus.on('column:sort:changed', (e) => {
      trackEvent('sort', e.sortModel);
    });
  },
};
```

Missing dependencies produce a clear error message. Circular dependencies are detected and throw during installation.

## Custom Cell Renderers

Register a cell renderer to control how cells in a column are displayed:

```typescript title="Custom cell renderer"
install(ctx) {
  ctx.registerCellRenderer('sparkline', (params) => {
    const { value, eCell } = params;
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 30;
    drawSparkline(canvas, value);
    eCell.appendChild(canvas);
    return canvas;
  });
}
```

Then reference it in a column definition:

```typescript title="Use the renderer"
const columns = [
  { field: 'trend', cellRenderer: 'sparkline' },
];
```

## Example: Row Highlight Plugin

This plugin highlights rows with configurable colors. It registers a command, manages its own state, and applies CSS classes to highlighted rows.

```typescript title="row-highlight-plugin.ts"
import type { GridPlugin, PluginContext } from '@gridstorm/core';

interface HighlightState {
  highlights: Record<string, string>; // rowId → CSS color
}

export function createRowHighlightPlugin(): GridPlugin {
  return {
    id: 'row-highlight',
    name: 'Row Highlight',
    version: '1.0.0',

    install(ctx: PluginContext) {
      // 1. Register state
      ctx.registerState<HighlightState>('row-highlight', {
        highlights: {},
      });

      // 2. Register commands
      ctx.registerCommand('highlight:set', (payload: {
        rowId: string;
        color: string;
      }) => {
        ctx.setState<HighlightState>('row-highlight', (prev) => ({
          highlights: { ...prev.highlights, [payload.rowId]: payload.color },
        }));
        ctx.eventBus.emit('highlight:changed', {
          rowId: payload.rowId,
          color: payload.color,
        });
      });

      ctx.registerCommand('highlight:clear', (payload: {
        rowId: string;
      }) => {
        ctx.setState<HighlightState>('row-highlight', (prev) => {
          const highlights = { ...prev.highlights };
          delete highlights[payload.rowId];
          return { highlights };
        });
        ctx.eventBus.emit('highlight:changed', {
          rowId: payload.rowId,
          color: null,
        });
      });

      ctx.registerCommand('highlight:clearAll', () => {
        ctx.setState<HighlightState>('row-highlight', () => ({
          highlights: {},
        }));
      });

      // 3. Register a cell renderer that applies highlight styles
      ctx.registerCellRenderer('highlighted-cell', (params) => {
        const state = ctx.getState<HighlightState>('row-highlight');
        const color = state.highlights[params.rowId];
        if (color) {
          params.eCell.style.backgroundColor = color;
        }
        params.eCell.textContent = String(params.value ?? '');
        return params.eCell;
      });

      // 4. No disposer needed -- registerCommand is auto-cleaned
    },
  };
}
```

```typescript title="Usage"
import { createGrid } from '@gridstorm/core';
import { createRowHighlightPlugin } from './row-highlight-plugin';

const engine = createGrid({
  columns: [{ field: 'name' }, { field: 'status' }],
  rowData: myData,
  plugins: [createRowHighlightPlugin()],
});

// Highlight a row
engine.commandBus.dispatch('highlight:set', {
  rowId: 'row-5',
  color: '#fff3cd',
});
```

## Example: Data Validation Plugin

This plugin validates cell values against rules and displays validation errors.

```typescript title="data-validation-plugin.ts"
import type { GridPlugin, PluginContext } from '@gridstorm/core';

interface ValidationRule {
  field: string;
  validate: (value: any) => string | null; // null = valid
}

interface ValidationState {
  errors: Record<string, Record<string, string>>; // rowId → field → error
  rules: ValidationRule[];
}

export function createDataValidationPlugin(
  rules: ValidationRule[],
): GridPlugin {
  return {
    id: 'data-validation',
    name: 'Data Validation',
    version: '1.0.0',

    install(ctx: PluginContext) {
      ctx.registerState<ValidationState>('data-validation', {
        errors: {},
        rules,
      });

      // Validate a single row
      ctx.registerCommand('validation:validateRow', (payload: {
        rowId: string;
      }) => {
        const state = ctx.store.getState();
        const node = state.rowNodes.get(payload.rowId);
        if (!node?.data) return;

        const rowErrors: Record<string, string> = {};
        for (const rule of rules) {
          const value = (node.data as any)[rule.field];
          const error = rule.validate(value);
          if (error) {
            rowErrors[rule.field] = error;
          }
        }

        ctx.setState<ValidationState>('data-validation', (prev) => {
          const errors = { ...prev.errors };
          if (Object.keys(rowErrors).length > 0) {
            errors[payload.rowId] = rowErrors;
          } else {
            delete errors[payload.rowId];
          }
          return { ...prev, errors };
        });
      });

      // Validate all displayed rows
      ctx.registerCommand('validation:validateAll', () => {
        const state = ctx.store.getState();
        for (const rowId of state.displayedRowIds) {
          ctx.commandBus.dispatch('validation:validateRow', { rowId });
        }
      });

      // Auto-validate on cell edit
      ctx.eventBus.on('cell:valueChanged', (event) => {
        ctx.commandBus.dispatch('validation:validateRow', {
          rowId: event.rowId,
        });
      });

      // Register a cell renderer that shows error styling
      ctx.registerCellRenderer('validated-cell', (params) => {
        const valState = ctx.getState<ValidationState>('data-validation');
        const rowErrors = valState.errors[params.rowId];
        const fieldError = rowErrors?.[params.colId];

        params.eCell.textContent = String(params.value ?? '');

        if (fieldError) {
          params.eCell.style.borderColor = '#dc3545';
          params.eCell.title = fieldError;
        }

        return params.eCell;
      });
    },
  };
}
```

```typescript title="Usage"
const engine = createGrid({
  columns: [
    { field: 'email', cellRenderer: 'validated-cell' },
    { field: 'age', cellRenderer: 'validated-cell' },
  ],
  rowData: myData,
  plugins: [
    createDataValidationPlugin([
      {
        field: 'email',
        validate: (v) =>
          v && v.includes('@') ? null : 'Invalid email address',
      },
      {
        field: 'age',
        validate: (v) =>
          typeof v === 'number' && v >= 0 && v <= 150
            ? null
            : 'Age must be between 0 and 150',
      },
    ]),
  ],
});

// Validate everything
engine.commandBus.dispatch('validation:validateAll', {});
```

## Testing Plugins

Use Vitest with jsdom to test plugins in isolation. Create a grid engine, install your plugin, and assert state changes.

```typescript title="row-highlight-plugin.test.ts"
import { describe, it, expect } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { createRowHighlightPlugin } from './row-highlight-plugin';

describe('RowHighlightPlugin', () => {
  function setup() {
    return createGrid({
      columns: [{ field: 'name' }],
      rowData: [{ name: 'Alice' }, { name: 'Bob' }],
      plugins: [createRowHighlightPlugin()],
    });
  }

  it('should highlight a row', () => {
    const engine = setup();
    const rowId = engine.store.getState().displayedRowIds[0];

    engine.commandBus.dispatch('highlight:set', {
      rowId,
      color: '#ffeb3b',
    });

    const state = engine.store.getState();
    const highlights = state.pluginState['row-highlight'] as any;
    expect(highlights.highlights[rowId]).toBe('#ffeb3b');

    engine.destroy();
  });

  it('should clear a highlight', () => {
    const engine = setup();
    const rowId = engine.store.getState().displayedRowIds[0];

    engine.commandBus.dispatch('highlight:set', { rowId, color: '#f00' });
    engine.commandBus.dispatch('highlight:clear', { rowId });

    const state = engine.store.getState();
    const highlights = state.pluginState['row-highlight'] as any;
    expect(highlights.highlights[rowId]).toBeUndefined();

    engine.destroy();
  });
});
```

Tips for testing:

- Use `createGrid` directly without a DOM renderer for unit tests.
- Use `makeRowData()` factory functions to avoid shared mutable state across tests.
- Access plugin state through `engine.store.getState().pluginState[key]`.
- Listen for events with `engine.eventBus.on()` to verify event emission.

## Publishing Plugins

To publish a GridStorm plugin as an npm package:

1. **Name your package** with a `gridstorm-plugin-` prefix or `@yourorg/gridstorm-plugin-*` scope.
2. **Export a factory function** (e.g., `createMyPlugin()`) as the default export.
3. **Declare `@gridstorm/core` as a peer dependency** to avoid version conflicts.
4. **Build with tsup** to generate ESM, CJS, and type declarations.
5. **Document your commands and events** so users know how to interact with the plugin.

```json title="package.json"
{
  "name": "gridstorm-plugin-row-highlight",
  "version": "1.0.0",
  "main": "dist/index.cjs",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "@gridstorm/core": ">=0.1.0"
  },
  "devDependencies": {
    "@gridstorm/core": "workspace:*",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
```

## Next Steps

- [PDF Toolkit](/guides/pdf-toolkit) -- The PDF engine uses the same plugin pattern with `PdfPlugin` and `PdfPluginContext`
- [Performance](/guides/performance) -- Optimize plugin state updates for large datasets
- [Integration Guide](/guides/integration-guide) -- Add plugins to your existing project
