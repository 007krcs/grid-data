import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';

// Site is the public canonical for the deployed docs. Required by
// @astrojs/sitemap (added below) and by Starlight for generating
// canonical URLs and Open Graph URLs in <head>. The docs are deployed
// under /docs/ on the marketing hub (see vercel.json route rule
// added alongside this change), so `base: '/docs'` makes every
// generated link, asset URL, and sitemap entry resolve correctly.
export default defineConfig({
  site: 'https://www.tekivex.com',
  base: (process.env.SITE_BASE || '') + '/docs',
  integrations: [
    // Generates dist/sitemap-index.xml + dist/sitemap-0.xml on `astro build`.
    // Picks up `site` and `base` above; emitted URLs are
    // https://gridstorm.tekivex.com/docs/<slug>/ with weekly changefreq.
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    }),
    starlight({
      title: 'GridStorm',
      description: 'Next-generation high-performance data grid for the web',
      social: {
        github: 'https://github.com/007krcs/grid-data',
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
          label: 'Guides',
          items: [
            { label: 'Migrate from AG Grid', slug: 'guides/migration-from-ag-grid' },
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
        {
          label: 'Blog',
          items: [
            { label: 'Plugin-First Architecture', slug: 'blog/architecture-deep-dive' },
            { label: 'GridStorm vs AG Grid', slug: 'blog/gridstorm-vs-ag-grid' },
            { label: 'CSS Variable Theming', slug: 'blog/css-variable-theming' },
          ],
        },
      ],
    }),
  ],
});
