/**
 * Vite plugin that resolves @gridstorm/* workspace packages directly to their
 * TypeScript/CSS source files. This eliminates the need to pre-build packages
 * before running `vite build` or `vite dev` in example apps.
 *
 * Works by scanning ../../packages/* for package.json files, mapping each
 * @gridstorm/* package name to its src/index.ts (or src/index.css) entry.
 */
import { Plugin } from 'vite';
import path from 'path';
import fs from 'fs';

export function gridstormResolve(): Plugin {
  // Build the alias map once at startup
  const packagesDir = path.resolve(__dirname, '..', '..', 'packages');
  const aliasMap: Record<string, string> = {};

  if (fs.existsSync(packagesDir)) {
    for (const dir of fs.readdirSync(packagesDir)) {
      const pkgJsonPath = path.join(packagesDir, dir, 'package.json');
      if (!fs.existsSync(pkgJsonPath)) continue;

      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
        if (!pkg.name || !pkg.name.startsWith('@gridstorm/')) continue;

        const tsEntry = path.join(packagesDir, dir, 'src', 'index.ts');
        const cssEntry = path.join(packagesDir, dir, 'src', 'index.css');

        if (fs.existsSync(tsEntry)) {
          aliasMap[pkg.name] = tsEntry;
        } else if (fs.existsSync(cssEntry)) {
          aliasMap[pkg.name] = cssEntry;
        }
      } catch {
        // skip invalid package.json
      }
    }
  }

  return {
    name: 'gridstorm-source-resolve',
    enforce: 'pre',
    resolveId(source) {
      // Handle exact package imports like '@gridstorm/core'
      if (aliasMap[source]) {
        return aliasMap[source];
      }
      // Handle sub-path imports like '@gridstorm/theme-default/light.css'
      if (source.startsWith('@gridstorm/')) {
        const parts = source.replace('@gridstorm/', '').split('/');
        const pkgName = `@gridstorm/${parts[0]}`;
        if (aliasMap[pkgName]) {
          const pkgDir = path.dirname(path.dirname(aliasMap[pkgName]));
          const subPath = parts.slice(1).join('/');
          // Try src/<subPath> first, then src/<subPath>.css
          const candidates = [
            path.join(pkgDir, 'src', subPath),
            path.join(pkgDir, 'src', `${subPath}.css`),
            path.join(pkgDir, subPath),
            path.join(pkgDir, `${subPath}.css`),
          ];
          for (const candidate of candidates) {
            if (fs.existsSync(candidate)) return candidate;
          }
        }
      }
      return null;
    },
  };
}
