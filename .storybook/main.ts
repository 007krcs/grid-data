import type { StorybookConfig } from '@storybook/html-vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Storybook 10 loads this config as ESM, so __dirname is not defined.
// Resolve the directory from import.meta.url instead.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// Every internal package gets aliased to its `src/index.ts`. Storybook stories
// import via `@gridstorm/<pkg>` exactly like real consumer code, but Vite
// resolves through these aliases to the live source so there's no rebuild
// step between editing a plugin and seeing it in a story.
const packageAliases: Record<string, string> = {
  '@gridstorm/core':                            'packages/core/src/index.ts',
  '@gridstorm/dom-renderer':                    'packages/dom-renderer/src/index.ts',
  '@gridstorm/license':                         'packages/license/src/index.ts',
  '@gridstorm/i18n':                            'packages/i18n/src/index.ts',
  '@gridstorm/theme-default':                   'packages/theme-default/src/index.ts',
  '@gridstorm/react':                           'packages/react-adapter/src/index.ts',
  '@gridstorm/vue':                             'packages/vue-adapter/src/index.ts',
  '@gridstorm/svelte':                          'packages/svelte-adapter/src/index.ts',
  '@gridstorm/angular':                         'packages/angular-adapter/src/index.ts',
  '@gridstorm/plugin-sorting':                  'packages/plugin-sorting/src/index.ts',
  '@gridstorm/plugin-filtering':                'packages/plugin-filtering/src/index.ts',
  '@gridstorm/plugin-selection':                'packages/plugin-selection/src/index.ts',
  '@gridstorm/plugin-editing':                  'packages/plugin-editing/src/index.ts',
  '@gridstorm/plugin-pagination':               'packages/plugin-pagination/src/index.ts',
  '@gridstorm/plugin-grouping':                 'packages/plugin-grouping/src/index.ts',
  '@gridstorm/plugin-aggregation':              'packages/plugin-aggregation/src/index.ts',
  '@gridstorm/plugin-column-resize':            'packages/plugin-column-resize/src/index.ts',
  '@gridstorm/plugin-column-pinning':           'packages/plugin-column-pinning/src/index.ts',
  '@gridstorm/plugin-column-reorder':           'packages/plugin-column-reorder/src/index.ts',
  '@gridstorm/plugin-column-autosize':          'packages/plugin-column-autosize/src/index.ts',
  '@gridstorm/plugin-context-menu':             'packages/plugin-context-menu/src/index.ts',
  '@gridstorm/plugin-clipboard':                'packages/plugin-clipboard/src/index.ts',
  '@gridstorm/plugin-conditional-formatting':   'packages/plugin-conditional-formatting/src/index.ts',
  '@gridstorm/plugin-sparklines':               'packages/plugin-sparklines/src/index.ts',
  '@gridstorm/plugin-charts':                   'packages/plugin-charts/src/index.ts',
  '@gridstorm/plugin-status-bar':               'packages/plugin-status-bar/src/index.ts',
  '@gridstorm/plugin-ssrm':                     'packages/plugin-ssrm/src/index.ts',
  '@gridstorm/plugin-master-detail':            'packages/plugin-master-detail/src/index.ts',
  '@gridstorm/plugin-cell-range':               'packages/plugin-cell-range/src/index.ts',
  '@gridstorm/plugin-time-travel':              'packages/plugin-time-travel/src/index.ts',
  '@gridstorm/plugin-streaming':                'packages/plugin-streaming/src/index.ts',
  '@gridstorm/plugin-validation':               'packages/plugin-validation/src/index.ts',
  '@gridstorm/plugin-excel-export':             'packages/plugin-excel-export/src/index.ts',
  '@gridstorm/plugin-pdf-export':               'packages/plugin-pdf-export/src/index.ts',
  '@gridstorm/plugin-ai':                       'packages/plugin-ai/src/index.ts',
  '@gridstorm/plugin-tree-data':                'packages/plugin-tree-data/src/index.ts',
  '@gridstorm/plugin-pivoting':                 'packages/plugin-pivoting/src/index.ts',
  '@gridstorm/plugin-formula':                  'packages/plugin-formula/src/index.ts',
  '@gridstorm/plugin-row-reorder':              'packages/plugin-row-reorder/src/index.ts',
  '@gridstorm/plugin-row-pinning':              'packages/plugin-row-pinning/src/index.ts',
  '@gridstorm/plugin-state-persistence':        'packages/plugin-state-persistence/src/index.ts',
  '@gridstorm/plugin-cell-formula':             'packages/plugin-cell-formula/src/index.ts',
  '@gridstorm/plugin-computed-columns':         'packages/plugin-cell-formula/src/index.ts',
  '@gridstorm/codemod':                         'packages/codemod/src/index.ts',
  '@gridstorm/mcp-server':                      'packages/mcp-server/src/index.ts',
  'gridstorm':                                  'packages/gridstorm/src/index.ts',
};

const config: StorybookConfig = {
  stories: ['../packages/*/src/**/*.stories.@(ts|tsx)'],
  framework: '@storybook/html-vite',
  // addon-docs gives us the Controls panel and the autodocs description blocks.
  // (We don't use MDX directly because mdx-react-shim needs React, which the
  // html-vite framework doesn't ship.)
  addons: ['@storybook/addon-docs'],
  viteFinal: async (viteConfig) => {
    viteConfig.resolve = viteConfig.resolve ?? {};
    const existingAlias = (viteConfig.resolve.alias ?? {}) as Record<string, string>;
    const resolved: Record<string, string> = { ...existingAlias };
    for (const [key, rel] of Object.entries(packageAliases)) {
      resolved[key] = path.resolve(repoRoot, rel);
    }
    viteConfig.resolve.alias = resolved;
    return viteConfig;
  },
  typescript: {
    check: false,
  },
};

export default config;
