---
title: Column Reorder
description: Drag and drop columns to reorder them in your GridStorm data grid, with pin zone protection and lock position support.
---

The Column Reorder plugin enables column rearrangement by dragging header cells. It supports locking columns in place via `lockPosition`, preventing cross-zone dragging for pinned columns, and swapping columns programmatically. A movement threshold prevents accidental reorders during header clicks.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-column-reorder
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { ColumnReorderPlugin } from '@gridstorm/plugin-column-reorder';

const grid = createGrid({
  columns: [
    { colId: 'id', field: 'id', headerName: 'ID', lockPosition: true },
    { colId: 'name', field: 'name', headerName: 'Name' },
    { colId: 'age', field: 'age', headerName: 'Age' },
    { colId: 'email', field: 'email', headerName: 'Email' },
  ],
  rowData: [],
  plugins: [
    ColumnReorderPlugin({
      enableDragDrop: true,
      lockPinnedColumns: true,
      dragIndicatorClass: 'gs-column-drag-indicator',
    }),
  ],
});
```

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `enableDragDrop` | `boolean` | `true` | Enable drag-and-drop reordering on header cells. |
| `lockPinnedColumns` | `boolean` | `true` | Prevent dragging columns across pin zones (left-pinned, center, right-pinned). |
| `dragIndicatorClass` | `string` | `'gs-column-drag-indicator'` | CSS class for the drag ghost element. |

## Usage Examples

### Move a Column to a Specific Index

```typescript title="move-column.ts"
grid.commandBus.dispatch('column:move', {
  colId: 'email',
  toIndex: 1,
});
```

The command respects `lockPosition` on the target column and `lockPinnedColumns` across pin zones.

### Swap Two Columns

```typescript title="swap-columns.ts"
grid.commandBus.dispatch('column:swap', {
  colIdA: 'name',
  colIdB: 'email',
});
```

Swap directly exchanges two columns in the column array and emits `column:moved`.

### Drag-and-Drop Behavior

When drag-and-drop is enabled, the plugin injects mousedown handlers on header cells. A 5px movement threshold distinguishes clicks from drags. During a drag:

1. A floating ghost element appears near the cursor showing the column name.
2. The cursor changes to `grabbing`.
3. On mouse release over another header cell, the column is moved to that position.

```typescript title="lock-a-column.ts"
// Columns with lockPosition cannot be dragged
const columns = [
  { colId: 'rowNum', field: 'rowNum', headerName: '#', lockPosition: true },
  { colId: 'name', field: 'name', headerName: 'Name' },
];
```

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `column:move` | `{ colId: string; toIndex: number }` | Move a column to a specific index. Respects `lockPosition` and `lockPinnedColumns`. |
| `column:swap` | `{ colIdA: string; colIdB: string }` | Swap the positions of two columns. |
| `column:dragStart` | `{ colId: string; startX: number; startY?: number }` | Begin a drag interaction. Creates ghost element and attaches mouse listeners. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `column:moved` | `{ column: ColumnState; fromIndex: number; toIndex: number }` | Emitted after a column is moved or swapped. |
| `dom:headerRendered` | `{}` | Listened to internally to re-inject drag handlers after header re-renders. |
| `grid:ready` | `{}` | Listened to internally to inject drag handlers on initial mount. |

## React Integration

```tsx title="ReorderableGrid.tsx"
import { GridStorm, useGridApi } from '@gridstorm/react';
import { ColumnReorderPlugin } from '@gridstorm/plugin-column-reorder';

function ReorderableGrid({ rowData, columns }) {
  const apiRef = useGridApi();

  const resetOrder = () => {
    // Move columns back to original positions
    columns.forEach((col, i) => {
      apiRef.current?.commandBus.dispatch('column:move', {
        colId: col.colId,
        toIndex: i,
      });
    });
  };

  return (
    <>
      <button onClick={resetOrder}>Reset Column Order</button>
      <GridStorm
        rowData={rowData}
        columns={columns}
        plugins={[ColumnReorderPlugin()]}
      />
    </>
  );
}
```

## Next Steps

- [Column Pinning Plugin](/plugins/column-pinning/) -- pin columns to edges (interacts with `lockPinnedColumns`).
- [Column Resize Plugin](/plugins/column-resize/) -- resize handles coexist with drag handles on headers.
- [Row Reorder Plugin](/plugins/row-reorder/) -- reorder rows via drag-and-drop.
