# @gridstorm/angular

Angular adapter for [GridStorm](https://grid-data-analytics-explorer.vercel.app/) -- a high-performance, headless data grid engine.

Provides a standalone Angular component (`<gridstorm>`) that wraps the GridStorm core engine and DOM renderer. Requires Angular 16+ (standalone component support).

## Installation

```bash
npm install @gridstorm/angular @gridstorm/core @gridstorm/dom-renderer
# or
pnpm add @gridstorm/angular @gridstorm/core @gridstorm/dom-renderer
```

## Quick Start

Import the standalone component directly in your Angular component:

```typescript
import { Component } from '@angular/core';
import { GridStormComponent } from '@gridstorm/angular';
import { sortingPlugin } from '@gridstorm/plugin-sorting';
import type { GridApi, ColumnDef } from '@gridstorm/angular';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [GridStormComponent],
  template: `
    <gridstorm
      [columns]="columns"
      [rowData]="rowData"
      [plugins]="plugins"
      [rowHeight]="40"
      [theme]="'dark'"
      [density]="'normal'"
      (gridReady)="onGridReady($event)"
      (selectionChanged)="onSelectionChanged($event)"
      style="height: 600px; width: 100%;"
    ></gridstorm>
  `,
})
export class EmployeesComponent {
  columns: ColumnDef[] = [
    { field: 'name', headerName: 'Name', sortable: true },
    { field: 'department', headerName: 'Department', sortable: true },
    { field: 'salary', headerName: 'Salary', width: 120 },
  ];

  rowData = [
    { name: 'Alice', department: 'Engineering', salary: 95000 },
    { name: 'Bob', department: 'Marketing', salary: 72000 },
    { name: 'Charlie', department: 'Engineering', salary: 110000 },
  ];

  plugins = [sortingPlugin()];

  private gridApi: GridApi | null = null;

  onGridReady(api: GridApi) {
    this.gridApi = api;
  }

  onSelectionChanged(event: any) {
    console.log('Selection changed:', event);
  }
}
```

## Inputs

| Input               | Type                        | Default    | Description                                     |
| ------------------- | --------------------------- | ---------- | ----------------------------------------------- |
| `columns`           | `ColumnDef[]`               | `[]`       | Column definitions                                 |
| `rowData`           | `any[]`                     | `[]`       | Row data array                                     |
| `plugins`           | `GridPlugin[]`              | `[]`       | Plugins to install                                 |
| `getRowId`          | `(params) => string`        | `undefined`| Custom row ID generator                         |
| `rowHeight`         | `number`                    | `40`       | Row height in pixels                            |
| `theme`             | `string`                    | `'light'`  | Theme name (`'light'`, `'dark'`, or custom)     |
| `density`           | `string`                    | `'normal'` | Density mode (`'compact'`, `'normal'`, etc.)    |
| `defaultColDef`     | `Partial<ColumnDef>`        | `undefined`| Default column config applied to all columns    |
| `paginationPageSize`| `number`                    | `undefined`| Rows per page (when pagination enabled)         |
| `headerHeight`      | `number`                    | `undefined`| Header row height in pixels                     |
| `domLayout`         | `'normal' \| 'autoHeight'`  | `undefined`| DOM layout mode                                 |
| `rowSelection`      | `'single' \| 'multiple'`    | `undefined`| Row selection mode                              |
| `pagination`        | `boolean`                   | `undefined`| Enable client-side pagination                   |
| `ariaLabel`         | `string`                    | `undefined`| ARIA label for accessibility                    |

## Outputs

| Output              | Payload                     | Description                                     |
| ------------------- | --------------------------- | ----------------------------------------------- |
| `gridReady`         | `GridApi`                   | Grid initialized, API is ready                  |
| `rowDataChanged`    | `{ rowData: any[] }`        | Row data was replaced                           |
| `selectionChanged`  | `{ selectedNodes, source }` | Row selection changed                           |
| `sortChanged`       | `{ sortModel }`             | Sort model changed                              |
| `filterChanged`     | `{ filterModel }`           | Filter model changed                            |
| `cellValueChanged`  | `{ node, colId, ... }`      | Cell value edited                               |
| `cellClicked`       | `{ node, colId, value }`    | Cell was clicked                                |
| `cellDoubleClicked` | `{ node, colId, value }`    | Cell was double-clicked                         |
| `rowClicked`        | `{ node, event }`           | Row was clicked                                 |
| `paginationChanged` | `{ currentPage, ... }`      | Pagination state changed                        |
| `columnResized`     | `{ column, ... }`           | Column was resized                              |

## GridStormService

An injectable service for managing multiple grid instances across your application:

```typescript
import { Component, OnDestroy } from '@angular/core';
import { GridStormComponent, GridStormService } from '@gridstorm/angular';
import type { GridApi } from '@gridstorm/angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [GridStormComponent],
  template: `
    <gridstorm
      [columns]="columns"
      [rowData]="rowData"
      (gridReady)="onGridReady($event)"
    ></gridstorm>
  `,
})
export class DashboardComponent implements OnDestroy {
  // ... columns, rowData ...

  constructor(private gridService: GridStormService) {}

  onGridReady(api: GridApi) {
    this.gridService.registerApi('dashboard-grid', api);
  }

  ngOnDestroy() {
    this.gridService.removeApi('dashboard-grid');
  }
}
```

Access from another component:

```typescript
export class ToolbarComponent {
  constructor(private gridService: GridStormService) {}

  exportSelected() {
    const api = this.gridService.getApi('dashboard-grid');
    if (api) {
      const rows = api.getSelectedRows();
      // ... export logic
    }
  }
}
```

## Build Notes

This package ships TypeScript source files alongside the tsup-compiled output. Since Angular decorators require the Angular compiler for AOT (ahead-of-time) compilation in production builds, there are two integration approaches:

### Development / JIT Mode

Import directly from the package -- the compiled ESM/CJS output works with Angular's JIT compiler:

```typescript
import { GridStormComponent, GridStormService } from '@gridstorm/angular';
```

### Production / AOT Builds

For production AOT builds, you may need to use `ngPackagr` or include the source files in your Angular project's compilation. The raw `.ts` source files are included in the published package under `src/` for this purpose.

## Theming

Apply the `@gridstorm/theme-default` stylesheet and use the `theme` and `density` inputs:

```typescript
// In your angular.json styles array:
// "node_modules/@gridstorm/theme-default/dist/index.css"

@Component({
  template: `
    <gridstorm
      [columns]="columns"
      [rowData]="rowData"
      [theme]="currentTheme"
      [density]="currentDensity"
    ></gridstorm>
  `,
})
export class ThemedGridComponent {
  currentTheme = 'dark';
  currentDensity = 'compact';

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
  }
}
```

## License

MIT
