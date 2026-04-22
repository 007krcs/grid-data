// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── AG Grid → GridStorm Import Map ───
// Maps AG Grid package imports to their GridStorm equivalents.

/**
 * Maps AG Grid package names to GridStorm package names.
 * Used to rewrite import declarations.
 */
export const PACKAGE_MAP: Record<string, string> = {
  // AG Grid community packages
  'ag-grid-react': '@gridstorm/react',
  'ag-grid-community': '@gridstorm/core',
  'ag-grid-enterprise': '@gridstorm/core',

  // AG Grid scoped packages
  '@ag-grid-community/react': '@gridstorm/react',
  '@ag-grid-community/core': '@gridstorm/core',
  '@ag-grid-community/client-side-row-model': '@gridstorm/core',
  '@ag-grid-community/csv-export': '@gridstorm/core',
  '@ag-grid-community/infinite-row-model': '@gridstorm/core',
  '@ag-grid-community/styles': '@gridstorm/theme-default',

  // AG Grid enterprise scoped packages
  '@ag-grid-enterprise/all-modules': '@gridstorm/core',
  '@ag-grid-enterprise/core': '@gridstorm/core',
  '@ag-grid-enterprise/row-grouping': '@gridstorm/plugin-grouping',
  '@ag-grid-enterprise/range-selection': '@gridstorm/plugin-selection',
  '@ag-grid-enterprise/clipboard': '@gridstorm/plugin-clipboard',
  '@ag-grid-enterprise/rich-select': '@gridstorm/plugin-editing',
  '@ag-grid-enterprise/side-bar': '@gridstorm/core',
  '@ag-grid-enterprise/status-bar': '@gridstorm/core',
  '@ag-grid-enterprise/master-detail': '@gridstorm/core',
  '@ag-grid-enterprise/excel-export': '@gridstorm/core',
  '@ag-grid-enterprise/charts': '@gridstorm/core',
  '@ag-grid-enterprise/set-filter': '@gridstorm/plugin-filtering',
  '@ag-grid-enterprise/multi-filter': '@gridstorm/plugin-filtering',
  '@ag-grid-enterprise/column-tool-panel': '@gridstorm/core',
  '@ag-grid-enterprise/filter-tool-panel': '@gridstorm/plugin-filtering',
  '@ag-grid-enterprise/menu': '@gridstorm/plugin-context-menu',
  '@ag-grid-enterprise/server-side-row-model': '@gridstorm/core',
  '@ag-grid-enterprise/viewport-row-model': '@gridstorm/core',
};

/**
 * Maps AG Grid named exports to GridStorm named exports.
 * Used to rewrite import specifiers.
 */
export const NAMED_EXPORT_MAP: Record<string, { name: string; from: string }> = {
  // Component renames
  'AgGridReact': { name: 'GridStorm', from: '@gridstorm/react' },
  'AgGridColumn': { name: 'GridStorm', from: '@gridstorm/react' },

  // Type renames — core types
  'ColDef': { name: 'ColumnDef', from: '@gridstorm/core' },
  'ColGroupDef': { name: 'ColumnDef', from: '@gridstorm/core' },
  'GridApi': { name: 'GridApi', from: '@gridstorm/core' },
  'ColumnApi': { name: 'GridApi', from: '@gridstorm/core' },
  'GridReadyEvent': { name: 'GridReadyEvent', from: '@gridstorm/core' },
  'GridOptions': { name: 'GridConfig', from: '@gridstorm/core' },
  'ICellRendererParams': { name: 'CellRendererProps', from: '@gridstorm/core' },
  'ICellRendererComp': { name: 'CellRendererFn', from: '@gridstorm/core' },
  'ICellEditorParams': { name: 'CellEditorParams', from: '@gridstorm/core' },
  'ValueGetterParams': { name: 'ValueGetterParams', from: '@gridstorm/core' },
  'ValueSetterParams': { name: 'ValueSetterParams', from: '@gridstorm/core' },
  'ValueFormatterParams': { name: 'ValueFormatterParams', from: '@gridstorm/core' },
  'ValueParserParams': { name: 'ValueParserParams', from: '@gridstorm/core' },
  'SortDirection': { name: 'SortDirection', from: '@gridstorm/core' },
  'RowNode': { name: 'RowNode', from: '@gridstorm/core' },
  'IRowNode': { name: 'RowNode', from: '@gridstorm/core' },
  'Column': { name: 'ColumnState', from: '@gridstorm/core' },

  // Selection types
  'SelectionChangedEvent': { name: 'SelectionState', from: '@gridstorm/core' },
  'RowSelectedEvent': { name: 'SelectionState', from: '@gridstorm/core' },

  // Filter types
  'IFilterParams': { name: 'FilterModel', from: '@gridstorm/core' },
  'FilterModel': { name: 'FilterModel', from: '@gridstorm/core' },

  // Sort types
  'SortModelItem': { name: 'SortModelItem', from: '@gridstorm/core' },

  // Module to Plugin renames (these are value imports, not just types)
  'ClientSideRowModelModule': { name: '/* ClientSideRowModelModule is built into GridStorm core */', from: '@gridstorm/core' },
  'AllCommunityModules': { name: '/* AllCommunityModules — install individual @gridstorm plugins instead */', from: '@gridstorm/core' },
  'ModuleRegistry': { name: '/* ModuleRegistry — GridStorm uses plugins prop, not module registry */', from: '@gridstorm/core' },
};

/**
 * AG Grid CSS import paths to remove (they are replaced by GridStorm theme imports).
 */
export const CSS_IMPORTS_TO_REMOVE: string[] = [
  'ag-grid-community/styles/ag-grid.css',
  'ag-grid-community/styles/ag-theme-alpine.css',
  'ag-grid-community/styles/ag-theme-alpine-dark.css',
  'ag-grid-community/styles/ag-theme-balham.css',
  'ag-grid-community/styles/ag-theme-balham-dark.css',
  'ag-grid-community/styles/ag-theme-material.css',
  'ag-grid-community/dist/styles/ag-grid.css',
  'ag-grid-community/dist/styles/ag-theme-alpine.css',
  'ag-grid-community/dist/styles/ag-theme-balham.css',
  'ag-grid-community/dist/styles/ag-theme-material.css',
  '@ag-grid-community/styles/ag-grid.css',
  '@ag-grid-community/styles/ag-theme-alpine.css',
  '@ag-grid-community/styles/ag-theme-balham.css',
  '@ag-grid-community/styles/ag-theme-material.css',
  '@ag-grid-community/core/dist/styles/ag-grid.css',
  '@ag-grid-community/core/dist/styles/ag-theme-alpine.css',
  '@ag-grid-community/core/dist/styles/ag-theme-balham.css',
  '@ag-grid-community/core/dist/styles/ag-theme-material.css',
];

/**
 * Replacement CSS import to add when AG Grid CSS is removed.
 */
export const GRIDSTORM_THEME_IMPORT = '@gridstorm/theme-default/dist/tokens.css';
