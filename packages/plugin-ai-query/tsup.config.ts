// © 2025 GridStorm / Tekivex — All Rights Reserved
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: false,
  clean: true,
  treeshake: true,
  external: ['@gridstorm/core', '@gridstorm/ai-adapter'],
});
