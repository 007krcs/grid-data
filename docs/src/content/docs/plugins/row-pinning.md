---
title: Row Pinning
description: Pin rows to the top or bottom of the grid so they remain visible outside the normal scroll area.
---

The Row Pinning plugin allows you to pin specific rows to the top or bottom of the grid as floating rows. Pinned rows stay visible regardless of scroll position and are managed through commands and plugin state. A configurable maximum capacity prevents excessive pinning, and rows can be initialized with pre-populated pinned data.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-row-pinning
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { RowPinningPlugin } from '@gridstorm/plugin-row-pinning';

const grid = createGrid({
  columns: [
    { colId: 'product', field: 'product', headerName: 'Product' },
    { colId: 'quantity', field: 'quantity', headerName: 'Qty' },
    { colId: 'price', field: 'price', headerName: 'Price' },
  ],
  rowData: [
    { product: 'Widget A', quantity: 150, price: 29.99 },
    { product: 'Widget B', quantity: 85, price: 49.99 },
    { product: 'Widget C', quantity: 220, price: 14.99 },
  ],
  plugins: [
    RowPinningPlugin({
      maxPinnedRows: 20,
      pinnedBottomRowData: [
        { product: 'Total', quantity: 455, price: null },
      ],
    }),
  ],
});
```

:::example{title="Live Row Pinning Demo" href="/cookbook/#row-pinning-basic"}
Pin summary rows to the bottom and important rows to the top while scrolling through a large dataset.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `maxPinnedRows` | `number` | `20` | Maximum total number of pinned rows (top + bottom combined). |
| `pinnedTopRowData` | `unknown[]` | `[]` | Initial data for rows pinned to the top of the grid. |
| `pinnedBottomRowData` | `unknown[]` | `[]` | Initial data for rows pinned to the bottom of the grid. |

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `rowPinning:pinTop` | `{ rowIds: string[] }` | Pin existing grid rows to the top. Rows already pinned are skipped. |
| `rowPinning:pinBottom` | `{ rowIds: string[] }` | Pin existing grid rows to the bottom. Rows already pinned are skipped. |
| `rowPinning:unpin` | `{ rowIds: string[] }` | Unpin specific rows from either top or bottom. |
| `rowPinning:unpinAll` | `{}` | Remove all pinned rows. |
| `rowPinning:setTopData` | `{ data: unknown[] }` | Replace all top-pinned rows with new data. |
| `rowPinning:setBottomData` | `{ data: unknown[] }` | Replace all bottom-pinned rows with new data. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `rowPinning:changed` | `{ pinnedTopRows: PinnedRowNode[]; pinnedBottomRows: PinnedRowNode[] }` | Emitted whenever the set of pinned rows changes. |

## Usage Examples

### Pin Selected Rows to the Top

```typescript title="pin-selected.ts"
// Get selected row IDs from the selection plugin
const selectedIds = grid.api.getSelectedNodes().map((n) => n.id);

// Pin them to the top of the grid
grid.commandBus.dispatch('rowPinning:pinTop', { rowIds: selectedIds });
```

### Summary Row at the Bottom

```typescript title="summary-row.ts"
const grid = createGrid({
  columns: [
    { colId: 'month', field: 'month', headerName: 'Month' },
    { colId: 'revenue', field: 'revenue', headerName: 'Revenue' },
    { colId: 'expenses', field: 'expenses', headerName: 'Expenses' },
  ],
  rowData: monthlyData,
  plugins: [
    RowPinningPlugin({
      pinnedBottomRowData: [
        { month: 'Total', revenue: 1250000, expenses: 890000 },
        { month: 'Average', revenue: 104167, expenses: 74167 },
      ],
    }),
  ],
});
```

### Unpin a Specific Row

```typescript title="unpin-row.ts"
// Unpin a single row by ID
grid.commandBus.dispatch('rowPinning:unpin', { rowIds: ['row-5'] });

// Unpin everything
grid.commandBus.dispatch('rowPinning:unpinAll', {});
```

### Replace Pinned Data Dynamically

```typescript title="dynamic-pinned.ts"
// Update the bottom summary when underlying data changes
grid.commandBus.dispatch('rowPinning:setBottomData', {
  data: [
    { product: 'Updated Total', quantity: newTotal, price: null },
  ],
});
```

## Next Steps

- [Status Bar Plugin](/plugins/status-bar/) -- aggregation summary bar as an alternative to pinned summary rows.
- [Selection Plugin](/plugins/selection/) -- select rows before pinning them.
- [Tree Data Plugin](/plugins/tree-data/) -- combine pinned rows with hierarchical tree data.
