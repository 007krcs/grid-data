---
title: Column Pinning
description: Pin columns to the left or right edge of the grid so they remain visible during horizontal scrolling.
---

The Column Pinning plugin enables columns to be fixed to the left or right edge of the grid. Pinned columns stay visible as the user scrolls horizontally through the remaining columns.

## Installation

```bash
npm install @gridstorm/plugin-column-pinning
```

```ts title="Setup"
import { ColumnPinningPlugin } from '@gridstorm/plugin-column-pinning';

const engine = createGrid({
  columns: [
    { field: 'id', pinned: 'left' },
    { field: 'name' },
    { field: 'email' },
    { field: 'phone' },
    { field: 'actions', pinned: 'right' },
  ],
  rowData: [...],
  plugins: [ColumnPinningPlugin()],
});
```

## Plugin Options

```ts title="ColumnPinningPluginOptions"
interface ColumnPinningPluginOptions {
  maxPinnedLeft?: number;   // Maximum left-pinned columns (default: Infinity)
  maxPinnedRight?: number;  // Maximum right-pinned columns (default: Infinity)
}
```

Limit the number of pinned columns to prevent excessive pinning:

```ts
ColumnPinningPlugin({ maxPinnedLeft: 2, maxPinnedRight: 1 })
```

## Pinning via Column Definitions

Set the initial pin state in the column definition:

```ts title="Column definition"
{ field: 'id', pinned: 'left' }
{ field: 'actions', pinned: 'right' }
{ field: 'name', pinned: null }  // Not pinned (default)
```

### Lock Pinned State

Prevent users from unpinning a column:

```ts
{ field: 'id', pinned: 'left', lockPinned: true }
```

## Programmatic Pinning

### Pin a Column

```ts
api.setColumnPinned('email', 'left');
api.setColumnPinned('phone', 'right');
```

### Unpin a Column

```ts
api.setColumnPinned('email', null);
```

### Unpin All Columns

Via command:

```ts
engine.commandBus.dispatch('column:unpinAll', {});
```

## Column Reordering with Pins

When a column is pinned, the plugin automatically reorders the column array so that:
1. Left-pinned columns appear first
2. Unpinned (center) columns appear in the middle
3. Right-pinned columns appear last

This reordering is internal and does not affect the order you defined in your column definitions.

## Commands

| Command | Payload | Description |
|---|---|---|
| `column:pin` | `{ colId, pinned: 'left' \| 'right' \| null }` | Pin or unpin a column |
| `column:unpinAll` | `{}` | Unpin all columns |

## Events

| Event | Payload | Description |
|---|---|---|
| `column:pinned` | `{ column, pinned }` | Column pin state changed |

## Next Steps

- **[Column Resize](/plugins/column-resize/)** -- Resize pinned and unpinned columns.
- **[Column Reorder](/plugins/column-reorder/)** -- Drag columns to reorder.
