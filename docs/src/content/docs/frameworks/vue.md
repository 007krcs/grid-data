---
title: Vue Adapter
description: Use GridStorm in Vue 3 applications with the @gridstorm/vue package, featuring composables, reactive data binding, and full TypeScript support.
---

The `@gridstorm/vue` package provides a Vue 3 integration for the GridStorm headless engine. It includes the `<GridStorm>` component, reactive composables powered by Vue's reactivity system, and full TypeScript support with generic row typing.

## Installation

```bash title="Terminal"
npm install @gridstorm/core @gridstorm/dom-renderer @gridstorm/vue @gridstorm/theme-default
```

Import the default theme CSS in your application entry point:

```typescript title="main.ts"
import '@gridstorm/theme-default';
```

## Basic Usage

```vue title="EmployeeGrid.vue"
<script setup lang="ts">
import { ref } from 'vue';
import { GridStorm } from '@gridstorm/vue';
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

const rowData = ref<Employee[]>([
  { id: '1', name: 'Alice', department: 'Engineering', salary: 95000 },
  { id: '2', name: 'Bob', department: 'Design', salary: 85000 },
]);
</script>

<template>
  <GridStorm
    :columns="columns"
    :row-data="rowData"
    :get-row-id="(params) => params.data.id"
    :height="400"
  />
</template>
```

## Composables

All composables must be used inside a component that is a child of `<GridStorm>`, where they have access to the injected grid context.

### useGridApi

Returns the `GridApi` instance for imperative operations.

```vue title="ExportButton.vue"
<script setup lang="ts">
import { useGridApi } from '@gridstorm/vue';

const api = useGridApi();

function logSelected() {
  console.log(api.getSelectedRows());
}
</script>

<template>
  <button @click="logSelected">Log Selected Rows</button>
</template>
```

### useGridState

Selector-based reactive state subscription. Re-renders only when the selected value changes.

```vue title="RowCounter.vue"
<script setup lang="ts">
import { useGridState } from '@gridstorm/vue';

const rowCount = useGridState((state) => state.displayedRowIds.length);
</script>

<template>
  <span>{{ rowCount }} rows displayed</span>
</template>
```

## Event Handling

Listen to grid events using standard Vue event syntax on the `<GridStorm>` component.

```vue title="EventGrid.vue"
<script setup lang="ts">
import { GridStorm } from '@gridstorm/vue';

function onCellClicked(event: { colId: string; value: any }) {
  console.log('Cell clicked:', event.colId, event.value);
}

function onSortChanged(event: { sortModel: any[] }) {
  console.log('Sort changed:', event.sortModel);
}
</script>

<template>
  <GridStorm
    :columns="columns"
    :row-data="rowData"
    @cell-clicked="onCellClicked"
    @sort-changed="onSortChanged"
    @selection-changed="(e) => console.log('Selected:', e.selectedIds)"
  />
</template>
```

## Reactive Data Binding

Vue's reactivity system integrates naturally with GridStorm. Use `ref` or `reactive` for row data, and the grid updates automatically when data changes.

```vue title="ReactiveGrid.vue"
<script setup lang="ts">
import { ref } from 'vue';
import { GridStorm } from '@gridstorm/vue';

const rowData = ref([
  { id: '1', name: 'Alice', salary: 95000 },
]);

function addRow() {
  rowData.value = [
    ...rowData.value,
    { id: String(Date.now()), name: 'New Employee', salary: 70000 },
  ];
}
</script>

<template>
  <button @click="addRow">Add Row</button>
  <GridStorm :columns="columns" :row-data="rowData" :height="400" />
</template>
```

## Using Plugins

Pass plugins via the `:plugins` prop. Plugins are initialized once when the grid mounts.

```vue title="PluginGrid.vue"
<script setup lang="ts">
import { GridStorm } from '@gridstorm/vue';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import { SelectionPlugin } from '@gridstorm/plugin-selection';

const plugins = [
  SortingPlugin({ multiSort: true }),
  FilteringPlugin(),
  SelectionPlugin({ mode: 'multiple', checkboxSelection: true }),
];
</script>

<template>
  <GridStorm
    :columns="columns"
    :row-data="rowData"
    :plugins="plugins"
    :height="500"
  />
</template>
```

## Next Steps

- [Theming](/core-concepts/theming/) -- customize appearance with CSS custom properties
- [Columns](/core-concepts/columns/) -- learn about column definitions and features
- [Events & Commands](/core-concepts/events-commands/) -- listen to grid events and dispatch commands
- [React](/frameworks/react/) -- use GridStorm with React
- [Svelte](/frameworks/svelte/) -- use GridStorm with Svelte
