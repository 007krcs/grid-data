---
title: Selection
description: Configure single and multiple row selection, checkbox selection, keyboard selection, and programmatic selection.
---

The Selection plugin provides row selection via mouse clicks, keyboard shortcuts, and programmatic API calls. It supports single selection, multiple selection with Ctrl+Click and Shift+Click, and optional checkbox columns.

## Installation

```bash
npm install @gridstorm/plugin-selection
```

```ts title="Setup"
import { SelectionPlugin } from '@gridstorm/plugin-selection';

const engine = createGrid({
  columns: [...],
  rowData: [...],
  plugins: [SelectionPlugin({ mode: 'multiple' })],
});
```

## Plugin Options

```ts title="SelectionPluginOptions"
interface SelectionPluginOptions {
  mode?: 'single' | 'multiple';       // Selection mode (default: 'multiple')
  checkbox?: boolean;                   // Show checkbox column (default: false)
  enableDeselection?: boolean;          // Allow deselecting by clicking (default: true)
  suppressRowClickSelection?: boolean;  // Disable click-to-select (default: false)
}
```

### Single Selection

Only one row can be selected at a time. Clicking a new row deselects the previous one:

```ts
SelectionPlugin({ mode: 'single' })
```

### Multiple Selection

Multiple rows can be selected. Supports keyboard modifiers:

- **Click** -- Select one row, deselect others
- **Ctrl+Click** (Cmd+Click on Mac) -- Toggle selection on a row
- **Shift+Click** -- Range select all rows between the last selected and the clicked row

```ts
SelectionPlugin({ mode: 'multiple' })
```

### Checkbox Selection

Add a checkbox column as the first column:

```ts
SelectionPlugin({ mode: 'multiple', checkbox: true })
```

### Suppress Row Click

Use only checkboxes for selection (clicking the row body does not select):

```ts
SelectionPlugin({
  mode: 'multiple',
  checkbox: true,
  suppressRowClickSelection: true,
})
```

## Programmatic Selection

### Select All / Deselect All

```ts
api.selectAll();
api.deselectAll();
```

### Get Selected Rows

```ts
const rows = api.getSelectedRows();       // Returns TData[]
const nodes = api.getSelectedNodes();     // Returns RowNode<TData>[]
```

### Select a Specific Row

Via command:

```ts
engine.commandBus.dispatch('selection:select', {
  rowId: 'emp-123',
  source: 'api',
});
```

With Ctrl (toggle) behavior:

```ts
engine.commandBus.dispatch('selection:select', {
  rowId: 'emp-123',
  multiSelect: true,
  source: 'api',
});
```

## Commands

| Command | Payload | Description |
|---|---|---|
| `selection:select` | `{ rowId, multiSelect?, rangeSelect?, source? }` | Select a row |
| `selection:selectAll` | `{}` | Select all visible rows |
| `selection:deselectAll` | `{}` | Deselect all rows |
| `focus:set` | `{ position }` | Set the focused cell position |

## Events

| Event | Payload | Description |
|---|---|---|
| `selection:changed` | `{ selectedNodes, source }` | Selection changed |
| `cell:focused` | `{ position, previousPosition }` | Focused cell changed |

The `source` field indicates what triggered the change: `'api'`, `'click'`, `'checkbox'`, `'keyboard'`, or `'selectAll'`.

## React Integration

Use the `useGridSelection` hook:

```tsx title="useGridSelection"
import { useGridSelection } from '@gridstorm/react';

function SelectionInfo() {
  const {
    selectedCount,
    selectedRowIds,
    isRowSelected,
    getSelectedRows,
    selectAll,
    deselectAll,
  } = useGridSelection();

  return (
    <div>
      <p>{selectedCount} rows selected</p>
      <button onClick={selectAll}>Select All</button>
      <button onClick={deselectAll}>Clear Selection</button>
    </div>
  );
}
```

### Controlled Selection in React

Use controlled state to own the selection externally:

```tsx title="Controlled selection"
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

<GridStorm
  columns={columns}
  rowData={data}
  plugins={plugins}
  selectedRowIds={selectedIds}
  onSelectedRowIdsChange={(ids, source) => {
    setSelectedIds(ids);
  }}
/>
```

## Next Steps

- **[Editing](/plugins/editing/)** -- Inline cell editing.
- **[Clipboard](/plugins/clipboard/)** -- Copy/paste selected rows.
