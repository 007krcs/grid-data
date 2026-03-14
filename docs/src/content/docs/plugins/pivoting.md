---
title: Pivoting
description: Transform row data into a cross-tabulated pivot view with dynamic value columns generated from row values.
---

The Pivoting plugin lets you rotate row-level data into column groups, producing spreadsheet-style pivot tables directly inside GridStorm.

## Installation

```bash
npm install @gridstorm/plugin-pivoting
```

```ts title="Setup"
import { PivotingPlugin } from '@gridstorm/plugin-pivoting';

const engine = createGrid({
  columns: [
    { field: 'region' },
    { field: 'product' },
    { field: 'revenue', aggFunc: 'sum' },
  ],
  rowData: [...],
  plugins: [PivotingPlugin()],
});
```

## How It Works

When pivot mode is active the plugin takes the distinct values of one or more **pivot columns** and creates dynamic child columns under each value. An **aggregation function** is applied to the measure columns for every group/pivot intersection.

```ts title="Enable pivot mode"
api.setPivotMode(true);
api.setPivotColumns(['product']);
```

## Plugin Options

| Option | Type | Default | Description |
|---|---|---|---|
| `pivotMode` | `boolean` | `false` | Start in pivot mode |
| `maxPivotValues` | `number` | `200` | Cap on generated pivot columns |

## Commands

| Command | Payload | Description |
|---|---|---|
| `pivot:setMode` | `{ enabled }` | Toggle pivot mode on/off |
| `pivot:setColumns` | `{ colIds }` | Set which columns to pivot on |

## Events

| Event | Payload | Description |
|---|---|---|
| `pivot:modeChanged` | `{ enabled }` | Pivot mode toggled |
| `pivot:columnsChanged` | `{ colIds }` | Pivot columns updated |

## Next Steps

- **[Grouping](/plugins/grouping/)** -- Group rows before pivoting.
- **[Aggregation](/plugins/aggregation/)** -- Configure aggregation functions for pivot values.
