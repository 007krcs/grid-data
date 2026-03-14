---
title: Grouping
description: Group rows by one or more columns with expand/collapse, hierarchical nesting, and auto-detection from column definitions.
---

The Grouping plugin organizes flat row data into a hierarchical tree by grouping on one or more column values. Group rows can be expanded and collapsed, and the plugin respects active filters and sort models when building the group tree.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-grouping
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { GroupingPlugin } from '@gridstorm/plugin-grouping';

const grid = createGrid({
  columns: [
    { colId: 'department', field: 'department', headerName: 'Department', rowGroup: true, rowGroupIndex: 0 },
    { colId: 'team', field: 'team', headerName: 'Team', rowGroup: true, rowGroupIndex: 1 },
    { colId: 'name', field: 'name', headerName: 'Name' },
    { colId: 'salary', field: 'salary', headerName: 'Salary' },
  ],
  rowData: [],
  plugins: [
    GroupingPlugin({
      defaultExpanded: false,
      groupDisplayType: 'singleColumn',
    }),
  ],
});
```

Columns with `rowGroup: true` are automatically detected on install and used as the initial group columns, sorted by `rowGroupIndex`.

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `defaultExpanded` | `boolean \| number` | `false` | Initial expand state. `true` expands all groups. A number expands groups to that depth level (e.g., `1` expands top-level only). `false` starts all collapsed. |
| `groupDisplayType` | `'singleColumn' \| 'multipleColumns' \| 'groupRows'` | `'singleColumn'` | How group information is displayed in the grid. |
| `groupRowRenderer` | `CellRendererFn` | `undefined` | Custom renderer for group rows. |

## Usage Examples

### Add and Remove Group Columns at Runtime

```typescript title="dynamic-grouping.ts"
// Add a column to grouping
grid.commandBus.dispatch('group:addColumn', { colId: 'department' });

// Remove a column from grouping
grid.commandBus.dispatch('group:removeColumn', { colId: 'department' });

// Replace all group columns at once
grid.commandBus.dispatch('group:setColumns', {
  colIds: ['department', 'team'],
});
```

When `groupColumns` becomes empty, the plugin dispatches `rows:reprocess` to revert to a flat row list.

### Expand and Collapse Groups

```typescript title="expand-collapse.ts"
// Expand a specific group row
grid.commandBus.dispatch('group:expand', { rowId: 'group-Engineering' });

// Collapse a specific group row
grid.commandBus.dispatch('group:collapse', { rowId: 'group-Engineering' });

// Expand/collapse all groups
grid.commandBus.dispatch('group:expandAll', {});
grid.commandBus.dispatch('group:collapseAll', {});

// Expand to a specific depth (e.g., expand top-level groups only)
grid.commandBus.dispatch('group:expandToLevel', { level: 1 });
```

### Filter and Sort Integration

The grouping pipeline applies current filters via `filterRowNodes()` and sorts via `sortRowNodes()` before building the group tree. This means grouped views automatically reflect the active filter and sort state without any extra configuration.

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `group:addColumn` | `{ colId: string }` | Add a column to the grouping. No-op if already grouped. Triggers reprocess. |
| `group:removeColumn` | `{ colId: string }` | Remove a column from grouping. Triggers reprocess. |
| `group:setColumns` | `{ colIds: string[] }` | Replace all group columns. Triggers reprocess. |
| `group:expand` | `{ rowId: string }` | Expand a specific group row. |
| `group:collapse` | `{ rowId: string }` | Collapse a specific group row. |
| `group:expandAll` | `{}` | Expand all group rows. |
| `group:collapseAll` | `{}` | Collapse all group rows. |
| `group:expandToLevel` | `{ level: number }` | Expand all groups with `node.level < level`. |
| `grouping:reprocess` | `{}` | Core dispatches this instead of the flat pipeline when grouping is active. Rebuilds the group tree. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `row:groupOpened` | `{ node: RowNode; expanded: boolean }` | Emitted when a group row is expanded or collapsed. |
| `grouping:changed` | `{ groupColumns: string[] }` | Emitted when the active group columns change (add, remove, or set). |

## React Integration

```tsx title="GroupedGrid.tsx"
import { GridStorm, useGridApi } from '@gridstorm/react';
import { GroupingPlugin } from '@gridstorm/plugin-grouping';

function GroupedGrid({ rowData, columns }) {
  const apiRef = useGridApi();

  const expandAll = () => apiRef.current?.commandBus.dispatch('group:expandAll', {});
  const collapseAll = () => apiRef.current?.commandBus.dispatch('group:collapseAll', {});

  return (
    <>
      <button onClick={expandAll}>Expand All</button>
      <button onClick={collapseAll}>Collapse All</button>
      <GridStorm
        rowData={rowData}
        columns={columns}
        plugins={[GroupingPlugin({ defaultExpanded: 1 })]}
      />
    </>
  );
}
```

## Next Steps

- [Aggregation Plugin](/plugins/aggregation/) -- compute sum, avg, count on group rows (requires Grouping).
- [Pivoting Plugin](/plugins/pivoting/) -- pivot grouped data into dynamic columns.
- [Filtering Plugin](/plugins/filtering/) -- filters are applied before grouping automatically.
