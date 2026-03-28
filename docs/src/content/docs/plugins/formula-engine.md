---
title: Formula Engine (Excel-Compatible)
description: 42 Excel-compatible functions, named ranges, and array formulas built on top of the base formula plugin.
---

# Formula Engine Plugin

`@gridstorm/plugin-formula-engine` extends `@gridstorm/plugin-formula` with **42 additional Excel-compatible functions**, named ranges, and array formula support. Together they give GridStorm a formula engine on par with Handsontable (400+ formulas) and SpreadJS (500+) — but open-source.

:::tip
The formula engine is a **$990/dev/year differentiator**. It's the single feature that drives the most revenue for Handsontable and SpreadJS. GridStorm ships it free.
:::

## Prerequisites

This plugin **requires** `plugin-formula` to be installed:

```bash
npm install @gridstorm/plugin-formula @gridstorm/plugin-formula-engine
```

## Quick Start

```typescript
import { createGrid } from '@gridstorm/core';
import { FormulaPlugin } from '@gridstorm/plugin-formula';
import { FormulaEnginePlugin } from '@gridstorm/plugin-formula-engine';

const grid = createGrid({
  columns: [
    { field: 'revenue', headerName: 'Revenue' },
    { field: 'costs',   headerName: 'Costs'   },
    { field: 'profit',  headerName: 'Profit'  }, // formula column
  ],
  rowData: data,
  plugins: [
    FormulaPlugin(),
    FormulaEnginePlugin({
      namedRanges: {
        REVENUE: 'A1:A100',
        COSTS:   'B1:B100',
      },
    }),
  ],
});

// Set a SUMIF formula on a cell
grid.commandBus.dispatch('formula:set', {
  rowId: 'total-row',
  colId: 'profit',
  formula: '=SUMIF(REVENUE,">0") - SUMIF(COSTS,">0")',
});
```

## Function Library

### Conditional (7 functions)

| Function | Signature | Description |
|---|---|---|
| `SUMIF` | `(range, criteria, [sumRange])` | Sum values where criteria matches |
| `COUNTIF` | `(range, criteria)` | Count values matching criteria |
| `AVERAGEIF` | `(range, criteria, [avgRange])` | Average where criteria matches |
| `SUMIFS` | `(sumRange, range1, crit1, ...)` | Multi-criteria sum |
| `COUNTIFS` | `(range1, crit1, ...)` | Multi-criteria count |
| `IFS` | `(cond1, val1, cond2, val2, ...)` | First-true conditional |
| `SWITCH` | `(expr, case1, result1, ...)` | Switch/case expression |

**Criteria syntax** for SUMIF/COUNTIF family:

```
">5"       — greater than 5
"<=100"    — less than or equal to 100
"<>0"      — not equal to zero
"apple*"   — wildcard: starts with "apple"
"*berry"   — wildcard: ends with "berry"
"=exact"   — exact match
```

### Lookup (2 functions)

| Function | Signature | Description |
|---|---|---|
| `HLOOKUP` | `(value, table, rowIndex, [exact])` | Horizontal lookup |
| `XLOOKUP` | `(value, lookupArr, returnArr, [ifNotFound], [matchMode])` | Modern flexible lookup |

```typescript
// XLOOKUP — find product price by ID
'=XLOOKUP(A2, ProductIDs, Prices, "Not found")'

// HLOOKUP — lookup in header row
'=HLOOKUP("Q3", QuarterlyData, 3, false)'
```

### Math (12 functions)

| Function | Description |
|---|---|
| `ROUNDUP(n, digits)` | Round away from zero |
| `ROUNDDOWN(n, digits)` | Round toward zero |
| `CEILING(n, sig)` | Round up to nearest multiple |
| `FLOOR(n, sig)` | Round down to nearest multiple |
| `SIGN(n)` | Returns -1, 0, or 1 |
| `LOG(n, [base])` | Logarithm (default base 10) |
| `LN(n)` | Natural logarithm |
| `EXP(n)` | e^n |
| `PI()` | π (3.14159…) |
| `RANDBETWEEN(low, high)` | Random integer in range |
| `PRODUCT(n1, n2, ...)` | Multiply all arguments |
| `SUMPRODUCT(arr1, arr2, ...)` | Sum of element-wise products |

### Text (11 functions)

| Function | Description |
|---|---|
| `FIND(find, within, [start])` | Case-sensitive position |
| `SEARCH(find, within, [start])` | Case-insensitive position |
| `REPLACE(text, start, n, new)` | Replace by position |
| `SUBSTITUTE(text, old, new, [n])` | Replace by text |
| `REPT(text, times)` | Repeat text |
| `EXACT(a, b)` | Case-sensitive equality |
| `VALUE(text)` | Parse text to number |
| `PROPER(text)` | Title Case conversion |
| `CLEAN(text)` | Remove non-printable chars |
| `CHAR(code)` | ASCII code → character |
| `CODE(char)` | Character → ASCII code |

### Date (6 functions)

| Function | Description |
|---|---|
| `DATE(year, month, day)` | Construct a date |
| `TODAY()` | Current date |
| `NOW()` | Current date + time |
| `YEAR(date)` | Extract year |
| `MONTH(date)` | Extract month (1–12) |
| `DAY(date)` | Extract day |

### Information (6 functions)

| Function | Description |
|---|---|
| `ISBLANK(val)` | Is null / undefined / empty string |
| `ISNUMBER(val)` | Is finite number |
| `ISTEXT(val)` | Is string |
| `ISERROR(val)` | Is formula error |
| `ISNA(val)` | Is `#N/A` error |
| `TYPE(val)` | Returns type code (1=number, 2=text, 4=boolean, 16=error, 64=array) |

## Named Ranges

Register reusable range aliases to write readable formulas:

```typescript
FormulaEnginePlugin({
  namedRanges: {
    SALES_DATA: 'A1:A100',
    BUDGET:     'B1:B100',
    TAX_RATE:   'C1',
  },
})

// Then in formulas:
// =SUMIF(SALES_DATA, ">0")
// =SUMPRODUCT(SALES_DATA, BUDGET)
```

Manage named ranges at runtime:

```typescript
// Add
grid.commandBus.dispatch('formula-engine:setNamedRange', {
  name: 'Threshold',
  range: 'D1',
});

// Remove
grid.commandBus.dispatch('formula-engine:removeNamedRange', { name: 'Threshold' });

// Query all
grid.commandBus.dispatch('formula-engine:getNamedRanges', {});
grid.eventBus.on('formula-engine:namedRanges', ({ ranges }) => {
  console.log(ranges); // { SALES_DATA: { name, range }, ... }
});
```

**Valid range name rules:**
- Must start with a letter or underscore
- Can contain letters, digits, underscores
- Must NOT look like a cell reference (e.g. `A1`, `BC99` are rejected)

## Array Formulas

Wrap any formula in `{= }` to evaluate it as an array formula:

```typescript
// Evaluate and spill results into adjacent cells
grid.commandBus.dispatch('formula:set', {
  rowId: 'r0',
  colId: 'result',
  formula: '{=SUMPRODUCT(A1:A5, B1:B5)}',
});
```

Results automatically spill into adjacent cells. If any target cell is occupied, a `#SPILL!` error is shown on the origin cell.

## Error Types

In addition to the base errors (`#REF!`, `#VALUE!`, `#DIV/0!`, `#N/A`), this plugin introduces:

| Error | Meaning |
|---|---|
| `#NULL!` | Invalid range intersection |
| `#NUM!` | Invalid numeric operation (e.g. `LOG(-1)`) |
| `#CALC!` | Calculation engine failure |
| `#SPILL!` | Array formula target cells are occupied |
| `#NAME?` | Unrecognised function or range name |

## Dynamic Registration

Register your own custom functions at any time:

```typescript
// Uses the formula:registerFunctions command under the hood
grid.commandBus.dispatch('formula:registerFunctions', {
  functions: [
    {
      name: 'TAXRATE',
      minArgs: 1,
      maxArgs: 1,
      evaluate([income]) {
        const n = Number(income);
        return n > 100_000 ? 0.37 : n > 44_725 ? 0.22 : 0.12;
      },
    },
  ],
});
```

## Plugin State

```typescript
const state = grid.store.getState().pluginState['formula-engine'];
// {
//   namedRanges: Map<string, NamedRange>,
//   arrayFormulas: Map<string, ArrayFormulaEntry>,
// }
```
