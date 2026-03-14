---
title: Excel Export
description: Export grid data to .xlsx files with styles, formulas, and multi-sheet support.
---

The Excel Export plugin generates native `.xlsx` workbooks from the current grid state, preserving column widths, cell styles, and optional formulas.

## Installation

```bash
npm install @gridstorm/plugin-excel-export
```

```ts title="Setup"
import { ExcelExportPlugin } from '@gridstorm/plugin-excel-export';

const engine = createGrid({
  columns: [...],
  rowData: [...],
  plugins: [ExcelExportPlugin()],
});
```

## Basic Usage

```ts title="Export to file"
api.exportToExcel({
  fileName: 'report.xlsx',
});
```

## Plugin Options

| Option | Type | Default | Description |
|---|---|---|---|
| `fileName` | `string` | `'export.xlsx'` | Default file name |
| `sheetName` | `string` | `'Sheet1'` | Default worksheet name |
| `includeHeaders` | `boolean` | `true` | Include column headers as first row |
| `includeFiltered` | `boolean` | `false` | Export rows hidden by filters |

## Export Options

Pass options per-export to override defaults:

```ts
api.exportToExcel({
  fileName: 'sales-q4.xlsx',
  sheetName: 'Q4 Sales',
  columnKeys: ['product', 'revenue', 'quantity'],
  includeHeaders: true,
});
```

## Commands

| Command | Payload | Description |
|---|---|---|
| `excel:export` | `ExportOptions` | Trigger an Excel export |

## Events

| Event | Payload | Description |
|---|---|---|
| `excel:exported` | `{ fileName, rowCount }` | Export completed |

## Next Steps

- **[Clipboard](/plugins/clipboard/)** -- Copy/paste grid data with Excel-compatible formats.
- **[Column Pinning](/plugins/column-pinning/)** -- Pin columns that should always appear first in exports.
