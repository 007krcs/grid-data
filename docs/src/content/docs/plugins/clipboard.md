---
title: Clipboard
description: Copy, cut, and paste grid data with keyboard shortcuts and TSV/CSV format support.
---

The Clipboard plugin enables copy, cut, and paste operations on grid data. It integrates with the browser's Clipboard API, uses tab-separated values (TSV) format for compatibility with spreadsheets, and responds to standard Ctrl+C / Ctrl+X / Ctrl+V keyboard shortcuts.

## Installation

```bash
npm install @gridstorm/plugin-clipboard @gridstorm/plugin-selection
```

```ts title="Setup"
import { SelectionPlugin } from '@gridstorm/plugin-selection';
import { ClipboardPlugin } from '@gridstorm/plugin-clipboard';

const engine = createGrid({
  columns: [...],
  rowData: [...],
  plugins: [
    SelectionPlugin({ mode: 'multiple' }),
    ClipboardPlugin(),
  ],
});
```

:::caution
The Clipboard plugin declares `dependencies: ['selection']`. The Selection plugin must be installed alongside it.
:::

## Plugin Options

```ts title="ClipboardPluginOptions"
interface ClipboardPluginOptions {
  copyHeaders?: boolean;             // Include headers in copy (default: false)
  delimiter?: string;                // Field delimiter (default: '\t')
  processCellForClipboard?: (params: { value: any; column: ColumnState }) => string;
  processCellFromClipboard?: (params: { value: string; column: ColumnState }) => any;
  suppressPaste?: boolean;           // Disable paste (default: false)
  suppressCut?: boolean;             // Disable cut (default: false)
}
```

### Include Headers

```ts
ClipboardPlugin({ copyHeaders: true })
```

### Custom Delimiter

Use comma-separated values instead of tab-separated:

```ts
ClipboardPlugin({ delimiter: ',' })
```

### Process Cell Values

Transform values during copy/paste:

```ts title="Custom processing"
ClipboardPlugin({
  processCellForClipboard: ({ value, column }) => {
    if (column.colId === 'date') {
      return new Date(value).toLocaleDateString();
    }
    return String(value ?? '');
  },
  processCellFromClipboard: ({ value, column }) => {
    if (column.colId === 'age') {
      return parseInt(value, 10);
    }
    return value;
  },
})
```

## Keyboard Shortcuts

When the grid has focus, the following shortcuts are active:

| Shortcut | Action |
|---|---|
| `Ctrl+C` / `Cmd+C` | Copy selected rows |
| `Ctrl+X` / `Cmd+X` | Cut selected rows |
| `Ctrl+V` / `Cmd+V` | Paste at focused cell |

## Copy

Copies the selected rows in TSV format. All visible columns are included.

```ts title="Programmatic copy"
engine.commandBus.dispatch('clipboard:copy', {});
```

### Copy a Specific Range

```ts title="Copy range"
engine.commandBus.dispatch('clipboard:copyRange', {
  startRow: 0,
  endRow: 4,
  startCol: 'name',
  endCol: 'email',
});
```

## Cut

Copies the selected rows and then clears the cell values in the grid:

```ts
engine.commandBus.dispatch('clipboard:cut', {});
```

## Paste

Reads TSV data from the clipboard and writes it into the grid starting from the currently focused cell. The paste fills cells left-to-right (matching visible columns) and top-to-bottom (matching displayed rows).

```ts
engine.commandBus.dispatch('clipboard:paste', {});
```

:::note
Paste requires the browser Clipboard API (`navigator.clipboard.readText()`). The user must grant clipboard read permission, and the grid must have focus.
:::

## Commands

| Command | Payload | Description |
|---|---|---|
| `clipboard:copy` | `{}` | Copy selected rows |
| `clipboard:cut` | `{}` | Cut selected rows |
| `clipboard:paste` | `{}` | Paste from clipboard |
| `clipboard:copyRange` | `{ startRow, endRow, startCol, endCol }` | Copy a specific range |

## Events

| Event | Payload | Description |
|---|---|---|
| `clipboard:copy` | `{ data }` | Data was copied |
| `clipboard:cut` | `{ data }` | Data was cut |
| `clipboard:paste` | `{ data }` | Data was pasted |

## Next Steps

- **[Selection](/plugins/selection/)** -- Required companion plugin.
- **[Editing](/plugins/editing/)** -- Paste often triggers editing workflows.
