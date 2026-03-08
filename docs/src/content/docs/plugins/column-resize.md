---
title: Column Resize
description: Enable drag-to-resize column headers with min/max width constraints and auto-size to content.
---

The Column Resize plugin adds drag handles to column header borders. Users can drag to resize columns, and double-click to auto-size a column to fit its content.

## Installation

```bash
npm install @gridstorm/plugin-column-resize
```

```ts title="Setup"
import { ColumnResizePlugin } from '@gridstorm/plugin-column-resize';

const engine = createGrid({
  columns: [
    { field: 'name', resizable: true },
    { field: 'age', resizable: true, minWidth: 60, maxWidth: 200 },
    { field: 'email', resizable: true },
  ],
  rowData: [...],
  plugins: [ColumnResizePlugin()],
});
```

:::note
Columns must have `resizable: true` for drag handles to appear. Use `defaultColDef` to make all columns resizable.
:::

## Plugin Options

```ts title="ColumnResizePluginOptions"
interface ColumnResizePluginOptions {
  minWidth?: number;       // Global minimum width in px (default: 50)
  maxWidth?: number;       // Global maximum width in px (default: Infinity)
  enableAutoSize?: boolean; // Enable double-click auto-size (default: true)
  resizeMode?: 'onChange' | 'onDragEnd'; // When to apply (default: 'onChange')
}
```

### Resize Mode

- **`onChange`** (default) -- Column width updates live as the user drags. Provides immediate visual feedback.
- **`onDragEnd`** -- Column width updates only when the user releases the mouse. Better for grids with complex cell renderers.

```ts
ColumnResizePlugin({ resizeMode: 'onDragEnd' })
```

## Width Constraints

Set per-column constraints in the column definition:

```ts title="Width constraints"
{
  field: 'name',
  resizable: true,
  width: 200,
  minWidth: 100,
  maxWidth: 400,
}
```

The global `minWidth` and `maxWidth` from plugin options act as fallback limits. The effective constraint is the most restrictive of the column-level and global values.

## Auto-Size to Content

Double-click a column's resize handle to auto-size the column to fit its widest visible content. The plugin measures both the header text and all visible cell content to determine the optimal width.

Auto-size respects min/max width constraints.

### Programmatic Auto-Size

```ts
// Auto-size a single column
engine.commandBus.dispatch('column:autoSize', { colId: 'name' });

// Auto-size all visible, resizable columns
engine.commandBus.dispatch('column:autoSizeAll', {});
```

## Programmatic Resize

Set an exact width via the API:

```ts
api.setColumnWidth('name', 250);
```

Or resize by a delta via command:

```ts
engine.commandBus.dispatch('column:resize', {
  colId: 'name',
  delta: 50,  // add 50px
});
```

## Commands

| Command | Payload | Description |
|---|---|---|
| `column:resize` | `{ colId, delta }` | Resize by a pixel delta |
| `column:resizeStart` | `{ colId, startX }` | Begin a drag resize |
| `column:autoSize` | `{ colId }` | Auto-size a column to content |
| `column:autoSizeAll` | `{}` | Auto-size all resizable columns |

## Events

| Event | Payload | Description |
|---|---|---|
| `column:resized` | `{ column, oldWidth, newWidth, finished }` | Column was resized |

The `finished` field is `true` when the resize interaction is complete (mouse released).

## Next Steps

- **[Column Pinning](/plugins/column-pinning/)** -- Pin columns to edges.
- **[Column Reorder](/plugins/column-reorder/)** -- Drag columns to reorder.
