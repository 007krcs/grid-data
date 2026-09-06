import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { gridstormResolve } from '../shared/gridstorm-resolve';
import path from 'path';

export default defineConfig({
  plugins: [gridstormResolve(), react()],
  base: (process.env.SITE_BASE || '') + '/',
  resolve: {
    alias: {
      '@docs': path.resolve(__dirname, '../../docs/src/content/docs'),
    },
  },
  build: {
    assetsDir: 'hub-assets',
    // Ship source maps so production JS is debuggable (Lighthouse: valid-source-maps)
    sourcemap: true,
  },
});
