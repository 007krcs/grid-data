---
title: Aggregation
description: Compute aggregate values (sum, avg, count, min, max) on group rows with built-in and custom aggregation functions.
---

The Aggregation plugin computes aggregate values for group rows. It walks the group tree bottom-up, computing specified aggregation functions for each group node. This plugin requires the Grouping plugin.

## Installation

```bash
npm install @gridstorm/plugin-aggregation @gridstorm/plugin-grouping
```

```ts title="Setup"
import { GroupingPlugin } from '@gridstorm/plugin-grouping';
import { AggregationPlugin } from '@gridstorm/plugin-aggregation';

const engine = createGrid({
  columns: [
    { field: 'department', rowGroup: true, rowGroupIndex: 0 },
    { field: 'name' },
    { field: 'salary', aggFunc: 'sum' },
    { field: 'age', aggFunc: 'avg' },
  ],
  rowData: [...],
  plugins: [
    GroupingPlugin({ defaultExpanded: true }),
    AggregationPlugin(),
  ],
});
```

:::caution
The Aggregation plugin declares `dependencies: ['grouping']`. The Grouping plugin must be installed alongside it.
:::

## Plugin Options

```ts title="AggregationPluginOptions"
interface AggregationPluginOptions {
  defaultAggFunc?: string;                  // Default agg function name
  customAggFuncs?: Record<string, AggFunc>; // Custom agg functions
}
```

## Built-in Aggregation Functions

| Name | Description |
|---|---|
| `sum` | Sum of all numeric values |
| `avg` | Average of all numeric values |
| `count` | Count of non-null values |
| `min` | Minimum numeric value |
| `max` | Maximum numeric value |
| `first` | First value in the group |
| `last` | Last value in the group |

### Assigning to Columns

Set the aggregation function in the column definition:

```ts
{ field: 'salary', aggFunc: 'sum' }
{ field: 'age', aggFunc: 'avg' }
{ field: 'name', aggFunc: 'count' }
```

### Change at Runtime

```ts
engine.commandBus.dispatch('agg:setColumnFunc', {
  colId: 'salary',
  aggFunc: 'avg',
});
```

### Remove Aggregation

```ts
engine.commandBus.dispatch('agg:removeColumnFunc', {
  colId: 'salary',
});
```

## Custom Aggregation Functions

Register custom functions via plugin options:

```ts title="Custom agg functions"
AggregationPlugin({
  customAggFuncs: {
    median: ({ values }) => {
      const sorted = values
        .filter((v) => v != null && !isNaN(Number(v)))
        .map(Number)
        .sort((a, b) => a - b);
      if (sorted.length === 0) return null;
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    },
    distinctCount: ({ values }) => {
      return new Set(values.filter((v) => v != null)).size;
    },
  },
})
```

Then use them on columns:

```ts
{ field: 'salary', aggFunc: 'median' }
{ field: 'department', aggFunc: 'distinctCount' }
```

### AggFunc Interface

```ts title="AggFunc"
type AggFunc = (params: {
  values: any[];
  nodes: RowNode[];
  column: ColumnState;
}) => any;
```

## Accessing Aggregated Values

Aggregated values are stored on the group RowNode's `aggData` property:

```ts
const groupNode = api.getRowNode('group-Engineering');
if (groupNode?.aggData) {
  console.log('Total salary:', groupNode.aggData.salary);
  console.log('Average age:', groupNode.aggData.age);
}
```

## Hierarchical Aggregation

Aggregations cascade bottom-up through nested groups. A parent group's aggregation uses its child groups' aggregated values (not the raw leaf values), which means:

- A `sum` at the top level is the sum of all child group sums
- An `avg` at the top level averages the child group averages (weighted by leaf count via `avg` function)

## Commands

| Command | Payload | Description |
|---|---|---|
| `agg:setColumnFunc` | `{ colId, aggFunc }` | Set aggregation on a column |
| `agg:removeColumnFunc` | `{ colId }` | Remove aggregation from a column |
| `agg:compute` | `{}` | Manually trigger recomputation |

## Events

| Event | Payload | Description |
|---|---|---|
| `aggregation:computed` | `{ groupNodeIds }` | Aggregations were recomputed |

## Next Steps

- **[Grouping](/plugins/grouping/)** -- Required companion plugin.
- **[Columns](/core-concepts/columns/)** -- Column aggFunc configuration.
