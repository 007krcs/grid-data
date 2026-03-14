---
title: Angular Adapter
description: Use GridStorm in Angular applications with the @gridstorm/angular package, featuring standalone components, event emitters, and a multi-grid service.
---

The `@gridstorm/angular` package provides a standalone Angular component and an injectable service for integrating GridStorm into Angular applications. The component wraps the headless core engine and DOM renderer, bridges Angular inputs/outputs to the grid, and supports `OnChanges` for reactive data binding.

## Installation

```bash title="Terminal"
npm install @gridstorm/core @gridstorm/dom-renderer @gridstorm/angular @gridstorm/theme-default
```

Import the default theme CSS in your `styles.css` or `angular.json`:

```css title="styles.css"
@import '@gridstorm/theme-default';
```

## Basic Usage

The `GridStormComponent` is a standalone component, so you can import it directly in any Angular module or standalone component.

```typescript title="app.component.ts"
import { Component } from '@angular/core';
import { GridStormComponent } from '@gridstorm/angular';
import type { ColumnDef, GridApi } from '@gridstorm/core';

interface Employee {
  id: string;
  name: string;
  department: string;
  salary: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GridStormComponent],
  template: `
    <div style="height: 500px;">
      <gridstorm
        [columns]="columns"
        [rowData]="rowData"
        [getRowId]="getRowId"
        [rowHeight]="40"
        theme="light"
        density="comfortable"
        (gridReady)="onGridReady($event)"
        (cellClicked)="onCellClicked($event)"
      />
    </div>
  `,
})
export class AppComponent {
  columns: ColumnDef<Employee>[] = [
    { field: 'name', headerName: 'Name', width: 200, sortable: true },
    { field: 'department', headerName: 'Department', width: 150, sortable: true },
    { field: 'salary', headerName: 'Salary', width: 120 },
  ];

  rowData: Employee[] = [
    { id: '1', name: 'Alice', department: 'Engineering', salary: 95000 },
    { id: '2', name: 'Bob', department: 'Design', salary: 85000 },
  ];

  getRowId = (params: any) => params.data.id;

  onGridReady(api: GridApi) {
    console.log('Grid is ready:', api);
  }

  onCellClicked(event: any) {
    console.log('Cell clicked:', event.colId, event.value);
  }
}
```

## Inputs Reference

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `columns` | `ColumnDef[]` | `[]` | Column definitions. |
| `rowData` | `any[]` | `[]` | Client-side row data array. |
| `plugins` | `GridPlugin[]` | `[]` | Plugins to install during grid initialization. |
| `getRowId` | `(params) => string` | `undefined` | Callback to generate a unique ID for each row. |
| `rowHeight` | `number` | `40` | Row height in pixels. |
| `headerHeight` | `number` | `undefined` | Header row height in pixels. |
| `theme` | `string` | `'light'` | Theme name (`'light'`, `'dark'`, `'high-contrast'`). |
| `density` | `string` | `'normal'` | Density mode (`'compact'`, `'normal'`, `'comfortable'`). |
| `defaultColDef` | `Partial<ColumnDef>` | `undefined` | Default column definition applied to all columns. |
| `paginationPageSize` | `number` | `undefined` | Rows per page when pagination is enabled. |
| `domLayout` | `'normal' \| 'autoHeight' \| 'print'` | `undefined` | Grid DOM height mode. |
| `rowSelection` | `'single' \| 'multiple' \| false` | `undefined` | Row selection mode. |
| `pagination` | `boolean` | `undefined` | Enable client-side pagination. |
| `ariaLabel` | `string` | `undefined` | ARIA label for the grid root element. |

## Outputs Reference

| Output | Payload | Description |
|--------|---------|-------------|
| `gridReady` | `GridApi` | Grid engine initialized and API is ready. |
| `rowDataChanged` | event object | Row data was updated. |
| `selectionChanged` | event object | Selection state changed. |
| `sortChanged` | event object | Sort model changed. |
| `filterChanged` | event object | Filter model changed. |
| `cellValueChanged` | event object | A cell value was edited. |
| `cellClicked` | event object | A cell was clicked. |
| `cellDoubleClicked` | event object | A cell was double-clicked. |
| `rowClicked` | event object | A row was clicked. |
| `paginationChanged` | event object | Pagination state changed. |
| `columnResized` | event object | A column was resized. |

## Reactive Data Binding

The component implements `OnChanges` and detects changes to `rowData`, `columns`, and `paginationPageSize`. When these inputs change, the component automatically syncs the new values to the grid engine.

```typescript title="dynamic-data.component.ts"
@Component({
  selector: 'app-dynamic-grid',
  standalone: true,
  imports: [GridStormComponent],
  template: `
    <button (click)="refreshData()">Refresh</button>
    <div style="height: 400px;">
      <gridstorm [columns]="columns" [rowData]="rowData" />
    </div>
  `,
})
export class DynamicGridComponent {
  columns: ColumnDef[] = [
    { field: 'name', headerName: 'Name' },
    { field: 'value', headerName: 'Value' },
  ];

  rowData = [{ name: 'Item 1', value: 100 }];

  refreshData() {
    // Replacing the array triggers OnChanges -> engine.api.setRowData()
    this.rowData = [
      { name: 'Item 1', value: Math.random() * 1000 },
      { name: 'Item 2', value: Math.random() * 1000 },
    ];
  }
}
```

## Adding Plugins

Pass plugins to the `[plugins]` input:

```typescript title="with-plugins.component.ts"
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import { SelectionPlugin } from '@gridstorm/plugin-selection';

@Component({
  selector: 'app-plugin-grid',
  standalone: true,
  imports: [GridStormComponent],
  template: `
    <div style="height: 500px;">
      <gridstorm
        [columns]="columns"
        [rowData]="rowData"
        [plugins]="plugins"
        rowSelection="multiple"
      />
    </div>
  `,
})
export class PluginGridComponent {
  plugins = [
    SortingPlugin(),
    FilteringPlugin(),
    SelectionPlugin({ mode: 'multiple' }),
  ];

  columns: ColumnDef[] = [
    { field: 'name', headerName: 'Name', sortable: true, filter: true },
    { field: 'email', headerName: 'Email', sortable: true },
  ];

  rowData = [/* ... */];
}
```

## Accessing the API

You can access the `GridApi` through the `(gridReady)` output or by using a template reference with `ViewChild`:

```typescript title="api-access.component.ts"
@Component({
  selector: 'app-api-grid',
  standalone: true,
  imports: [GridStormComponent],
  template: `
    <button (click)="selectAll()">Select All</button>
    <button (click)="clearSort()">Clear Sort</button>
    <div style="height: 400px;">
      <gridstorm
        #grid
        [columns]="columns"
        [rowData]="rowData"
        (gridReady)="onGridReady($event)"
      />
    </div>
  `,
})
export class ApiGridComponent {
  @ViewChild('grid') gridComponent!: GridStormComponent;

  private api: GridApi | null = null;

  columns: ColumnDef[] = [/* ... */];
  rowData = [/* ... */];

  onGridReady(api: GridApi) {
    this.api = api;
  }

  selectAll() {
    this.api?.selectAll();
  }

  clearSort() {
    this.api?.setSortModel([]);
  }
}
```

## GridStormService for Multi-Grid Applications

The `GridStormService` is an injectable service for managing multiple grid instances. It acts as a registry where you can store and retrieve `GridApi` instances by a string identifier.

```typescript title="multi-grid.component.ts"
import { Component, OnDestroy } from '@angular/core';
import { GridStormComponent, GridStormService } from '@gridstorm/angular';
import type { GridApi } from '@gridstorm/core';

@Component({
  selector: 'app-multi-grid',
  standalone: true,
  imports: [GridStormComponent],
  template: `
    <button (click)="syncSelection()">Copy Selection to Grid B</button>
    <div style="display: flex; gap: 16px; height: 400px;">
      <gridstorm
        [columns]="columnsA"
        [rowData]="dataA"
        (gridReady)="onGridAReady($event)"
      />
      <gridstorm
        [columns]="columnsB"
        [rowData]="dataB"
        (gridReady)="onGridBReady($event)"
      />
    </div>
  `,
})
export class MultiGridComponent implements OnDestroy {
  constructor(private gridService: GridStormService) {}

  columnsA = [/* ... */];
  columnsB = [/* ... */];
  dataA = [/* ... */];
  dataB = [/* ... */];

  onGridAReady(api: GridApi) {
    this.gridService.registerApi('grid-a', api);
  }

  onGridBReady(api: GridApi) {
    this.gridService.registerApi('grid-b', api);
  }

  syncSelection() {
    const apiA = this.gridService.getApi('grid-a');
    const apiB = this.gridService.getApi('grid-b');
    if (apiA && apiB) {
      const selectedRows = apiA.getSelectedRows();
      apiB.setRowData(selectedRows);
    }
  }

  ngOnDestroy() {
    this.gridService.removeApi('grid-a');
    this.gridService.removeApi('grid-b');
  }
}
```

### GridStormService API

| Method | Return | Description |
|--------|--------|-------------|
| `registerApi(id, api)` | `void` | Register a GridApi under a unique identifier. |
| `getApi(id)` | `GridApi \| undefined` | Retrieve a registered GridApi by its identifier. |
| `removeApi(id)` | `void` | Remove a registered API (call on component destroy). |
| `getRegisteredIds()` | `string[]` | Get all registered grid identifiers. |
| `hasApi(id)` | `boolean` | Check if an API is registered with the given ID. |
| `clear()` | `void` | Remove all registered APIs. |

## Theming in Angular

Set the theme and density through the component inputs. They are applied as `data-theme` and `data-density` attributes on the grid wrapper:

```html title="template"
<gridstorm [columns]="columns" [rowData]="data" theme="dark" density="compact" />
```

Switch at runtime by binding to a component property:

```typescript title="theme-toggle.component.ts"
@Component({
  template: `
    <select [(ngModel)]="theme">
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="high-contrast">High Contrast</option>
    </select>
    <gridstorm [columns]="columns" [rowData]="data" [theme]="theme" />
  `,
})
export class ThemeToggleComponent {
  theme = 'light';
  // ...
}
```

## Next Steps

- [Theming](/core-concepts/theming/) -- complete token reference and custom theme creation
- [Vanilla JS](/frameworks/vanilla/) -- use GridStorm without a framework
- [React Adapter](/frameworks/react/) -- use GridStorm with React
- [Events & Commands](/core-concepts/events-commands/) -- the event and command system in depth
