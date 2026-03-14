---
title: Events & Commands
description: Subscribe to grid events, dispatch commands, write middleware, and reference the complete event and command catalog.
---

GridStorm uses two complementary systems for communication: the **EventBus** for notifications (something happened) and the **CommandBus** for mutations (make something happen). Events flow outward to inform you of state changes. Commands flow inward to trigger state changes. Together they enforce a strict unidirectional data flow.

## Events vs Commands

| Aspect | Events | Commands |
|---|---|---|
| Direction | Outward (grid to your code) | Inward (your code to grid) |
| Purpose | Notify that something happened | Request that something changes |
| Timing | Fired after state has changed | Processed immediately when dispatched |
| Handlers | Multiple listeners, no return value | Multiple handlers, all invoked |
| Cancellation | Not cancellable | Cancellable via middleware |

## Installation

Both systems are part of `@gridstorm/core` and are created automatically with the grid engine:

```bash title="Install core"
pnpm add @gridstorm/core
```

## EventBus API

### on(event, listener)

Subscribe to an event. Returns an unsubscribe function:

```ts title="Subscribe to an event"
const unsub = engine.eventBus.on('selection:changed', (event) => {
  console.log('Selected:', event.selectedNodes.length);
  console.log('Source:', event.source);
});

// Later: unsubscribe
unsub();
```

### once(event, listener)

Subscribe to an event for a single firing. The listener is automatically removed after it runs:

```ts title="One-time listener"
engine.eventBus.once('grid:ready', (event) => {
  console.log('Grid is ready, API:', event.api);
});
```

### off(event, listener)

Manually remove a specific listener by reference:

```ts title="Remove a listener"
function onSort(event) {
  console.log('Sort changed:', event.sortModel);
}

engine.eventBus.on('column:sort:changed', onSort);

// Later: remove by reference
engine.eventBus.off('column:sort:changed', onSort);
```

### emit(event, payload)

Emit an event to all registered listeners. Primarily used by plugins and the engine internals:

```ts title="Emit an event"
engine.eventBus.emit('row:clicked', {
  node: rowNode,
  event: mouseEvent,
});
```

Listeners that throw errors are caught and logged without interrupting other listeners.

### Via the GridApi

The `GridApi` wraps the EventBus with `addEventListener` and `removeEventListener`:

```ts title="API subscription"
const unsub = api.addEventListener('filter:changed', (event) => {
  console.log('Filters:', event.filterModel);
});

// The return value is an unsubscribe function
unsub();
```

### Via React Hooks

In React, use the `useGridEvent` hook which handles the subscription lifecycle automatically:

```tsx title="React hook"
import { useGridEvent } from '@gridstorm/react';

useGridEvent('cell:clicked', (event) => {
  console.log('Clicked:', event.colId, event.value);
});
```

Or use event callback props on the `<GridStorm>` component:

```tsx title="React callback props"
<GridStorm
  columns={columns}
  rowData={data}
  onSortChanged={(e) => console.log('Sort:', e.sortModel)}
  onSelectionChanged={(e) => console.log('Selected:', e.selectedNodes.length)}
  onCellValueChanged={(e) => console.log('Changed:', e.colId, e.newValue)}
/>
```

## CommandBus API

### registerHandler(commandType, handler)

Register a synchronous handler for a command type. Multiple handlers per type are supported -- all are invoked when the command is dispatched. Returns an unsubscribe function:

```ts title="Register a handler"
const unregister = engine.commandBus.registerHandler('sort:set', (payload) => {
  console.log('Sort model set to:', payload.sortModel);
});

// Later: remove the handler
unregister();
```

### registerAsyncHandler(commandType, handler)

Register an asynchronous handler. Async handlers are only invoked via `dispatchAsync()` and run sequentially (each awaited before the next):

```ts title="Async handler"
engine.commandBus.registerAsyncHandler('ssrm:refresh', async (payload) => {
  const data = await fetch('/api/rows');
  engine.store.setState((prev) => ({ ...prev, /* ... */ }));
});
```

### dispatch(commandType, payload)

Dispatch a command synchronously. Middleware runs first, then all registered handlers:

```ts title="Dispatch a command"
engine.commandBus.dispatch('sort:set', {
  sortModel: [{ colId: 'name', sort: 'asc' }],
});
```

If no handler is registered and `__GRIDSTORM_DEV__` is enabled, a warning is logged.

### dispatchAsync(commandType, payload)

Dispatch a command asynchronously. Middleware runs synchronously first. Then sync handlers run, followed by async handlers in sequence:

```ts title="Async dispatch"
await engine.commandBus.dispatchAsync('ssrm:refresh', {});
```

## Command Middleware

Middleware intercepts every command before handlers run. Use it for logging, validation, analytics, or cancellation:

```ts title="Logging middleware"
const removeMiddleware = engine.commandBus.use((context) => {
  console.log(`[Command] ${context.commandType}`, context.payload);
});

// Later: remove
removeMiddleware();
```

### Cancelling Commands

Call `context.cancel()` to prevent a command from reaching its handlers:

```ts title="Validation middleware"
engine.commandBus.use((context) => {
  if (context.commandType === 'editing:start') {
    const { colId } = context.payload;
    if (colId === 'id') {
      console.warn('Cannot edit the ID column');
      context.cancel();
    }
  }
});
```

### Middleware Context

The `CommandContext` object passed to middleware contains:

| Property | Type | Description |
|---|---|---|
| `commandType` | `string` | The command being dispatched |
| `payload` | `any` | The command payload |
| `cancel()` | `() => void` | Call to prevent handler execution |

Middleware functions run in registration order. If any middleware calls `cancel()`, no subsequent middleware or handlers run.

## Complete Event Reference

### Lifecycle Events

| Event | Payload | Description |
|---|---|---|
| `grid:ready` | `{ api }` | Grid engine is initialized and ready |
| `grid:destroyed` | `{}` | Grid has been destroyed |

### Data Events

| Event | Payload | Description |
|---|---|---|
| `rowData:changed` | `{ rowData }` | Row data was replaced via `setRowData()` |
| `rowNode:updated` | `{ node }` | A specific row node was updated |

### Column Events

| Event | Payload | Description |
|---|---|---|
| `columns:changed` | `{ columns }` | Column definitions or state changed |
| `column:moved` | `{ column, fromIndex, toIndex }` | Column was reordered |
| `column:resized` | `{ column, oldWidth, newWidth, finished }` | Column width changed |
| `column:visible` | `{ column, visible }` | Column visibility toggled |
| `column:pinned` | `{ column, pinned }` | Column pin state changed |
| `column:sort:changed` | `{ sortModel }` | Sort model changed |

### Selection Events

| Event | Payload | Description |
|---|---|---|
| `selection:changed` | `{ selectedNodes, source }` | Row selection changed |
| `range:selection:changed` | `{ ranges }` | Cell range selection changed |

The `source` field indicates what triggered the selection: `'api'`, `'click'`, `'checkbox'`, `'keyboard'`, or `'selectAll'`.

### Editing Events

| Event | Payload | Description |
|---|---|---|
| `cell:editingStarted` | `{ node, colId, value }` | Cell editing began |
| `cell:editingStopped` | `{ node, colId, oldValue, newValue, cancelled }` | Cell editing ended |
| `cell:valueChanged` | `{ node, colId, oldValue, newValue }` | Cell value was committed |

### Filter Events

| Event | Payload | Description |
|---|---|---|
| `filter:changed` | `{ filterModel }` | Column filter model changed |
| `quickFilter:changed` | `{ text }` | Quick filter text changed |

### Scroll and Viewport Events

| Event | Payload | Description |
|---|---|---|
| `scroll:changed` | `{ top, left }` | Scroll position changed |
| `viewport:changed` | `{ firstRow, lastRow }` | Visible row range changed |

### Row Interaction Events

| Event | Payload | Description |
|---|---|---|
| `row:clicked` | `{ node, event }` | Row was clicked |
| `row:doubleClicked` | `{ node, event }` | Row was double-clicked |
| `cell:clicked` | `{ node, colId, value, event }` | Cell was clicked |
| `cell:doubleClicked` | `{ node, colId, value, event }` | Cell was double-clicked |
| `cell:focused` | `{ position, previousPosition }` | Focused cell changed |

### Row Grouping Events

| Event | Payload | Description |
|---|---|---|
| `row:groupOpened` | `{ node, expanded }` | Group row expanded or collapsed |
| `grouping:changed` | `{ groupColumns }` | Active group columns changed |

### Aggregation Events

| Event | Payload | Description |
|---|---|---|
| `aggregation:computed` | `{ groupNodeIds }` | Aggregation values recomputed |

### Pagination Events

| Event | Payload | Description |
|---|---|---|
| `pagination:changed` | `{ currentPage, totalPages, pageSize }` | Pagination state changed |

### Pivot Events

| Event | Payload | Description |
|---|---|---|
| `pivot:changed` | `{ pivotColumns, pivotMode }` | Pivot configuration changed |

### Context Menu Events

| Event | Payload | Description |
|---|---|---|
| `contextMenu:opened` | `{ node, colId, x, y }` | Context menu was opened |
| `contextMenu:closed` | `{}` | Context menu was closed |

### DOM Renderer Events

| Event | Payload | Description |
|---|---|---|
| `dom:headerRendered` | `{}` | Header DOM was rebuilt (plugins re-inject handles) |

### Row Reorder Events

| Event | Payload | Description |
|---|---|---|
| `row:moved` | `{ rowId, fromIndex, toIndex }` | Row was moved to a new position |
| `row:dragStarted` | `{ rowId }` | Row drag reorder started |
| `row:dragEnded` | `{ rowId }` | Row drag reorder ended |

### Clipboard Events

| Event | Payload | Description |
|---|---|---|
| `clipboard:copy` | `{ data }` | Data was copied to clipboard |
| `clipboard:paste` | `{ data }` | Data was pasted from clipboard |
| `clipboard:cut` | `{ data }` | Data was cut to clipboard |

## Complete Command Reference

### Core Engine Commands

| Command | Payload | Description |
|---|---|---|
| `rows:reprocess` | `{}` | Re-run filter, sort, and display pipeline |
| `sort:set` | `{ sortModel }` | Set the sort model |
| `filter:set` | `{ filterModel }` | Set the filter model |

### Sorting Plugin Commands

| Command | Payload | Description |
|---|---|---|
| `sort:toggle` | `{ colId, multiSort? }` | Toggle sort on a column |
| `sort:clear` | `{}` | Clear all sort |

### Filtering Plugin Commands

| Command | Payload | Description |
|---|---|---|
| `filter:set` | `{ colId, model }` | Set filter on a specific column |
| `filter:clear` | `{}` | Clear all filters |
| `filter:quickFilter` | `{ text }` | Set quick filter text |
| `filter:setColumn` | `{ colId, model }` | Set filter for one column |
| `filter:removeColumn` | `{ colId }` | Remove filter from one column |

### Selection Plugin Commands

| Command | Payload | Description |
|---|---|---|
| `selection:select` | `{ rowId, multiSelect?, rangeSelect?, source? }` | Select a row |
| `selection:selectAll` | `{}` | Select all visible rows |
| `selection:deselectAll` | `{}` | Deselect all rows |
| `focus:set` | `{ position }` | Set the focused cell |

### Editing Plugin Commands

| Command | Payload | Description |
|---|---|---|
| `editing:start` | `{ rowId, colId }` | Start editing a cell |
| `editing:stop` | `{ cancel? }` | Stop editing (commit or cancel) |
| `editing:setValue` | `{ value }` | Update the value during editing |

### Pagination Plugin Commands

| Command | Payload | Description |
|---|---|---|
| `pagination:goToPage` | `{ page }` | Navigate to a specific page |
| `pagination:nextPage` | `{}` | Go to next page |
| `pagination:prevPage` | `{}` | Go to previous page |
| `pagination:firstPage` | `{}` | Go to first page |
| `pagination:lastPage` | `{}` | Go to last page |
| `pagination:setPageSize` | `{ pageSize }` | Change the page size |

### Column Pinning Commands

| Command | Payload | Description |
|---|---|---|
| `column:pin` | `{ colId, pinned }` | Pin or unpin a column |
| `column:unpinAll` | `{}` | Unpin all columns |

### Column Resize Commands

| Command | Payload | Description |
|---|---|---|
| `column:resize` | `{ colId, delta }` | Resize by a pixel delta |
| `column:resizeStart` | `{ colId, startX }` | Begin drag resize |
| `column:autoSize` | `{ colId }` | Auto-size to content |
| `column:autoSizeAll` | `{}` | Auto-size all columns |

### Column Reorder Commands

| Command | Payload | Description |
|---|---|---|
| `column:move` | `{ colId, toIndex }` | Move column to index |
| `column:swap` | `{ colIdA, colIdB }` | Swap two columns |
| `column:dragStart` | `{ colId, startX }` | Begin drag reorder |

### Grouping Plugin Commands

| Command | Payload | Description |
|---|---|---|
| `group:addColumn` | `{ colId }` | Add column to grouping |
| `group:removeColumn` | `{ colId }` | Remove column from grouping |
| `group:setColumns` | `{ colIds }` | Set all group columns |
| `group:expand` | `{ groupId }` | Expand a group row |
| `group:collapse` | `{ groupId }` | Collapse a group row |
| `group:expandAll` | `{}` | Expand all groups |
| `group:collapseAll` | `{}` | Collapse all groups |
| `group:expandToLevel` | `{ level }` | Expand groups to a depth |

### Aggregation Plugin Commands

| Command | Payload | Description |
|---|---|---|
| `agg:setColumnFunc` | `{ colId, aggFunc }` | Set aggregation function on a column |
| `agg:removeColumnFunc` | `{ colId }` | Remove aggregation from a column |
| `agg:compute` | `{}` | Manually trigger aggregation |

### Context Menu Commands

| Command | Payload | Description |
|---|---|---|
| `contextMenu:show` | `{ x, y, node, colId, value }` | Show the context menu |
| `contextMenu:hide` | `{}` | Hide the context menu |
| `contextMenu:registerItem` | `{ item }` | Register a custom menu item |

### Clipboard Commands

| Command | Payload | Description |
|---|---|---|
| `clipboard:copy` | `{}` | Copy selected rows to clipboard |
| `clipboard:cut` | `{}` | Cut selected rows to clipboard |
| `clipboard:paste` | `{}` | Paste from clipboard |
| `clipboard:copyRange` | `{ startRow, endRow, startCol, endCol }` | Copy a specific range |

### Row Reorder Commands

| Command | Payload | Description |
|---|---|---|
| `row:move` | `{ rowId, toIndex }` | Move a row to a new display index |
| `row:swap` | `{ rowIdA, rowIdB }` | Swap two rows by their IDs |

### Tree Commands

| Command | Payload | Description |
|---|---|---|
| `tree:toggle` | `{ nodeId }` | Toggle a tree node's expanded state |
| `tree:expand` | `{ nodeId }` | Expand a tree node |
| `tree:collapse` | `{ nodeId }` | Collapse a tree node |
| `tree:expandAll` | `{}` | Expand all tree nodes |
| `tree:collapseAll` | `{}` | Collapse all tree nodes |
| `tree:getNodeState` | `{ nodeId }` | Get the state of a tree node |

### Server-Side Row Model Commands

| Command | Payload | Description |
|---|---|---|
| `ssrm:ensureRows` | `{ startRow, endRow }` | Ensure rows in the given range are loaded |
| `ssrm:refresh` | `{}` | Refresh server-side data |
| `ssrm:getCacheInfo` | `{}` | Get cache information |

### Export Commands

| Command | Payload | Description |
|---|---|---|
| `excel:exportCsv` | `{}` | Export data as CSV |
| `excel:exportExcel` | `{}` | Export data as Excel |
| `excel:exportData` | `{}` | Export raw data |

### Master-Detail Commands

| Command | Payload | Description |
|---|---|---|
| `detail:expand` | `{ nodeId }` | Expand a detail row |
| `detail:collapse` | `{ nodeId }` | Collapse a detail row |
| `detail:toggle` | `{ nodeId }` | Toggle a detail row's state |
| `detail:expandAll` | `{}` | Expand all detail rows |
| `detail:collapseAll` | `{}` | Collapse all detail rows |
| `detail:refreshDetail` | `{ nodeId }` | Refresh a specific detail row |

### Custom Commands

Plugins can register custom commands via declaration merging:

```ts title="Declare a custom command"
declare module '@gridstorm/core' {
  interface CommandMap {
    'myPlugin:doSomething': { value: string };
  }
}

// Now type-safe to dispatch
engine.commandBus.dispatch('myPlugin:doSomething', { value: 'hello' });
```

## Next Steps

- **[Store](/core-concepts/store/)** -- How the store reacts to commands and notifies subscribers.
- **[Plugin System](/core-concepts/plugin-system/)** -- Registering command handlers and event listeners in plugins.
- **[React Guide](/frameworks/react/)** -- Event callback props and hooks.
