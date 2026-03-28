export interface DocEntry {
  slug: string;
  title: string;
}

export interface DocSection {
  label: string;
  items: DocEntry[];
}

export const DOC_SECTIONS: DocSection[] = [
  {
    label: 'Getting Started',
    items: [
      { slug: 'getting-started/introduction', title: 'Introduction' },
      { slug: 'getting-started/quick-start', title: 'Quick Start' },
      { slug: 'getting-started/installation', title: 'Installation' },
    ],
  },
  {
    label: 'Core Concepts',
    items: [
      { slug: 'core-concepts/architecture', title: 'Architecture' },
      { slug: 'core-concepts/columns', title: 'Columns' },
      { slug: 'core-concepts/row-data', title: 'Row Data' },
      { slug: 'core-concepts/theming', title: 'Theming' },
      { slug: 'core-concepts/events-commands', title: 'Events & Commands' },
      { slug: 'core-concepts/store', title: 'Store' },
      { slug: 'core-concepts/dom-renderer', title: 'DOM Renderer' },
      { slug: 'core-concepts/plugin-system', title: 'Plugin System (Deep Dive)' },
    ],
  },
  {
    label: 'Plugins — Core',
    items: [
      { slug: 'plugins/plugin-system', title: 'Plugin System' },
      { slug: 'plugins/sorting', title: 'Sorting' },
      { slug: 'plugins/filtering', title: 'Filtering' },
      { slug: 'plugins/selection', title: 'Selection' },
      { slug: 'plugins/editing', title: 'Editing' },
      { slug: 'plugins/pagination', title: 'Pagination' },
      { slug: 'plugins/column-pinning', title: 'Column Pinning' },
      { slug: 'plugins/column-resize', title: 'Column Resize' },
      { slug: 'plugins/column-reorder', title: 'Column Reorder' },
      { slug: 'plugins/context-menu', title: 'Context Menu' },
      { slug: 'plugins/clipboard', title: 'Clipboard' },
    ],
  },
  {
    label: 'Plugins — Enterprise',
    items: [
      { slug: 'plugins/grouping', title: 'Grouping' },
      { slug: 'plugins/aggregation', title: 'Aggregation' },
      { slug: 'plugins/pivoting', title: 'Pivoting' },
      { slug: 'plugins/master-detail', title: 'Master Detail' },
      { slug: 'plugins/tree-data', title: 'Tree Data' },
      { slug: 'plugins/row-reorder', title: 'Row Reorder' },
      { slug: 'plugins/excel-export', title: 'Excel Export' },
      { slug: 'plugins/pdf-export', title: 'PDF Export' },
      { slug: 'plugins/sparklines', title: 'Sparklines' },
      { slug: 'plugins/charts', title: 'Charts' },
      { slug: 'plugins/ssrm', title: 'Server-Side Row Model' },
    ],
  },
  {
    label: 'Plugins — Next-Gen',
    items: [
      { slug: 'plugins/status-bar', title: 'Status Bar' },
      { slug: 'plugins/state-persistence', title: 'State Persistence' },
      { slug: 'plugins/column-autosize', title: 'Column AutoSize' },
      { slug: 'plugins/row-pinning', title: 'Row Pinning' },
      { slug: 'plugins/conditional-formatting', title: 'Conditional Formatting' },
      { slug: 'plugins/streaming', title: 'Streaming / Live Data' },
      { slug: 'plugins/ai', title: 'AI Integration' },
    ],
  },
  {
    label: 'Plugins — Differentiators',
    items: [
      { slug: 'plugins/formula', title: 'Formula Engine' },
      { slug: 'plugins/time-travel', title: 'Time Travel' },
      { slug: 'plugins/cell-range', title: 'Cell Range Selection' },
      { slug: 'plugins/validation', title: 'Data Validation' },
    ],
  },
  {
    label: 'Plugins — Enterprise Tier',
    items: [
      { slug: 'plugins/a11y', title: 'Accessibility (WCAG 2.1 AA)' },
      { slug: 'plugins/formula-engine', title: 'Formula Engine Pro (42 functions)' },
      { slug: 'plugins/clipboard-pro', title: 'Clipboard Pro (Excel-Compatible)' },
    ],
  },
  {
    label: 'Framework Guides',
    items: [
      { slug: 'frameworks/react', title: 'React' },
      { slug: 'frameworks/vue', title: 'Vue' },
      { slug: 'frameworks/svelte', title: 'Svelte' },
      { slug: 'frameworks/vanilla', title: 'Vanilla JS' },
      { slug: 'frameworks/angular', title: 'Angular' },
    ],
  },
  {
    label: 'Guides',
    items: [
      { slug: 'guides/migration-from-ag-grid', title: 'Migrate from AG Grid' },
      { slug: 'guides/mcp-server', title: 'MCP Server (AI Integration)' },
      { slug: 'guides/pdf-toolkit', title: 'PDF Toolkit' },
      { slug: 'guides/integration-guide', title: 'Integration Guide' },
      { slug: 'guides/custom-plugins', title: 'Custom Plugins' },
      { slug: 'guides/performance', title: 'Performance' },
      { slug: 'guides/accessibility', title: 'Accessibility' },
    ],
  },
  {
    label: 'API Reference',
    items: [
      { slug: 'api/grid-config', title: 'GridConfig' },
      { slug: 'api/grid-api', title: 'GridApi' },
      { slug: 'api/column-definitions', title: 'Column Definitions' },
      { slug: 'api/row-nodes', title: 'Row Nodes' },
    ],
  },
  {
    label: 'Blog',
    items: [
      { slug: 'blog/architecture-deep-dive', title: 'Plugin-First Architecture' },
      { slug: 'blog/gridstorm-vs-ag-grid', title: 'GridStorm vs AG Grid' },
      { slug: 'blog/css-variable-theming', title: 'CSS Variable Theming' },
    ],
  },
];
