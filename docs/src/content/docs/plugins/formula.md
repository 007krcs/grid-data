---
title: Formula
description: Excel-like formulas with a tokenizer-parser-evaluator pipeline, 34 built-in functions, and dependency tracking.
---

The Formula plugin brings spreadsheet-style calculations to GridStorm. It includes a full tokenizer, parser, and evaluator pipeline supporting 34 built-in functions (SUM, IF, VLOOKUP, AVERAGE, and more). A dependency graph tracks cell references and recalculates only affected cells on changes, with circular reference detection to prevent infinite loops.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-formula
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { FormulaPlugin } from '@gridstorm/plugin-formula';

const grid = createGrid({
  columns: [
    { colId: 'item', field: 'item', headerName: 'Item' },
    { colId: 'qty', field: 'qty', headerName: 'Quantity' },
    { colId: 'price', field: 'price', headerName: 'Price' },
    { colId: 'total', field: 'total', headerName: 'Total' },
  ],
  rowData: [],
  plugins: [
    FormulaPlugin({
      columnMapping: { A: 'item', B: 'qty', C: 'price', D: 'total' },
      maxDepth: 50,
      customFunctions: {
        MARKUP: (value, pct) => value * (1 + pct / 100),
      },
    }),
  ],
});
```

:::example{title="Live Formula Demo" href="/cookbook/#formula-basic"}
Enter Excel-style formulas like `=SUM(B2:B100)` and `=IF(C2>100, "High", "Low")` and see results update live.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `customFunctions` | `Record<string, Function>` | `{}` | Register custom functions available in formulas. Function name becomes the formula identifier. |
| `maxDepth` | `number` | `100` | Maximum dependency chain depth before triggering circular reference detection. |
| `columnMapping` | `Record<string, string>` | `auto` | Map spreadsheet-style column letters to grid `colId` values. Auto-generated from column order if omitted. |

## Built-in Functions

| Category | Functions |
| --- | --- |
| Math | `SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT`, `ABS`, `ROUND`, `FLOOR`, `CEILING`, `MOD`, `POWER` |
| Logic | `IF`, `AND`, `OR`, `NOT`, `IFERROR`, `SWITCH` |
| Lookup | `VLOOKUP`, `HLOOKUP`, `INDEX`, `MATCH`, `OFFSET` |
| Text | `CONCAT`, `LEFT`, `RIGHT`, `MID`, `LEN`, `UPPER`, `LOWER`, `TRIM`, `SUBSTITUTE` |
| Date | `TODAY`, `NOW`, `YEAR`, `MONTH`, `DAY`, `DATEDIF` |
| Aggregate | `SUMIF`, `COUNTIF`, `AVERAGEIF` |

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `formula:set` | `{ rowId: string; colId: string; formula: string }` | Set a formula on a specific cell. The formula string must start with `=`. |
| `formula:remove` | `{ rowId: string; colId: string }` | Remove a formula from a cell, leaving the last computed value. |
| `formula:evaluate` | `{ rowId: string; colId: string }` | Force re-evaluation of a single cell formula. |
| `formula:evaluateAll` | `{}` | Re-evaluate all formulas in dependency order. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `formula:evaluated` | `{ rowId: string; colId: string; value: any }` | Emitted after a cell formula is evaluated. |
| `formula:error` | `{ rowId: string; colId: string; error: string }` | Emitted when a formula evaluation fails (circular ref, bad syntax, etc.). |

## Usage Examples

### Basic Formulas

Set formulas on cells to compute derived values.

```typescript title="basic-formulas.ts"
// Total = Quantity * Price
grid.commandBus.dispatch('formula:set', {
  rowId: 'row-1',
  colId: 'total',
  formula: '=B1*C1',
});

// Conditional logic
grid.commandBus.dispatch('formula:set', {
  rowId: 'row-1',
  colId: 'status',
  formula: '=IF(D1>1000, "High Value", "Standard")',
});
```

### Aggregate Formulas

Use range references to aggregate across rows.

```typescript title="aggregate-formulas.ts"
// Sum all quantities
grid.commandBus.dispatch('formula:set', {
  rowId: 'summary',
  colId: 'qty',
  formula: '=SUM(B2:B100)',
});

// Conditional sum
grid.commandBus.dispatch('formula:set', {
  rowId: 'summary',
  colId: 'total',
  formula: '=SUMIF(A2:A100, "Widget", D2:D100)',
});
```

### Custom Functions

Register domain-specific functions at plugin initialization.

```typescript title="custom-functions.ts"
FormulaPlugin({
  customFunctions: {
    TAX: (amount, rate) => amount * (rate / 100),
    DISCOUNT: (price, tier) =>
      tier === 'gold' ? price * 0.8 : tier === 'silver' ? price * 0.9 : price,
  },
});

// Use in formulas: =TAX(D1, 8.5) or =DISCOUNT(C1, "gold")
```

## Next Steps

- [Editing Plugin](/plugins/editing/) -- edit cell values that feed into formula dependencies.
- [Aggregation Plugin](/plugins/aggregation/) -- combine formula results with footer aggregations.
- [Excel Export Plugin](/plugins/excel-export/) -- export formulas as native Excel formulas.
