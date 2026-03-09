// ─── Benchmark Timer Utilities ───
// Provides precise timing, statistical aggregation, and formatting
// for benchmark measurements.

import { performance } from 'node:perf_hooks';

export interface BenchmarkResult {
  median: number;
  mean: number;
  min: number;
  max: number;
  p95: number;
  iterations: number;
}

/**
 * Run a function multiple times and collect timing statistics.
 *
 * @param fn - The function to benchmark.
 * @param iterations - Number of iterations to run (default: 5).
 * @returns Aggregated timing statistics.
 */
export function benchmark(fn: () => void, iterations: number = 5): BenchmarkResult {
  const times: number[] = [];

  // Warmup run (not measured)
  fn();

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const elapsed = performance.now() - start;
    times.push(elapsed);
  }

  return {
    median: median(times),
    mean: mean(times),
    min: Math.min(...times),
    max: Math.max(...times),
    p95: percentile(times, 95),
    iterations,
  };
}

/**
 * Run an async function multiple times and collect timing statistics.
 *
 * @param fn - The async function to benchmark.
 * @param iterations - Number of iterations to run (default: 5).
 * @returns Aggregated timing statistics.
 */
export async function benchmarkAsync(
  fn: () => Promise<void>,
  iterations: number = 5,
): Promise<BenchmarkResult> {
  const times: number[] = [];

  // Warmup run (not measured)
  await fn();

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const elapsed = performance.now() - start;
    times.push(elapsed);
  }

  return {
    median: median(times),
    mean: mean(times),
    min: Math.min(...times),
    max: Math.max(...times),
    p95: percentile(times, 95),
    iterations,
  };
}

/**
 * Calculate the median of a number array.
 */
export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

/**
 * Calculate the arithmetic mean of a number array.
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate a given percentile of a number array.
 *
 * @param values - The data points.
 * @param p - The percentile (0-100).
 */
export function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) return sorted[lower]!;
  return sorted[lower]! * (1 - weight) + sorted[upper]! * weight;
}

/**
 * Format milliseconds for display.
 */
export function formatMs(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}us`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format bytes for display (e.g., 1024 -> "1.00 KB").
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Format a BenchmarkResult into a compact summary string.
 */
export function formatResult(result: BenchmarkResult): string {
  return `median=${formatMs(result.median)} mean=${formatMs(result.mean)} min=${formatMs(result.min)} max=${formatMs(result.max)} p95=${formatMs(result.p95)}`;
}
