# @gridstorm/plugin-clipboard-pro

Excel-compatible copy/paste for [GridStorm](https://gridstorm.tekivex.com) — range-aware TSV serialization, smart type coercion, validation integration, formula-aware paste, and undo support.

## Install

```bash
npm install @gridstorm/plugin-clipboard-pro
```

## Quick Start

```ts
import { createGrid } from '@gridstorm/core';
import { clipboardProPlugin } from '@gridstorm/plugin-clipboard-pro';

const grid = createGrid({
  plugins: [clipboardProPlugin()],
  columns: [...],
  data: [...],
});
```

## Features

- **Range copy/paste** — copies the full selected cell range as TSV (tab-separated values)
- **Excel-compatible** — paste directly from Excel or Google Sheets including merged cells and quoted values
- **Smart type coercion** — auto-converts text to number, boolean, date, percentage, and currency
- **Formula-aware paste** — strings starting with `=` dispatch to the formula engine automatically
- **Validation integration** — works with `@gridstorm/plugin-validation` to reject invalid pastes
- **Undo support** — integrates with `@gridstorm/plugin-time-travel` for paste undo
- **Copy with headers** — optionally include column headers in the copied TSV

## Options

```ts
clipboardProPlugin({
  copyWithHeaders: false,   // include column headers on copy
  coerceTypes: true,        // auto-convert pasted strings to native types
  formulaAware: true,       // dispatch '=...' strings to formula engine
})
```

## Commands

| Command | Description |
|---|---|
| `clipboard:copy` | Copy selected range to clipboard |
| `clipboard:paste` | Paste from clipboard into selected cell |
| `clipboard:cut` | Cut selected range |
| `clipboard:copyWithHeaders` | Copy range including column headers |
| `clipboard:pasteSpecial` | Paste with custom coercion options |

## Documentation

Full docs at [gridstorm.tekivex.com](https://gridstorm.tekivex.com/#/docs)

## License

MIT © [GridStorm](https://gridstorm.tekivex.com)
