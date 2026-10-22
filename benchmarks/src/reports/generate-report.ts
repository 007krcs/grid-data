// ─── Report Generator ───
// Runs all benchmark suites and generates a consolidated markdown report
// at benchmarks/results/latest.md with system info and timestamp.

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import os from 'node:os';

import { runBundleSizeBenchmark, formatBundleSizeReport } from '../runners/bundle-size.js';
import { runRenderTimeBenchmark, formatRenderTimeReport } from '../runners/render-time.js';
import { runSortPerfBenchmark, formatSortPerfReport } from '../runners/sort-perf.js';
import { runFilterPerfBenchmark, formatFilterPerfReport } from '../runners/filter-perf.js';
import { runMemoryBenchmark, formatMemoryReport } from '../runners/memory.js';

export interface FullBenchmarkReport {
  timestamp: string;
  systemInfo: SystemInfo;
  markdown: string;
  /**
   * Flat, machine-readable metrics for the regression gate (`bench:check`).
   * Keys: `render.<rows>.min`, `sort.single.<rows>.min`,
   * `sort.multi.<rows>.min`, `filter.text.<rows>.min`,
   * `filter.range.<rows>.min` (ms); `memory.<rows>.heapDelta` (bytes);
   * Timing metrics gate on the MIN of the iterations: a real regression
   * shifts the whole distribution including the floor, while scheduler
   * noise on shared runners mostly inflates the upper half. The markdown
   * report still prints median/mean/p95 for humans.
   * `bundle.<package>.gzip` and `bundle.<tier>.gzip` (bytes).
   */
  metrics: Record<string, number>;
}

export interface SystemInfo {
  nodeVersion: string;
  platform: string;
  arch: string;
  osRelease: string;
  cpuModel: string;
  cpuCores: number;
  totalMemory: string;
}

/**
 * Collect system information for the report header.
 */
function getSystemInfo(): SystemInfo {
  const cpus = os.cpus();
  const totalMemGB = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(1);

  return {
    nodeVersion: process.version,
    platform: `${os.platform()} ${os.release()}`,
    arch: os.arch(),
    osRelease: os.release(),
    cpuModel: cpus[0]?.model ?? 'Unknown',
    cpuCores: cpus.length,
    totalMemory: `${totalMemGB} GB`,
  };
}

/**
 * Run all benchmarks and generate the full report.
 */
export function generateFullReport(): FullBenchmarkReport {
  const timestamp = new Date().toISOString();
  const sysInfo = getSystemInfo();

  const sections: string[] = [];
  const metrics: Record<string, number> = {};

  // Header
  sections.push('# GridStorm Benchmark Report');
  sections.push('');
  sections.push(`**Generated:** ${timestamp}`);
  sections.push('');

  // System info
  sections.push('## System Information');
  sections.push('');
  sections.push('| Property | Value |');
  sections.push('|----------|-------|');
  sections.push(`| Node.js | ${sysInfo.nodeVersion} |`);
  sections.push(`| Platform | ${sysInfo.platform} |`);
  sections.push(`| Architecture | ${sysInfo.arch} |`);
  sections.push(`| CPU | ${sysInfo.cpuModel} |`);
  sections.push(`| CPU Cores | ${sysInfo.cpuCores} |`);
  sections.push(`| Total Memory | ${sysInfo.totalMemory} |`);
  sections.push('');
  sections.push('---');
  sections.push('');

  // Run each benchmark suite
  console.log('[1/5] Running bundle size benchmark...');
  const bundleResult = runBundleSizeBenchmark();
  sections.push(formatBundleSizeReport(bundleResult));
  for (const pkg of bundleResult.packages) {
    if (pkg.gzipSize > 0) metrics[`bundle.${pkg.package.replace('@gridstorm/', '')}.gzip`] = pkg.gzipSize;
  }
  metrics['bundle.tier-core.gzip'] = bundleResult.coreOnly.gzip;
  metrics['bundle.tier-core-plus-community.gzip'] = bundleResult.corePlusCommunity.gzip;
  metrics['bundle.tier-full.gzip'] = bundleResult.fullEnterprise.gzip;
  sections.push('---');
  sections.push('');

  console.log('[2/5] Running render time benchmark...');
  const renderResults = runRenderTimeBenchmark();
  sections.push(formatRenderTimeReport(renderResults));
  for (const r of renderResults) metrics[`render.${r.rowCount}.min`] = r.result.min;
  sections.push('---');
  sections.push('');

  console.log('[3/5] Running sort performance benchmark...');
  const sortResults = runSortPerfBenchmark();
  sections.push(formatSortPerfReport(sortResults));
  for (const r of sortResults) {
    metrics[`sort.single.${r.rowCount}.min`] = r.singleColumn.min;
    metrics[`sort.multi.${r.rowCount}.min`] = r.multiColumn.min;
  }
  sections.push('---');
  sections.push('');

  console.log('[4/5] Running filter performance benchmark...');
  const filterResults = runFilterPerfBenchmark();
  sections.push(formatFilterPerfReport(filterResults));
  for (const r of filterResults) {
    metrics[`filter.text.${r.rowCount}.min`] = r.textFilter.min;
    metrics[`filter.range.${r.rowCount}.min`] = r.numberRangeFilter.min;
  }
  sections.push('---');
  sections.push('');

  console.log('[5/5] Running memory benchmark...');
  const memoryResults = runMemoryBenchmark();
  sections.push(formatMemoryReport(memoryResults));
  for (const r of memoryResults) metrics[`memory.${r.rowCount}.heapDelta`] = r.heapDelta;

  // Footer
  sections.push('---');
  sections.push('');
  sections.push('*Report generated by @gridstorm/benchmarks*');
  sections.push('');

  const markdown = sections.join('\n');

  return {
    timestamp,
    systemInfo: sysInfo,
    markdown,
    metrics,
  };
}

/**
 * Generate the report and write it to disk.
 */
export function generateAndSaveReport(): string {
  const report = generateFullReport();
  const resultsDir = resolve(import.meta.dirname, '../../results');
  mkdirSync(resultsDir, { recursive: true });
  const outputPath = resolve(resultsDir, 'latest.md');
  const jsonPath = resolve(resultsDir, 'latest.json');

  writeFileSync(outputPath, report.markdown, 'utf-8');
  writeFileSync(
    jsonPath,
    JSON.stringify(
      { timestamp: report.timestamp, systemInfo: report.systemInfo, metrics: report.metrics },
      null,
      2,
    ) + '\n',
    'utf-8',
  );
  console.log(`\nReport written to: ${outputPath}`);
  console.log(`Metrics written to: ${jsonPath}`);

  return outputPath;
}

// ── Standalone execution ──
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('generate-report.ts')) {
  generateAndSaveReport();
}
