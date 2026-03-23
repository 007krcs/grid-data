---
title: Validation
description: Data validation with 12 validator types, inline error display, and cross-cell rules.
---

The Validation plugin enforces data integrity by validating cell values against configurable rules. It ships with 12 built-in validator types covering common patterns (email, phone, URL, range, regex) and supports cross-cell validation and custom validator functions. Validation errors are displayed inline with configurable error styling and tooltips.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-validation
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { ValidationPlugin } from '@gridstorm/plugin-validation';

const grid = createGrid({
  columns: [
    { colId: 'name', field: 'name', headerName: 'Name' },
    { colId: 'email', field: 'email', headerName: 'Email' },
    { colId: 'age', field: 'age', headerName: 'Age' },
    { colId: 'role', field: 'role', headerName: 'Role' },
  ],
  rowData: [],
  plugins: [
    ValidationPlugin({
      validateOnEdit: true,
      validateOnLoad: false,
      rules: [
        { colId: 'name', type: 'required', message: 'Name is required' },
        { colId: 'email', type: 'email', message: 'Enter a valid email address' },
        { colId: 'age', type: 'range', min: 18, max: 120, message: 'Age must be 18-120' },
        { colId: 'role', type: 'list', values: ['Admin', 'Editor', 'Viewer'] },
      ],
    }),
  ],
});
```

:::example{title="Live Validation Demo" href="/cookbook/#validation-basic"}
Edit cells and see inline validation errors with red borders and tooltip messages for invalid entries.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `rules` | `ValidationRule[]` | `[]` | Initial validation rules applied on setup. |
| `validateOnEdit` | `boolean` | `true` | Automatically validate a cell when its value is committed via the editing plugin. |
| `validateOnLoad` | `boolean` | `false` | Run validation on all cells when row data is first loaded. |

## Validator Types

| Type | Parameters | Description |
| --- | --- | --- |
| `required` | -- | Cell must have a non-empty value. |
| `email` | -- | Value must be a valid email address format. |
| `phone` | `{ format?: string }` | Value must match a phone number pattern. |
| `url` | -- | Value must be a valid URL. |
| `regex` | `{ pattern: string; flags?: string }` | Value must match the provided regular expression. |
| `range` | `{ min?: number; max?: number }` | Numeric value must fall within the specified range. |
| `list` | `{ values: any[] }` | Value must be one of the allowed values. |
| `integer` | -- | Value must be a whole number with no decimal places. |
| `length` | `{ min?: number; max?: number }` | String length must fall within the specified range. |
| `unique` | -- | Value must be unique within its column. |
| `crossCell` | `{ validator: (value, row) => boolean }` | Validate against other cell values in the same row. |
| `custom` | `{ validator: (value) => boolean \| string }` | Custom validator function. Return `true` for valid, or an error string. |

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `validation:setRules` | `{ rules: ValidationRule[] }` | Replace all validation rules with a new set. |
| `validation:addRule` | `{ rule: ValidationRule }` | Add a single validation rule. |
| `validation:validate` | `{ rowId: string; colId: string }` | Validate a specific cell and update its error state. |
| `validation:validateAll` | `{}` | Validate all cells in the grid against their rules. |
| `validation:getErrors` | `{}` | Retrieve all current validation errors. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `validation:error` | `{ rowId: string; colId: string; message: string }` | Emitted when a cell fails validation. |
| `validation:cleared` | `{ rowId: string; colId: string }` | Emitted when a previously invalid cell becomes valid. |
| `validation:complete` | `{ errorCount: number }` | Emitted after `validateAll` finishes with the total error count. |

## Usage Examples

### Multiple Rules per Column

Stack validators to enforce complex requirements.

```typescript title="stacked-rules.ts"
grid.commandBus.dispatch('validation:addRule', {
  rule: {
    colId: 'username',
    type: 'required',
    message: 'Username is required',
  },
});

grid.commandBus.dispatch('validation:addRule', {
  rule: {
    colId: 'username',
    type: 'length',
    min: 3,
    max: 20,
    message: 'Username must be 3-20 characters',
  },
});

grid.commandBus.dispatch('validation:addRule', {
  rule: {
    colId: 'username',
    type: 'unique',
    message: 'Username must be unique',
  },
});
```

### Cross-Cell Validation

Validate a cell based on the values of other cells in the same row.

```typescript title="cross-cell.ts"
grid.commandBus.dispatch('validation:addRule', {
  rule: {
    colId: 'endDate',
    type: 'crossCell',
    validator: (value, row) => new Date(value) > new Date(row.startDate),
    message: 'End date must be after start date',
  },
});
```

### Validate and Check Errors

Run full validation and inspect the results.

```typescript title="validate-all.ts"
// Validate all cells
grid.commandBus.dispatch('validation:validateAll', {});

// Listen for completion
grid.eventBus.on('validation:complete', (event) => {
  if (event.errorCount > 0) {
    console.warn(`${event.errorCount} validation errors found`);
    grid.commandBus.dispatch('validation:getErrors', {});
  }
});
```

## Next Steps

- [Editing Plugin](/plugins/editing/) -- validation runs automatically after cell edits when `validateOnEdit` is enabled.
- [Excel Export Plugin](/plugins/excel-export/) -- export validation rules as Excel data validation.
- [Context Menu Plugin](/plugins/context-menu/) -- add "Validate Cell" to the right-click menu.
