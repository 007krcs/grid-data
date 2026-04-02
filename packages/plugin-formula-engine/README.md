# @gridstorm/plugin-formula-engine

Extended formula engine for [GridStorm](https://gridstorm.tekivex.com) — 50+ Excel-compatible functions, named ranges, and array formulas built on top of `@gridstorm/plugin-formula`.

## Install

```bash
npm install @gridstorm/plugin-formula @gridstorm/plugin-formula-engine
```

## Quick Start

```ts
import { createGrid } from '@gridstorm/core';
import { formulaPlugin } from '@gridstorm/plugin-formula';
import { formulaEnginePlugin } from '@gridstorm/plugin-formula-engine';

const grid = createGrid({
  plugins: [formulaPlugin(), formulaEnginePlugin()],
  columns: [
    { field: 'revenue', formula: '=SUMIF(B:B,"Q1",C:C)' },
  ],
  data: [...],
});
```

## Features

- **50+ Excel functions** across math, text, date, lookup, and info categories
- **Named ranges** — define `Sales` = `A1:A100` and use in formulas
- **Array formulas** — `{=SUM(A1:A10*B1:B10)}` with spill support
- **SUMIF / COUNTIF / AVERAGEIF / SUMIFS / COUNTIFS** — conditional aggregation
- **XLOOKUP / HLOOKUP** — modern and classic lookup functions
- **IFS / SWITCH** — multi-branch logic

## Functions by Category

| Category | Functions |
|---|---|
| Conditional | SUMIF, COUNTIF, AVERAGEIF, SUMIFS, COUNTIFS, IFS, SWITCH |
| Lookup | HLOOKUP, XLOOKUP |
| Math | ROUNDUP, ROUNDDOWN, CEILING, SIGN, LOG, LN, EXP, PI, RANDBETWEEN, PRODUCT, SUMPRODUCT |
| Text | FIND, SEARCH, REPLACE, REPT, EXACT, VALUE, PROPER, CLEAN, CHAR, CODE |
| Date | DATE, TODAY, NOW, YEAR, MONTH, DAY |
| Info | ISBLANK, ISNUMBER, ISTEXT, ISERROR, ISNA, TYPE |

## Commands

| Command | Description |
|---|---|
| `formula-engine:setNamedRange` | Define a named range |
| `formula-engine:removeNamedRange` | Remove a named range |
| `formula-engine:evaluateArray` | Evaluate an array formula |

## Documentation

Full docs at [gridstorm.tekivex.com](https://gridstorm.tekivex.com/#/docs)

## License

MIT © [GridStorm](https://gridstorm.tekivex.com)
