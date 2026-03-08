---
title: Editing
description: Enable inline cell editing with built-in text, number, and select editors, custom editors, and edit validation.
---

The Editing plugin provides inline cell editing with a complete lifecycle: start editing, modify the value, and commit or cancel. It ships with built-in editors for text, number, and select inputs, and supports custom editor components.

## Installation

```bash
npm install @gridstorm/plugin-editing
```

```ts title="Setup"
import { EditingPlugin } from '@gridstorm/plugin-editing';

const engine = createGrid({
  columns: [
    { field: 'name', editable: true },
    { field: 'age', editable: true, cellEditor: 'number' },
    { field: 'status', editable: true, cellEditor: 'select',
      cellEditorParams: { values: ['active', 'inactive', 'pending'] } },
  ],
  rowData: [...],
  plugins: [EditingPlugin()],
});
```

## Plugin Options

```ts title="EditingPluginOptions"
interface EditingPluginOptions {
  defaultEditor?: string;                // Default editor type (default: 'text')
  stopEditingWhenCellLoseFocus?: boolean; // Stop on blur (default: true)
  undoRedo?: boolean;                     // Enable Ctrl+Z/Y (default: false)
}
```

## Making Columns Editable

Set `editable: true` on columns that should support editing:

```ts title="Editable columns"
{ field: 'name', editable: true }
```

### Conditional Editability

Pass a function to control editability per row:

```ts title="Conditional editable"
{
  field: 'salary',
  editable: (params) => params.data?.role !== 'intern',
}
```

## Built-in Editors

### Text Editor

The default editor. Renders a text input:

```ts
{ field: 'name', editable: true }
// or explicitly:
{ field: 'name', editable: true, cellEditor: 'text' }
```

### Number Editor

Renders a number input with arrow key increment/decrement:

```ts
{ field: 'age', editable: true, cellEditor: 'number' }
```

### Select Editor

Renders a dropdown select:

```ts
{
  field: 'status',
  editable: true,
  cellEditor: 'select',
  cellEditorParams: {
    values: ['active', 'inactive', 'pending'],
  },
}
```

## Editing Lifecycle

1. **Start** -- User double-clicks a cell (or programmatic trigger). The plugin reads the current value and enters editing state.
2. **Modify** -- The editor component updates the value in real time via the `editing:setValue` command.
3. **Commit** -- User presses Enter or tabs away. The new value is written to the row data.
4. **Cancel** -- User presses Escape. The original value is restored.

## Programmatic Editing

### Start Editing

```ts
api.startEditingCell({ rowIndex: 0, colId: 'name' });
```

Or via command:

```ts
engine.commandBus.dispatch('editing:start', {
  rowId: 'row-0',
  colId: 'name',
});
```

### Stop Editing

```ts
api.stopEditing();        // Commit
api.stopEditing(true);    // Cancel
```

## Value Pipeline Integration

During editing, values flow through the column's value pipeline:

1. **Value Parser** -- Parses user input (e.g., string to number)
2. **Value Setter** -- Writes the parsed value to the row data (can reject invalid values)

```ts title="Validated editing"
{
  field: 'price',
  editable: true,
  cellEditor: 'number',
  valueParser: (params) => parseFloat(params.newValue),
  valueSetter: (params) => {
    if (params.newValue < 0) return false; // reject negative
    params.data.price = params.newValue;
    return true;
  },
}
```

## Commands

| Command | Payload | Description |
|---|---|---|
| `editing:start` | `{ rowId, colId }` | Start editing a cell |
| `editing:stop` | `{ cancel? }` | Stop editing (commit or cancel) |
| `editing:setValue` | `{ value }` | Update value during editing |

## Events

| Event | Payload | Description |
|---|---|---|
| `cell:editingStarted` | `{ node, colId, value }` | Editing began |
| `cell:editingStopped` | `{ node, colId, oldValue, newValue, cancelled }` | Editing ended |
| `cell:valueChanged` | `{ node, colId, oldValue, newValue }` | Value committed |

## React Custom Editors

In the React adapter, provide React components as cell editors:

```tsx title="React cell editor"
import type { CellEditorProps } from '@gridstorm/react';

function RatingEditor({ value, onValueChange, stopEditing }: CellEditorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(Number(e.target.value))}
      onBlur={() => stopEditing()}
      autoFocus
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>
      ))}
    </select>
  );
}

// Use in column def:
{ field: 'rating', editable: true, cellEditorComponent: RatingEditor }
```

## Next Steps

- **[Selection](/plugins/selection/)** -- Row selection for editing workflows.
- **[Clipboard](/plugins/clipboard/)** -- Copy/paste edited data.
- **[React Guide](/frameworks/react/)** -- Custom editor components with React.
