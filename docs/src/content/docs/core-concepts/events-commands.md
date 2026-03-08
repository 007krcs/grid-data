---
title: Events & Commands
description: Subscribe to grid events, dispatch commands, and understand the full event and command reference.
---

GridStorm uses two complementary systems for communication: the **EventBus** for notifications (something happened) and the **CommandBus** for mutations (make something happen).

## EventBus

The EventBus is a typed publish/subscribe system. Events are emitted after state changes occur and are used for reacting to grid behavior.

### Subscribing to Events

```ts title="Direct subscription"
const unsub = engine.eventBus.on('column:sort:changed', (event) => {
  console.log('New sort model:', event.sortModel);
});

// Later: unsubscribe
unsub();
```

### Via the GridApi

The GridApi provides `addEventListener` and `removeEventListener` methods that delegate to the EventBus:

```ts title="API subscription"
function onSortChanged(event) {
  console.log('Sort model:', event.sortModel);
}

api.addEventListener('column:sort:changed', onSortChanged);

// Later: remove
api.removeEventListener('column:sort:changed', onSortChanged);
```

### Via React Hooks

In React, use the `useGridEvent` hook which handles subscription lifecycle automatically:

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

## Event Reference

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
| `cell:valueChanged` | `{ node, colId, oldValue, newValue }` | Cell value was committed (not cancelled) |

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

### Clipboard Events

| Event | Payload | Description |
|---|---|---|
| `clipboard:copy` | `{ data }` | Data was copied to clipboard |
| `clipboard:paste` | `{ data }` | Data was pasted from clipboard |
| `clipboard:cut` | `{ data }` | Data was cut to clipboard |

## CommandBus

The CommandBus is the mutation layer. Dispatching a command invokes all registered handlers for that command type. Commands are the only sanctioned way to change grid state.

### Dispatching Commands

```ts title="Dispatching"
engine.commandBus.dispatch('sort:toggle', {
  colId: 'age',
  multiSort: true,
});
```

### Registering Command Handlers

Plugins register command handlers during installation. You can also register custom handlers:

```ts title="Custom handler"
const unregister = engine.commandBus.registerHandler('myCommand', (payload) => {
  console.log('Custom command received:', payload);
});

// Later: unregister
unregister();
```

## Command Reference

### Built-in Engine Commands

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
| `group:expand` | `{ rowId }` | Expand a group row |
| `group:collapse` | `{ rowId }` | Collapse a group row |
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

## Next Steps

- **[Architecture](/core-concepts/architecture/)** -- How the event and command systems fit into the engine.
- **[Plugin System](/plugins/plugin-system/)** -- Building plugins that register commands and events.
- **[React Guide](/frameworks/react/)** -- Event callback props and hooks.
