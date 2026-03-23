---
title: Charts
description: Render inline SVG charts and manage standalone chart instances from grid data.
---

The Charts plugin provides two capabilities: an inline `'chart'` cell renderer for embedding SVG bar, line, pie, and scatter charts directly in grid cells, and a standalone chart state management system for creating charts outside the grid. Chart rendering uses lightweight SVG generation with no external dependencies.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-charts
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { ChartsPlugin } from '@gridstorm/plugin-charts';

const grid = createGrid({
  columns: [
    { colId: 'category', field: 'category', headerName: 'Category' },
    {
      colId: 'distribution',
      field: 'distribution',
      headerName: 'Distribution',
      cellRenderer: 'chart',
      cellRendererParams: { chartType: 'bar', colors: ['#3b82f6'] },
      width: 220,
    },
  ],
  rowData: [
    { category: 'Electronics', distribution: [42, 28, 35, 19, 51] },
    { category: 'Clothing', distribution: [15, 22, 18, 30, 25] },
  ],
  plugins: [ChartsPlugin()],
});
```

:::example{title="Live Charts Demo" href="/cookbook/#charts-basic"}
View inline bar, line, and pie charts rendered from array data inside grid cells.
:::

## Plugin Options

`ChartsPlugin()` takes no constructor options. Chart behavior is configured per-column through `cellRendererParams` or per-chart through command payloads.

## Cell Renderer Params

Configure inline charts on individual columns via `cellRendererParams`.

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `chartType` | `'bar' \| 'line' \| 'pie' \| 'scatter'` | `'bar'` | The type of chart to render in the cell. |
| `colors` | `string[]` | theme defaults | Array of colors for data points or series. |
| `showAxes` | `boolean` | `false` | Display axis lines on the chart. |
| `showGrid` | `boolean` | `false` | Display grid lines behind the chart. |

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `charts:create` | `{ id: string; config: ChartConfig; data: ChartDataPoint[] }` | Create a standalone chart stored in plugin state. |
| `charts:destroy` | `{ id: string }` | Remove a standalone chart from plugin state. |

### ChartConfig

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `type` | `'bar' \| 'line' \| 'pie' \| 'scatter'` | required | Chart type. |
| `width` | `number` | auto | Chart width in pixels. |
| `height` | `number` | auto | Chart height in pixels. |
| `title` | `string` | `undefined` | Chart title text. |
| `colors` | `string[]` | theme defaults | Data point colors. |
| `showAxes` | `boolean` | `false` | Show axis lines. |
| `showGrid` | `boolean` | `false` | Show grid lines. |
| `showLegend` | `boolean` | `false` | Show chart legend. |
| `animate` | `boolean` | `false` | Enable entry animations. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `charts:rendered` | `{ chartId: string }` | Emitted after a standalone chart is created via `charts:create`. |

## Usage Examples

### Inline Pie Chart Column

```typescript title="pie-chart-column.ts"
const columns = [
  { colId: 'region', field: 'region', headerName: 'Region' },
  {
    colId: 'market',
    field: 'marketShare',
    headerName: 'Market Share',
    cellRenderer: 'chart',
    cellRendererParams: {
      chartType: 'pie',
      colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'],
    },
    width: 200,
  },
];

const rowData = [
  { region: 'North America', marketShare: [45, 25, 18, 12] },
  { region: 'Europe', marketShare: [30, 35, 20, 15] },
];
```

### Standalone Chart Management

```typescript title="standalone-chart.ts"
// Create a bar chart from grid data
grid.commandBus.dispatch('charts:create', {
  id: 'revenue-chart',
  config: {
    type: 'bar',
    title: 'Quarterly Revenue',
    showAxes: true,
    showGrid: true,
    colors: ['#3b82f6', '#10b981'],
  },
  data: [
    { label: 'Q1', value: 125000 },
    { label: 'Q2', value: 148000 },
    { label: 'Q3', value: 132000 },
    { label: 'Q4', value: 175000 },
  ],
});

// Later, remove the chart
grid.commandBus.dispatch('charts:destroy', { id: 'revenue-chart' });
```

### Scatter Plot in a Cell

```typescript title="scatter-column.ts"
const columns = [
  { colId: 'experiment', field: 'experiment', headerName: 'Experiment' },
  {
    colId: 'results',
    field: 'measurements',
    headerName: 'Measurements',
    cellRenderer: 'chart',
    cellRendererParams: { chartType: 'scatter', showAxes: true },
    width: 240,
  },
];
```

## Next Steps

- [Sparklines Plugin](/plugins/sparklines/) -- lighter-weight inline mini-charts for compact visualizations.
- [Excel Export Plugin](/plugins/excel-export/) -- export data alongside chart configurations.
