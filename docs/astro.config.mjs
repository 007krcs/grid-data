import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'GridStorm',
      description: 'Next-generation high-performance data grid for the web',
      social: {
        github: 'https://github.com/gridstorm/gridstorm',
      },
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'getting-started/introduction' },
            { label: 'Quick Start', slug: 'getting-started/quick-start' },
            { label: 'Installation', slug: 'getting-started/installation' },
          ],
        },
        {
          label: 'Core Concepts',
          items: [
            { label: 'Architecture', slug: 'core-concepts/architecture' },
            { label: 'Columns', slug: 'core-concepts/columns' },
            { label: 'Row Data', slug: 'core-concepts/row-data' },
            { label: 'Theming', slug: 'core-concepts/theming' },
            { label: 'Events & Commands', slug: 'core-concepts/events-commands' },
          ],
        },
        {
          label: 'Plugins',
          items: [
            { label: 'Plugin System', slug: 'plugins/plugin-system' },
            { label: 'Sorting', slug: 'plugins/sorting' },
            { label: 'Filtering', slug: 'plugins/filtering' },
            { label: 'Selection', slug: 'plugins/selection' },
            { label: 'Editing', slug: 'plugins/editing' },
            { label: 'Pagination', slug: 'plugins/pagination' },
            { label: 'Column Pinning', slug: 'plugins/column-pinning' },
            { label: 'Column Resize', slug: 'plugins/column-resize' },
            { label: 'Column Reorder', slug: 'plugins/column-reorder' },
            { label: 'Context Menu', slug: 'plugins/context-menu' },
            { label: 'Grouping', slug: 'plugins/grouping' },
            { label: 'Aggregation', slug: 'plugins/aggregation' },
            { label: 'Clipboard', slug: 'plugins/clipboard' },
          ],
        },
        {
          label: 'Framework Guides',
          items: [
            { label: 'React', slug: 'frameworks/react' },
          ],
        },
        {
          label: 'API Reference',
          items: [
            { label: 'GridConfig', slug: 'api/grid-config' },
            { label: 'GridApi', slug: 'api/grid-api' },
            { label: 'Column Definitions', slug: 'api/column-definitions' },
            { label: 'Row Nodes', slug: 'api/row-nodes' },
          ],
        },
      ],
    }),
  ],
});
