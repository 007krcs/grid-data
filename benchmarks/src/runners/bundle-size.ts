// ─── Bundle Size Benchmark ───
// Measures raw and gzip-compressed sizes of all GridStorm packages.
// Reports per-package sizes plus aggregated totals for core-only,
// core+community, and full enterprise bundles.

import { readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { formatBytes } from '../utils/timer.js';

export interface BundleSizeEntry {
  package: string;
  rawSize: number;
  gzipSize: number;
  rawFormatted: string;
  gzipFormatted: string;
}

export interface BundleSizeResult {
  packages: BundleSizeEntry[];
  coreOnly: { raw: number; gzip: number };
  corePlusCommunity: { raw: number; gzip: number };
  fullEnterprise: { raw: number; gzip: number };
}

// All GridStorm packages in order
const PACKAGES = [
  // Core
  { name: '@gridstorm/core', dir: 'core', tier: 'core' as const },
  { name: '@gridstorm/dom-renderer', dir: 'dom-renderer', tier: 'core' as const },
  { name: '@gridstorm/react', dir: 'react-adapter', tier: 'core' as const },
  { name: '@gridstorm/theme-default', dir: 'theme-default', tier: 'core' as const },

  // Community plugins
  { name: '@gridstorm/plugin-sorting', dir: 'plugin-sorting', tier: 'community' as const },
  { name: '@gridstorm/plugin-filtering', dir: 'plugin-filtering', tier: 'community' as const },
  { name: '@gridstorm/plugin-selection', dir: 'plugin-selection', tier: 'community' as const },
  { name: '@gridstorm/plugin-editing', dir: 'plugin-editing', tier: 'community' as const },
  { name: '@gridstorm/plugin-pagination', dir: 'plugin-pagination', tier: 'community' as const },
  { name: '@gridstorm/plugin-column-resize', dir: 'plugin-column-resize', tier: 'community' as const },
  { name: '@gridstorm/plugin-column-reorder', dir: 'plugin-column-reorder', tier: 'community' as const },
  { name: '@gridstorm/plugin-column-pinning', dir: 'plugin-column-pinning', tier: 'community' as const },
  { name: '@gridstorm/plugin-clipboard', dir: 'plugin-clipboard', tier: 'community' as const },
  { name: '@gridstorm/plugin-context-menu', dir: 'plugin-context-menu', tier: 'community' as const },

  // Enterprise plugins
  { name: '@gridstorm/plugin-grouping', dir: 'plugin-grouping', tier: 'enterprise' as const },
  { name: '@gridstorm/plugin-aggregation', dir: 'plugin-aggregation', tier: 'enterprise' as const },
  { name: '@gridstorm/plugin-pivoting', dir: 'plugin-pivoting', tier: 'enterprise' as const },
];

/**
 * Measure the raw and gzip sizes of a package's ESM dist bundle.
 */
function measurePackage(packagesRoot: string, dir: string): { raw: number; gzip: number } | null {
  const distDir = join(packagesRoot, dir, 'dist');

  // Try ESM first, then CJS
  const esmPath = join(distDir, 'index.js');
  const cjsPath = join(distDir, 'index.cjs');

  let filePath: string;
  if (existsSync(esmPath)) {
    filePath = esmPath;
  } else if (existsSync(cjsPath)) {
    filePath = cjsPath;
  } else {
    return null;
  }

  const content = readFileSync(filePath);
  const gzipped = gzipSync(content, { level: 9 });

  return {
    raw: content.byteLength,
    gzip: gzipped.byteLength,
  };
}

/**
 * Run the bundle size benchmark across all packages.
 */
export function runBundleSizeBenchmark(): BundleSizeResult {
  const packagesRoot = resolve(import.meta.dirname, '../../../packages');

  const entries: BundleSizeEntry[] = [];
  let coreRaw = 0, coreGzip = 0;
  let communityRaw = 0, communityGzip = 0;
  let enterpriseRaw = 0, enterpriseGzip = 0;

  for (const pkg of PACKAGES) {
    const sizes = measurePackage(packagesRoot, pkg.dir);

    if (sizes === null) {
      entries.push({
        package: pkg.name,
        rawSize: 0,
        gzipSize: 0,
        rawFormatted: 'N/A (no dist)',
        gzipFormatted: 'N/A (no dist)',
      });
      continue;
    }

    entries.push({
      package: pkg.name,
      rawSize: sizes.raw,
      gzipSize: sizes.gzip,
      rawFormatted: formatBytes(sizes.raw),
      gzipFormatted: formatBytes(sizes.gzip),
    });

    if (pkg.tier === 'core') {
      coreRaw += sizes.raw;
      coreGzip += sizes.gzip;
    } else if (pkg.tier === 'community') {
      communityRaw += sizes.raw;
      communityGzip += sizes.gzip;
    } else {
      enterpriseRaw += sizes.raw;
      enterpriseGzip += sizes.gzip;
    }
  }

  return {
    packages: entries,
    coreOnly: { raw: coreRaw, gzip: coreGzip },
    corePlusCommunity: {
      raw: coreRaw + communityRaw,
      gzip: coreGzip + communityGzip,
    },
    fullEnterprise: {
      raw: coreRaw + communityRaw + enterpriseRaw,
      gzip: coreGzip + communityGzip + enterpriseGzip,
    },
  };
}

/**
 * Format bundle size results as a markdown report.
 */
export function formatBundleSizeReport(result: BundleSizeResult): string {
  const lines: string[] = [];

  lines.push('## Bundle Size Analysis');
  lines.push('');
  lines.push('| Package | Raw Size | Gzip Size |');
  lines.push('|---------|----------|-----------|');

  for (const entry of result.packages) {
    lines.push(`| ${entry.package} | ${entry.rawFormatted} | ${entry.gzipFormatted} |`);
  }

  lines.push('');
  lines.push('### Aggregate Totals');
  lines.push('');
  lines.push('| Bundle | Raw Size | Gzip Size |');
  lines.push('|--------|----------|-----------|');
  lines.push(`| Core only | ${formatBytes(result.coreOnly.raw)} | ${formatBytes(result.coreOnly.gzip)} |`);
  lines.push(`| Core + Community | ${formatBytes(result.corePlusCommunity.raw)} | ${formatBytes(result.corePlusCommunity.gzip)} |`);
  lines.push(`| Full Enterprise | ${formatBytes(result.fullEnterprise.raw)} | ${formatBytes(result.fullEnterprise.gzip)} |`);
  lines.push('');

  return lines.join('\n');
}

// ── Standalone execution ──
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('bundle-size.ts')) {
  console.log('Running bundle size benchmark...\n');
  const result = runBundleSizeBenchmark();
  console.log(formatBundleSizeReport(result));
}
