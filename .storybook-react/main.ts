import type { StorybookConfig } from '@storybook/react-vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Sibling Storybook config that hosts the React adapter stories. The HTML
// framework Storybook in ../.storybook covers the core engine; this one
// covers everything that's specific to consuming GridStorm from React:
// the <GridStorm> component, hooks, error boundary, and React cell renderers.
//
// Run independently:
//   pnpm storybook:react              # dev server on :6007
//   pnpm build-storybook:react        # static build to storybook-static-react/

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// Same alias map as the HTML Storybook, so internal package imports route to
// live source. Kept in sync manually for now — could be hoisted to a shared
// module later if it drifts.
const packageAliases: Record<string, string> = {
  '@gridstorm/core':                            'packages/core/src/index.ts',
  '@gridstorm/dom-renderer':                    'packages/dom-renderer/src/index.ts',
  '@gridstorm/license':                         'packages/license/src/index.ts',
  '@gridstorm/i18n':                            'packages/i18n/src/index.ts',
  '@gridstorm/theme-default':                   'packages/theme-default/src/index.ts',
  '@gridstorm/react':                           'packages/react-adapter/src/index.ts',
  '@gridstorm/plugin-sorting':                  'packages/plugin-sorting/src/index.ts',
  '@gridstorm/plugin-filtering':                'packages/plugin-filtering/src/index.ts',
  '@gridstorm/plugin-selection':                'packages/plugin-selection/src/index.ts',
  '@gridstorm/plugin-editing':                  'packages/plugin-editing/src/index.ts',
  '@gridstorm/plugin-column-resize':            'packages/plugin-column-resize/src/index.ts',
  '@gridstorm/plugin-pagination':               'packages/plugin-pagination/src/index.ts',
};

const config: StorybookConfig = {
  stories: ['../packages/react-adapter/src/**/*.stories.@(ts|tsx)'],
  framework: '@storybook/react-vite',
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
    // Disable react-docgen so TS interfaces don't have to be perfectly parseable.
    reactDocgen: false,
  },
};

export default config;
