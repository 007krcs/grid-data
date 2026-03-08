---
title: Column Reorder
description: Drag columns to reorder them, with support for pinned column zones and lock position.
---

The Column Reorder plugin enables users to rearrange columns by dragging header cells. It supports locking columns in place and preventing columns from being dragged across pin zones.

## Installation

```bash
npm install @gridstorm/plugin-column-reorder
```

```ts title="Setup"
import { ColumnReorderPlugin } from '@gridstorm/plugin-column-reorder';

const engine = createGrid({
  columns: [
    { field: 'id', lockPosition: true },   // Cannot be moved
    { field: 'name' },
    { field: 'age' },
    { field: 'email' },
  ],
  rowData: [...],
  plugins: [ColumnReorderPlugin()],
});
```

## Plugin Options

```ts title="ColumnReorderPluginOptions"
interface ColumnReorderPluginOptions {
  enableDragDrop?: boolean;     // Enable drag-and-drop (default: true)
  lockPinnedColumns?: boolean;  // Prevent cross-zone dragging (default: true)
  dragIndicatorClass?: string;  // CSS class for the drag ghost element
}
```

### Lock Pinned Columns

When `lockPinnedColumns` is `true` (the default), columns cannot be dragged from the pinned-left zone to the center zone or vice versa. Each pin zone maintains its own ordering.

```ts
ColumnReorderPlugin({ lockPinnedColumns: true })
```

Set to `false` to allow free movement across zones:

```ts
ColumnReorderPlugin({ lockPinnedColumns: false })
```

## Lock Position

Prevent a specific column from being moved by setting `lockPosition` on the column definition:

```ts
{ field: 'rowNumber', lockPosition: true }
```

Locked columns cannot be dragged and other columns cannot be dropped in their position.

## Programmatic Reorder

### Move a Column to an Index

```ts
api.moveColumn('email', 1);  // Move email to index 1
```

### Swap Two Columns

```ts
engine.commandBus.dispatch('column:swap', {
  colIdA: 'name',
  colIdB: 'email',
});
```

## Drag Interaction

When the user initiates a drag on a header cell:

1. A ghost element appears near the cursor showing the column name.
2. The cursor changes to `grabbing`.
3. On mouse release over another header cell, the column is moved to that position.
4. The ghost element is removed and the cursor resets.

## Commands

| Command | Payload | Description |
|---|---|---|
| `column:move` | `{ colId, toIndex }` | Move a column to a specific index |
| `column:swap` | `{ colIdA, colIdB }` | Swap the positions of two columns |
| `column:dragStart` | `{ colId, startX }` | Begin a drag reorder interaction |

## Events

| Event | Payload | Description |
|---|---|---|
| `column:moved` | `{ column, fromIndex, toIndex }` | Column was moved |

## Next Steps

- **[Column Pinning](/plugins/column-pinning/)** -- Pin columns to edges.
- **[Column Resize](/plugins/column-resize/)** -- Resize columns by dragging.
