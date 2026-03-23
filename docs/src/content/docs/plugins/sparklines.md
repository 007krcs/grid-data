---
title: Sparklines
description: Render inline mini-charts (line, bar, area, win/loss) inside grid cells.
---

The Sparklines plugin renders compact SVG charts directly inside grid cells. It supports line, bar, area, and win/loss chart types and is configured through column definitions using cell renderer parameters. Each sparkline visualizes an array of numeric values stored in the cell data.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-sparklines
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { SparklinePlugin } from '@gridstorm/plugin-sparklines';

const grid = createGrid({
  columns: [
    { colId: 'product', field: 'product', headerName: 'Product' },
    {
      colId: 'trend',
      field: 'trend',
      headerName: 'Weekly Trend',
      cellRenderer: 'sparkline',
      cellRendererParams: { type: 'line', color: '#3b82f6' },
      width: 160,
    },
  ],
  rowData: [
    { product: 'Widget A', trend: [12, 15, 11, 18, 22, 19, 25] },
    { product: 'Widget B', trend: [8, 6, 9, 5, 7, 10, 12] },
  ],
  plugins: [
    SparklinePlugin({
      defaultType: 'line',
      defaultColor: '#3b82f6',
    }),
  ],
});
```

:::example{title="Live Sparklines Demo" href="/cookbook/#sparklines-basic"}
See inline line, bar, and area sparklines rendered from weekly sales data arrays.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `defaultType` | `'line' \| 'bar' \| 'area' \| 'winloss'` | `'line'` | Default sparkline type when not specified per column. |
| `defaultColor` | `string` | `'#3b82f6'` | Default stroke/fill color. |
| `defaultNegativeColor` | `string` | `'#ef4444'` | Color used for negative values in bar and win/loss charts. |
| `defaultHeight` | `number` | cell height | Default sparkline height in pixels. |

## Cell Renderer Params

Configure individual sparkline columns via `cellRendererParams` on the column definition.

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `type` | `'line' \| 'bar' \| 'area' \| 'winloss'` | plugin default | Chart type for this column. |
| `color` | `string` | plugin default | Stroke or fill color. |
| `negativeColor` | `string` | `'#ef4444'` | Color for negative value bars. |
| `fillOpacity` | `number` | `0.1` | Fill opacity for area charts. |
| `strokeWidth` | `number` | `1.5` | Line stroke width in pixels. |
| `barGap` | `number` | `1` | Gap between bars in pixels. |
| `showMin` | `boolean` | `false` | Highlight the minimum data point. |
| `showMax` | `boolean` | `false` | Highlight the maximum data point. |
| `showLast` | `boolean` | `false` | Highlight the last data point. |

## Cell Renderers

The plugin registers these cell renderer names that you can reference in column definitions:

| Renderer Name | Description |
| --- | --- |
| `sparkline` | Generic renderer that reads `type` from `cellRendererParams`. |
| `sparkline-line` | Line sparkline. |
| `sparkline-bar` | Bar sparkline. |
| `sparkline-area` | Area sparkline with fill. |
| `sparkline-winloss` | Win/loss binary bar chart. |

## Usage Examples

### Bar Sparkline with Highlighted Extremes

```typescript title="bar-sparkline.ts"
const columns = [
  { colId: 'city', field: 'city', headerName: 'City' },
  {
    colId: 'temps',
    field: 'temperatures',
    headerName: 'Daily Temps',
    cellRenderer: 'sparkline-bar',
    cellRendererParams: {
      color: '#f59e0b',
      negativeColor: '#3b82f6',
      showMin: true,
      showMax: true,
    },
    width: 180,
  },
];

const rowData = [
  { city: 'New York', temperatures: [2, 5, -1, 8, 12, 9, 6] },
  { city: 'Chicago', temperatures: [-3, -1, 4, 7, 2, -2, 1] },
];
```

### Area Sparkline for Revenue

```typescript title="area-sparkline.ts"
const columns = [
  { colId: 'region', field: 'region', headerName: 'Region' },
  {
    colId: 'revenue',
    field: 'monthlyRevenue',
    headerName: 'Revenue (6mo)',
    cellRenderer: 'sparkline-area',
    cellRendererParams: {
      color: '#10b981',
      fillOpacity: 0.2,
      strokeWidth: 2,
      showLast: true,
    },
    width: 200,
  },
];
```

## Next Steps

- [Charts Plugin](/plugins/charts/) -- full-size chart rendering from grid data.
- [Conditional Formatting Plugin](/plugins/conditional-formatting/) -- apply color scales and data bars alongside sparklines.
