// ─── Filter Performance Benchmark ───
// Measures the time to filter data using the grid engine's command bus.
// Tests text-based (equals) and number-range filters.

import { createGrid } from '@gridstorm/core';
import type { ColumnDef, GridEngine } from '@gridstorm/core';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import { generateRows, ROW_COUNTS, formatNumber, type BenchRow } from '../fixtures/data-generators.js';
import { benchmark, formatMs, type BenchmarkResult } from '../utils/timer.js';

export interface FilterPerfResult {
  rowCount: number;
  textFilter: BenchmarkResult;
  numberRangeFilter: BenchmarkResult;
}

const COLUMNS: ColumnDef<BenchRow>[] = [
  { field: 'id', headerName: 'ID', width: 80, sortable: true, filterable: true },
  { field: 'name', headerName: 'Name', width: 180, sortable: true, filterable: true },
  { field: 'email', headerName: 'Email', width: 220, sortable: true, filterable: true },
  { field: 'department', headerName: 'Department', width: 140, sortable: true, filterable: true },
  { field: 'salary', headerName: 'Salary', width: 120, sortable: true, filterable: true },
  { field: 'age', headerName: 'Age', width: 80, sortable: true, filterable: true },
  { field: 'city', headerName: 'City', width: 140, sortable: true, filterable: true },
  { field: 'country', headerName: 'Country', width: 140, sortable: true, filterable: true },
  { field: 'joinDate', headerName: 'Join Date', width: 120, sortable: true, filterable: true },
  { field: 'active', headerName: 'Active', width: 80, sortable: true, filterable: true },
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
 * Run the filter performance benchmark for all row counts.
 */
export function runFilterPerfBenchmark(): FilterPerfResult[] {
  const results: FilterPerfResult[] = [];

  for (const count of ROW_COUNTS) {
    const data = generateRows(count);

    // ── Text filter: department equals "Engineering" ──
    const textFilter = benchmark(() => {
      const engine = createBenchGrid(data);
      engine.commandBus.dispatch('filter:set', {
        filterModel: {
          department: {
            filterType: 'text',
            type: 'equals',
            filter: 'Engineering',
          },
        },
      });
      engine.destroy();
    });

    // ── Number range filter: salary between 50000 and 120000 ──
    const numberRangeFilter = benchmark(() => {
      const engine = createBenchGrid(data);
      engine.commandBus.dispatch('filter:set', {
        filterModel: {
          salary: {
            filterType: 'number',
            type: 'inRange',
            filter: 50000,
            filterTo: 120000,
          },
        },
      });
      engine.destroy();
    });

    results.push({ rowCount: count, textFilter, numberRangeFilter });
  }

  return results;
}

/**
 * Format filter performance results as a markdown report.
 */
export function formatFilterPerfReport(results: FilterPerfResult[]): string {
  const lines: string[] = [];

  lines.push('## Filter Performance');
  lines.push('');
  lines.push('Measures time to filter data via `commandBus.dispatch("filter:set", ...)`.');
  lines.push('Includes grid creation time.');
  lines.push('');

  // Text filter
  lines.push('### Text Filter (department = "Engineering")');
  lines.push('');
  lines.push('| Rows | Median | Mean | Min | Max | P95 |');
  lines.push('|------|--------|------|-----|-----|-----|');

  for (const { rowCount, textFilter } of results) {
    lines.push(
      `| ${formatNumber(rowCount)} | ${formatMs(textFilter.median)} | ${formatMs(textFilter.mean)} | ${formatMs(textFilter.min)} | ${formatMs(textFilter.max)} | ${formatMs(textFilter.p95)} |`,
    );
  }

  lines.push('');

  // Number range filter
  lines.push('### Number Range Filter (salary 50,000 - 120,000)');
  lines.push('');
  lines.push('| Rows | Median | Mean | Min | Max | P95 |');
  lines.push('|------|--------|------|-----|-----|-----|');

  for (const { rowCount, numberRangeFilter } of results) {
    lines.push(
      `| ${formatNumber(rowCount)} | ${formatMs(numberRangeFilter.median)} | ${formatMs(numberRangeFilter.mean)} | ${formatMs(numberRangeFilter.min)} | ${formatMs(numberRangeFilter.max)} | ${formatMs(numberRangeFilter.p95)} |`,
    );
  }

  lines.push('');
  return lines.join('\n');
}

// ── Standalone execution ──
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('filter-perf.ts')) {
  console.log('Running filter performance benchmark...\n');
  const results = runFilterPerfBenchmark();
  console.log(formatFilterPerfReport(results));
}
