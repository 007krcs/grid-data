---
title: Tree Data
description: Display hierarchical parent-child data with expandable and collapsible tree rows.
---

The Tree Data plugin enables hierarchical row display in your GridStorm grid. It supports both nested data structures (via a `childrenField`) and flat data with parent references (via `getParentId`). Rows can be expanded and collapsed individually or in bulk, with configurable indentation and depth limits.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-tree-data
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { TreeDataPlugin } from '@gridstorm/plugin-tree-data';

const grid = createGrid({
  columns: [
    { colId: 'name', field: 'name', headerName: 'Name' },
    { colId: 'type', field: 'type', headerName: 'Type' },
    { colId: 'size', field: 'size', headerName: 'Size' },
  ],
  rowData: [
    {
      name: 'Documents',
      type: 'folder',
      size: null,
      children: [
        { name: 'Resume.pdf', type: 'file', size: '245 KB' },
        { name: 'Cover Letter.docx', type: 'file', size: '89 KB' },
      ],
    },
    {
      name: 'Photos',
      type: 'folder',
      size: null,
      children: [
        { name: 'vacation.jpg', type: 'file', size: '3.2 MB' },
      ],
    },
  ],
  plugins: [
    TreeDataPlugin({
      childrenField: 'children',
      defaultExpanded: false,
      indentPerLevel: 24,
    }),
  ],
});
```

:::example{title="Live Tree Data Demo" href="/cookbook/#tree-data-basic"}
Explore a file-system-style hierarchy with expand/collapse controls and indented child rows.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `childrenField` | `string` | `'children'` | Field name on each row that contains an array of child rows (nested mode). |
| `getParentId` | `string \| (data) => string \| null` | `undefined` | Field name or function returning the parent row ID (flat mode). When set, `childrenField` is ignored. |
| `defaultExpanded` | `boolean` | `false` | Whether tree nodes start expanded. |
| `maxDepth` | `number` | `Infinity` | Maximum nesting depth to render. |
| `indentPerLevel` | `number` | `24` | Pixels of indentation added per tree level. |

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `tree:toggle` | `{ nodeId: string }` | Toggle expand/collapse on a single node. |
| `tree:expand` | `{ nodeId: string }` | Expand a specific node. |
| `tree:collapse` | `{ nodeId: string }` | Collapse a specific node. |
| `tree:expandAll` | `{}` | Expand every group node in the tree. |
| `tree:collapseAll` | `{}` | Collapse every group node in the tree. |
| `tree:getNodeState` | `{ nodeId: string }` | Retrieve the internal tree state for a node. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `row:groupOpened` | `{ node: RowNode; expanded: boolean }` | Emitted when a tree node is toggled via `tree:toggle`. |

## Usage Examples

### Nested Data (childrenField)

```typescript title="nested-tree.ts"
const orgData = [
  {
    name: 'Engineering', department: 'ENG', headCount: 42,
    children: [
      { name: 'Frontend', department: 'ENG-FE', headCount: 15, children: [] },
      { name: 'Backend', department: 'ENG-BE', headCount: 20, children: [] },
      { name: 'DevOps', department: 'ENG-DO', headCount: 7, children: [] },
    ],
  },
  {
    name: 'Marketing', department: 'MKT', headCount: 18, children: [],
  },
];

const grid = createGrid({
  columns: [
    { colId: 'name', field: 'name', headerName: 'Department' },
    { colId: 'headCount', field: 'headCount', headerName: 'Head Count' },
  ],
  rowData: orgData,
  plugins: [TreeDataPlugin({ childrenField: 'children', defaultExpanded: true })],
});
```

### Flat Data (getParentId)

```typescript title="flat-tree.ts"
const employees = [
  { id: '1', name: 'Alice', role: 'CEO', managerId: null },
  { id: '2', name: 'Bob', role: 'VP Engineering', managerId: '1' },
  { id: '3', name: 'Carol', role: 'VP Sales', managerId: '1' },
  { id: '4', name: 'Dave', role: 'Senior Dev', managerId: '2' },
];

const grid = createGrid({
  columns: [
    { colId: 'name', field: 'name', headerName: 'Name' },
    { colId: 'role', field: 'role', headerName: 'Role' },
  ],
  rowData: employees,
  plugins: [TreeDataPlugin({ getParentId: 'managerId' })],
});
```

### Expand and Collapse Programmatically

```typescript title="tree-controls.ts"
// Expand a specific department
grid.commandBus.dispatch('tree:expand', { nodeId: '1' });

// Collapse it again
grid.commandBus.dispatch('tree:collapse', { nodeId: '1' });

// Expand the entire tree
grid.commandBus.dispatch('tree:expandAll', {});

// Collapse everything back
grid.commandBus.dispatch('tree:collapseAll', {});
```

## Next Steps

- [Grouping Plugin](/plugins/grouping/) -- group flat data by field values rather than parent-child relationships.
- [Selection Plugin](/plugins/selection/) -- select rows within tree hierarchies.
- [Row Pinning Plugin](/plugins/row-pinning/) -- pin summary rows alongside tree data.
