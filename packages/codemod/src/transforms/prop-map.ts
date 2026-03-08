// ─── AG Grid → GridStorm Prop Map ───
// Maps AG Grid component prop names to their GridStorm equivalents.

/**
 * Maps AG Grid <AgGridReact> prop names to GridStorm <GridStorm> prop names.
 * Only includes props that differ between the two libraries.
 * Props not listed here are assumed to be the same in both.
 */
export const PROP_MAP: Record<string, string> = {
  // Core prop renames
  'columnDefs': 'columns',
  'modules': 'plugins',

  // These are the same but listed for completeness / documentation
  // 'rowData': 'rowData',
  // 'defaultColDef': 'defaultColDef',
  // 'getRowId': 'getRowId',
  // 'onGridReady': 'onGridReady',
  // 'rowHeight': 'rowHeight',
  // 'headerHeight': 'headerHeight',
  // 'rowSelection': 'rowSelection',
  // 'pagination': 'pagination',
  // 'paginationPageSize': 'paginationPageSize',
  // 'animateRows': 'animateRows',
};

/**
 * Maps AG Grid column definition property names to GridStorm equivalents.
 * Only includes properties that differ between the two.
 */
export const COLUMN_PROP_MAP: Record<string, string> = {
  'filter': 'filterable',
  'headerComponent': 'headerRenderer',
  'headerComponentFramework': 'headerRenderer',
  'cellRendererFramework': 'cellRenderer',
  'cellEditorFramework': 'cellEditor',
  'filterFramework': 'filter',
  'floatingFilterComponent': 'floatingFilter',
  'floatingFilterComponentFramework': 'floatingFilter',
  'tooltipComponent': 'tooltip',
  'tooltipComponentFramework': 'tooltip',
};

/**
 * Maps AG Grid CSS theme class names to GridStorm data-theme attribute values.
 */
export const THEME_CLASS_MAP: Record<string, string> = {
  'ag-theme-alpine': 'light',
  'ag-theme-alpine-dark': 'dark',
  'ag-theme-alpine-auto-dark': 'dark',
  'ag-theme-balham': 'light',
  'ag-theme-balham-dark': 'dark',
  'ag-theme-balham-auto-dark': 'dark',
  'ag-theme-material': 'light',
  'ag-theme-material-dark': 'dark',
  'ag-theme-quartz': 'light',
  'ag-theme-quartz-dark': 'dark',
  'ag-theme-quartz-auto-dark': 'dark',
};

/**
 * Maps AG Grid module names to GridStorm plugin names.
 * Value is null if the module is built into GridStorm core and needs no plugin.
 * Value is a string with the plugin import details if a plugin is needed.
 */
export const MODULE_TO_PLUGIN_MAP: Record<string, { plugin: string | null; package: string | null; note: string }> = {
  'ClientSideRowModelModule': {
    plugin: null,
    package: null,
    note: 'Built into @gridstorm/core — remove this module',
  },
  'InfiniteRowModelModule': {
    plugin: null,
    package: null,
    note: 'Coming soon in GridStorm — not yet available',
  },
  'CsvExportModule': {
    plugin: null,
    package: null,
    note: 'Coming soon in GridStorm — not yet available',
  },
  'RowGroupingModule': {
    plugin: 'GroupingPlugin',
    package: '@gridstorm/plugin-grouping',
    note: 'Free in GridStorm (no enterprise license needed)',
  },
  'RangeSelectionModule': {
    plugin: 'SelectionPlugin',
    package: '@gridstorm/plugin-selection',
    note: 'Provides row and range selection',
  },
  'ClipboardModule': {
    plugin: 'ClipboardPlugin',
    package: '@gridstorm/plugin-clipboard',
    note: 'Copy/paste support',
  },
  'RichSelectModule': {
    plugin: 'EditingPlugin',
    package: '@gridstorm/plugin-editing',
    note: 'Cell editing with rich editors',
  },
  'SetFilterModule': {
    plugin: 'FilteringPlugin',
    package: '@gridstorm/plugin-filtering',
    note: 'Includes set filter and other filter types',
  },
  'MultiFilterModule': {
    plugin: 'FilteringPlugin',
    package: '@gridstorm/plugin-filtering',
    note: 'Multi-filter is part of FilteringPlugin',
  },
  'MenuModule': {
    plugin: 'ContextMenuPlugin',
    package: '@gridstorm/plugin-context-menu',
    note: 'Context menu support',
  },
  'ColumnsToolPanelModule': {
    plugin: null,
    package: null,
    note: 'Coming soon in GridStorm — not yet available',
  },
  'FiltersToolPanelModule': {
    plugin: 'FilteringPlugin',
    package: '@gridstorm/plugin-filtering',
    note: 'Filter panel is part of FilteringPlugin',
  },
  'SideBarModule': {
    plugin: null,
    package: null,
    note: 'Coming soon in GridStorm — not yet available',
  },
  'StatusBarModule': {
    plugin: null,
    package: null,
    note: 'Coming soon in GridStorm — not yet available',
  },
  'MasterDetailModule': {
    plugin: null,
    package: null,
    note: 'Coming soon in GridStorm — not yet available',
  },
  'ExcelExportModule': {
    plugin: null,
    package: null,
    note: 'Coming soon in GridStorm — not yet available',
  },
  'ServerSideRowModelModule': {
    plugin: null,
    package: null,
    note: 'Coming soon in GridStorm — not yet available',
  },
  'ViewportRowModelModule': {
    plugin: null,
    package: null,
    note: 'Coming soon in GridStorm — not yet available',
  },
  'SparklinesModule': {
    plugin: null,
    package: null,
    note: 'Coming soon in GridStorm — not yet available',
  },
  'GridChartsModule': {
    plugin: null,
    package: null,
    note: 'Coming soon in GridStorm — not yet available',
  },
  'AllCommunityModules': {
    plugin: null,
    package: null,
    note: 'Install individual @gridstorm/plugin-* packages instead',
  },
  'AllEnterpriseModules': {
    plugin: null,
    package: null,
    note: 'Install individual @gridstorm/plugin-* packages instead',
  },
};

/**
 * Maps AG Grid event names (used with gridApi.addEventListener) to GridStorm event bus names.
 */
export const EVENT_NAME_MAP: Record<string, string> = {
  'sortChanged': 'column:sort:changed',
  'filterChanged': 'filter:changed',
  'selectionChanged': 'selection:changed',
  'rowDataChanged': 'rowData:changed',
  'cellValueChanged': 'cell:valueChanged',
  'cellClicked': 'cell:clicked',
  'cellDoubleClicked': 'cell:doubleClicked',
  'rowClicked': 'row:clicked',
  'cellEditingStarted': 'cell:editingStarted',
  'cellEditingStopped': 'cell:editingStopped',
  'paginationChanged': 'pagination:changed',
  'columnResized': 'column:resized',
  'gridReady': 'grid:ready',
};
