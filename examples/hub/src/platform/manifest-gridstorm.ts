import type { ProductManifest } from '../platform/types';

export const gridstormManifest: ProductManifest = {
  id: 'gridstorm',
  name: 'GridStorm',
  tagline: 'Enterprise Data Grid — 35 composable plugins',
  description:
    'Headless data grid engine with virtual scrolling, WCAG 2.1 AA accessibility, ' +
    '42 Excel-compatible formula functions, Excel copy/paste, and a full plugin ' +
    'ecosystem. MIT-licensed. No per-dev license fees.',
  version: '0.1.2',
  status: 'ga',
  tier: 'open-source',
  color: '#3b82f6',
  accentColor: 'rgba(59, 130, 246, 0.1)',
  iconName: 'grid',
  homePath: '/product/gridstorm',
  docsRoot: '/docs/',
  primaryDemoPath: '/feature-showcase/',
  stats: [
    { value: '57',     label: 'Packages' },
    { value: '35',     label: 'Plugins' },
    { value: '100K+',  label: 'Rows @ 60fps' },
    { value: '<50KB',  label: 'Core bundle' },
  ],
  keyFeatures: [
    'Virtual scrolling — 100K+ rows at 60fps',
    'WCAG 2.1 AA accessibility (plugin-a11y)',
    '42 Excel-compatible formula functions',
    'Excel copy/paste with type coercion',
    'Headless + framework-agnostic (React, Vue, Svelte, Angular)',
    '1,899+ tests across 90 test suites',
  ],
  quickLinks: [
    { label: 'Get Started',       path: '/docs/getting-started/introduction' },
    { label: 'Feature Showcase',  path: '/feature-showcase/', external: true },
    { label: 'Plugin Reference',  path: '/docs/plugins/plugin-system' },
    { label: 'Migration from AG Grid', path: '/docs/guides/migration-from-ag-grid' },
    { label: 'Playground',        path: '/playground/', external: true, isNew: true },
  ],
  tags: ['MIT', 'TypeScript', 'React', 'Vue', 'Svelte', 'Virtual Scroll', 'WCAG 2.1 AA'],
};
