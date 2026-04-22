// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Pattern Detector ───
// Detects patterns from a sequence of values for auto-fill.

import type { DetectedPattern } from './types';

/**
 * Try to parse a value as a Date, returning the timestamp or null.
 */
function tryParseDate(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    // Match common date patterns: YYYY-MM-DD, MM/DD/YYYY, etc.
    const timestamp = Date.parse(value);
    if (!isNaN(timestamp)) {
      // Extra check: the string should look date-like (has dashes, slashes, or is ISO)
      if (/^\d{4}-\d{2}-\d{2}/.test(value) || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(value)) {
        return timestamp;
      }
    }
  }
  return null;
}

/**
 * Try to detect a text series pattern like "Item 1", "Item 2", "Item 3".
 * Returns the pattern or null if not detected.
 */
function tryTextSeries(values: unknown[]): DetectedPattern | null {
  if (values.length < 2) return null;
  if (!values.every((v) => typeof v === 'string')) return null;

  const strings = values as string[];
  // Match trailing numbers: "prefix123suffix" -> prefix, 123, suffix
  const regex = /^(.*?)(\d+)(\D*)$/;
  const parsed = strings.map((s) => regex.exec(s));

  if (parsed.some((p) => p === null)) return null;

  const matches = parsed as RegExpExecArray[];
  const prefix = matches[0]![1]!;
  const suffix = matches[0]![3]!;

  // All must share the same prefix and suffix
  if (!matches.every((m) => m[1] === prefix && m[3] === suffix)) return null;

  const numbers = matches.map((m) => parseInt(m[2]!, 10));
  if (numbers.length < 2) return null;

  // Check for constant step
  const step = numbers[1]! - numbers[0]!;
  for (let i = 2; i < numbers.length; i++) {
    if (numbers[i]! - numbers[i - 1]! !== step) return null;
  }

  return {
    type: 'text-series',
    prefix,
    numStart: numbers[0]!,
    step,
    suffix,
  };
}

/**
 * Try to detect a repeating cycle pattern.
 * Values like ["A", "B", "A", "B"] -> repeat with period 2.
 */
function tryRepeat(values: unknown[]): DetectedPattern | null {
  if (values.length < 2) return null;

  // Try cycle lengths from 1 to half the array length
  for (let period = 1; period <= Math.floor(values.length / 2); period++) {
    if (values.length % period !== 0) continue;

    const cycle = values.slice(0, period);
    let isCycle = true;
    for (let i = period; i < values.length; i++) {
      if (values[i] !== cycle[i % period]) {
        isCycle = false;
        break;
      }
    }
    if (isCycle) {
      return { type: 'repeat', values: cycle };
    }
  }

  return null;
}

/**
 * Detect a pattern from a sequence of values.
 *
 * Detection order:
 * 1. Number increment (constant step between all numeric values)
 * 2. Date increment (constant step between date-like values)
 * 3. Text series (strings with trailing numbers sharing prefix/suffix)
 * 4. Repeating cycle
 * 5. Fallback to copy
 */
export function detectPattern(values: unknown[]): DetectedPattern {
  if (values.length === 0) {
    return { type: 'copy', value: undefined };
  }

  if (values.length === 1) {
    return { type: 'copy', value: values[0] };
  }

  // 1. Number increment
  if (values.every((v) => typeof v === 'number' && !isNaN(v as number))) {
    const nums = values as number[];
    const step = nums[1]! - nums[0]!;
    let isConstantStep = true;
    for (let i = 2; i < nums.length; i++) {
      // Use a small epsilon for floating-point tolerance
      if (Math.abs((nums[i]! - nums[i - 1]!) - step) > 1e-10) {
        isConstantStep = false;
        break;
      }
    }
    if (isConstantStep) {
      return { type: 'number-increment', start: nums[0]!, step };
    }
  }

  // 2. Date increment
  const timestamps = values.map(tryParseDate);
  if (timestamps.every((t) => t !== null)) {
    const ts = timestamps as number[];
    const stepMs = ts[1]! - ts[0]!;
    let isConstantStep = true;
    for (let i = 2; i < ts.length; i++) {
      if (ts[i]! - ts[i - 1]! !== stepMs) {
        isConstantStep = false;
        break;
      }
    }
    if (isConstantStep && stepMs !== 0) {
      return { type: 'date-increment', startMs: ts[0]!, stepMs };
    }
  }

  // 3. Text series
  const textSeries = tryTextSeries(values);
  if (textSeries) return textSeries;

  // 4. Repeating pattern
  const repeat = tryRepeat(values);
  if (repeat) return repeat;

  // 5. Fallback: copy the first value
  return { type: 'copy', value: values[0] };
}
