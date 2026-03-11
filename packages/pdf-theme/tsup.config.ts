import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/pdf-theme.css'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
