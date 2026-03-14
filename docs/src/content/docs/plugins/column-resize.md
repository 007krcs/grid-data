---
title: Column Resize
description: Add drag-to-resize handles with min/max constraints and double-click auto-size to your GridStorm data grid.
---

The Column Resize plugin adds drag handles to column header borders. You can drag to resize columns, and double-click the handle to auto-size a column to fit its content. It supports min/max width constraints and two resize modes.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-column-resize
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { ColumnResizePlugin } from '@gridstorm/plugin-column-resize';

const grid = createGrid({
  columns: [
    { colId: 'name', field: 'name', headerName: 'Name', resizable: true },
    { colId: 'age', field: 'age', headerName: 'Age', resizable: true, minWidth: 60, maxWidth: 200 },
    { colId: 'email', field: 'email', headerName: 'Email', resizable: true },
  ],
  rowData: [],
  plugins: [
    ColumnResizePlugin({
      minWidth: 50,
      maxWidth: Infinity,
      enableAutoSize: true,
      resizeMode: 'onChange',
    }),
  ],
});
```

Columns must have `resizable: true` for resize handles to appear.

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `minWidth` | `number` | `50` | Global minimum column width in pixels. The effective minimum is `Math.max(col.minWidth, globalMinWidth)`. |
| `maxWidth` | `number` | `Infinity` | Global maximum column width in pixels. The effective maximum is `Math.min(col.maxWidth, globalMaxWidth)`. |
| `enableAutoSize` | `boolean` | `true` | Enable double-click on the resize handle to auto-size to content. |
| `resizeMode` | `'onChange' \| 'onDragEnd'` | `'onChange'` | `'onChange'` updates the width live during drag. `'onDragEnd'` waits until mouse release. |

## Usage Examples

### Resize by Delta

Apply a relative width change to a column. The result is clamped to min/max constraints.

```typescript title="resize-delta.ts"
grid.commandBus.dispatch('column:resize', {
  colId: 'name',
  delta: 50, // add 50px
});
```

### Start a Drag Resize Interaction

This is typically called internally by the injected resize handles, but you can trigger it programmatically.

```typescript title="drag-resize.ts"
grid.commandBus.dispatch('column:resizeStart', {
  colId: 'name',
  startX: 400, // initial mouse X position
});
```

### Auto-Size Columns

Double-click a resize handle to auto-size that column, or auto-size all visible resizable columns at once.

```typescript title="auto-size.ts"
// Auto-size a single column
grid.commandBus.dispatch('column:autoSize', { colId: 'name' });

// Auto-size all visible, resizable columns
grid.commandBus.dispatch('column:autoSizeAll', {});
```

Auto-size measures both the header text width and all visible cell content widths (with padding), then sets the column to the widest value within min/max constraints.

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `column:resize` | `{ colId: string; delta: number }` | Resize a column by a pixel delta. Clamped to min/max. Only works on `resizable` columns. |
| `column:resizeStart` | `{ colId: string; startX: number }` | Begin a drag resize interaction. Attaches mousemove/mouseup listeners. Respects `resizeMode`. |
| `column:autoSize` | `{ colId: string }` | Auto-size a column to fit its content. No-op if `enableAutoSize` is `false`. |
| `column:autoSizeAll` | `{}` | Auto-size all visible, resizable columns. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `column:resized` | `{ column: ColumnState; newWidth: number }` | Emitted by the core API when `api.setColumnWidth()` is called. |
| `dom:headerRendered` | `{}` | Listened to internally to re-inject resize handles after header re-renders. |
| `grid:ready` | `{}` | Listened to internally to inject resize handles on initial mount. |

## React Integration

```tsx title="ResizableGrid.tsx"
import { GridStorm, useGridApi } from '@gridstorm/react';
import { ColumnResizePlugin } from '@gridstorm/plugin-column-resize';

function ResizableGrid({ rowData, columns }) {
  const apiRef = useGridApi();

  const autoSizeAll = () => {
    apiRef.current?.commandBus.dispatch('column:autoSizeAll', {});
  };

  return (
    <>
      <button onClick={autoSizeAll}>Auto-Size All Columns</button>
      <GridStorm
        rowData={rowData}
        columns={columns}
        plugins={[ColumnResizePlugin({ resizeMode: 'onChange' })]}
      />
    </>
  );
}
```

## Next Steps

- [Column Pinning Plugin](/plugins/column-pinning/) -- pin columns to edges.
- [Column Reorder Plugin](/plugins/column-reorder/) -- drag columns to reorder.
- [Context Menu Plugin](/plugins/context-menu/) -- add auto-size to the right-click menu.
