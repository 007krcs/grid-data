---
title: Master Detail
description: Expand rows to reveal nested detail grids with independent columns, data, and plugins.
---

The Master Detail plugin allows each row to expand and display a nested child grid. This is useful for order/line-item relationships, hierarchical data, or any parent-child pattern.

## Installation

```bash
npm install @gridstorm/plugin-master-detail
```

```ts title="Setup"
import { MasterDetailPlugin } from '@gridstorm/plugin-master-detail';

const engine = createGrid({
  columns: [...],
  rowData: [...],
  plugins: [
    MasterDetailPlugin({
      detailGridOptions: (parentRow) => ({
        columns: [
          { field: 'lineItem' },
          { field: 'qty' },
          { field: 'price' },
        ],
        rowData: parentRow.data.lineItems,
      }),
    }),
  ],
});
```

## Plugin Options

| Option | Type | Default | Description |
|---|---|---|---|
| `detailGridOptions` | `(row) => GridOptions` | required | Factory returning grid config for the detail row |
| `detailRowHeight` | `number` | `300` | Height of the expanded detail area in pixels |
| `keepDetailMounted` | `boolean` | `false` | Keep detail grid alive when row is collapsed |

## Commands

| Command | Payload | Description |
|---|---|---|
| `detail:expand` | `{ rowId }` | Expand a master row |
| `detail:collapse` | `{ rowId }` | Collapse a master row |
| `detail:toggle` | `{ rowId }` | Toggle expansion state |

## Events

| Event | Payload | Description |
|---|---|---|
| `detail:expanded` | `{ rowId, api }` | Detail grid opened (includes child api) |
| `detail:collapsed` | `{ rowId }` | Detail grid closed |

## Next Steps

- **[Selection](/plugins/selection/)** -- Select rows across master and detail grids.
- **[Grouping](/plugins/grouping/)** -- Combine grouping with master-detail for multi-level hierarchies.
