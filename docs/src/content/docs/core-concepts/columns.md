---
title: Columns
description: Define columns, configure sizing, sorting, filtering, editing, and custom rendering.
---

Columns are the foundation of a GridStorm grid. Every column is described by a `ColumnDef` object that controls what data is displayed, how it is formatted, and what interactions are available.

## Basic Column Definition

At minimum, a column needs a `field` that maps to a property on your row data:

```ts title="Simple columns"
const columns = [
  { field: 'name' },
  { field: 'age' },
  { field: 'email' },
];
```

When `headerName` is omitted, GridStorm uses the `field` value as the header text. For a cleaner display, provide an explicit header:

```ts title="With header names"
const columns = [
  { field: 'firstName', headerName: 'First Name' },
  { field: 'lastName', headerName: 'Last Name' },
  { field: 'email', headerName: 'Email Address' },
];
```

## Column IDs

Each column has a unique `colId`. If you do not provide one, it is auto-generated from the `field` value. For columns without a `field` (e.g., action columns), always set `colId` explicitly:

```ts title="Explicit column ID"
{
  colId: 'actions',
  headerName: 'Actions',
  cellRenderer: (params) => {
    const btn = document.createElement('button');
    btn.textContent = 'Edit';
    return btn;
  },
}
```

## Sizing

### Width

Set column width in pixels:

```ts
{ field: 'name', width: 200 }
```

### Min and Max Width

Constrain the column's resizable range:

```ts
{ field: 'name', width: 200, minWidth: 100, maxWidth: 400 }
```

### Flex

Use `flex` to distribute remaining space proportionally:

```ts title="Flex columns"
const columns = [
  { field: 'name', flex: 1 },       // 1/3 of remaining space
  { field: 'email', flex: 2 },      // 2/3 of remaining space
  { field: 'status', width: 100 },  // fixed 100px
];
```

Flex columns fill available space after fixed-width columns are laid out.

## Feature Flags

Column definitions include boolean flags to enable plugin features per column:

| Property | Type | Default | Description |
|---|---|---|---|
| `sortable` | `boolean` | `false` | Allow sorting by clicking the header |
| `filterable` | `boolean` | `false` | Allow filtering this column |
| `editable` | `boolean \| function` | `false` | Allow inline cell editing |
| `resizable` | `boolean` | `false` | Allow drag-to-resize from the header border |

```ts title="Feature flags"
{
  field: 'name',
  sortable: true,
  filterable: true,
  editable: true,
  resizable: true,
}
```

:::tip
Use `defaultColDef` on the grid config to set defaults for all columns, then override per column:

```ts
const config = {
  columns: [...],
  rowData: [...],
  defaultColDef: {
    sortable: true,
    resizable: true,
    filterable: true,
  },
};
```
:::

### Conditional Editability

The `editable` property accepts a function for row-level control:

```ts title="Conditional editing"
{
  field: 'price',
  editable: (params) => params.data?.status !== 'locked',
}
```

## Pinning

Pin columns to the left or right edge so they remain visible during horizontal scrolling:

```ts title="Pinned columns"
{ field: 'name', pinned: 'left' }
{ field: 'actions', pinned: 'right' }
```

Set `lockPinned: true` to prevent the user from unpinning a column via the context menu.

## Visibility

Hide a column from the grid while keeping it available in the data model:

```ts
{ field: 'internalId', hide: true }
```

Toggle visibility programmatically via the API:

```ts
api.setColumnVisible('internalId', true);
```

## Value Pipeline

GridStorm processes cell values through a pipeline of optional functions:

```
Raw Data  -->  valueGetter  -->  value  -->  valueFormatter  -->  display string
                                              (editing uses valueParser)
```

### Value Getter

Extract or compute values that do not map directly to a single field:

```ts title="Computed value"
{
  colId: 'fullName',
  headerName: 'Full Name',
  valueGetter: (params) => {
    return `${params.data?.firstName} ${params.data?.lastName}`;
  },
}
```

### Value Formatter

Format a value for display without changing the underlying data:

```ts title="Currency formatting"
{
  field: 'salary',
  valueFormatter: (params) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(params.value);
  },
}
```

### Value Setter

Control how edited values are written back to the row data:

```ts title="Value setter"
{
  field: 'price',
  valueSetter: (params) => {
    const parsed = parseFloat(params.newValue);
    if (isNaN(parsed)) return false; // reject
    params.data.price = parsed;
    return true; // accept
  },
}
```

### Value Parser

Parse user input during editing before it reaches the value setter:

```ts title="Value parser"
{
  field: 'age',
  valueParser: (params) => parseInt(params.newValue, 10),
}
```

## Custom Cell Renderers

Return a string or an `HTMLElement` from the `cellRenderer` function to customize cell content:

```ts title="Status badge renderer"
{
  field: 'status',
  cellRenderer: (params) => {
    const span = document.createElement('span');
    span.className = `badge badge-${params.value}`;
    span.textContent = params.value;
    return span;
  },
}
```

In the React adapter, you can pass React components as cell renderers. See the [React guide](/frameworks/react/) for details.

## Custom Header Renderers

Customize the header cell rendering:

```ts title="Custom header"
{
  field: 'name',
  headerRenderer: (params) => {
    const el = document.createElement('div');
    el.innerHTML = `<strong>${params.displayName}</strong>`;
    return el;
  },
}
```

## Cell Styling

Apply dynamic CSS classes or inline styles:

```ts title="Cell class"
{
  field: 'score',
  cellClass: (params) => params.value >= 90 ? 'cell-high' : 'cell-low',
}
```

```ts title="Cell style"
{
  field: 'balance',
  cellStyle: (params) => ({
    color: params.value < 0 ? 'red' : 'green',
    fontWeight: '600',
  }),
}
```

## Tooltips

Show a tooltip on hover:

```ts
{ field: 'description', tooltipField: 'description' }
```

Or compute the tooltip dynamically:

```ts
{
  field: 'name',
  tooltipValueGetter: (params) => `Employee ID: ${params.node.id}`,
}
```

## Column Spanning

Span a cell across multiple columns:

```ts
{
  field: 'title',
  colSpan: (params) => params.data?.isHeader ? 3 : 1,
}
```

## Row Grouping and Aggregation

Columns can participate in grouping and aggregation:

```ts title="Group and aggregate"
{ field: 'department', rowGroup: true, rowGroupIndex: 0 }
{ field: 'salary', aggFunc: 'sum' }
```

See the [Grouping](/plugins/grouping/) and [Aggregation](/plugins/aggregation/) plugin pages for details.

## Next Steps

- **[Row Data](/core-concepts/row-data/)** -- Setting and updating row data.
- **[Column Definitions API](/api/column-definitions/)** -- Complete ColumnDef property reference.
- **[Editing Plugin](/plugins/editing/)** -- Cell editors and editing lifecycle.
