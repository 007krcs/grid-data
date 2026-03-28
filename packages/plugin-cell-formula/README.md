# @gridstorm/plugin-cell-formula

Adds computed columns to the grid — define a column whose value is derived from a JavaScript function over other columns, with automatic recomputation when rows change.

## Install

```sh
pnpm add @gridstorm/plugin-cell-formula
```

## Quick Usage

```typescript
import { createGrid } from '@gridstorm/core';
import { CellFormulaPlugin } from '@gridstorm/plugin-cell-formula';

const grid = createGrid({
  columns: [
    { field: 'price' },
    { field: 'qty' },
    { field: 'total' }, // computed
  ],
  rowData: [{ price: 10, qty: 3 }, { price: 5, qty: 4 }],
  plugins: [CellFormulaPlugin({ onError: 'report' })],
});

// Define the formula for the 'total' column
grid.commandBus.dispatch('formula:define', {
  columnId: 'total',
  dependencies: ['price', 'qty'],
  compute: (row) => row.price * row.qty,
  format: (val) => `$${val}`,
});

// Listen for computation events
grid.eventBus.on('formula:computed', ({ columnId, computedValues }) => {
  console.log('Recomputed:', columnId);
});

// Remove a formula
grid.commandBus.dispatch('formula:remove', { columnId: 'total' });
```

## Commands

| Command | Payload | Description |
|---|---|---|
| `formula:define` | `FormulaDefinition` | Register or update a computed column formula and trigger initial compute |
| `formula:remove` | `{ columnId: string }` | Remove a formula definition and its cached computed values |
| `formula:recalculate` | `{ columnId?: string }` | Recompute one column (if columnId given) or all formulas |

## Events

| Event | Payload | Description |
|---|---|---|
| `formula:computed` | `{ columnId?: string; computedValues: Map<string, Map<string, unknown>> }` | Emitted after any computation completes |
| `formula:error` | `{ errors: FormulaError[] }` | Emitted when compute throws and `onError` is `'report'` |
