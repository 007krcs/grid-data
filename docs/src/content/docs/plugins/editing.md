---
title: Editing
description: Add inline cell editing with built-in editors, undo/redo, and double-click activation to your GridStorm data grid.
---

The Editing plugin provides inline cell editing with built-in editors for text, number, and select fields. It manages the full editing lifecycle (start, value change, stop/commit/cancel), supports undo/redo history, and activates editing on double-click.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-editing
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { EditingPlugin } from '@gridstorm/plugin-editing';

const grid = createGrid({
  columns: [
    { colId: 'name', field: 'name', headerName: 'Name', editable: true },
    { colId: 'price', field: 'price', headerName: 'Price', editable: true, cellEditor: 'number' },
    {
      colId: 'status',
      field: 'status',
      headerName: 'Status',
      editable: true,
      cellEditor: 'select',
      cellEditorParams: { values: ['Active', 'Inactive', 'Pending'] },
    },
  ],
  rowData: [],
  plugins: [
    EditingPlugin({
      defaultEditor: 'text',
      stopEditingWhenCellLoseFocus: true,
      undoRedo: true,
    }),
  ],
});
```

:::example{title="Live Editing Demo" href="/cookbook/#editing-basic"}
Double-click any cell to start editing. Press Enter to confirm or Escape to cancel. Try the value pipeline with valueParser and valueSetter.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `defaultEditor` | `string` | `'text'` | Default editor type when a column does not specify `cellEditor`. |
| `stopEditingWhenCellLoseFocus` | `boolean` | `true` | Automatically stop editing when the user clicks outside the editing cell. |
| `undoRedo` | `boolean` | `false` | Enable undo/redo support. Tracks edit history and responds to `editing:undo` / `editing:redo` commands. |

## Built-in Editors

The plugin registers three cell editors out of the box:

| Editor Key | Description |
| --- | --- |
| `'text'` | Standard text input. Used as the default when no `cellEditor` is specified. |
| `'number'` | Numeric input with type validation. |
| `'select'` | Dropdown select. Configure options via `cellEditorParams: { values: [...] }`. |

## Usage Examples

### Start Editing a Cell

Double-clicking a cell automatically starts editing via the `cell:doubleClicked` event listener. You can also trigger it programmatically.

```typescript title="start-editing.ts"
grid.commandBus.dispatch('editing:start', {
  rowId: 'row-1',
  colId: 'name',
});
```

The plugin checks the column's `editable` property (which can be a boolean or a function) before entering edit mode. It reads the current cell value using `valueGetter` if defined, otherwise falls back to `node.data[field]`.

### Stop Editing

```typescript title="stop-editing.ts"
// Commit the current value
grid.commandBus.dispatch('editing:stop', { cancel: false });

// Cancel and revert to original value
grid.commandBus.dispatch('editing:stop', { cancel: true });
```

### Undo and Redo

When `undoRedo` is enabled, every committed edit is pushed to an internal `EditHistory` stack. Undo restores the old value and triggers `rows:reprocess`.

```typescript title="undo-redo.ts"
grid.commandBus.dispatch('editing:undo', {});
grid.commandBus.dispatch('editing:redo', {});
```

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `editing:start` | `{ rowId: string; colId: string }` | Start editing a specific cell. Checks column `editable` property first. |
| `editing:stop` | `{ cancel?: boolean }` | Stop editing. Pass `cancel: true` to revert to the original value. |
| `editing:setValue` | `{ value: any }` | Update the current editing value without committing. |
| `editing:getEditorDef` | `{ colId: string; callback: (def: CellEditorDef \| null) => void }` | Retrieve the editor definition for a column via callback. |
| `editing:undo` | `{}` | Undo the last edit (requires `undoRedo: true`). Restores the previous value and reprocesses rows. |
| `editing:redo` | `{}` | Redo the last undone edit (requires `undoRedo: true`). |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `cell:editingStarted` | `{ node: RowNode; colId: string; value: any }` | Emitted when a cell enters edit mode. |
| `cell:editingStopped` | `{ node: RowNode; colId: string; oldValue: any; newValue: any; cancelled: boolean }` | Emitted when editing stops. The `cancelled` flag indicates whether the edit was reverted. |
| `cell:valueChanged` | `{ node: RowNode; colId: string; oldValue: any; newValue: any }` | Emitted when a cell value changes, including via undo/redo. |
| `cell:doubleClicked` | `{ node: RowNode; colId: string }` | Listened to internally to start editing on double-click. |

## React Integration

```tsx title="EditableGrid.tsx"
import { GridStorm, useGridApi } from '@gridstorm/react';
import { EditingPlugin } from '@gridstorm/plugin-editing';

function EditableGrid({ rowData, columns }) {
  const apiRef = useGridApi();

  const undo = () => apiRef.current?.commandBus.dispatch('editing:undo', {});
  const redo = () => apiRef.current?.commandBus.dispatch('editing:redo', {});

  return (
    <>
      <button onClick={undo}>Undo</button>
      <button onClick={redo}>Redo</button>
      <GridStorm
        rowData={rowData}
        columns={columns}
        plugins={[EditingPlugin({ undoRedo: true })]}
      />
    </>
  );
}
```

## Next Steps

- [Selection Plugin](/plugins/selection/) -- select cells before editing.
- [Clipboard Plugin](/plugins/clipboard/) -- copy and paste edited values.
- [Context Menu Plugin](/plugins/context-menu/) -- add edit actions to the right-click menu.
