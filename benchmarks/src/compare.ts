// ─── Benchmark Regression Gate ───
// Compares a current `latest.json` against a baseline and exits non-zero when
// any gated metric regressed beyond its threshold. Used by CI; also runnable
// locally:
//
//   pnpm --filter @gridstorm/benchmarks bench:check -- \
//     --baseline results/baseline.json --current results/latest.json
//
// Policy
//   • Every metric is lower-is-better (milliseconds or bytes).
//   • Timing metrics (render/sort/filter, min over iterations) fail at +10 %.
//     A regression must also exceed an absolute floor (2 ms) so that noise on
//     sub-millisecond cases cannot fail the build.
//   • Memory metrics fail at +20 %: GC timing on shared CI runners is noisy.
//   • Bundle-size metrics fail at +10 % against the COMMITTED bundle baseline
//     (`benchmarks/bundle-baseline.json`), because bundle size is
//     deterministic and must never silently grow.
//   • A metric present in the baseline but missing from the current run is a
//     failure (a benchmark silently stopped running).
//   • Metrics new in the current run are reported, not gated.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface BenchmarkJson {
  timestamp: string;
  systemInfo: Record<string, unknown>;
  /** Flat metric map, e.g. "render.100000.median" → 123.4 (ms) or "bundle.core.gzip" → 15000 (bytes). */
  metrics: Record<string, number>;
}

export interface GatePolicy {
  /** Relative threshold for timing metrics (0.10 = 10 %). */
  timingThreshold: number;
  /** Absolute floor in ms below which a timing diff is never a regression. */
  timingFloorMs: number;
  /** Relative threshold for memory metrics. */
  memoryThreshold: number;
  /** Relative threshold for bundle-size metrics. */
  bundleThreshold: number;
}

export const DEFAULT_POLICY: GatePolicy = {
  timingThreshold: 0.10,
  timingFloorMs: 2,
  memoryThreshold: 0.20,
  bundleThreshold: 0.10,
};

export type MetricClass = 'timing' | 'memory' | 'bundle';

export function classify(metric: string): MetricClass {
  if (metric.startsWith('bundle.')) return 'bundle';
  if (metric.startsWith('memory.')) return 'memory';
  return 'timing';
}

export interface MetricVerdict {
  metric: string;
  cls: MetricClass;
  baseline: number | undefined;
  current: number | undefined;
  /** (current - baseline) / baseline; NaN when either side is missing. */
  delta: number;
  status: 'ok' | 'regression' | 'missing' | 'new';
}

export interface CompareResult {
  verdicts: MetricVerdict[];
  regressions: MetricVerdict[];
  missing: MetricVerdict[];
  passed: boolean;
}

export function compareMetrics(
  baseline: Record<string, number>,
  current: Record<string, number>,
  policy: GatePolicy = DEFAULT_POLICY,
): CompareResult {
  const keys = new Set([...Object.keys(baseline), ...Object.keys(current)]);
  const verdicts: MetricVerdict[] = [];

  for (const metric of [...keys].sort()) {
    const b = baseline[metric];
    const c = current[metric];
    const cls = classify(metric);

    if (b === undefined) {
      verdicts.push({ metric, cls, baseline: b, current: c, delta: NaN, status: 'new' });
      continue;
    }
    if (c === undefined) {
      verdicts.push({ metric, cls, baseline: b, current: c, delta: NaN, status: 'missing' });
      continue;
    }

    const delta = b === 0 ? (c === 0 ? 0 : Infinity) : (c - b) / b;
    let regressed = false;
    if (cls === 'timing') {
      regressed = delta > policy.timingThreshold && c - b > policy.timingFloorMs;
    } else if (cls === 'memory') {
      regressed = delta > policy.memoryThreshold;
    } else {
      regressed = delta > policy.bundleThreshold;
    }
    verdicts.push({ metric, cls, baseline: b, current: c, delta, status: regressed ? 'regression' : 'ok' });
  }

  const regressions = verdicts.filter((v) => v.status === 'regression');
  const missing = verdicts.filter((v) => v.status === 'missing');
  return { verdicts, regressions, missing, passed: regressions.length === 0 && missing.length === 0 };
}

function fmt(v: number | undefined, cls: MetricClass): string {
  if (v === undefined) return '—';
  if (cls === 'bundle' || cls === 'memory') return `${(v / 1024).toFixed(1)} KB`;
  return `${v.toFixed(2)} ms`;
}

export function formatCompareTable(result: CompareResult): string {
  const lines: string[] = [];
  lines.push('| Metric | Baseline | Current | Δ | Status |');
  lines.push('|---|---|---|---|---|');
  for (const v of result.verdicts) {
    const delta = Number.isFinite(v.delta) ? `${v.delta >= 0 ? '+' : ''}${(v.delta * 100).toFixed(1)} %` : '—';
    const icon = v.status === 'ok' ? '✅' : v.status === 'new' ? '🆕' : '❌';
    lines.push(`| ${v.metric} | ${fmt(v.baseline, v.cls)} | ${fmt(v.current, v.cls)} | ${delta} | ${icon} ${v.status} |`);
  }
  return lines.join('\n');
}

function readJson(path: string): BenchmarkJson {
  return JSON.parse(readFileSync(path, 'utf-8')) as BenchmarkJson;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/**
 * CLI entry. Exit codes: 0 pass, 1 regression/missing, 2 usage error.
 *
 * Baselines:
 *   --baseline <file>          timing + memory baseline (from a previous run on comparable hardware).
 *                              If the file does not exist, timing/memory gates are skipped with a notice
 *                              and the current run is written there (first run seeds the baseline).
 *   --bundle-baseline <file>   committed bundle-size baseline. Always gated when present.
 *   --current <file>           defaults to results/latest.json
 *   --threshold <0.10>         override timing threshold
 *   --write-baseline           after a passing run, overwrite --baseline with --current
 */
export function main(): number {
  // Defaults live relative to this file; explicit CLI paths resolve from cwd.
  const here = import.meta.dirname;
  const pick = (flag: string, fallback: string) => {
    const v = arg(flag);
    return v ? resolve(process.cwd(), v) : resolve(here, fallback);
  };
  const currentPath = pick('--current', '../results/latest.json');
  const baselinePath = pick('--baseline', '../results/baseline.json');
  const bundleBaselinePath = pick('--bundle-baseline', '../bundle-baseline.json');
  const threshold = arg('--threshold');
  const policy: GatePolicy = {
    ...DEFAULT_POLICY,
    ...(threshold ? { timingThreshold: Number(threshold) } : {}),
  };

  if (!existsSync(currentPath)) {
    console.error(`[bench:check] current results not found at ${currentPath}. Run bench:report first.`);
    return 2;
  }
  const current = readJson(currentPath);
  let failed = false;

  // ── Bundle size: committed baseline, always gated ──
  const currentBundle = Object.fromEntries(
    Object.entries(current.metrics).filter(([k]) => k.startsWith('bundle.')),
  );
  if (existsSync(bundleBaselinePath)) {
    const bundleBaseline = readJson(bundleBaselinePath);
    const r = compareMetrics(bundleBaseline.metrics, currentBundle, policy);
    console.log('\n## Bundle size vs committed baseline\n');
    console.log(formatCompareTable(r));
    if (!r.passed) failed = true;
  } else {
    console.log(`[bench:check] no bundle baseline at ${bundleBaselinePath}; seeding it from the current run.`);
    writeFileSync(
      bundleBaselinePath,
      JSON.stringify({ timestamp: current.timestamp, systemInfo: {}, metrics: currentBundle }, null, 2) + '\n',
    );
  }

  // ── Timing + memory: machine-local baseline ──
  const currentPerf = Object.fromEntries(
    Object.entries(current.metrics).filter(([k]) => !k.startsWith('bundle.')),
  );
  if (existsSync(baselinePath)) {
    const baseline = readJson(baselinePath);
    const perfBaseline = Object.fromEntries(
      Object.entries(baseline.metrics).filter(([k]) => !k.startsWith('bundle.')),
    );
    const r = compareMetrics(perfBaseline, currentPerf, policy);
    console.log(
      `\n## Timing & memory vs baseline (${baseline.timestamp}; timing +${(policy.timingThreshold * 100).toFixed(0)} %, memory +${(policy.memoryThreshold * 100).toFixed(0)} %)\n`,
    );
    console.log(formatCompareTable(r));
    if (!r.passed) {
      failed = true;
      console.error(`\n[bench:check] ${r.regressions.length} regression(s), ${r.missing.length} missing metric(s).`);
    }
  } else {
    console.log(`\n[bench:check] no timing baseline at ${baselinePath}; timing/memory gates skipped on this first run.`);
    writeFileSync(baselinePath, JSON.stringify(current, null, 2) + '\n');
    console.log(`[bench:check] seeded baseline from current run.`);
  }

  if (!failed && process.argv.includes('--write-baseline')) {
    writeFileSync(baselinePath, JSON.stringify(current, null, 2) + '\n');
    console.log(`[bench:check] baseline updated → ${baselinePath}`);
  }

  console.log(failed ? '\n[bench:check] FAIL' : '\n[bench:check] PASS');
  return failed ? 1 : 0;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('compare.ts')) {
  process.exit(main());
}
