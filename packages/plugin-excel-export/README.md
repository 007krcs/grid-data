# @gridstorm/plugin-excel-export

Enterprise Excel/CSV export plugin for GridStorm. Export grid data to CSV or SpreadsheetML (Excel XML) format with zero external dependencies.

## Installation

```bash
pnpm add @gridstorm/plugin-excel-export
```

## Quick Start

```ts
import { createGrid } from '@gridstorm/core';
import { ExcelExportPlugin } from '@gridstorm/plugin-excel-export';

const grid = createGrid({
  columns: [
    { field: 'name', headerName: 'Name' },
    { field: 'salary', headerName: 'Salary', valueFormatter: ({ value }) => `$${value}` },
  ],
  rowData: [
    { name: 'Alice', salary: 80000 },
    { name: 'Bob', salary: 95000 },
  ],
  plugins: [
    ExcelExportPlugin({
      fileName: 'employees',
      includeHeaders: true,
    }),
  ],
});

// Export as CSV
grid.commandBus.dispatch('excel:exportCsv', {});

// Export as Excel XML
grid.commandBus.dispatch('excel:exportExcel', { sheetName: 'Employees' });

// Get raw data without downloading
grid.commandBus.dispatch('excel:exportData', {});
```

## Commands

| Command | Description |
|---------|-------------|
| `excel:exportCsv` | Generates a CSV file and triggers a browser download |
| `excel:exportExcel` | Generates an Excel XML file and triggers a browser download |
| `excel:exportData` | Returns raw `{ headers, rows }` without triggering a download |

All commands accept an `ExcelExportOptions` payload to override plugin defaults.

## Options

```ts
interface ExcelExportOptions {
  fileName?: string;              // Default: 'gridstorm-export'
  sheetName?: string;             // Default: 'Sheet1'
  includeHeaders?: boolean;       // Default: true
  includeHiddenColumns?: boolean; // Default: false
  columnKeys?: string[];          // Specific columns to export
  onlySelected?: boolean;         // Export selected rows only
  processCellCallback?: (params: ProcessCellParams) => string;
  processHeaderCallback?: (params: ProcessHeaderParams) => string;
}
```

## Export Formats

### CSV
Standard RFC 4180 CSV with proper escaping for commas, quotes, and newlines.

### Excel XML (SpreadsheetML)
Microsoft SpreadsheetML 2003 format. Opens natively in Excel, LibreOffice, and Google Sheets. Supports typed cells (String, Number, DateTime) and bold headers.

## License

Enterprise license required. See LICENSE.md for details.
