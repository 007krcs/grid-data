---
title: Selection
description: Add row selection with single, multiple, range, and checkbox modes to your GridStorm data grid.
---

The Selection plugin provides row selection with support for single select, multi-select (Ctrl+Click), range select (Shift+Click), and programmatic selection. It also manages cell focus for keyboard navigation.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-selection
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { SelectionPlugin } from '@gridstorm/plugin-selection';

const grid = createGrid({
  columns: [
    { colId: 'name', field: 'name', headerName: 'Name' },
    { colId: 'email', field: 'email', headerName: 'Email' },
  ],
  rowData: [],
  plugins: [
    SelectionPlugin({
      mode: 'multiple',
      checkbox: false,
      enableDeselection: true,
      suppressRowClickSelection: false,
    }),
  ],
});
```

:::example{title="Live Selection Demo" href="/cookbook/#selection-modes"}
Click rows to select, Ctrl+Click for multi-select, Shift+Click for range selection. Toggle between single, multiple, and range modes.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `mode` | `'single' \| 'multiple'` | `'multiple'` | Selection mode. `'single'` allows only one row at a time. |
| `checkbox` | `boolean` | `false` | Add a checkbox column as the first column for selection. |
| `enableDeselection` | `boolean` | `true` | Allow clicking a selected row to deselect it. |
| `suppressRowClickSelection` | `boolean` | `false` | When `true`, row clicks do not trigger selection. Useful for checkbox-only mode. |

## Usage Examples

### Select a Row Programmatically

```typescript title="select-row.ts"
grid.commandBus.dispatch('selection:select', {
  rowId: 'row-1',
  source: 'api',
});
```

### Multi-Select and Range Select

```typescript title="multi-select.ts"
// Toggle a row in multi-select mode (like Ctrl+Click)
grid.commandBus.dispatch('selection:select', {
  rowId: 'row-2',
  multiSelect: true,
});

// Range select (like Shift+Click) -- selects all rows between last selected and target
grid.commandBus.dispatch('selection:select', {
  rowId: 'row-5',
  rangeSelect: true,
});
```

Range selection walks through `displayedRowIds` between the last selected row and the target, selecting all rows whose `selectable` property is `true`.

### Controlled Selection (Replace Entire Selection)

Set the entire selection state at once with `selection:set`. This filters the provided IDs to only include rows that exist and are selectable.

```typescript title="controlled-selection.ts"
grid.commandBus.dispatch('selection:set', {
  selectedRowIds: ['row-1', 'row-3', 'row-5'],
  source: 'api',
});
```

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `selection:select` | `{ rowId: string; multiSelect?: boolean; rangeSelect?: boolean; source?: SelectionSource }` | Select a row. Supports toggle (Ctrl) and range (Shift) behavior. Only selects rows where `node.selectable` is `true`. |
| `selection:set` | `{ selectedRowIds: Set<string> \| string[]; source?: SelectionSource }` | Replace the entire selection. Accepts a `Set` or array of row IDs. |
| `selection:selectAll` | `{}` | Select all displayed rows (multiple mode only). Calls `api.selectAll()`. |
| `selection:deselectAll` | `{}` | Deselect all rows. Calls `api.deselectAll()`. |
| `focus:set` | `{ position: CellPosition \| null }` | Set the focused cell position for keyboard navigation. Emits `cell:focused`. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `selection:changed` | `{ selectedNodes: RowNode[]; source: SelectionSource }` | Emitted whenever the selection changes. `source` indicates what triggered the change (`'click'`, `'api'`, etc.). |
| `cell:focused` | `{ position: CellPosition \| null; previousPosition: CellPosition \| null }` | Emitted when the focused cell changes via `focus:set`. |
| `row:clicked` | `{ node: RowNode; event: MouseEvent \| null }` | Listened to internally to trigger selection on row clicks (unless `suppressRowClickSelection` is `true`). |

## React Integration

```tsx title="SelectableGrid.tsx"
import { GridStorm, useGridApi } from '@gridstorm/react';
import { SelectionPlugin } from '@gridstorm/plugin-selection';

function SelectableGrid({ rowData, columns }) {
  const apiRef = useGridApi();

  const getSelected = () => {
    const nodes = apiRef.current?.getSelectedNodes() ?? [];
    console.log('Selected:', nodes.map((n) => n.id));
  };

  const selectAll = () => {
    apiRef.current?.commandBus.dispatch('selection:selectAll', {});
  };

  return (
    <>
      <button onClick={selectAll}>Select All</button>
      <button onClick={getSelected}>Log Selection</button>
      <GridStorm
        rowData={rowData}
        columns={columns}
        plugins={[SelectionPlugin({ mode: 'multiple', checkbox: true })]}
      />
    </>
  );
}
```

## Next Steps

- [Editing Plugin](/plugins/editing/) -- edit selected cells.
- [Clipboard Plugin](/plugins/clipboard/) -- copy/paste selected rows (requires Selection).
- [Context Menu Plugin](/plugins/context-menu/) -- right-click actions on selected rows.
