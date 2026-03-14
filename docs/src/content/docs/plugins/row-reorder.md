---
title: Row Reorder
description: Drag and drop rows to reorder them within the grid, with animation and drop-zone indicators.
---

The Row Reorder plugin enables drag-and-drop row repositioning. Users grab a drag handle (or the entire row) and move it to a new position within the grid.

## Installation

```bash
npm install @gridstorm/plugin-row-reorder
```

```ts title="Setup"
import { RowReorderPlugin } from '@gridstorm/plugin-row-reorder';

const engine = createGrid({
  columns: [...],
  rowData: [...],
  plugins: [RowReorderPlugin()],
});
```

## Plugin Options

| Option | Type | Default | Description |
|---|---|---|---|
| `dragHandle` | `boolean` | `true` | Show a dedicated drag handle column |
| `animationDuration` | `number` | `200` | Drop animation duration in ms |
| `onRowMoved` | `(event) => void` | -- | Callback after a row is repositioned |

## Usage with Drag Handle

When `dragHandle` is true, a narrow column with a grip icon is prepended to the grid. Users click and drag from that column to reorder.

```ts
RowReorderPlugin({ dragHandle: true })
```

To allow dragging from any cell in the row:

```ts
RowReorderPlugin({ dragHandle: false })
```

## Commands

| Command | Payload | Description |
|---|---|---|
| `row:move` | `{ fromIndex, toIndex }` | Programmatically move a row |
| `row:moveMultiple` | `{ rowIds, toIndex }` | Move multiple selected rows |

## Events

| Event | Payload | Description |
|---|---|---|
| `row:dragStart` | `{ rowId, index }` | Drag operation started |
| `row:dragEnd` | `{ rowId, fromIndex, toIndex }` | Row dropped at new position |

## Next Steps

- **[Selection](/plugins/selection/)** -- Select rows before bulk reorder.
- **[Column Reorder](/plugins/column-reorder/)** -- Reorder columns via drag and drop.
