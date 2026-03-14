---
title: Column Pinning
description: Pin columns to the left or right edge of your GridStorm data grid so they remain visible during horizontal scrolling.
---

The Column Pinning plugin enables columns to be fixed to the left or right edge of the grid. Pinned columns remain visible as the user scrolls horizontally. The plugin enforces configurable limits on the number of pinned columns and automatically reorders columns into left-pinned, center, and right-pinned zones.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-column-pinning
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { ColumnPinningPlugin } from '@gridstorm/plugin-column-pinning';

const grid = createGrid({
  columns: [
    { colId: 'id', field: 'id', headerName: 'ID', pinned: 'left' },
    { colId: 'name', field: 'name', headerName: 'Name' },
    { colId: 'email', field: 'email', headerName: 'Email' },
    { colId: 'phone', field: 'phone', headerName: 'Phone' },
    { colId: 'actions', field: 'actions', headerName: 'Actions', pinned: 'right' },
  ],
  rowData: [],
  plugins: [
    ColumnPinningPlugin({
      maxPinnedLeft: 2,
      maxPinnedRight: 1,
    }),
  ],
});
```

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `maxPinnedLeft` | `number` | `Infinity` | Maximum number of columns that can be pinned to the left. New pin requests are rejected when the limit is reached. |
| `maxPinnedRight` | `number` | `Infinity` | Maximum number of columns that can be pinned to the right. |

## Usage Examples

### Pin a Column Programmatically

```typescript title="pin-column.ts"
// Pin to left
grid.commandBus.dispatch('column:pin', { colId: 'email', pinned: 'left' });

// Pin to right
grid.commandBus.dispatch('column:pin', { colId: 'phone', pinned: 'right' });

// Unpin
grid.commandBus.dispatch('column:pin', { colId: 'email', pinned: null });
```

After pinning, the plugin automatically reorders the column array so left-pinned columns come first, center columns in the middle, and right-pinned columns last.

### Unpin All Columns

```typescript title="unpin-all.ts"
grid.commandBus.dispatch('column:unpinAll', {});
```

This uses `store.batch()` to unpin all columns in a single update.

### Set Initial Pinning via Column Definitions

```typescript title="initial-pinning.ts"
const columns = [
  { colId: 'id', field: 'id', headerName: 'ID', pinned: 'left' },
  { colId: 'total', field: 'total', headerName: 'Total', pinned: 'right' },
];
```

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `column:pin` | `{ colId: string; pinned: 'left' \| 'right' \| null }` | Pin or unpin a column. Enforces `maxPinnedLeft` / `maxPinnedRight` limits. Reorders columns after pinning. |
| `column:unpinAll` | `{}` | Unpin all currently pinned columns in a single batch. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `column:pinned` | `{ column: ColumnState; pinned: 'left' \| 'right' \| null }` | Emitted by the core API after a column's pin state changes. |

## React Integration

```tsx title="PinnableGrid.tsx"
import { GridStorm, useGridApi } from '@gridstorm/react';
import { ColumnPinningPlugin } from '@gridstorm/plugin-column-pinning';

function PinnableGrid({ rowData, columns }) {
  const apiRef = useGridApi();

  const pinLeft = (colId: string) => {
    apiRef.current?.commandBus.dispatch('column:pin', { colId, pinned: 'left' });
  };

  const unpinAll = () => {
    apiRef.current?.commandBus.dispatch('column:unpinAll', {});
  };

  return (
    <>
      <button onClick={unpinAll}>Unpin All</button>
      <GridStorm
        rowData={rowData}
        columns={columns}
        plugins={[ColumnPinningPlugin({ maxPinnedLeft: 3 })]}
      />
    </>
  );
}
```

## Next Steps

- [Column Resize Plugin](/plugins/column-resize/) -- resize pinned and unpinned columns.
- [Column Reorder Plugin](/plugins/column-reorder/) -- drag columns to reorder within pin zones.
- [Context Menu Plugin](/plugins/context-menu/) -- add pin/unpin actions to the right-click menu.
