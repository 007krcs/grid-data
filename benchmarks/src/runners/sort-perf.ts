// ─── Sort Performance Benchmark ───
// Measures the time to sort data using the grid engine's command bus.
// Tests both single-column and multi-column sort operations.

import { createGrid } from '@gridstorm/core';
import type { ColumnDef, GridEngine } from '@gridstorm/core';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import { generateRows, ROW_COUNTS, formatNumber, type BenchRow } from '../fixtures/data-generators.js';
import { benchmark, formatMs, type BenchmarkResult } from '../utils/timer.js';

export interface SortPerfResult {
  rowCount: number;
  singleColumn: BenchmarkResult;
  multiColumn: BenchmarkResult;
}

const COLUMNS: ColumnDef<BenchRow>[] = [
  { field: 'id', headerName: 'ID', width: 80, sortable: true },
  { field: 'name', headerName: 'Name', width: 180, sortable: true },
  { field: 'email', headerName: 'Email', width: 220, sortable: true },
  { field: 'department', headerName: 'Department', width: 140, sortable: true },
  { field: 'salary', headerName: 'Salary', width: 120, sortable: true },
  { field: 'age', headerName: 'Age', width: 80, sortable: true },
  { field: 'city', headerName: 'City', width: 140, sortable: true },
  { field: 'country', headerName: 'Country', width: 140, sortable: true },
  { field: 'joinDate', headerName: 'Join Date', width: 120, sortable: true },
  { field: 'active', headerName: 'Active', width: 80, sortable: true },
];

/**
 * Create a fresh grid engine with the given data.
 */
function createBenchGrid(data: BenchRow[]): GridEngine<BenchRow> {
  return createGrid<BenchRow>({
    columns: COLUMNS,
    rowData: data,
    plugins: [
      SortingPlugin(),
      FilteringPlugin(),
    ],
  });
}

/**
 * Run the sort performance benchmark for all row counts.
 */
export function runSortPerfBenchmark(): SortPerfResult[] {
  const results: SortPerfResult[] = [];

  for (const count of ROW_COUNTS) {
    const data = generateRows(count);

    // ── Single column sort ──
    const singleColumn = benchmark(() => {
      const engine = createBenchGrid(data);
      engine.commandBus.dispatch('sort:set', {
        sortModel: [{ colId: 'salary', sort: 'asc' }],
      });
      engine.destroy();
    });

    // ── Multi-column sort ──
    const multiColumn = benchmark(() => {
      const engine = createBenchGrid(data);
      engine.commandBus.dispatch('sort:set', {
        sortModel: [
          { colId: 'department', sort: 'asc' },
          { colId: 'salary', sort: 'desc' },
          { colId: 'name', sort: 'asc' },
        ],
      });
      engine.destroy();
    });

    results.push({ rowCount: count, singleColumn, multiColumn });
  }

  return results;
}

/**
 * Format sort performance results as a markdown report.
 */
export function formatSortPerfReport(results: SortPerfResult[]): string {
  const lines: string[] = [];

  lines.push('## Sort Performance');
  lines.push('');
  lines.push('Measures time to sort data via `commandBus.dispatch("sort:set", ...)`.');
  lines.push('Includes grid creation time. Single column sorts by salary (numeric),');
  lines.push('multi-column sorts by department (string), salary (numeric desc), and name (string).');
  lines.push('');

  // Single column
  lines.push('### Single Column Sort (salary ASC)');
  lines.push('');
  lines.push('| Rows | Median | Mean | Min | Max | P95 |');
  lines.push('|------|--------|------|-----|-----|-----|');

  for (const { rowCount, singleColumn } of results) {
    lines.push(
      `| ${formatNumber(rowCount)} | ${formatMs(singleColumn.median)} | ${formatMs(singleColumn.mean)} | ${formatMs(singleColumn.min)} | ${formatMs(singleColumn.max)} | ${formatMs(singleColumn.p95)} |`,
    );
  }

  lines.push('');

  // Multi column
  lines.push('### Multi-Column Sort (department ASC, salary DESC, name ASC)');
  lines.push('');
  lines.push('| Rows | Median | Mean | Min | Max | P95 |');
  lines.push('|------|--------|------|-----|-----|-----|');

  for (const { rowCount, multiColumn } of results) {
    lines.push(
      `| ${formatNumber(rowCount)} | ${formatMs(multiColumn.median)} | ${formatMs(multiColumn.mean)} | ${formatMs(multiColumn.min)} | ${formatMs(multiColumn.max)} | ${formatMs(multiColumn.p95)} |`,
    );
  }

  lines.push('');
  return lines.join('\n');
}

// ── Standalone execution ──
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('sort-perf.ts')) {
  console.log('Running sort performance benchmark...\n');
  const results = runSortPerfBenchmark();
  console.log(formatSortPerfReport(results));
}
