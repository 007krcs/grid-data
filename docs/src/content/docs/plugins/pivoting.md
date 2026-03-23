---
title: Pivoting
description: Transform grouped row data into a cross-tabulated pivot table with dynamically generated columns.
---

The Pivoting plugin transforms row-grouped data into dynamic columns, producing spreadsheet-style pivot tables. It scans distinct values from pivot columns and generates secondary columns for each unique value, applying aggregation functions to compute the cell values. This is an enterprise plugin that requires a license for production use.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-pivoting @gridstorm/plugin-aggregation @gridstorm/plugin-grouping
```

The Pivoting plugin declares `dependencies: ['aggregation']`, which itself depends on `'grouping'`. All three plugins must be installed.

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { GroupingPlugin } from '@gridstorm/plugin-grouping';
import { AggregationPlugin } from '@gridstorm/plugin-aggregation';
import { PivotPlugin } from '@gridstorm/plugin-pivoting';

const grid = createGrid({
  columns: [
    { colId: 'region', field: 'region', headerName: 'Region', rowGroup: true, rowGroupIndex: 0 },
    { colId: 'product', field: 'product', headerName: 'Product', pivot: true, pivotIndex: 0 },
    { colId: 'revenue', field: 'revenue', headerName: 'Revenue', aggFunc: 'sum' },
  ],
  rowData: [],
  plugins: [
    GroupingPlugin({ defaultExpanded: true }),
    AggregationPlugin(),
    PivotPlugin({
      pivotMode: false,
      pivotMaxGeneratedColumns: 1000,
    }),
  ],
});
```

Columns with `pivot: true` are auto-detected on install and used as the initial pivot columns, sorted by `pivotIndex`.

:::example{title="Pivoting Demo" href="/cookbook/#pivoting"}
Transform row data into cross-tabulated pivot tables with dynamically generated columns and aggregated cell values.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `pivotMode` | `boolean` | `false` | Enable pivot mode on startup. |
| `pivotMaxGeneratedColumns` | `number` | `1000` | Maximum number of generated pivot columns. Prevents runaway column generation on high-cardinality data. |
| `processSecondaryColumns` | `(columns: ColumnDef[]) => ColumnDef[]` | `undefined` | Post-process generated secondary columns before they are applied. Useful for renaming, reordering, or filtering generated columns. |

## Usage Examples

### Enable and Disable Pivot Mode

When pivot mode is enabled, the plugin saves original columns and replaces the column set with group columns plus generated pivot columns. Disabling restores the original columns.

```typescript title="pivot-mode.ts"
// Enable pivot mode
grid.commandBus.dispatch('pivot:enable', {});

// Disable pivot mode (restores original columns)
grid.commandBus.dispatch('pivot:disable', {});
```

### Add and Remove Pivot Columns

```typescript title="pivot-columns.ts"
// Add a column to pivot on
grid.commandBus.dispatch('pivot:addColumn', { colId: 'product' });

// Remove a pivot column
grid.commandBus.dispatch('pivot:removeColumn', { colId: 'product' });

// Replace all pivot columns at once
grid.commandBus.dispatch('pivot:setColumns', { colIds: ['product', 'quarter'] });
```

### Post-Process Generated Columns

```typescript title="process-columns.ts"
PivotPlugin({
  processSecondaryColumns: (columns) => {
    // Sort generated columns alphabetically by header name
    return columns.sort((a, b) => (a.headerName ?? '').localeCompare(b.headerName ?? ''));
  },
});
```

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `pivot:enable` | `{}` | Enable pivot mode. Saves original columns, generates pivot columns, and replaces the column set. |
| `pivot:disable` | `{}` | Disable pivot mode. Restores original columns. |
| `pivot:addColumn` | `{ colId: string }` | Add a column to pivot on. Rebuilds pivot columns. No-op if already a pivot column. |
| `pivot:removeColumn` | `{ colId: string }` | Remove a pivot column. Rebuilds remaining pivot columns. |
| `pivot:setColumns` | `{ colIds: string[] }` | Replace all pivot columns. Rebuilds pivot columns. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `pivot:changed` | `{ pivotColumns: string[]; pivotMode: boolean }` | Emitted whenever pivot mode or pivot columns change. |

## React Integration

```tsx title="PivotGrid.tsx"
import { GridStorm, useGridApi } from '@gridstorm/react';
import { GroupingPlugin } from '@gridstorm/plugin-grouping';
import { AggregationPlugin } from '@gridstorm/plugin-aggregation';
import { PivotPlugin } from '@gridstorm/plugin-pivoting';

function PivotGrid({ rowData, columns }) {
  const apiRef = useGridApi();

  const togglePivot = () => {
    // Read current state and toggle
    apiRef.current?.commandBus.dispatch('pivot:enable', {});
  };

  return (
    <>
      <button onClick={togglePivot}>Enable Pivot</button>
      <GridStorm
        rowData={rowData}
        columns={columns}
        plugins={[
          GroupingPlugin({ defaultExpanded: true }),
          AggregationPlugin(),
          PivotPlugin(),
        ]}
      />
    </>
  );
}
```

## Next Steps

- [Aggregation Plugin](/plugins/aggregation/) -- required for computing pivot cell values.
- [Grouping Plugin](/plugins/grouping/) -- required for row grouping that feeds the pivot.
- [Excel Export Plugin](/plugins/excel-export/) -- export pivot tables to CSV or Excel.
