import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    plugins: 'src/plugins.ts',
    pdf: 'src/pdf.ts',
    react: 'src/react.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  clean: true,
  external: [
    'react',
    'react-dom',
  ],
});
