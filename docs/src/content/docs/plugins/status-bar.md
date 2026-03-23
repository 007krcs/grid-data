---
title: Status Bar
description: Display an aggregation summary bar with auto-recalculating statistics for selected or all rows.
---

The Status Bar plugin renders a summary panel below the grid showing aggregation values such as sum, average, min, max, and count. It recalculates automatically when the row selection changes and can display statistics for all rows when nothing is selected. Custom panels can be configured for layout control.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-status-bar
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { StatusBarPlugin } from '@gridstorm/plugin-status-bar';

const grid = createGrid({
  columns: [
    { colId: 'product', field: 'product', headerName: 'Product' },
    { colId: 'quantity', field: 'quantity', headerName: 'Quantity' },
    { colId: 'price', field: 'price', headerName: 'Price' },
    { colId: 'total', field: 'total', headerName: 'Total' },
  ],
  rowData: [
    { product: 'Laptop', quantity: 5, price: 999, total: 4995 },
    { product: 'Monitor', quantity: 12, price: 349, total: 4188 },
    { product: 'Keyboard', quantity: 30, price: 79, total: 2370 },
  ],
  plugins: [
    StatusBarPlugin({
      showOnSelection: true,
      showForAllRows: true,
      defaultAggregations: ['sum', 'avg', 'min', 'max', 'count'],
    }),
  ],
});
```

:::example{title="Live Status Bar Demo" href="/cookbook/#status-bar-basic"}
Select rows in the grid and watch the status bar recalculate sum, average, and count in real time.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `panels` | `StatusBarPanel[]` | `[]` | Custom panel definitions for the status bar layout. |
| `defaultAggregations` | `AggregationType[]` | all seven types | Which aggregation functions to compute: `'sum'`, `'avg'`, `'min'`, `'max'`, `'count'`, `'first'`, `'last'`. |
| `showOnSelection` | `boolean` | `true` | Compute aggregations from selected rows when a selection exists. |
| `showForAllRows` | `boolean` | `true` | Compute aggregations from all displayed rows when no selection exists. |

### StatusBarPanel

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | `string` | required | Unique panel identifier. |
| `label` | `string` | `undefined` | Display label for the panel. |
| `align` | `'left' \| 'center' \| 'right'` | `'left'` | Panel alignment in the status bar. |
| `component` | `string` | `undefined` | Custom component name for rendering the panel. |

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `statusBar:calculate` | `{}` | Force a recalculation of all aggregation values. |
| `statusBar:toggle` | `{}` | Toggle the status bar visibility on or off. |
| `statusBar:setPanels` | `{ panels: StatusBarPanel[] }` | Replace the current panel configuration. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `selection:changed` | selection state | The plugin listens to this event to trigger automatic recalculation. |

## Usage Examples

### Show Only Sum and Count

```typescript title="minimal-status-bar.ts"
const grid = createGrid({
  columns: [...],
  rowData: [...],
  plugins: [
    StatusBarPlugin({
      defaultAggregations: ['sum', 'count'],
      showOnSelection: true,
      showForAllRows: false,
    }),
  ],
});
```

### Force Recalculation After Data Update

```typescript title="recalculate.ts"
// After updating row data programmatically
grid.api.setRowData(updatedData);

// Trigger a manual recalculation
grid.commandBus.dispatch('statusBar:calculate', {});
```

### Toggle Visibility

```typescript title="toggle-status-bar.ts"
document.getElementById('toggleBtn')?.addEventListener('click', () => {
  grid.commandBus.dispatch('statusBar:toggle', {});
});
```

### Configure Custom Panels

```typescript title="custom-panels.ts"
grid.commandBus.dispatch('statusBar:setPanels', {
  panels: [
    { id: 'total-panel', label: 'Total', align: 'left' },
    { id: 'avg-panel', label: 'Average', align: 'center' },
    { id: 'count-panel', label: 'Row Count', align: 'right' },
  ],
});
```

## Next Steps

- [Selection Plugin](/plugins/selection/) -- the status bar reacts to selection changes automatically.
- [Aggregation Plugin](/plugins/aggregation/) -- built-in aggregation for grouped rows.
- [Filtering Plugin](/plugins/filtering/) -- filter rows to narrow the aggregation scope.
