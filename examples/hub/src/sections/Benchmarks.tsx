// ─── Live, reproducible grid benchmark ───
//
// Every number on this section is MEASURED in the visitor's browser when they
// press "Run". Nothing is hard-coded. The methodology is printed next to the
// results, and the same scenarios run headless in CI (benchmarks/) where a
// regression gate fails the build on a >10 % slowdown.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createGrid } from '@gridstorm/core';
import type { ColumnDef, GridEngine } from '@gridstorm/core';
import { DomRenderer } from '@gridstorm/dom-renderer';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import { SelectionPlugin } from '@gridstorm/plugin-selection';
import '@gridstorm/theme-default';

const ROW_COUNT = 100_000;
const SCROLL_DURATION_MS = 2_000;

interface BenchRow {
  id: number;
  name: string;
  email: string;
  department: string;
  salary: number;
  age: number;
  city: string;
  active: boolean;
}

const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'Finance', 'Support', 'Legal'];
const CITIES = ['Berlin', 'Austin', 'Tokyo', 'Toronto', 'Lisbon', 'Sydney', 'Pune', 'Oslo'];

/** Deterministic LCG so every visitor benchmarks the same dataset. */
function generateRows(count: number): BenchRow[] {
  let seed = 42;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x1_0000_0000;
  };
  const rows: BenchRow[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const dept = DEPARTMENTS[Math.floor(rnd() * DEPARTMENTS.length)]!;
    rows[i] = {
      id: i + 1,
      name: `Person ${i + 1}`,
      email: `person${i + 1}@example.com`,
      department: dept,
      salary: 40_000 + Math.floor(rnd() * 120_000),
      age: 20 + Math.floor(rnd() * 45),
      city: CITIES[Math.floor(rnd() * CITIES.length)]!,
      active: rnd() > 0.3,
    };
  }
  return rows;
}

const COLUMNS: ColumnDef<BenchRow>[] = [
  { field: 'id', headerName: 'ID', width: 80, sortable: true },
  { field: 'name', headerName: 'Name', width: 160, sortable: true, filterable: true },
  { field: 'email', headerName: 'Email', width: 220, sortable: true },
  { field: 'department', headerName: 'Department', width: 140, sortable: true, filterable: true },
  { field: 'salary', headerName: 'Salary', width: 110, sortable: true, filterable: true },
  { field: 'age', headerName: 'Age', width: 70, sortable: true },
  { field: 'city', headerName: 'City', width: 120, sortable: true },
  { field: 'active', headerName: 'Active', width: 80, sortable: true },
];

export interface LiveBenchmarkResult {
  rows: number;
  /** createGrid(): column resolution, 100k RowNodes, plugin install. */
  engineMs: number;
  /** DomRenderer.mount() until the first data row exists in the DOM. */
  firstRowMs: number;
  /** Mean FPS over a continuous programmatic scroll through the whole dataset. */
  scrollFps: number;
  /** Worst single frame during the scroll. */
  worstFrameMs: number;
  /** Full sort of 100k rows by a string column via the sorting plugin. */
  sortMs: number;
  /** Text filter over 100k rows via the filtering plugin. */
  filterMs: number;
  /** JS heap growth attributable to the grid (Chromium only; null elsewhere). */
  heapDeltaMb: number | null;
  userAgent: string;
  measuredAt: string;
}

const nextFrame = () => new Promise<number>((r) => requestAnimationFrame(r));

/** Resolve once a row with data-row-id exists under `root`, or after 10 s. */
function waitForFirstRow(root: HTMLElement): Promise<number> {
  const start = performance.now();
  return new Promise((resolve) => {
    const check = () => {
      if (root.querySelector('[role="row"][data-row-id]')) {
        resolve(performance.now() - start);
        return;
      }
      if (performance.now() - start > 10_000) {
        resolve(NaN);
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  });
}

async function measureScroll(viewport: HTMLElement): Promise<{ fps: number; worstFrameMs: number }> {
  const maxTop = viewport.scrollHeight - viewport.clientHeight;
  const start = performance.now();
  let last = start;
  let frames = 0;
  let worst = 0;
  while (true) {
    const now = await nextFrame();
    const elapsed = now - start;
    if (elapsed >= SCROLL_DURATION_MS) break;
    viewport.scrollTop = (elapsed / SCROLL_DURATION_MS) * maxTop;
    const dt = now - last;
    last = now;
    frames++;
    if (frames > 1 && dt > worst) worst = dt;
  }
  const total = performance.now() - start;
  return { fps: frames / (total / 1000), worstFrameMs: worst };
}

function heapUsed(): number | null {
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return mem ? mem.usedJSHeapSize : null;
}

export async function runLiveBenchmark(host: HTMLElement): Promise<LiveBenchmarkResult> {
  host.innerHTML = '';
  const container = document.createElement('div');
  container.style.height = '420px';
  container.style.width = '100%';
  host.appendChild(container);

  const data = generateRows(ROW_COUNT);
  const heapBefore = heapUsed();

  // 1. Engine
  const t0 = performance.now();
  const engine: GridEngine<BenchRow> = createGrid<BenchRow>({
    columns: COLUMNS,
    rowData: data,
    getRowId: (p) => String(p.data.id),
    plugins: [SortingPlugin(), FilteringPlugin(), SelectionPlugin()],
  });
  const engineMs = performance.now() - t0;

  // 2. Time to first row
  const renderer = new DomRenderer({ container, engine });
  renderer.mount();
  const firstRowMs = await waitForFirstRow(container);

  // 3. Scroll FPS
  await nextFrame();
  const viewport = container.querySelector<HTMLElement>('.gs-body-viewport');
  const scroll = viewport ? await measureScroll(viewport) : { fps: NaN, worstFrameMs: NaN };

  // 4. Sort (string column, 100k rows)
  await nextFrame();
  const s0 = performance.now();
  engine.api.setSortModel([{ colId: 'name', sort: 'desc' }]);
  const sortMs = performance.now() - s0;
  engine.api.setSortModel([]);

  // 5. Filter (text contains)
  await nextFrame();
  const f0 = performance.now();
  engine.api.setFilterModel({ department: { filterType: 'text', type: 'contains', filter: 'Eng' } });
  const filterMs = performance.now() - f0;
  engine.api.setFilterModel({});

  await nextFrame();
  const heapAfter = heapUsed();

  renderer.destroy();
  engine.destroy();
  host.innerHTML = '';

  return {
    rows: ROW_COUNT,
    engineMs,
    firstRowMs,
    scrollFps: scroll.fps,
    worstFrameMs: scroll.worstFrameMs,
    sortMs,
    filterMs,
    heapDeltaMb: heapBefore !== null && heapAfter !== null ? (heapAfter - heapBefore) / 1_048_576 : null,
    userAgent: navigator.userAgent,
    measuredAt: new Date().toISOString(),
  };
}

const fmtMs = (v: number) => (Number.isFinite(v) ? `${v.toFixed(v < 10 ? 1 : 0)} ms` : 'n/a');

export function Benchmarks() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle');
  const [result, setResult] = useState<LiveBenchmarkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    if (!hostRef.current || state === 'running') return;
    setState('running');
    setError(null);
    try {
      // Yield so the "Running…" state paints before the heavy work starts.
      await nextFrame();
      const r = await runLiveBenchmark(hostRef.current);
      setResult(r);
      setState('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState('idle');
    }
  }, [state]);

  useEffect(() => () => {
    if (hostRef.current) hostRef.current.innerHTML = '';
  }, []);

  const cards = result
    ? [
        { value: fmtMs(result.firstRowMs), metric: 'Time to first row', detail: `${ROW_COUNT.toLocaleString()} rows, mount → first DOM row` },
        { value: Number.isFinite(result.scrollFps) ? `${Math.round(result.scrollFps)} fps` : 'n/a', metric: 'Scroll frame rate', detail: `2 s continuous scroll, worst frame ${fmtMs(result.worstFrameMs)}` },
        { value: fmtMs(result.sortMs), metric: 'Sort 100k rows', detail: 'String column, descending, via SortingPlugin' },
        { value: fmtMs(result.filterMs), metric: 'Filter 100k rows', detail: 'Text contains, via FilteringPlugin' },
        { value: fmtMs(result.engineMs), metric: 'Engine creation', detail: 'createGrid(): nodes, columns, 3 plugins' },
        { value: result.heapDeltaMb === null ? 'n/a' : `${result.heapDeltaMb.toFixed(0)} MB`, metric: 'Heap growth', detail: result.heapDeltaMb === null ? 'performance.memory unavailable in this browser' : 'JS heap delta, data + grid' },
      ]
    : [
        { value: '—', metric: 'Time to first row', detail: `${ROW_COUNT.toLocaleString()} rows, mount → first DOM row` },
        { value: '—', metric: 'Scroll frame rate', detail: '2 s continuous scroll through the whole dataset' },
        { value: '—', metric: 'Sort 100k rows', detail: 'String column, descending' },
        { value: '—', metric: 'Filter 100k rows', detail: 'Text contains' },
      ];

  return (
    <div className="benchmark-section" id="benchmarks">
      <div className="section-header" style={{ marginBottom: 8 }}>
        <h2>Performance, measured on your machine</h2>
      </div>
      <p className="benchmark-intro">
        No marketing numbers. Press run and GridStorm will build a {ROW_COUNT.toLocaleString()}-row grid in
        this page, scroll it, sort it, and filter it while timing every step. The same scenarios run headless
        in CI, where a regression gate fails the build on a 10% slowdown.
      </p>
      <div className="benchmark-actions">
        <button type="button" className="btn-primary" onClick={run} disabled={state === 'running'}>
          {state === 'running' ? 'Running…' : state === 'done' ? 'Run again' : `Run 100k-row benchmark`}
        </button>
        <a
          className="btn-secondary"
          href="https://github.com/007krcs/grid-data/tree/main/benchmarks"
          target="_blank"
          rel="noreferrer"
        >
          Methodology &amp; CI gate
        </a>
      </div>
      {error && <p className="benchmark-error" role="alert">Benchmark failed: {error}</p>}
      <div className="benchmark-grid" aria-live="polite">
        {cards.map((b) => (
          <div key={b.metric} className="benchmark-card">
            <div className="benchmark-value">{b.value}</div>
            <div className="benchmark-metric">{b.metric}</div>
            <div className="benchmark-detail">{b.detail}</div>
          </div>
        ))}
      </div>
      <div ref={hostRef} className="benchmark-host" aria-hidden={state !== 'running'} />
      {result && (
        <p className="benchmark-footnote">
          Measured {new Date(result.measuredAt).toLocaleString()} in your browser. Results vary with hardware,
          browser, and other open tabs. Run it twice; the first run includes JIT warm-up.
        </p>
      )}
    </div>
  );
}
