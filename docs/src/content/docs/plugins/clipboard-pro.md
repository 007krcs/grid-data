---
title: Clipboard Pro (Excel-Compatible)
description: Drop-in replacement for plugin-clipboard with range-aware copy/paste, type coercion, validation, and formula-aware paste.
---

# Clipboard Pro Plugin

`@gridstorm/plugin-clipboard-pro` is a drop-in replacement for `@gridstorm/plugin-clipboard` that adds true Excel-compatible copy/paste: range-aware selection, advanced TSV parsing, automatic type coercion, paste validation, formula-aware paste, and undo integration.

:::tip
True Excel copy/paste is one of the top paywalled features in AG Grid Enterprise ($999/dev/yr). GridStorm ships it free.
:::

## Installation

```bash
npm install @gridstorm/plugin-clipboard-pro
```

Use this **instead of** `plugin-clipboard` — they share the same plugin ID (`'clipboard'`) so you can't have both.

## Quick Start

```typescript
import { createGrid } from '@gridstorm/core';
import { SelectionPlugin } from '@gridstorm/plugin-selection';
import { ClipboardProPlugin } from '@gridstorm/plugin-clipboard-pro';

const grid = createGrid({
  columns: [/* ... */],
  rowData: [/* ... */],
  plugins: [
    SelectionPlugin(),
    ClipboardProPlugin({
      typeCoercion: true,      // Auto-detect numbers, dates, booleans
      pasteValidation: true,   // Respect column validation rules
      formulaAwarePaste: true, // Detect =SUM() formulas on paste
      undoSupport: true,       // Snapshot before/after paste
    }),
  ],
});
```

Keyboard shortcuts work automatically: `Ctrl+C` / `Ctrl+X` / `Ctrl+V` (or `Cmd` on macOS).

## Copy Priority

When you copy, the plugin determines **what to copy** in this order:

1. **Cell range selection** — if a cell range is active (from `plugin-cell-range`)
2. **Row selection** — if rows are selected (all visible columns)
3. **Focused cell** — single cell

## Copy Options

```typescript
// Standard copy (respects copy priority)
grid.commandBus.dispatch('clipboard:copy', {});

// Copy with column headers included
grid.commandBus.dispatch('clipboard:copyWithHeaders', {});
```

## Paste

Pasting starts at the **focused cell** and expands right and down:

```
Clipboard:        Grid result (paste starts at B2):
Alice  30  NYC    → B2=Alice  C2=30   D2=NYC
Bob    25  LA     → B3=Bob    C3=25   D3=LA
```

### Type Coercion

When `typeCoercion: true` (default), pasted text is automatically converted to the correct JS type:

| Input Text | Coerced Value |
|---|---|
| `"42"` | `42` (number) |
| `"3.14"` | `3.14` (number) |
| `"1,234,567"` | `1234567` (number) |
| `"true"` / `"false"` | `true` / `false` (boolean) |
| `"45%"` | `0.45` (number) |
| `"$1,234.56"` | `1234.56` (number) |
| `"€100"` | `100` (number) |
| `"2024-03-15"` | ISO date string |
| `"03/15/2024"` | ISO date string |
| `"1.5e10"` | `15000000000` (number) |
| `""` | `null` |
| Other text | string (unchanged) |

### Paste Validation

When `pasteValidation: true` (default) and `plugin-validation` is installed, each pasted cell is validated:

- **Read-only columns** are skipped (not pasted into)
- **Column validation rules** are checked — invalid values are rejected
- The `clipboard:paste` event payload includes both `pastedCells` and `rejectedCells` arrays

```typescript
grid.eventBus.on('clipboard:paste', ({ pastedCells, rejectedCells, operation }) => {
  if (rejectedCells > 0) {
    console.warn(`${rejectedCells} cells rejected by validation`);
  }
});
```

### Formula-Aware Paste

When `formulaAwarePaste: true` (default) and `plugin-formula` is installed, any pasted value beginning with `=` is dispatched as a formula instead of plain text:

```
Paste "=SUM(A1:A10)" → dispatches formula:set command
Paste "=IF(B2>0, B2, 0)" → formula registered in dependency graph
```

### Undo Support

When `undoSupport: true` (default) and `plugin-time-travel` is installed, a snapshot is created before and after every paste operation:

```typescript
// After a paste, undo it:
grid.commandBus.dispatch('timeTravel:undo', {});
```

## Paste Special

Paste with a specific mode:

```typescript
// Values only — strips any formula prefix
grid.commandBus.dispatch('clipboard:pasteSpecial', {
  mode: 'values',
  text: '=SUM(A1:A3)', // pasted as literal text "=SUM(A1:A3)"
});

// Formulas mode — same as regular paste (formula detection active)
grid.commandBus.dispatch('clipboard:pasteSpecial', {
  mode: 'formulas',
});
```

## Cut

Cut stores the cell data internally, clears the source cells, and writes to the system clipboard:

```typescript
grid.commandBus.dispatch('clipboard:cut', {});
```

The state includes the cut range so the UI can show a "marching ants" indicator:

```typescript
const state = grid.store.getState().pluginState['clipboard-pro'];
if (state.cutRange) {
  const { startRowIndex, endRowIndex, columns } = state.cutRange;
  // highlight these cells with a dashed border
}
```

## Options Reference

```typescript
interface ClipboardProPluginOptions {
  /** Custom cell serialiser for copy */
  processCellForClipboard?: (params: ProcessCellParams) => string;

  /** Custom cell deserialiser for paste */
  processCellFromClipboard?: (params: ProcessCellParams) => unknown;

  /** Auto type detection on paste. Default: true */
  typeCoercion?: boolean;

  /** Respect column validators on paste. Default: true */
  pasteValidation?: boolean;

  /** Detect = formulas on paste. Default: true */
  formulaAwarePaste?: boolean;

  /** Create time-travel snapshots around paste. Default: true */
  undoSupport?: boolean;

  /** Include column headers on copy. Default: false */
  includeHeaders?: boolean;

  /** Cell delimiter. Default: '\t' (tab) */
  delimiter?: string;
}
```

## Events

| Event | Payload |
|---|---|
| `clipboard:copy` | `{ text, rowCount, colCount, withHeaders? }` |
| `clipboard:paste` | `{ pastedCells, rejectedCells, operation }` |
| `clipboard:cut` | `{ text, range }` |

## Excel Compatibility

The TSV parser is fully compatible with content copied from Excel and Google Sheets:

- **Quoted fields** — `"value with\ttab"` handled correctly
- **Embedded newlines** — `"line1\nline2"` inside a single cell
- **Escaped quotes** — `""` inside quotes → single `"`
- **CRLF line endings** — `\r\n` normalised to `\n`
- **Empty cells** — `\t\t` → `['', '']`

## Upgrade from plugin-clipboard

Replace the import — no other changes needed:

```diff
- import { ClipboardPlugin } from '@gridstorm/plugin-clipboard';
+ import { ClipboardProPlugin } from '@gridstorm/plugin-clipboard-pro';

  plugins: [
-   ClipboardPlugin(),
+   ClipboardProPlugin(),
  ],
```

Both plugins use the same ID (`'clipboard'`) and handle the same commands (`clipboard:copy`, `clipboard:paste`, `clipboard:cut`).
