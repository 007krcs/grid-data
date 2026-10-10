// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: false,
    clean: true,
    treeshake: true,
    external: ['@gridstorm/core', '@gridstorm/pdf-core'],
  },
  {
    // Standalone stdio server: `npx @gridstorm/mcp-server` / `gridstorm-mcp`.
    entry: ['src/cli.ts'],
    format: ['esm'],
    dts: false,
    sourcemap: false,
    platform: 'node',
    banner: { js: '#!/usr/bin/env node' },
    external: ['@gridstorm/core', '@gridstorm/pdf-core'],
  },
]);
