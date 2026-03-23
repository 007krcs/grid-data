---
title: Row Reorder
description: Drag and drop rows to reorder them in your GridStorm data grid, with drag handles, drop indicators, and group boundary protection.
---

The Row Reorder plugin enables drag-and-drop row repositioning. It uses event delegation and CSS pseudo-elements for compatibility with virtual scrolling, shows a visual drop indicator during drag, and persists custom row order across sort/filter reprocessing.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-row-reorder
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { RowReorderPlugin } from '@gridstorm/plugin-row-reorder';

const grid = createGrid({
  columns: [
    { colId: 'name', field: 'name', headerName: 'Name' },
    { colId: 'email', field: 'email', headerName: 'Email' },
  ],
  rowData: [],
  plugins: [
    RowReorderPlugin({
      enableDragDrop: true,
      showDragHandle: true,
      lockGroupedRows: true,
      dragHandleWidth: 24,
    }),
  ],
});
```

:::example{title="Row Reorder Demo" href="/cookbook/#row-reorder"}
Drag rows to reorder them with visual drop indicators. Supports drag handles, group boundary protection, and persistent custom ordering.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `enableDragDrop` | `boolean` | `true` | Enable drag-and-drop reordering via mouse interactions. |
| `showDragHandle` | `boolean` | `true` | Show a drag handle icon on the left edge of each row on hover. When `false`, the entire row is draggable. |
| `lockGroupedRows` | `boolean` | `true` | Prevent dragging rows across group boundaries. Rows can only be reordered within their parent group. |
| `dragHandleWidth` | `number` | `24` | Width of the drag handle hit area in pixels. |

## Usage Examples

### Move a Row Programmatically

```typescript title="move-row.ts"
grid.commandBus.dispatch('row:move', {
  rowId: 'row-3',
  toIndex: 0, // Move to the top
});
```

The command respects `lockGroupedRows` -- if the target position is in a different group than the source row, the move is rejected. Group rows cannot be moved.

### Swap Two Rows

```typescript title="swap-rows.ts"
grid.commandBus.dispatch('row:swap', {
  rowIdA: 'row-1',
  rowIdB: 'row-5',
});
```

### Drag-and-Drop Behavior

When `enableDragDrop` is `true`, the plugin injects mousedown handlers on the body viewport via event delegation:

1. If `showDragHandle` is `true`, dragging only starts when clicking within the drag handle area (left edge of the row).
2. A 5px movement threshold prevents accidental drags during normal clicks.
3. A ghost element appears near the cursor showing a preview of the row data.
4. A horizontal drop indicator line shows where the row will be inserted.
5. On mouse release, the row is moved above or below the target row based on cursor position relative to the target's midpoint.

```typescript title="full-row-drag.ts"
// Make the entire row draggable instead of just the handle
RowReorderPlugin({ showDragHandle: false })
```

## Custom Order Persistence

After any programmatic or drag-and-drop reorder, the plugin stores a custom order map. When the core engine reprocesses rows (due to sorting or filtering), the plugin re-applies the custom order to maintain user-defined positioning.

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `row:move` | `{ rowId: string; toIndex: number }` | Move a row to a specific display index. Clamped to valid range. Respects `lockGroupedRows`. Group rows cannot be moved. |
| `row:swap` | `{ rowIdA: string; rowIdB: string }` | Swap the display positions of two rows. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `row:moved` | `{ rowId: string; fromIndex: number; toIndex: number }` | Emitted after a row is moved or swapped. |
| `row:dragStarted` | `{ rowId: string }` | Emitted when a drag interaction begins (after the movement threshold is met). |
| `row:dragEnded` | `{ rowId: string }` | Emitted when a drag interaction ends (on mouse release). |

## React Integration

```tsx title="ReorderableGrid.tsx"
import { GridStorm, useGridApi } from '@gridstorm/react';
import { RowReorderPlugin } from '@gridstorm/plugin-row-reorder';

function ReorderableGrid({ rowData, columns }) {
  const apiRef = useGridApi();

  const moveToTop = (rowId: string) => {
    apiRef.current?.commandBus.dispatch('row:move', { rowId, toIndex: 0 });
  };

  return (
    <GridStorm
      rowData={rowData}
      columns={columns}
      plugins={[RowReorderPlugin({ showDragHandle: true })]}
    />
  );
}
```

## Next Steps

- [Column Reorder Plugin](/plugins/column-reorder/) -- reorder columns via drag-and-drop.
- [Selection Plugin](/plugins/selection/) -- select rows before reordering.
- [Grouping Plugin](/plugins/grouping/) -- grouped rows respect `lockGroupedRows` boundaries.
