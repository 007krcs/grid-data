---
title: Svelte Adapter
description: Use GridStorm in Svelte 5 applications with the @gridstorm/svelte package, featuring stores, reactive bindings, and full TypeScript support.
---

The `@gridstorm/svelte` package provides a Svelte 5 integration for the GridStorm headless engine. It includes the `<GridStorm>` component, reactive stores for grid state, and full TypeScript support with generic row typing.

## Installation

```bash title="Terminal"
npm install @gridstorm/core @gridstorm/dom-renderer @gridstorm/svelte @gridstorm/theme-default
```

Import the default theme CSS in your application entry point:

```typescript title="main.ts"
import '@gridstorm/theme-default';
```

## Basic Usage

```svelte title="EmployeeGrid.svelte"
<script lang="ts">
  import { GridStorm } from '@gridstorm/svelte';
  import type { ColumnDef } from '@gridstorm/core';

  interface Employee {
    id: string;
    name: string;
    department: string;
    salary: number;
  }

  const columns: ColumnDef<Employee>[] = [
    { colId: 'name', field: 'name', headerName: 'Name', width: 200 },
    { colId: 'department', field: 'department', headerName: 'Department', width: 150 },
    { colId: 'salary', field: 'salary', headerName: 'Salary', width: 120 },
  ];

  let rowData: Employee[] = [
    { id: '1', name: 'Alice', department: 'Engineering', salary: 95000 },
    { id: '2', name: 'Bob', department: 'Design', salary: 85000 },
  ];
</script>

<GridStorm
  {columns}
  {rowData}
  getRowId={(params) => params.data.id}
  height={400}
/>
```

## Stores

GridStorm exposes reactive Svelte stores for accessing grid state. Import them from the `@gridstorm/svelte` package and use them inside components nested within `<GridStorm>`.

### gridApi

Access the `GridApi` instance for imperative operations.

```svelte title="ExportButton.svelte"
<script lang="ts">
  import { gridApi } from '@gridstorm/svelte';

  function logSelected() {
    console.log($gridApi.getSelectedRows());
  }
</script>

<button on:click={logSelected}>Log Selected Rows</button>
```

### gridState

Selector-based reactive state. Subscribe to specific slices of grid state.

```svelte title="RowCounter.svelte"
<script lang="ts">
  import { gridState } from '@gridstorm/svelte';

  $: rowCount = $gridState.displayedRowIds.length;
</script>

<span>{rowCount} rows displayed</span>
```

## Event Handling

Listen to grid events using Svelte's `on:` directive on the `<GridStorm>` component.

```svelte title="EventGrid.svelte"
<script lang="ts">
  import { GridStorm } from '@gridstorm/svelte';

  function handleCellClick(event) {
    console.log('Cell clicked:', event.detail.colId, event.detail.value);
  }

  function handleSortChange(event) {
    console.log('Sort changed:', event.detail.sortModel);
  }
</script>

<GridStorm
  {columns}
  {rowData}
  on:cell-clicked={handleCellClick}
  on:sort-changed={handleSortChange}
  on:selection-changed={(e) => console.log('Selected:', e.detail.selectedIds)}
/>
```

## Reactive Data

Svelte's reactive declarations work naturally with GridStorm. Reassigning `rowData` triggers a grid update.

```svelte title="ReactiveGrid.svelte"
<script lang="ts">
  import { GridStorm } from '@gridstorm/svelte';

  let rowData = [
    { id: '1', name: 'Alice', salary: 95000 },
  ];

  function addRow() {
    rowData = [
      ...rowData,
      { id: String(Date.now()), name: 'New Employee', salary: 70000 },
    ];
  }
</script>

<button on:click={addRow}>Add Row</button>
<GridStorm {columns} {rowData} height={400} />
```

## Using Plugins

Pass plugins via the `plugins` prop. Plugins are initialized once when the grid mounts.

```svelte title="PluginGrid.svelte"
<script lang="ts">
  import { GridStorm } from '@gridstorm/svelte';
  import { SortingPlugin } from '@gridstorm/plugin-sorting';
  import { FilteringPlugin } from '@gridstorm/plugin-filtering';
  import { SelectionPlugin } from '@gridstorm/plugin-selection';

  const plugins = [
    SortingPlugin({ multiSort: true }),
    FilteringPlugin(),
    SelectionPlugin({ mode: 'multiple', checkboxSelection: true }),
  ];
</script>

<GridStorm
  {columns}
  {rowData}
  {plugins}
  height={500}
/>
```

## Next Steps

- [Theming](/core-concepts/theming/) -- customize appearance with CSS custom properties
- [Columns](/core-concepts/columns/) -- learn about column definitions and features
- [Events & Commands](/core-concepts/events-commands/) -- listen to grid events and dispatch commands
- [React](/frameworks/react/) -- use GridStorm with React
- [Vue](/frameworks/vue/) -- use GridStorm with Vue
