---
title: PDF Export
description: Export grid data to a formatted PDF document with headers, page breaks, and styling.
---

The PDF Export plugin generates downloadable PDF files from your GridStorm grid. It produces formatted tables with column headers, automatic page breaks, and configurable page size and orientation. Value formatters defined on columns are respected in the exported output.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-pdf-export
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { PdfExportPlugin } from '@gridstorm/plugin-pdf-export';

const grid = createGrid({
  columns: [
    { colId: 'name', field: 'name', headerName: 'Employee' },
    { colId: 'department', field: 'department', headerName: 'Department' },
    { colId: 'salary', field: 'salary', headerName: 'Salary' },
  ],
  rowData: [],
  plugins: [
    PdfExportPlugin({
      fileName: 'employee-report',
      pageSize: 'a4',
      orientation: 'portrait',
      includeHeaders: true,
    }),
  ],
});
```

:::example{title="Live PDF Export Demo" href="/cookbook/#pdf-export-basic"}
Export a sample employee grid to PDF with configurable page size and orientation settings.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `fileName` | `string` | `'gridstorm-export'` | Output file name without the `.pdf` extension. |
| `pageSize` | `'a4' \| 'letter' \| 'legal' \| 'a3'` | `'a4'` | Page size preset. |
| `orientation` | `'portrait' \| 'landscape'` | `'portrait'` | Page orientation. |
| `includeHeaders` | `boolean` | `true` | Include column header row in the PDF. |
| `columnKeys` | `string[]` | all visible | Specific column IDs to export. Defaults to all visible columns. |
| `onlySelected` | `boolean` | `false` | Export only the currently selected rows. |
| `includeHiddenColumns` | `boolean` | `false` | Include columns marked as hidden. |
| `headerText` | `string` | `undefined` | Text displayed at the top of each page. |
| `footerText` | `string` | `undefined` | Text displayed at the bottom of each page. |
| `fontSize` | `number` | `10` | Font size in points for data cells. |
| `headerFontSize` | `number` | `12` | Font size in points for column headers. |
| `margins` | `{ top, right, bottom, left }` | default | Page margins in PDF points. |
| `processCellCallback` | `(params) => string` | `undefined` | Custom transformer applied to each cell value before export. |
| `processHeaderCallback` | `(params) => string` | `undefined` | Custom transformer applied to each header value before export. |

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `pdf:export` | `PdfExportOptions` | Generate and download a PDF file. Payload options override the defaults passed at setup. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `pdf:exportCompleted` | `{ fileName, rowCount, pageSize, orientation }` | Emitted after the PDF has been generated and the download triggered. |

## Usage Examples

### Basic Export

```typescript title="basic-export.ts"
// Export with default options configured at setup
grid.commandBus.dispatch('pdf:export', {});
```

### Landscape with Custom Columns

```typescript title="landscape-export.ts"
grid.commandBus.dispatch('pdf:export', {
  orientation: 'landscape',
  columnKeys: ['name', 'department', 'salary'],
  headerText: 'Q4 2025 Salary Report',
  footerText: 'Confidential',
});
```

### Export Selected Rows with Custom Cell Formatting

```typescript title="selected-export.ts"
grid.commandBus.dispatch('pdf:export', {
  onlySelected: true,
  fileName: 'selected-employees',
  processCellCallback: ({ value, column }) => {
    if (column.colId === 'salary') {
      return `$${Number(value).toLocaleString()}`;
    }
    return String(value);
  },
});
```

## Next Steps

- [Excel Export Plugin](/plugins/excel-export/) -- export to XLSX format with multi-sheet support.
- [Selection Plugin](/plugins/selection/) -- select rows before exporting with `onlySelected`.
- [Filtering Plugin](/plugins/filtering/) -- filter data before export so only matching rows are included.
