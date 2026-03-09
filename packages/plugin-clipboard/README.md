# @gridstorm/plugin-clipboard

Copy, cut, and paste with keyboard shortcuts for GridStorm.

> **Enterprise Plugin** -- Requires a [GridStorm license key](https://gridstorm.dev/pricing).

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

[Clipboard Guide](https://gridstorm.dev/docs/clipboard) | [API Reference](https://gridstorm.dev/api/plugin-clipboard)

## License

Commercial -- [Enterprise License Required](https://gridstorm.dev/pricing)
