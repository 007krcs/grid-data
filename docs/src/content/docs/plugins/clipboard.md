---
title: Clipboard
description: Add copy, cut, and paste operations with keyboard shortcuts and TSV format support to your GridStorm data grid.
---

The Clipboard plugin enables copy, cut, and paste operations on grid data. It uses the browser Clipboard API, serializes data as tab-separated values (TSV) for spreadsheet compatibility, and responds to standard keyboard shortcuts (Ctrl+C, Ctrl+X, Ctrl+V). This is an enterprise plugin that requires a license for production use.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-clipboard @gridstorm/plugin-selection
```

The Clipboard plugin declares `dependencies: ['selection']` and requires the Selection plugin to be installed.

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { SelectionPlugin } from '@gridstorm/plugin-selection';
import { ClipboardPlugin } from '@gridstorm/plugin-clipboard';

const grid = createGrid({
  columns: [
    { colId: 'name', field: 'name', headerName: 'Name', editable: true },
    { colId: 'email', field: 'email', headerName: 'Email', editable: true },
  ],
  rowData: [],
  plugins: [
    SelectionPlugin({ mode: 'multiple' }),
    ClipboardPlugin({
      copyHeaders: false,
      delimiter: '\t',
      suppressPaste: false,
      suppressCut: false,
    }),
  ],
});
```

:::example{title="Live Clipboard Demo" href="/cookbook/#clipboard-basic"}
Select cells, then use Ctrl+C to copy and Ctrl+V to paste. Supports TSV format for Excel compatibility.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `copyHeaders` | `boolean` | `false` | Include column headers as the first row when copying. |
| `delimiter` | `string` | `'\t'` | Field delimiter for clipboard text. Use `','` for CSV format. |
| `processCellForClipboard` | `(params: { value: any; node: RowNode; column: ColumnState }) => string` | `undefined` | Transform cell values during copy. |
| `processCellFromClipboard` | `(params: { value: string; column: ColumnState }) => any` | `undefined` | Transform cell values during paste. |
| `suppressPaste` | `boolean` | `false` | Disable paste operations entirely. |
| `suppressCut` | `boolean` | `false` | Disable cut operations entirely. |

## Usage Examples

### Copy Selected Rows

Copies all visible columns of the selected rows to the clipboard as TSV text.

```typescript title="copy.ts"
grid.commandBus.dispatch('clipboard:copy', {});
```

### Copy a Specific Range

Copy a rectangular range by specifying row indices and column IDs.

```typescript title="copy-range.ts"
grid.commandBus.dispatch('clipboard:copyRange', {
  startRow: 0,
  endRow: 4,
  startCol: 'name',
  endCol: 'email',
});
```

### Cut and Paste

Cut copies the selected rows and then clears the cell values (setting them to `null`). Paste reads TSV text from the clipboard and fills cells starting from the currently focused cell position.

```typescript title="cut-paste.ts"
// Cut selected rows
grid.commandBus.dispatch('clipboard:cut', {});

// Paste at the focused cell
grid.commandBus.dispatch('clipboard:paste', {});
```

Paste respects column `editable` status -- non-editable columns are skipped. It also applies `valueParser` and `valueSetter` from column definitions when available.

## Keyboard Shortcuts

When the grid root element has focus, these shortcuts are active:

| Shortcut | Action |
| --- | --- |
| `Ctrl+C` / `Cmd+C` | Copy selected rows. |
| `Ctrl+X` / `Cmd+X` | Cut selected rows. |
| `Ctrl+V` / `Cmd+V` | Paste at the focused cell. |

The plugin ensures the grid root is focusable by setting `tabindex="0"` if not already present.

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `clipboard:copy` | `{}` | Copy selected rows to clipboard as TSV. |
| `clipboard:cut` | `{}` | Copy selected rows and clear their cell values. No-op if `suppressCut` is `true`. |
| `clipboard:paste` | `{}` | Read from clipboard and paste starting at the focused cell. No-op if `suppressPaste` is `true`. |
| `clipboard:copyRange` | `{ startRow: number; endRow: number; startCol: string; endCol: string }` | Copy a specific rectangular range to clipboard. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `clipboard:copy` | `{ data: string }` | Emitted after data is copied to the clipboard. |
| `clipboard:cut` | `{ data: string }` | Emitted after data is cut to the clipboard. |
| `clipboard:paste` | `{ data: string }` | Emitted after data is pasted from the clipboard. |

## React Integration

```tsx title="ClipboardGrid.tsx"
import { GridStorm, useGridApi } from '@gridstorm/react';
import { SelectionPlugin } from '@gridstorm/plugin-selection';
import { ClipboardPlugin } from '@gridstorm/plugin-clipboard';

function ClipboardGrid({ rowData, columns }) {
  const apiRef = useGridApi();

  const copy = () => apiRef.current?.commandBus.dispatch('clipboard:copy', {});
  const paste = () => apiRef.current?.commandBus.dispatch('clipboard:paste', {});

  return (
    <>
      <button onClick={copy}>Copy</button>
      <button onClick={paste}>Paste</button>
      <GridStorm
        rowData={rowData}
        columns={columns}
        plugins={[
          SelectionPlugin({ mode: 'multiple' }),
          ClipboardPlugin({ copyHeaders: true }),
        ]}
      />
    </>
  );
}
```

## Next Steps

- [Selection Plugin](/plugins/selection/) -- required companion plugin for identifying rows to copy.
- [Editing Plugin](/plugins/editing/) -- paste workflows often involve cell editing.
- [Excel Export Plugin](/plugins/excel-export/) -- export to CSV or Excel files for larger exports.
