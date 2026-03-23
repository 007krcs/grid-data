// ─── Fill Engine ───
// Generates fill values based on a detected pattern.

import type { DetectedPattern } from './types';

/**
 * Format a timestamp back to an ISO date string (YYYY-MM-DD).
 */
function formatDate(ms: number): string {
  const d = new Date(ms);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate fill values based on a detected pattern.
 *
 * @param pattern - The detected pattern from the source values.
 * @param count - Number of values to generate.
 * @param sourceLength - Length of the original source sequence (used to compute continuation).
 * @returns Array of generated values.
 */
export function generateFillValues(
  pattern: DetectedPattern,
  count: number,
  sourceLength: number = 1,
): unknown[] {
  const result: unknown[] = [];

  switch (pattern.type) {
    case 'number-increment': {
      // Continue from where the source left off
      const lastValue = pattern.start + pattern.step * (sourceLength - 1);
      for (let i = 1; i <= count; i++) {
        result.push(lastValue + pattern.step * i);
      }
      break;
    }

    case 'date-increment': {
      const lastMs = pattern.startMs + pattern.stepMs * (sourceLength - 1);
      for (let i = 1; i <= count; i++) {
        result.push(formatDate(lastMs + pattern.stepMs * i));
      }
      break;
    }

    case 'text-series': {
      const lastNum = pattern.numStart + pattern.step * (sourceLength - 1);
      for (let i = 1; i <= count; i++) {
        result.push(`${pattern.prefix}${lastNum + pattern.step * i}${pattern.suffix}`);
      }
      break;
    }

    case 'repeat': {
      const cycle = pattern.values;
      for (let i = 0; i < count; i++) {
        // Continue cycling from where source left off
        result.push(cycle[(sourceLength + i) % cycle.length]);
      }
      break;
    }

    case 'copy': {
      for (let i = 0; i < count; i++) {
        result.push(pattern.value);
      }
      break;
    }
  }

  return result;
}
