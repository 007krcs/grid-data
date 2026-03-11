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
    ],
  },
  {
    label: 'Plugins',
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
      { slug: 'plugins/grouping', title: 'Grouping' },
      { slug: 'plugins/aggregation', title: 'Aggregation' },
      { slug: 'plugins/clipboard', title: 'Clipboard' },
    ],
  },
  {
    label: 'Framework Guides',
    items: [
      { slug: 'frameworks/react', title: 'React' },
    ],
  },
  {
    label: 'Guides',
    items: [
      { slug: 'guides/migration-from-ag-grid', title: 'Migrate from AG Grid' },
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
