---
title: Aggregation
description: Compute aggregate values like sum, avg, count, min, and max on group rows with built-in and custom functions.
---

The Aggregation plugin computes aggregate values for group rows by walking the group tree bottom-up. It supports built-in functions (sum, avg, count, min, max, first, last), custom aggregation functions, and automatic recomputation when grouping changes. This is an enterprise plugin that requires a license for production use.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-aggregation @gridstorm/plugin-grouping
```

The Aggregation plugin declares `dependencies: ['grouping']` and requires the Grouping plugin to be installed.

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { GroupingPlugin } from '@gridstorm/plugin-grouping';
import { AggregationPlugin } from '@gridstorm/plugin-aggregation';

const grid = createGrid({
  columns: [
    { colId: 'department', field: 'department', headerName: 'Department', rowGroup: true, rowGroupIndex: 0 },
    { colId: 'name', field: 'name', headerName: 'Name' },
    { colId: 'salary', field: 'salary', headerName: 'Salary', aggFunc: 'sum' },
    { colId: 'age', field: 'age', headerName: 'Age', aggFunc: 'avg' },
  ],
  rowData: [],
  plugins: [
    GroupingPlugin({ defaultExpanded: true }),
    AggregationPlugin({
      customAggFuncs: {
        median: ({ values }) => {
          const nums = values.filter((v) => v != null && !isNaN(Number(v))).map(Number).sort((a, b) => a - b);
          if (nums.length === 0) return null;
          const mid = Math.floor(nums.length / 2);
          return nums.length % 2 === 0 ? (nums[mid - 1] + nums[mid]) / 2 : nums[mid];
        },
      },
    }),
  ],
});
```

:::example{title="Aggregation Demo" href="/cookbook/#aggregation"}
See sum, avg, count, and other aggregate values computed automatically on grouped data with custom aggregation function support.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `defaultAggFunc` | `string` | `undefined` | Default aggregation function name applied to columns without an explicit `aggFunc`. |
| `customAggFuncs` | `Record<string, AggFunc>` | `{}` | Custom aggregation functions merged with the built-in registry. Keys become the function names you reference in `aggFunc`. |

## Built-in Aggregation Functions

| Name | Description |
| --- | --- |
| `sum` | Sum of all numeric values. |
| `avg` | Average of all numeric values. |
| `count` | Count of non-null values. |
| `min` | Minimum numeric value. |
| `max` | Maximum numeric value. |
| `first` | First value in the group. |
| `last` | Last value in the group. |

## Usage Examples

### Set Aggregation on a Column at Runtime

```typescript title="set-agg.ts"
grid.commandBus.dispatch('agg:setColumnFunc', {
  colId: 'salary',
  aggFunc: 'avg',
});
```

### Remove Aggregation from a Column

When all aggregation columns are removed, `aggData` is cleared from all group nodes.

```typescript title="remove-agg.ts"
grid.commandBus.dispatch('agg:removeColumnFunc', {
  colId: 'salary',
});
```

### Manually Trigger Recomputation

Aggregations auto-recompute on `grouping:changed` events. You can also trigger it manually.

```typescript title="recompute.ts"
grid.commandBus.dispatch('agg:compute', {});
```

## Custom Aggregation Functions

The `AggFunc` signature receives an object with `values`, `nodes`, and `column`:

```typescript title="custom-agg.ts"
type AggFunc = (params: {
  values: any[];
  nodes: RowNode[];
  column: ColumnState;
}) => any;
```

For hierarchical groups, `values` may contain already-aggregated child group values rather than raw leaf values, enabling cascading aggregation.

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `agg:setColumnFunc` | `{ colId: string; aggFunc: string }` | Set the aggregation function on a column. Triggers immediate recomputation. |
| `agg:removeColumnFunc` | `{ colId: string }` | Remove aggregation from a column. Sets `aggFunc` to `null`. Clears `aggData` if no agg columns remain. |
| `agg:compute` | `{}` | Manually trigger aggregation recomputation across all group nodes. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `aggregation:computed` | `{ groupNodeIds: string[] }` | Emitted after aggregations are computed. Contains the IDs of all group nodes that were updated. |
| `grouping:changed` | `{ groupColumns: string[] }` | Listened to internally to auto-recompute aggregations when grouping changes. |

## React Integration

```tsx title="AggregatedGrid.tsx"
import { GridStorm, useGridApi } from '@gridstorm/react';
import { GroupingPlugin } from '@gridstorm/plugin-grouping';
import { AggregationPlugin } from '@gridstorm/plugin-aggregation';

function AggregatedGrid({ rowData, columns }) {
  const apiRef = useGridApi();

  const switchToAvg = () => {
    apiRef.current?.commandBus.dispatch('agg:setColumnFunc', {
      colId: 'salary',
      aggFunc: 'avg',
    });
  };

  return (
    <>
      <button onClick={switchToAvg}>Show Average Salary</button>
      <GridStorm
        rowData={rowData}
        columns={columns}
        plugins={[
          GroupingPlugin({ defaultExpanded: true }),
          AggregationPlugin(),
        ]}
      />
    </>
  );
}
```

## Next Steps

- [Grouping Plugin](/plugins/grouping/) -- required companion plugin for row grouping.
- [Pivoting Plugin](/plugins/pivoting/) -- pivot grouped data into dynamic columns (requires Aggregation).
- [Excel Export Plugin](/plugins/excel-export/) -- export aggregated data.
