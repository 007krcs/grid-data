---
title: Migration from AG Grid
description: Step-by-step guide to migrate from AG Grid to GridStorm
---

This guide walks you through migrating an existing AG Grid application to GridStorm. Whether you are on AG Grid Community or Enterprise, GridStorm provides a modern, lightweight alternative with a familiar API surface.

## Why Migrate?

| | AG Grid | GridStorm |
|---|---------|-----------|
| **Bundle size** | 300 KB+ (community), grows with enterprise modules | ~35 KB core, add only the plugins you need |
| **Architecture** | Monolithic module system | Plugin-based: pay only for what you use |
| **Theming** | Pre-built themes with SCSS overrides | CSS custom properties, runtime-switchable light/dark/high-contrast |
| **Grouping** | Enterprise license required | Free and included |
| **Aggregation** | Enterprise license required | Included |
| **Clipboard** | Enterprise license required | Included |
| **Licensing** | Per-developer seat pricing | Open-core with affordable enterprise plugins |

GridStorm was designed from the ground up to be modular. The core engine ships at ~35 KB and every feature is an opt-in plugin. You never ship code you do not use.

## Conceptual Mapping

The table below maps AG Grid concepts to their GridStorm equivalents. Many APIs are intentionally similar to keep the migration surface small.

| AG Grid | GridStorm | Notes |
|---------|-----------|-------|
| `<AgGridReact>` | `<GridStorm>` | Drop-in React component |
| `ColDef` | `ColumnDef` | Very similar shape |
| `columnDefs` | `columns` | Same structure, renamed prop |
| `rowData` | `rowData` | Identical |
| `modules` (e.g. `ClientSideRowModelModule`) | `plugins` (e.g. `SortingPlugin()`) | Functions, not module objects |
| `defaultColDef` | `defaultColDef` | Same |
| `getRowId` | `getRowId` | Same API |
| `onGridReady` | `onGridReady` | Same callback |
| Enterprise modules | Enterprise plugins | Paid, but cheaper |
| `ag-theme-alpine` | `data-theme="light"` | CSS custom properties |
| `ag-theme-alpine-dark` | `data-theme="dark"` | CSS custom properties |
| `GridApi` | `GridApi` | Similar method surface |
| `ICellRendererParams` | `CellRendererProps` | Renamed |
| `ColDef.sortable` | `ColumnDef.sortable` | Same |
| `ColDef.filter` | `ColumnDef.filterable` | Renamed |
| `ColDef.editable` | `ColumnDef.editable` | Same |
| `ColDef.pinned` | `ColumnDef.pinned` | Same |
| `ColDef.resizable` | `ColumnDef.resizable` | Same |

## Step-by-Step Migration

### Step 1: Replace npm Packages

Remove AG Grid packages and install GridStorm.

```bash
# Remove AG Grid
npm uninstall ag-grid-community ag-grid-react ag-grid-enterprise
# or scoped packages
npm uninstall @ag-grid-community/core @ag-grid-community/react @ag-grid-enterprise/all-modules

# Install GridStorm
npm install @gridstorm/core @gridstorm/dom-renderer @gridstorm/react @gridstorm/theme-default

# Install only the plugins you need
npm install @gridstorm/plugin-sorting @gridstorm/plugin-filtering @gridstorm/plugin-selection
npm install @gridstorm/plugin-editing @gridstorm/plugin-pagination
npm install @gridstorm/plugin-column-pinning @gridstorm/plugin-column-resize
npm install @gridstorm/plugin-column-reorder @gridstorm/plugin-context-menu
npm install @gridstorm/plugin-grouping @gridstorm/plugin-aggregation
npm install @gridstorm/plugin-clipboard
```

### Step 2: Update Imports

Replace AG Grid imports with GridStorm equivalents.

```typescript
// Before (AG Grid)
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// After (GridStorm)
import { GridStorm } from '@gridstorm/react';
import type { ColumnDef, GridApi } from '@gridstorm/core';
import '@gridstorm/theme-default/dist/tokens.css';
```

If you were using scoped AG Grid packages:

```typescript
// Before (AG Grid scoped)
import { AgGridReact } from '@ag-grid-community/react';
import type { ColDef } from '@ag-grid-community/core';

// After (GridStorm)
import { GridStorm } from '@gridstorm/react';
import type { ColumnDef } from '@gridstorm/core';
```

### Step 3: Replace the Component

```tsx
// Before (AG Grid)
<div className="ag-theme-alpine" style={{ height: 500, width: '100%' }}>
  <AgGridReact
    columnDefs={columnDefs}
    rowData={rowData}
    defaultColDef={defaultColDef}
    onGridReady={onGridReady}
  />
</div>

// After (GridStorm)
<div data-theme="light">
  <GridStorm
    columns={columnDefs}
    rowData={rowData}
    defaultColDef={defaultColDef}
    onGridReady={onGridReady}
    height={500}
    width="100%"
  />
</div>
```

Key differences:
- The wrapper `div` uses `data-theme` instead of a CSS class.
- `columnDefs` prop is renamed to `columns`.
- `height` and `width` are props on `<GridStorm>`, not styles on a wrapper div.

### Step 4: Convert Modules to Plugins

AG Grid uses a module registration system. GridStorm uses plugin functions that you pass directly.

```typescript
// Before (AG Grid modules)
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { SortModule } from '@ag-grid-enterprise/sort';

<AgGridReact modules={[ClientSideRowModelModule, SortModule]} />

// After (GridStorm plugins)
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import { SelectionPlugin } from '@gridstorm/plugin-selection';

<GridStorm plugins={[SortingPlugin(), FilteringPlugin(), SelectionPlugin()]} />
```

Note that GridStorm plugins are **function calls** (with parentheses), not module references. The client-side row model is built into the core engine and does not need a separate plugin.

**Module to Plugin mapping:**

| AG Grid Module | GridStorm Plugin | Notes |
|---------------|-----------------|-------|
| `ClientSideRowModelModule` | *(built-in)* | Remove, it is part of the core |
| `CsvExportModule` | *(coming soon)* | |
| `InfiniteRowModelModule` | *(coming soon)* | |
| `RowGroupingModule` | `GroupingPlugin()` | Free in GridStorm |
| `RangeSelectionModule` | `SelectionPlugin()` | |
| `ClipboardModule` | `ClipboardPlugin()` | |
| `SideBarModule` | *(coming soon)* | |
| `StatusBarModule` | *(coming soon)* | |
| `MasterDetailModule` | *(coming soon)* | |

### Step 5: Update Column Definitions

Column definitions are largely compatible. The main change is the type name (`ColDef` becomes `ColumnDef`) and `filter` becomes `filterable`.

```typescript
// Before (AG Grid)
const columnDefs: ColDef[] = [
  {
    field: 'name',
    headerName: 'Name',
    sortable: true,
    filter: true,
    editable: true,
    width: 200,
    pinned: 'left',
    resizable: true,
    cellRenderer: (params) => `<strong>${params.value}</strong>`,
  },
];

// After (GridStorm)
const columnDefs: ColumnDef[] = [
  {
    field: 'name',
    headerName: 'Name',
    sortable: true,
    filterable: true,
    editable: true,
    width: 200,
    pinned: 'left',
    resizable: true,
    cellRenderer: ({ value }) => `<strong>${value}</strong>`,
  },
];
```

Changes:
- `ColDef` type becomes `ColumnDef`.
- `filter: true` becomes `filterable: true`.
- Cell renderer params use destructured props rather than an AG Grid params object.

### Step 6: Update Event Names

GridStorm uses the same `onXxx` callback pattern as AG Grid on the React component. The underlying core events use a colon-separated naming convention.

```typescript
// AG Grid callback props → GridStorm callback props
onGridReady        → onGridReady         // Same
onRowDataChanged   → onRowDataChanged    // Same
onSelectionChanged → onSelectionChanged  // Same
onSortChanged      → onSortChanged       // Same
onFilterChanged    → onFilterChanged     // Same
onCellValueChanged → onCellValueChanged  // Same
onCellClicked      → onCellClicked       // Same
onCellDoubleClicked → onCellDoubleClicked // Same
onRowClicked       → onRowClicked        // Same
onColumnResized    → onColumnResized     // Same
onPaginationChanged → onPaginationChanged // Same
```

Most event callbacks are identical. If you were using the AG Grid `gridApi.addEventListener()` method, the GridStorm equivalent is `engine.eventBus.on()`.

```typescript
// Before (AG Grid)
api.addEventListener('sortChanged', handler);

// After (GridStorm)
engine.eventBus.on('column:sort:changed', handler);
```

### Step 7: Update Theme Classes

AG Grid uses CSS class names for theming. GridStorm uses `data-theme` attributes with CSS custom properties.

```html
<!-- Before (AG Grid) -->
<div class="ag-theme-alpine">...</div>
<div class="ag-theme-alpine-dark">...</div>
<div class="ag-theme-balham">...</div>
<div class="ag-theme-material">...</div>

<!-- After (GridStorm) -->
<div data-theme="light">...</div>
<div data-theme="dark">...</div>
<div data-theme="high-contrast">...</div>
```

GridStorm themes are CSS custom properties, so you can switch themes at runtime without reloading the page:

```javascript
document.querySelector('.gs-container').setAttribute('data-theme', 'dark');
```

You can also customize any token:

```css
[data-theme="light"] {
  --gs-header-bg: #f0f4ff;
  --gs-row-hover-bg: #e8f0fe;
  --gs-font-family: 'Inter', sans-serif;
}
```

### Step 8: Test and Verify

After migration, verify the following:

1. **Data renders correctly** -- rows and columns display as expected
2. **Sorting works** -- click column headers, verify sort icons
3. **Filtering works** -- apply filters, verify row counts
4. **Selection works** -- single and multi-select rows
5. **Editing works** -- double-click cells, edit values, verify persistence
6. **Column resize and reorder** -- drag column borders and headers
7. **Pagination** -- if used, verify page navigation
8. **Keyboard navigation** -- Tab, Arrow keys, Enter for editing
9. **Accessibility** -- verify ARIA attributes are present on the grid
10. **Theming** -- switch between light/dark themes

## API Differences

### Column Properties

| AG Grid Property | GridStorm Property | Notes |
|-----------------|-------------------|-------|
| `field` | `field` | Identical |
| `headerName` | `headerName` | Identical |
| `width` | `width` | Identical |
| `minWidth` | `minWidth` | Identical |
| `maxWidth` | `maxWidth` | Identical |
| `sortable` | `sortable` | Identical |
| `filter` | `filterable` | Renamed |
| `editable` | `editable` | Identical |
| `pinned` | `pinned` | Identical (`'left'` or `'right'`) |
| `resizable` | `resizable` | Identical |
| `hide` | `hide` | Identical |
| `cellRenderer` | `cellRenderer` | Similar (different param shape) |
| `headerComponent` | `headerRenderer` | Renamed |
| `valueGetter` | `valueGetter` | Similar |
| `valueSetter` | `valueSetter` | Similar |
| `valueFormatter` | `valueFormatter` | Similar |
| `valueParser` | `valueParser` | Similar |
| `comparator` | `comparator` | Identical |
| `aggFunc` | `aggFunc` | Identical |
| `cellClass` | `cellClass` | Identical |
| `cellStyle` | `cellStyle` | Identical |
| `headerClass` | `headerClass` | Identical |

### Grid API Methods

| AG Grid Method | GridStorm Method | Notes |
|---------------|-----------------|-------|
| `api.setRowData()` | `api.setRowData()` | Identical |
| `api.getRowNode()` | `api.getRowNode()` | Identical |
| `api.forEachNode()` | `api.forEachNode()` | Identical |
| `api.setColumnDefs()` | `api.setColumnDefs()` | Identical |
| `api.sizeColumnsToFit()` | `api.sizeColumnsToFit()` | Identical |
| `api.setSortModel()` | `api.setSortModel()` | Identical |
| `api.getSortModel()` | `api.getSortModel()` | Identical |
| `api.setFilterModel()` | `api.setFilterModel()` | Identical |
| `api.getFilterModel()` | `api.getFilterModel()` | Identical |
| `api.getSelectedRows()` | `api.getSelectedRows()` | Identical |
| `api.selectAll()` | `api.selectAll()` | Identical |
| `api.deselectAll()` | `api.deselectAll()` | Identical |
| `api.refreshCells()` | `api.refreshCells()` | Identical |
| `api.paginationGoToPage()` | `api.paginationGoToPage()` | Identical |
| `api.paginationGetPageSize()` | `api.paginationGetPageSize()` | Identical |
| `api.destroy()` | `engine.destroy()` | On engine, not api |

### Selection API

| AG Grid | GridStorm | Notes |
|---------|-----------|-------|
| `rowSelection: 'single'` | `rowSelection: 'single'` | Identical |
| `rowSelection: 'multiple'` | `rowSelection: 'multiple'` | Identical |
| `api.getSelectedRows()` | `api.getSelectedRows()` | Identical |
| `api.getSelectedNodes()` | `api.getSelectedNodes()` | Identical |
| `api.selectAll()` | `api.selectAll()` | Identical |
| `api.deselectAll()` | `api.deselectAll()` | Identical |
| `onSelectionChanged` | `onSelectionChanged` | Identical callback |

### Sorting API

| AG Grid | GridStorm | Notes |
|---------|-----------|-------|
| `sortable: true` | `sortable: true` | On column def |
| `sort: 'asc'` | Initial sort via `sortModel` | Use controlled sort model |
| `api.setSortModel()` | `api.setSortModel()` | Identical |
| `api.getSortModel()` | `api.getSortModel()` | Identical |
| `onSortChanged` | `onSortChanged` | Identical callback |

## Before/After Code Examples

### Basic Grid Setup

**AG Grid:**

```tsx
import { useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

function MyGrid() {
  const [rowData] = useState([
    { name: 'Alice', age: 30, country: 'USA' },
    { name: 'Bob', age: 25, country: 'UK' },
  ]);

  const [columnDefs] = useState<ColDef[]>([
    { field: 'name', sortable: true, filter: true },
    { field: 'age', sortable: true, filter: true },
    { field: 'country', sortable: true, filter: true },
  ]);

  return (
    <div className="ag-theme-alpine" style={{ height: 400, width: '100%' }}>
      <AgGridReact columnDefs={columnDefs} rowData={rowData} />
    </div>
  );
}
```

**GridStorm:**

```tsx
import { useState } from 'react';
import { GridStorm } from '@gridstorm/react';
import type { ColumnDef } from '@gridstorm/core';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import '@gridstorm/theme-default/dist/tokens.css';

function MyGrid() {
  const [rowData] = useState([
    { name: 'Alice', age: 30, country: 'USA' },
    { name: 'Bob', age: 25, country: 'UK' },
  ]);

  const [columnDefs] = useState<ColumnDef[]>([
    { field: 'name', sortable: true, filterable: true },
    { field: 'age', sortable: true, filterable: true },
    { field: 'country', sortable: true, filterable: true },
  ]);

  return (
    <div data-theme="light">
      <GridStorm
        columns={columnDefs}
        rowData={rowData}
        plugins={[SortingPlugin(), FilteringPlugin()]}
        height={400}
        width="100%"
      />
    </div>
  );
}
```

### Custom Cell Renderer

**AG Grid:**

```tsx
import { ICellRendererParams } from 'ag-grid-community';

function StatusRenderer(params: ICellRendererParams) {
  const color = params.value === 'active' ? 'green' : 'red';
  return <span style={{ color }}>{params.value}</span>;
}

// Usage in column def
{ field: 'status', cellRenderer: StatusRenderer }
```

**GridStorm:**

```tsx
import type { CellRendererFn } from '@gridstorm/core';

// As a React component via the React adapter
function StatusRenderer({ value }: { value: string }) {
  const color = value === 'active' ? 'green' : 'red';
  return <span style={{ color }}>{value}</span>;
}

// Usage in column def
{ field: 'status', cellRenderer: StatusRenderer }
```

### Event Handling

**AG Grid:**

```tsx
import { GridReadyEvent, GridApi } from 'ag-grid-community';

function MyGrid() {
  const [gridApi, setGridApi] = useState<GridApi | null>(null);

  const onGridReady = (event: GridReadyEvent) => {
    setGridApi(event.api);
    event.api.sizeColumnsToFit();
  };

  return <AgGridReact onGridReady={onGridReady} />;
}
```

**GridStorm:**

```tsx
import type { GridApi } from '@gridstorm/core';

function MyGrid() {
  const [gridApi, setGridApi] = useState<GridApi | null>(null);

  const onGridReady = (api: GridApi) => {
    setGridApi(api);
    api.sizeColumnsToFit();
  };

  return <GridStorm onGridReady={onGridReady} columns={columns} />;
}
```

Note: GridStorm passes the `GridApi` directly to `onGridReady`, not an event object.

### Theme Migration

**AG Grid:**

```css
/* Custom AG Grid theme overrides */
.ag-theme-alpine {
  --ag-header-background-color: #f0f4ff;
  --ag-odd-row-background-color: #fafafa;
  --ag-font-family: 'Inter', sans-serif;
  --ag-font-size: 14px;
}
```

**GridStorm:**

```css
/* Custom GridStorm theme overrides */
[data-theme="light"] {
  --gs-header-bg: #f0f4ff;
  --gs-row-alt-bg: #fafafa;
  --gs-font-family: 'Inter', sans-serif;
  --gs-font-size: 14px;
}
```

GridStorm uses the `--gs-` prefix for all CSS custom properties.

## Feature Parity Table

| Feature | AG Grid | GridStorm | Status |
|---------|---------|-----------|--------|
| Column Sort | Yes | Yes | Available |
| Multi Sort | Yes | Yes | Available |
| Filter | Yes | Yes | Available |
| Selection | Yes | Yes | Available |
| Cell Editing | Yes | Yes | Available |
| Column Pinning | Yes | Yes | Available |
| Column Resize | Yes | Yes | Available |
| Column Reorder | Yes | Yes | Available |
| Context Menu | Yes | Yes | Available |
| Grouping | Yes (Enterprise) | Yes (FREE) | Available |
| Aggregation | Yes (Enterprise) | Yes | Available |
| Clipboard | Yes (Enterprise) | Yes | Available |
| Pivoting | Yes (Enterprise) | Planned | Coming soon |
| Tree Data | Yes (Enterprise) | Planned | Coming soon |
| Excel Export | Yes (Enterprise) | Planned | Coming soon |
| Charts Integration | Yes (Enterprise) | Planned | Coming soon |
| Server-Side Row Model | Yes (Enterprise) | Planned | Coming soon |
| Master Detail | Yes (Enterprise) | Planned | Coming soon |
| CSV Export | Yes | Planned | Coming soon |
| Column Spanning | Yes | Planned | Coming soon |
| Row Spanning | Yes | Planned | Coming soon |
| Status Bar | Yes (Enterprise) | Planned | Coming soon |

## Using the Codemod

GridStorm provides an automated codemod tool that handles the mechanical parts of migration. It rewrites imports, renames components, and converts prop names.

```bash
# Run the codemod on your source directory
npx @gridstorm/codemod ./src

# Dry run (see changes without writing files)
npx @gridstorm/codemod --dry-run ./src

# Verbose output
npx @gridstorm/codemod --verbose ./src
```

The codemod handles:
- Import path rewrites (`ag-grid-react` to `@gridstorm/react`, etc.)
- Component renames (`AgGridReact` to `GridStorm`)
- Prop renames (`columnDefs` to `columns`)
- Type renames (`ColDef` to `ColumnDef`, `ICellRendererParams` to `CellRendererProps`)
- Theme class to `data-theme` attribute conversion
- Module to plugin conversion comments

After running the codemod, review each changed file and make any manual adjustments. The codemod cannot automatically convert AG Grid module arrays to plugin function calls, but it will add comments indicating where conversion is needed.

For more details on the codemod, see the [@gridstorm/codemod package](https://www.npmjs.com/package/@gridstorm/codemod).
