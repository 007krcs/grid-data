---
title: Column Auto-Size
description: Automatically fit column widths to their content using character-width estimation.
---

The Column Auto-Size plugin calculates optimal column widths based on cell content using a character-width heuristic. Since GridStorm uses a headless architecture, content width is estimated from average character proportions rather than DOM measurement. Columns can be auto-sized individually, in batches, or all at once, with optional automatic resizing when data changes.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-column-autosize
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { ColumnAutoSizePlugin } from '@gridstorm/plugin-column-autosize';

const grid = createGrid({
  columns: [
    { colId: 'id', field: 'id', headerName: 'ID' },
    { colId: 'name', field: 'name', headerName: 'Full Name' },
    { colId: 'email', field: 'email', headerName: 'Email Address' },
    { colId: 'company', field: 'company', headerName: 'Company' },
  ],
  rowData: [
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com', company: 'Acme Corp' },
    { id: 2, name: 'Bob Williams', email: 'bob.williams@longdomain.co', company: 'GlobalTech Inc.' },
  ],
  plugins: [
    ColumnAutoSizePlugin({
      padding: 16,
      includeHeaders: true,
      maxWidth: 400,
      minWidth: 60,
    }),
  ],
});
```

:::example{title="Live Column Auto-Size Demo" href="/cookbook/#column-autosize-basic"}
Click the auto-size button to fit all columns to their content widths based on character estimation.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `padding` | `number` | `16` | Extra padding in pixels added to the estimated content width. |
| `includeHeaders` | `boolean` | `true` | Include header text when calculating the optimal column width. |
| `skipHidden` | `boolean` | `true` | Skip hidden columns when auto-sizing all columns. |
| `maxWidth` | `number` | `500` | Maximum column width in pixels. |
| `minWidth` | `number` | `50` | Minimum column width in pixels. |
| `sampleSize` | `number` | `100` | Maximum number of rows to sample for width estimation. Set to `0` to sample all rows. |
| `autoSizeOnDataChange` | `boolean` | `false` | Automatically auto-size all columns when row data changes. |

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `autoSize:all` | `{}` | Auto-size all visible columns to fit their content. |
| `autoSize:column` | `{ colId: string }` | Auto-size a single column by its ID. |
| `autoSize:columns` | `{ colIds: string[] }` | Auto-size a specific set of columns by their IDs. |

## Usage Examples

### Auto-Size All Columns on Load

```typescript title="autosize-on-load.ts"
const grid = createGrid({
  columns: [...],
  rowData: largeDataset,
  plugins: [
    ColumnAutoSizePlugin({ autoSizeOnDataChange: true }),
  ],
});
// Columns will auto-size when rowData is first set
```

### Auto-Size a Single Column

```typescript title="autosize-single.ts"
// Resize just the email column after its data changes
grid.commandBus.dispatch('autoSize:column', { colId: 'email' });
```

### Auto-Size Specific Columns

```typescript title="autosize-batch.ts"
// Resize only the name and company columns
grid.commandBus.dispatch('autoSize:columns', {
  colIds: ['name', 'company'],
});
```

### Button-Triggered Auto-Size

```typescript title="autosize-button.ts"
document.getElementById('fitColumnsBtn')?.addEventListener('click', () => {
  grid.commandBus.dispatch('autoSize:all', {});
});
```

## How Width Estimation Works

The plugin estimates text width using character-class heuristics:

- **Narrow characters** (`i`, `l`, `1`, `.`, `,`) are measured at 35% of font size.
- **Wide characters** (`M`, `W`, `m`, `w`, `@`) are measured at 85% of font size.
- **Uppercase letters** are measured at 70% of font size.
- **Standard characters** (lowercase, digits) are measured at 55% of font size.

The widest cell value (or header text if `includeHeaders` is enabled) determines the column width, clamped between `minWidth` and `maxWidth`, plus `padding`.

## Next Steps

- [Column Resize Plugin](/plugins/column-resize/) -- manual drag-to-resize works alongside auto-sizing.
- [Column Pinning Plugin](/plugins/column-pinning/) -- pin auto-sized columns to the left or right edge.
