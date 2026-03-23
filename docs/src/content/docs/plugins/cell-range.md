---
title: Cell Range
description: Range selection with fill handle, pattern detection, and multi-range support.
---

The Cell Range plugin adds spreadsheet-style range selection to GridStorm. Users can click and drag to select rectangular cell ranges, use a fill handle to auto-fill adjacent cells with detected patterns (number sequences, date increments, text series), and work with multiple simultaneous ranges for advanced data manipulation.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-cell-range
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { CellRangePlugin } from '@gridstorm/plugin-cell-range';

const grid = createGrid({
  columns: [
    { colId: 'month', field: 'month', headerName: 'Month' },
    { colId: 'target', field: 'target', headerName: 'Target' },
    { colId: 'actual', field: 'actual', headerName: 'Actual' },
  ],
  rowData: [],
  plugins: [
    CellRangePlugin({
      multiRange: true,
      fillHandle: true,
      maxRanges: 10,
    }),
  ],
});
```

:::example{title="Live Cell Range Demo" href="/cookbook/#cell-range-basic"}
Click and drag to select cell ranges. Use the fill handle in the bottom-right corner to auto-fill with detected patterns.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `multiRange` | `boolean` | `false` | Allow selecting multiple non-contiguous ranges by holding Ctrl/Cmd while dragging. |
| `fillHandle` | `boolean` | `true` | Show a fill handle at the bottom-right corner of the selection for auto-filling adjacent cells. |
| `maxRanges` | `number` | `5` | Maximum number of simultaneous range selections when `multiRange` is enabled. |

## Fill Handle Patterns

The fill handle detects and continues these patterns automatically:

| Pattern | Example | Fill Result |
| --- | --- | --- |
| Number sequence | `1, 2, 3` | `4, 5, 6, ...` |
| Number with step | `10, 20, 30` | `40, 50, 60, ...` |
| Date increment | `Jan, Feb, Mar` | `Apr, May, Jun, ...` |
| Day sequence | `Mon, Tue, Wed` | `Thu, Fri, Sat, ...` |
| Text series | `Q1, Q2, Q3` | `Q4, Q5, Q6, ...` |
| Repeating pattern | `A, B, A, B` | `A, B, A, B, ...` |
| Constant value | `100, 100, 100` | `100, 100, 100, ...` |

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `range:select` | `{ start: CellAddress; end: CellAddress; additive?: boolean }` | Select a rectangular range. Pass `additive: true` to add to existing selections. |
| `range:clear` | `{ rangeId?: string }` | Clear a specific range, or all ranges if no ID is provided. |
| `range:fill` | `{ direction: 'down' \| 'right' \| 'up' \| 'left'; count: number }` | Fill adjacent cells from the current selection using detected pattern. |
| `range:copy` | `{}` | Copy the current range selection to the internal clipboard. |
| `range:delete` | `{}` | Delete the contents of all cells in the current range selection. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `range:selected` | `{ ranges: CellRange[] }` | Emitted when the range selection changes. |
| `range:filled` | `{ range: CellRange; pattern: string; count: number }` | Emitted after a fill operation completes. |

## Usage Examples

### Programmatic Selection

Select a range of cells via the command bus.

```typescript title="select-range.ts"
// Select cells from B2 to D5
grid.commandBus.dispatch('range:select', {
  start: { rowIndex: 1, colId: 'target' },
  end: { rowIndex: 4, colId: 'actual' },
});

// Add another range without clearing the first
grid.commandBus.dispatch('range:select', {
  start: { rowIndex: 7, colId: 'target' },
  end: { rowIndex: 9, colId: 'target' },
  additive: true,
});
```

### Fill Handle

Auto-fill cells below the current selection with a detected pattern.

```typescript title="fill-handle.ts"
// Select cells with values 100, 200, 300
grid.commandBus.dispatch('range:select', {
  start: { rowIndex: 0, colId: 'target' },
  end: { rowIndex: 2, colId: 'target' },
});

// Fill 5 more rows downward (400, 500, 600, 700, 800)
grid.commandBus.dispatch('range:fill', {
  direction: 'down',
  count: 5,
});
```

### Copy and Clear

Copy range data or clear cell contents within a selection.

```typescript title="copy-clear.ts"
// Copy current selection
grid.commandBus.dispatch('range:copy', {});

// Delete contents of selected cells
grid.commandBus.dispatch('range:delete', {});

// Clear all range selections
grid.commandBus.dispatch('range:clear', {});
```

## Next Steps

- [Clipboard Plugin](/plugins/clipboard/) -- paste copied range data to external applications.
- [Editing Plugin](/plugins/editing/) -- edit individual cells within a selected range.
- [Selection Plugin](/plugins/selection/) -- combine row selection with cell range selection.
