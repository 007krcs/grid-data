---
title: Vanilla JavaScript
description: Use GridStorm without a framework by combining the core engine and DOM renderer directly.
---

You can use GridStorm without any framework by combining `@gridstorm/core` (the headless engine) and `@gridstorm/dom-renderer` (the DOM rendering layer) directly. This is the most lightweight approach and works in any JavaScript or TypeScript project.

## Installation

```bash title="Terminal"
npm install @gridstorm/core @gridstorm/dom-renderer @gridstorm/theme-default
```

## Creating a Grid

Every GridStorm instance requires three steps: create the engine with `createGrid()`, create a `DomRenderer`, and mount it to a container element.

```ts title="main.ts"
import { createGrid } from '@gridstorm/core';
import { DomRenderer } from '@gridstorm/dom-renderer';
import '@gridstorm/theme-default';

const container = document.getElementById('my-grid')!;

// 1. Create the headless grid engine
const engine = createGrid({
  columns: [
    { field: 'name', headerName: 'Name', width: 200, sortable: true },
    { field: 'age', headerName: 'Age', width: 100, sortable: true },
    { field: 'department', headerName: 'Department', width: 150 },
  ],
  rowData: [
    { name: 'Alice', age: 30, department: 'Engineering' },
    { name: 'Bob', age: 25, department: 'Design' },
    { name: 'Charlie', age: 35, department: 'Marketing' },
  ],
  getRowId: (params) => params.data.name,
  rowHeight: 40,
  headerHeight: 48,
});

// 2. Create the DOM renderer and mount it
const renderer = new DomRenderer({
  container,
  engine,
});
renderer.mount();
```

Your HTML just needs a container with a defined height:

```html title="index.html"
<div id="my-grid" style="height: 400px; width: 100%;"></div>
```

## Adding Plugins

Plugins are passed to `createGrid()` in the `plugins` array. Each plugin is an object created by its factory function.

```ts title="with-plugins.ts"
import { createGrid } from '@gridstorm/core';
import { DomRenderer } from '@gridstorm/dom-renderer';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import { SelectionPlugin } from '@gridstorm/plugin-selection';
import { PaginationPlugin } from '@gridstorm/plugin-pagination';
import '@gridstorm/theme-default';

const engine = createGrid({
  columns: [
    { field: 'name', headerName: 'Name', sortable: true, filter: true },
    { field: 'email', headerName: 'Email', sortable: true, filter: true },
    { field: 'role', headerName: 'Role', filter: true },
  ],
  rowData: employees,
  getRowId: (params) => params.data.id,
  plugins: [
    SortingPlugin(),
    FilteringPlugin(),
    SelectionPlugin({ mode: 'multiple' }),
    PaginationPlugin({ pageSize: 25 }),
  ],
  rowSelection: 'multiple',
  pagination: true,
  paginationPageSize: 25,
});

const renderer = new DomRenderer({
  container: document.getElementById('my-grid')!,
  engine,
  floatingFilter: true,
  checkboxSelection: true,
  enablePagination: true,
  pageSizeOptions: [10, 25, 50, 100],
});
renderer.mount();
```

## Using the API

The `engine.api` object provides methods for programmatic control of the grid.

```ts title="api-usage.ts"
const { api } = engine;

// Update row data
api.setRowData(newEmployees);

// Sort programmatically
api.setSortModel([{ colId: 'name', sort: 'asc' }]);

// Filter programmatically
api.setFilterModel({
  role: { filterType: 'text', type: 'equals', filter: 'Engineer' },
});

// Quick filter (searches all columns)
api.setQuickFilter('alice');

// Selection
api.selectAll();
const selected = api.getSelectedRows();
api.deselectAll();

// Column manipulation
api.setColumnVisible('email', false);
api.setColumnWidth('name', 300);
api.setColumnPinned('name', 'left');
api.moveColumn('role', 0);

// Pagination
api.paginationGoToPage(2);

// Get current state
const state = engine.store.getState();
console.log('Displayed rows:', state.displayedRowIds.length);
console.log('Sort model:', state.sortModel);
```

## Listening to Events

The `engine.eventBus` provides typed event subscriptions. Each `on()` call returns an unsubscribe function.

```ts title="events.ts"
// Cell click
const unsubClick = engine.eventBus.on('cell:clicked', (event) => {
  console.log('Clicked cell:', event.colId, 'value:', event.value);
});

// Sort changes
engine.eventBus.on('column:sort:changed', (event) => {
  console.log('New sort model:', event.sortModel);
});

// Selection changes
engine.eventBus.on('selection:changed', (event) => {
  console.log('Selected rows:', event.selectedNodes.length);
});

// Filter changes
engine.eventBus.on('filter:changed', (event) => {
  console.log('Filter model:', event.filterModel);
});

// Row data changes
engine.eventBus.on('rowData:changed', (event) => {
  console.log('Row count:', event.rowCount);
});

// Cell editing
engine.eventBus.on('cell:editingStarted', (event) => {
  console.log('Editing:', event.colId, event.node.id);
});

engine.eventBus.on('cell:editingStopped', (event) => {
  console.log('Edit stopped, cancelled:', event.cancelled);
});

// Pagination
engine.eventBus.on('pagination:changed', (event) => {
  console.log('Page:', event.currentPage, 'of', event.totalPages);
});

// Column resized
engine.eventBus.on('column:resized', (event) => {
  console.log('Column', event.column.colId, 'resized to', event.column.width);
});

// Unsubscribe when no longer needed
unsubClick();
```

## Subscribing to State Changes

The `engine.store` allows you to subscribe to any state change:

```ts title="store-subscription.ts"
const unsubscribe = engine.store.subscribe(() => {
  const state = engine.store.getState();
  document.getElementById('row-count')!.textContent =
    `${state.displayedRowIds.length} rows`;
});
```

## Dispatching Commands

You can dispatch commands directly through the command bus for operations not exposed on the API:

```ts title="commands.ts"
// Toggle sort on a column
engine.commandBus.dispatch('sort:toggle', { colId: 'name', multiSort: false });

// Set selection
engine.commandBus.dispatch('selection:set', {
  selectedRowIds: new Set(['row-1', 'row-2']),
});
```

## Theming

Apply themes by setting `data-theme` on the grid container or any ancestor element:

```html title="Dark theme"
<div data-theme="dark">
  <div id="my-grid" style="height: 400px;"></div>
</div>
```

Switch themes at runtime:

```ts title="theme-switch.ts"
const wrapper = document.getElementById('grid-wrapper')!;
wrapper.setAttribute('data-theme', 'dark');
wrapper.setAttribute('data-density', 'compact');
```

## Destroying the Grid

Always destroy the grid when you are done with it to clean up event listeners, observers, and DOM elements:

```ts title="cleanup.ts"
// Destroy the renderer first (removes DOM elements and observers)
renderer.destroy();

// Then destroy the engine (cleans up plugins, event bus, store)
engine.destroy();
```

## Full Working Example

Here is a complete standalone example with sorting, filtering, selection, and pagination:

```html title="index.html"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>GridStorm Vanilla Example</title>
  <style>
    #grid-wrapper { height: 500px; width: 100%; }
    .toolbar { margin-bottom: 8px; display: flex; gap: 8px; }
    .toolbar button { padding: 4px 12px; }
    .toolbar input { padding: 4px 8px; }
  </style>
</head>
<body>
  <div class="toolbar">
    <input id="search" type="text" placeholder="Quick filter..." />
    <button id="btn-select-all">Select All</button>
    <button id="btn-deselect">Deselect All</button>
    <button id="btn-theme">Toggle Dark Mode</button>
    <span id="status"></span>
  </div>
  <div id="grid-wrapper" data-theme="light">
    <div id="my-grid" style="height: 100%;"></div>
  </div>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

```ts title="main.ts"
import { createGrid } from '@gridstorm/core';
import { DomRenderer } from '@gridstorm/dom-renderer';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import { SelectionPlugin } from '@gridstorm/plugin-selection';
import { PaginationPlugin } from '@gridstorm/plugin-pagination';
import '@gridstorm/theme-default';

// Sample data
const rowData = Array.from({ length: 200 }, (_, i) => ({
  id: String(i),
  name: `Employee ${i + 1}`,
  department: ['Engineering', 'Design', 'Marketing', 'Sales'][i % 4],
  salary: 50000 + Math.floor(Math.random() * 80000),
}));

// Create grid engine
const engine = createGrid({
  columns: [
    { field: 'name', headerName: 'Name', width: 200, sortable: true, filter: true },
    { field: 'department', headerName: 'Department', width: 150, sortable: true, filter: true },
    {
      field: 'salary',
      headerName: 'Salary',
      width: 120,
      sortable: true,
      valueFormatter: ({ value }) => `$${Number(value).toLocaleString()}`,
    },
  ],
  rowData,
  getRowId: (params) => params.data.id,
  plugins: [
    SortingPlugin(),
    FilteringPlugin(),
    SelectionPlugin({ mode: 'multiple' }),
    PaginationPlugin({ pageSize: 50 }),
  ],
  rowSelection: 'multiple',
  pagination: true,
  paginationPageSize: 50,
});

// Create and mount renderer
const renderer = new DomRenderer({
  container: document.getElementById('my-grid')!,
  engine,
  floatingFilter: true,
  checkboxSelection: true,
  enablePagination: true,
});
renderer.mount();

// Toolbar: quick filter
document.getElementById('search')!.addEventListener('input', (e) => {
  engine.api.setQuickFilter((e.target as HTMLInputElement).value);
});

// Toolbar: selection buttons
document.getElementById('btn-select-all')!.addEventListener('click', () => {
  engine.api.selectAll();
});
document.getElementById('btn-deselect')!.addEventListener('click', () => {
  engine.api.deselectAll();
});

// Toolbar: theme toggle
let isDark = false;
document.getElementById('btn-theme')!.addEventListener('click', () => {
  isDark = !isDark;
  document.getElementById('grid-wrapper')!.setAttribute(
    'data-theme',
    isDark ? 'dark' : 'light',
  );
});

// Status bar
const statusEl = document.getElementById('status')!;
engine.store.subscribe(() => {
  const state = engine.store.getState();
  const selected = state.selection.selectedRowIds.size;
  statusEl.textContent = `${state.displayedRowIds.length} rows | ${selected} selected`;
});
```

## Next Steps

- [React Adapter](/frameworks/react/) -- use GridStorm with React hooks and portals
- [Angular Adapter](/frameworks/angular/) -- use GridStorm with Angular
- [Theming](/core-concepts/theming/) -- customize the grid appearance
- [Events & Commands](/core-concepts/events-commands/) -- the event and command system in depth
