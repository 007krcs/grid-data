---
title: Grouping
description: Group rows by one or more columns with expand/collapse support, group renderers, and nested hierarchies.
---

The Grouping plugin organizes flat row data into a hierarchical tree by grouping on one or more column values. Group rows can be expanded and collapsed, and each group row shows the count of its leaf children.

## Installation

```bash
npm install @gridstorm/plugin-grouping
```

```ts title="Setup"
import { GroupingPlugin } from '@gridstorm/plugin-grouping';

const engine = createGrid({
  columns: [
    { field: 'department', rowGroup: true, rowGroupIndex: 0 },
    { field: 'team', rowGroup: true, rowGroupIndex: 1 },
    { field: 'name' },
    { field: 'salary' },
  ],
  rowData: [...],
  plugins: [GroupingPlugin()],
});
```

## Plugin Options

```ts title="GroupingPluginOptions"
interface GroupingPluginOptions {
  defaultExpanded?: boolean | number; // Initial expand state (default: false)
  groupDisplayType?: 'singleColumn' | 'multipleColumns' | 'groupRows';
  groupRowRenderer?: CellRendererFn;  // Custom group row renderer
}
```

### Default Expanded

- `false` -- All groups collapsed initially
- `true` -- All groups expanded initially
- `number` -- Expand groups to this depth level (e.g., `1` expands top-level groups only)

```ts
GroupingPlugin({ defaultExpanded: 1 })  // Expand first level
```

## Defining Group Columns

Mark columns for grouping in the column definition:

```ts title="Group columns"
{ field: 'department', rowGroup: true, rowGroupIndex: 0 }
{ field: 'team', rowGroup: true, rowGroupIndex: 1 }
```

The `rowGroupIndex` determines the nesting order. Lower indices create higher-level groups.

## Programmatic Grouping

### Add a Column to Grouping

```ts
engine.commandBus.dispatch('group:addColumn', { colId: 'department' });
```

### Remove a Column from Grouping

```ts
engine.commandBus.dispatch('group:removeColumn', { colId: 'department' });
```

### Set All Group Columns

```ts
engine.commandBus.dispatch('group:setColumns', {
  colIds: ['department', 'team'],
});
```

## Expand and Collapse

### Toggle a Single Group

```ts
engine.commandBus.dispatch('group:expand', { rowId: 'group-Engineering' });
engine.commandBus.dispatch('group:collapse', { rowId: 'group-Engineering' });
```

Or through the API:

```ts
const groupNode = api.getRowNode('group-Engineering');
if (groupNode) {
  api.setRowNodeExpanded(groupNode, true);
}
```

### Expand/Collapse All

```ts
api.expandAll();
api.collapseAll();
```

Via commands:

```ts
engine.commandBus.dispatch('group:expandAll', {});
engine.commandBus.dispatch('group:collapseAll', {});
```

### Expand to a Specific Level

```ts
engine.commandBus.dispatch('group:expandToLevel', { level: 2 });
```

## Group Row Nodes

Group rows are `RowNode` objects with `group: true`. They have:

- `groupField` -- The column ID this group is keyed on
- `groupValue` -- The value of the group key
- `children` -- Array of child RowNodes (may be other groups or leaf rows)
- `leafChildrenCount` -- Total number of leaf descendants
- `expanded` -- Whether this group is currently expanded
- `aggData` -- Aggregated values (when the Aggregation plugin is installed)

## Commands

| Command | Payload | Description |
|---|---|---|
| `group:addColumn` | `{ colId }` | Add a column to grouping |
| `group:removeColumn` | `{ colId }` | Remove a column from grouping |
| `group:setColumns` | `{ colIds }` | Set all group columns |
| `group:expand` | `{ rowId }` | Expand a group row |
| `group:collapse` | `{ rowId }` | Collapse a group row |
| `group:expandAll` | `{}` | Expand all groups |
| `group:collapseAll` | `{}` | Collapse all groups |
| `group:expandToLevel` | `{ level }` | Expand groups to a depth |

## Events

| Event | Payload | Description |
|---|---|---|
| `row:groupOpened` | `{ node, expanded }` | Group row was expanded or collapsed |
| `grouping:changed` | `{ groupColumns }` | Active group columns changed |

## Next Steps

- **[Aggregation](/plugins/aggregation/)** -- Compute sum, avg, count on group rows.
- **[Row Data](/core-concepts/row-data/)** -- Understanding RowNode structure.
