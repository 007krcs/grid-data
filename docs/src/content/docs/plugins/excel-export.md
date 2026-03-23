---
title: Excel Export
description: Export grid data to CSV and Excel XML formats with column selection, header inclusion, and custom cell processing.
---

The Excel Export plugin provides CSV and Excel XML export capabilities for GridStorm grids. It supports exporting all displayed rows or only selected rows, includes configurable column selection, custom cell and header processors, and triggers browser downloads. It also generates true Office Open XML spreadsheet parts via the XLSX builder. This is an enterprise plugin that requires a license for production use.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-excel-export
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { ExcelExportPlugin } from '@gridstorm/plugin-excel-export';

const grid = createGrid({
  columns: [
    { colId: 'name', field: 'name', headerName: 'Name' },
    { colId: 'email', field: 'email', headerName: 'Email' },
    { colId: 'salary', field: 'salary', headerName: 'Salary' },
  ],
  rowData: [],
  plugins: [
    ExcelExportPlugin({
      fileName: 'gridstorm-export',
      sheetName: 'Sheet1',
      includeHeaders: true,
      includeHiddenColumns: false,
    }),
  ],
});
```

:::example{title="Excel Export Demo" href="/cookbook/#excel-export"}
Export grid data to CSV or XLSX format with column selection, custom cell processing, and support for exporting only selected rows.
:::

## Plugin Options (Default Export Options)

Options passed to `ExcelExportPlugin()` serve as defaults. They can be overridden per-export via command payloads.

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `fileName` | `string` | `'gridstorm-export'` | Output file name (without extension). The extension is added automatically (`.csv` or `.xml`). |
| `sheetName` | `string` | `'Sheet1'` | Worksheet name for Excel XML exports. |
| `includeHeaders` | `boolean` | `true` | Include column headers as the first row in the export. |
| `includeHiddenColumns` | `boolean` | `false` | Include hidden columns in the export. By default only visible columns are exported. |
| `columnKeys` | `string[]` | `undefined` | Specific column IDs to export. Defaults to all visible columns. |
| `onlySelected` | `boolean` | `false` | Export only the currently selected rows (requires the Selection plugin). |
| `processCellCallback` | `(params: ProcessCellParams) => string` | `undefined` | Transform cell values during export. Receives `{ value, node, column, rowIndex, colIndex }`. |
| `processHeaderCallback` | `(params: ProcessHeaderParams) => string` | `undefined` | Transform header values during export. Receives `{ column, colIndex }`. |

## Usage Examples

### Export to CSV

```typescript title="export-csv.ts"
grid.commandBus.dispatch('excel:exportCsv', {
  fileName: 'employees',
  includeHeaders: true,
});
```

This generates a `.csv` file and triggers a browser download.

### Export to Excel XML

```typescript title="export-excel.ts"
grid.commandBus.dispatch('excel:exportExcel', {
  fileName: 'sales-report',
  sheetName: 'Q4 Sales',
  columnKeys: ['name', 'salary'],
});
```

This generates an Excel XML (`.xml`) file compatible with Microsoft Excel.

### Export Selected Rows Only

```typescript title="export-selected.ts"
grid.commandBus.dispatch('excel:exportCsv', {
  fileName: 'selected-rows',
  onlySelected: true,
});
```

### Custom Cell Processing

```typescript title="custom-processing.ts"
ExcelExportPlugin({
  processCellCallback: ({ value, column }) => {
    if (column.colId === 'salary') {
      return `$${Number(value).toLocaleString()}`;
    }
    return String(value ?? '');
  },
  processHeaderCallback: ({ column }) => {
    return column.headerName.toUpperCase();
  },
});
```

## XLSX Builder

The package includes an `xlsx-builder.ts` module that generates true Office Open XML spreadsheet parts (`.xlsx` format). The `buildXlsxParts()` function returns an object of file paths to XML content that can be bundled into a `.xlsx` file using a ZIP library like `fflate` or `JSZip`.

```typescript title="xlsx-builder.ts"
import { buildXlsxParts } from '@gridstorm/plugin-excel-export';

const parts = buildXlsxParts(
  ['Name', 'Email', 'Salary'],
  [['Alice', 'alice@example.com', 75000], ['Bob', 'bob@example.com', 82000]],
);
// parts contains: [Content_Types].xml, _rels/.rels, xl/workbook.xml, etc.
```

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `excel:exportCsv` | `ExcelExportOptions` | Export grid data as a CSV file. Triggers a browser download. |
| `excel:exportExcel` | `ExcelExportOptions` | Export grid data as an Excel XML file. Triggers a browser download. |
| `excel:exportData` | `ExcelExportOptions` | Return raw export data (`{ headers, rows }`) without triggering a download. Useful for custom export workflows. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `excel:exported` | `{ format: 'csv' \| 'excel'; fileName: string; rowCount: number }` | Emitted after a successful export with the format, file name, and number of exported rows. |

## React Integration

```tsx title="ExportGrid.tsx"
import { GridStorm, useGridApi } from '@gridstorm/react';
import { ExcelExportPlugin } from '@gridstorm/plugin-excel-export';

function ExportGrid({ rowData, columns }) {
  const apiRef = useGridApi();

  const exportCsv = () => {
    apiRef.current?.commandBus.dispatch('excel:exportCsv', {
      fileName: 'report',
    });
  };

  const exportExcel = () => {
    apiRef.current?.commandBus.dispatch('excel:exportExcel', {
      fileName: 'report',
      sheetName: 'Data',
    });
  };

  return (
    <>
      <button onClick={exportCsv}>Export CSV</button>
      <button onClick={exportExcel}>Export Excel</button>
      <GridStorm
        rowData={rowData}
        columns={columns}
        plugins={[ExcelExportPlugin()]}
      />
    </>
  );
}
```

## Next Steps

- [Clipboard Plugin](/plugins/clipboard/) -- copy grid data to clipboard for quick transfers.
- [Selection Plugin](/plugins/selection/) -- use `onlySelected: true` to export just the selected rows.
- [Filtering Plugin](/plugins/filtering/) -- exports respect the current filter state (only displayed rows are exported).
