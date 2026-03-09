// ─── Memory Usage Benchmark ───
// Measures heap memory consumed by grid engine creation at various row counts.
// Uses process.memoryUsage() with forced GC (when available via --expose-gc)
// to get accurate heap delta measurements.

import { createGrid } from '@gridstorm/core';
import type { ColumnDef, GridEngine } from '@gridstorm/core';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import { SelectionPlugin } from '@gridstorm/plugin-selection';
import { generateRows, ROW_COUNTS, formatNumber, type BenchRow } from '../fixtures/data-generators.js';
import { formatBytes } from '../utils/timer.js';

export interface MemoryResult {
  rowCount: number;
  heapDelta: number;
  heapDeltaFormatted: string;
  heapUsedAfter: number;
  bytesPerRow: number;
  bytesPerRowFormatted: string;
}

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
 * Attempt to force garbage collection.
 * Requires Node.js to be started with --expose-gc flag.
 * Falls back to a no-op if GC is not exposed.
 */
function forceGC(): void {
  if (typeof globalThis.gc === 'function') {
    globalThis.gc();
  }
}

/**
 * Run the memory benchmark for all row counts.
 */
export function runMemoryBenchmark(): MemoryResult[] {
  const results: MemoryResult[] = [];
  const gcAvailable = typeof globalThis.gc === 'function';

  if (!gcAvailable) {
    console.warn(
      'Warning: --expose-gc not available. Memory measurements may be less accurate.',
    );
    console.warn('Run with: node --expose-gc -r tsx/esm src/runners/memory.ts\n');
  }

  for (const count of ROW_COUNTS) {
    // Pre-generate data (measured separately from grid creation)
    const data = generateRows(count);

    // Force GC and measure baseline
    forceGC();
    const baselineHeap = process.memoryUsage().heapUsed;

    // Create grid engine
    const engine = createGrid<BenchRow>({
      columns: COLUMNS,
      rowData: data,
      plugins: [
        SortingPlugin(),
        FilteringPlugin(),
        SelectionPlugin(),
      ],
    });

    // Force GC and measure after creation
    forceGC();
    const afterHeap = process.memoryUsage().heapUsed;

    const heapDelta = Math.max(0, afterHeap - baselineHeap);
    const bytesPerRow = count > 0 ? Math.round(heapDelta / count) : 0;

    results.push({
      rowCount: count,
      heapDelta,
      heapDeltaFormatted: formatBytes(heapDelta),
      heapUsedAfter: afterHeap,
      bytesPerRow,
      bytesPerRowFormatted: formatBytes(bytesPerRow),
    });

    // Clean up
    engine.destroy();
    forceGC();
  }

  return results;
}

/**
 * Format memory benchmark results as a markdown report.
 */
export function formatMemoryReport(results: MemoryResult[]): string {
  const lines: string[] = [];
  const gcAvailable = typeof globalThis.gc === 'function';

  lines.push('## Memory Usage');
  lines.push('');
  lines.push('Measures heap memory delta after creating a grid engine with data.');
  if (!gcAvailable) {
    lines.push('');
    lines.push('> **Note:** `--expose-gc` was not available. Values are approximate.');
  }
  lines.push('');
  lines.push('| Rows | Heap Delta | Bytes/Row | Heap Used After |');
  lines.push('|------|------------|-----------|-----------------|');

  for (const r of results) {
    lines.push(
      `| ${formatNumber(r.rowCount)} | ${r.heapDeltaFormatted} | ${r.bytesPerRowFormatted} | ${formatBytes(r.heapUsedAfter)} |`,
    );
  }

  lines.push('');
  return lines.join('\n');
}

// ── Standalone execution ──
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('memory.ts')) {
  console.log('Running memory benchmark...\n');
  const results = runMemoryBenchmark();
  console.log(formatMemoryReport(results));
}
