---
title: Conditional Formatting
description: Apply Excel-like conditional formatting rules with color scales, data bars, icon sets, and 18 condition types.
---

The Conditional Formatting plugin lets you visually highlight cells based on their values. It supports 18 condition types including color scales, data bars, icon sets, top/bottom N, duplicates, and standard comparisons. Rules are evaluated in priority order and applied as inline styles or CSS classes.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-conditional-formatting
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { ConditionalFormattingPlugin } from '@gridstorm/plugin-conditional-formatting';

const grid = createGrid({
  columns: [
    { colId: 'product', field: 'product', headerName: 'Product' },
    { colId: 'revenue', field: 'revenue', headerName: 'Revenue' },
    { colId: 'growth', field: 'growth', headerName: 'Growth %' },
  ],
  rowData: [],
  plugins: [
    ConditionalFormattingPlugin({
      rules: [
        {
          colId: 'revenue',
          type: 'colorScale',
          min: { value: 0, color: '#fee0d2' },
          max: { value: 100000, color: '#de2d26' },
        },
        {
          colId: 'growth',
          type: 'greaterThan',
          value: 10,
          style: { backgroundColor: '#c6efce', color: '#006100' },
        },
      ],
      maxRulesPerCell: 5,
    }),
  ],
});
```

:::example{title="Live Conditional Formatting Demo" href="/cookbook/#conditional-formatting-basic"}
See color scales, data bars, and icon sets applied to financial data in real time.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `rules` | `FormattingRule[]` | `[]` | Initial formatting rules to apply on load. |
| `maxRulesPerCell` | `number` | `10` | Maximum number of rules that can apply to a single cell. Rules beyond this limit are skipped. |

## Condition Types

| Type | Description |
| --- | --- |
| `greaterThan` / `lessThan` | Compare cell value against a threshold. |
| `between` | Value falls within a min/max range. |
| `equals` / `notEquals` | Exact value match. |
| `contains` / `notContains` | Substring match for text cells. |
| `beginsWith` / `endsWith` | Text prefix or suffix match. |
| `colorScale` | Two or three-color gradient based on value position in range. |
| `dataBar` | Horizontal bar fill proportional to cell value. |
| `iconSet` | Display icons (arrows, circles, flags) based on value thresholds. |
| `topN` / `bottomN` | Highlight the top or bottom N values in a column. |
| `aboveAverage` / `belowAverage` | Compare against the column's mean value. |
| `duplicates` / `unique` | Highlight duplicate or unique values in a column. |

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `formatting:addRule` | `{ rule: FormattingRule }` | Add a new formatting rule. |
| `formatting:removeRule` | `{ ruleId: string }` | Remove a rule by its ID. |
| `formatting:updateRule` | `{ ruleId: string; changes: Partial<FormattingRule> }` | Update properties of an existing rule. |
| `formatting:clearRules` | `{ colId?: string }` | Remove all rules, or only rules for a specific column. |
| `formatting:evaluate` | `{}` | Force re-evaluation of all rules against current data. |

## Usage Examples

### Color Scales

Apply a three-color gradient to visualize revenue distribution across rows.

```typescript title="color-scale.ts"
grid.commandBus.dispatch('formatting:addRule', {
  rule: {
    ruleId: 'revenue-gradient',
    colId: 'revenue',
    type: 'colorScale',
    min: { value: 0, color: '#f7fbff' },
    mid: { value: 50000, color: '#6baed6' },
    max: { value: 100000, color: '#08306b' },
  },
});
```

### Data Bars

Show inline bar charts inside cells to compare values visually.

```typescript title="data-bars.ts"
grid.commandBus.dispatch('formatting:addRule', {
  rule: {
    ruleId: 'sales-bars',
    colId: 'sales',
    type: 'dataBar',
    min: 0,
    max: 'auto',
    color: '#4472c4',
    showValue: true,
  },
});
```

### Icon Sets

Display directional arrows based on growth percentage thresholds.

```typescript title="icon-sets.ts"
grid.commandBus.dispatch('formatting:addRule', {
  rule: {
    ruleId: 'growth-icons',
    colId: 'growth',
    type: 'iconSet',
    iconStyle: 'arrows',
    thresholds: [
      { value: 10, icon: 'up', color: '#22c55e' },
      { value: 0, icon: 'right', color: '#eab308' },
      { value: -Infinity, icon: 'down', color: '#ef4444' },
    ],
  },
});
```

## Next Steps

- [Sorting Plugin](/plugins/sorting/) -- sorted data respects conditional formatting rules.
- [Filtering Plugin](/plugins/filtering/) -- combine visual formatting with column filters.
- [Excel Export Plugin](/plugins/excel-export/) -- export formatted cells with styles preserved.
