// ─── Render Time Benchmark ───
// Measures the time to create a GridStorm engine instance with data.
// This covers column resolution, row node creation, initial sort/filter
// processing, and plugin installation.

import { createGrid } from '@gridstorm/core';
import type { ColumnDef } from '@gridstorm/core';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import { SelectionPlugin } from '@gridstorm/plugin-selection';
import { generateRows, ROW_COUNTS, formatNumber, type BenchRow } from '../fixtures/data-generators.js';
import { benchmark, formatMs, type BenchmarkResult } from '../utils/timer.js';

export interface RenderTimeResult {
  rowCount: number;
  result: BenchmarkResult;
}

/**
 * Column definitions for the benchmark grid.
 */
const COLUMNS: ColumnDef<BenchRow>[] = [
  { field: 'id', headerName: 'ID', width: 80, sortable: true },
  { field: 'name', headerName: 'Name', width: 180, sortable: true, filterable: true },
  { field: 'email', headerName: 'Email', width: 220, sortable: true },
  { field: 'department', headerName: 'Department', width: 140, sortable: true, filterable: true },
  { field: 'salary', headerName: 'Salary', width: 120, sortable: true, filterable: true },
  { field: 'age', headerName: 'Age', width: 80, sortable: true, filterable: true },
  { field: 'city', headerName: 'City', width: 140, sortable: true },
  { field: 'country', headerName: 'Country', width: 140, sortable: true },
  { field: 'joinDate', headerName: 'Join Date', width: 120, sortable: true },
  { field: 'active', headerName: 'Active', width: 80, sortable: true },
];

/**
 * Run the render time benchmark for all row counts.
 */
export function runRenderTimeBenchmark(): RenderTimeResult[] {
  const results: RenderTimeResult[] = [];

  for (const count of ROW_COUNTS) {
    // Pre-generate data outside the timed section
    const data = generateRows(count);

    const result = benchmark(() => {
      const engine = createGrid<BenchRow>({
        columns: COLUMNS,
        rowData: data,
        plugins: [
          SortingPlugin(),
          FilteringPlugin(),
          SelectionPlugin(),
        ],
      });

      // Clean up
      engine.destroy();
    });

    results.push({ rowCount: count, result });
  }

  return results;
}

/**
 * Format render time results as a markdown report.
 */
export function formatRenderTimeReport(results: RenderTimeResult[]): string {
  const lines: string[] = [];

  lines.push('## Initial Render Time (createGrid)');
  lines.push('');
  lines.push('Measures time from `createGrid()` call to engine ready, including');
  lines.push('column resolution, row node creation, initial pipeline processing,');
  lines.push('and plugin installation.');
  lines.push('');
  lines.push('| Rows | Median | Mean | Min | Max | P95 |');
  lines.push('|------|--------|------|-----|-----|-----|');

  for (const { rowCount, result } of results) {
    lines.push(
      `| ${formatNumber(rowCount)} | ${formatMs(result.median)} | ${formatMs(result.mean)} | ${formatMs(result.min)} | ${formatMs(result.max)} | ${formatMs(result.p95)} |`,
    );
  }

  lines.push('');
  return lines.join('\n');
}

// ── Standalone execution ──
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('render-time.ts')) {
  console.log('Running render time benchmark...\n');
  const results = runRenderTimeBenchmark();
  console.log(formatRenderTimeReport(results));
}
