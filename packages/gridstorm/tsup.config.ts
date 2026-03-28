import { defineConfig } from 'tsup';
import path from 'path';

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
  esbuildPlugins: [
    {
      name: 'gridstorm-workspace-resolve',
      setup(build) {
        build.onResolve({ filter: /^@gridstorm\// }, (args) => {
          const pkgName = args.path.replace('@gridstorm/', '');
          const resolved = path.resolve(__dirname, `../${pkgName}/src/index.ts`);
          return { path: resolved };
        });
      },
    },
  ],
});
