# @gridstorm/plugin-clipboard

Copy, cut, and paste with keyboard shortcuts for GridStorm.

> **Enterprise Plugin** -- Requires a [GridStorm license key](https://grid-data-analytics-explorer.vercel.app//pricing).

## Install

```bash
npm install @gridstorm/plugin-clipboard @gridstorm/core @gridstorm/license
```

## Usage

```typescript
import { setLicenseKey } from '@gridstorm/license';
import { createGridEngine } from '@gridstorm/core';
import { ClipboardPlugin } from '@gridstorm/plugin-clipboard';
import { SelectionPlugin } from '@gridstorm/plugin-selection';

setLicenseKey('YOUR_LICENSE_KEY');

const engine = createGridEngine({
  columnDefs: columns,
  rowData: myData,
  plugins: [SelectionPlugin(), ClipboardPlugin()],
});
```

## Features

- Ctrl+C / Cmd+C to copy selected cells or rows
- Ctrl+V / Cmd+V to paste into editable cells
- Ctrl+X / Cmd+X to cut
- Tab-separated values for spreadsheet compatibility
- Programmatic clipboard API

## Documentation

[Clipboard Guide](https://grid-data-analytics-explorer.vercel.app//docs/clipboard) | [API Reference](https://grid-data-analytics-explorer.vercel.app//api/plugin-clipboard)

## Formula injection protection

Copied cells that begin with `=`, `+`, `-`, `@`, a tab or a carriage return are prefixed with an apostrophe so spreadsheets paste them as text rather than evaluating them (CWE-1236). Plain negative numbers are left untouched. Disable with `ClipboardPlugin({ neutralizeFormulas: false })` only when the clipboard target is never a spreadsheet.

## License

Commercial -- [Enterprise License Required](https://grid-data-analytics-explorer.vercel.app//pricing)
