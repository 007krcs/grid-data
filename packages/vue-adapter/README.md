# @gridstorm/vue

Vue 3 adapter for [GridStorm](https://gridstorm.dev) -- a high-performance, headless data grid engine.

## Installation

```bash
pnpm add @gridstorm/vue @gridstorm/core @gridstorm/dom-renderer
```

## Basic Usage

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { GridStorm } from '@gridstorm/vue';
import type { ColumnDef, GridApi } from '@gridstorm/vue';
import { sortingPlugin } from '@gridstorm/plugin-sorting';
import { filterPlugin } from '@gridstorm/plugin-filtering';

interface Employee {
  id: number;
  name: string;
  department: string;
  salary: number;
}

const columns: ColumnDef<Employee>[] = [
  { field: 'name', headerName: 'Name', sortable: true },
  { field: 'department', headerName: 'Department', filter: true },
  { field: 'salary', headerName: 'Salary', width: 120 },
];

const rowData = ref<Employee[]>([
  { id: 1, name: 'Alice', department: 'Engineering', salary: 95000 },
  { id: 2, name: 'Bob', department: 'Marketing', salary: 72000 },
  { id: 3, name: 'Charlie', department: 'Engineering', salary: 88000 },
]);

const gridRef = ref<InstanceType<typeof GridStorm>>();

function onGridReady(api: GridApi<Employee>) {
  console.log('Grid ready!', api.getDisplayedRowCount(), 'rows');
}
</script>

<template>
  <GridStorm
    ref="gridRef"
    :columns="columns"
    :row-data="rowData"
    :plugins="[sortingPlugin(), filterPlugin()]"
    :get-row-id="(params) => String(params.data.id)"
    :row-height="40"
    theme="light"
    height="400px"
    @grid-ready="onGridReady"
    @sort-changed="(e) => console.log('Sort:', e)"
  />
</template>
```

## Composables

All composables must be used within a child component of `<GridStorm>`.

### useGridApi

Access the GridApi instance.

```vue
<script setup lang="ts">
import { useGridApi } from '@gridstorm/vue';

const api = useGridApi();

function refresh() {
  api.value?.refreshCells();
}
</script>
```

### useGridSort

Reactive sort model and sort actions.

```vue
<script setup lang="ts">
import { useGridSort } from '@gridstorm/vue';

const { sortModel, isSorted, toggleSort, clearSort } = useGridSort();
</script>

<template>
  <button @click="toggleSort('name')">Sort by Name</button>
  <button v-if="isSorted" @click="clearSort()">Clear Sort</button>
</template>
```

### useGridFilter

Reactive filter model and filter actions.

```vue
<script setup lang="ts">
import { useGridFilter } from '@gridstorm/vue';

const { isFiltered, setQuickFilter, clearFilters } = useGridFilter();
</script>

<template>
  <input
    placeholder="Search..."
    @input="(e) => setQuickFilter((e.target as HTMLInputElement).value)"
  />
  <button v-if="isFiltered" @click="clearFilters()">Clear</button>
</template>
```

### useGridSelection

Reactive selection state and selection actions.

```vue
<script setup lang="ts">
import { useGridSelection } from '@gridstorm/vue';

const { selectedCount, selectAll, deselectAll } = useGridSelection();
</script>

<template>
  <p>{{ selectedCount }} rows selected</p>
  <button @click="selectAll()">Select All</button>
  <button @click="deselectAll()">Deselect All</button>
</template>
```

### useGridPagination

Reactive pagination state and navigation.

```vue
<script setup lang="ts">
import { useGridPagination } from '@gridstorm/vue';

const {
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  nextPage,
  previousPage,
} = useGridPagination();
</script>

<template>
  <div class="pagination">
    <button :disabled="!hasPreviousPage" @click="previousPage()">Prev</button>
    <span>Page {{ currentPage + 1 }} of {{ totalPages }}</span>
    <button :disabled="!hasNextPage" @click="nextPage()">Next</button>
  </div>
</template>
```

### useGridEvent

Subscribe to grid events with automatic cleanup.

```vue
<script setup lang="ts">
import { useGridEvent } from '@gridstorm/vue';

useGridEvent('selection:changed', (e) => {
  console.log('Selection changed:', e.selectedNodes);
});

useGridEvent('cell:clicked', (e) => {
  console.log('Cell clicked:', e.colId, e.value);
});
</script>
```

## Template Ref API

Access the grid API via a template ref:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { GridStorm } from '@gridstorm/vue';

const gridRef = ref<InstanceType<typeof GridStorm>>();

function exportSelected() {
  const api = gridRef.value?.getApi();
  const rows = api?.getSelectedRows() ?? [];
  console.log('Selected rows:', rows);
}
</script>

<template>
  <GridStorm ref="gridRef" :columns="columns" :row-data="rowData" />
  <button @click="exportSelected">Export Selected</button>
</template>
```

## License

MIT
