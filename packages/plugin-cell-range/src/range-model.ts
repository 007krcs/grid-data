// ─── Range Model ───
// Pure functions for creating, expanding, querying, and merging cell ranges.

import type { CellPosition, RangeBounds, RangeSelection } from './types';

let rangeCounter = 0;

/**
 * Normalize start/end so that startRow <= endRow and startCol <= endCol.
 */
export function normalizeRange(start: CellPosition, end: CellPosition): RangeBounds {
  return {
    startRow: Math.min(start.rowIndex, end.rowIndex),
    endRow: Math.max(start.rowIndex, end.rowIndex),
    startCol: Math.min(start.colIndex, end.colIndex),
    endCol: Math.max(start.colIndex, end.colIndex),
  };
}

/**
 * Create a new RangeSelection from a start and end cell position.
 */
export function createRange(start: CellPosition, end: CellPosition): RangeSelection {
  rangeCounter++;
  return {
    id: `range-${rangeCounter}`,
    start,
    end,
    bounds: normalizeRange(start, end),
  };
}

/**
 * Expand an existing range to a new end position, recalculating bounds.
 */
export function expandRange(range: RangeSelection, newEnd: CellPosition): RangeSelection {
  return {
    ...range,
    end: newEnd,
    bounds: normalizeRange(range.start, newEnd),
  };
}

/**
 * Check whether a cell position falls within a range's bounds.
 */
export function isInRange(pos: CellPosition, range: RangeSelection): boolean {
  const { bounds } = range;
  return (
    pos.rowIndex >= bounds.startRow &&
    pos.rowIndex <= bounds.endRow &&
    pos.colIndex >= bounds.startCol &&
    pos.colIndex <= bounds.endCol
  );
}

/**
 * Enumerate all cell positions within a range, row-major order.
 */
export function getRangeCells(range: RangeSelection): CellPosition[] {
  const cells: CellPosition[] = [];
  const { bounds } = range;
  for (let r = bounds.startRow; r <= bounds.endRow; r++) {
    for (let c = bounds.startCol; c <= bounds.endCol; c++) {
      cells.push({ rowIndex: r, colIndex: c });
    }
  }
  return cells;
}

/**
 * Check if two ranges overlap.
 */
function rangesOverlap(a: RangeBounds, b: RangeBounds): boolean {
  return (
    a.startRow <= b.endRow &&
    a.endRow >= b.startRow &&
    a.startCol <= b.endCol &&
    a.endCol >= b.startCol
  );
}

/**
 * Merge overlapping ranges into combined ranges.
 * Non-overlapping ranges are kept as-is.
 */
export function mergeRanges(ranges: RangeSelection[]): RangeSelection[] {
  if (ranges.length <= 1) return ranges;

  const merged: RangeSelection[] = [];
  const used = new Set<number>();

  for (let i = 0; i < ranges.length; i++) {
    if (used.has(i)) continue;

    let current = ranges[i]!;
    used.add(i);

    let didMerge = true;
    while (didMerge) {
      didMerge = false;
      for (let j = 0; j < ranges.length; j++) {
        if (used.has(j)) continue;
        if (rangesOverlap(current.bounds, ranges[j]!.bounds)) {
          // Merge j into current
          const mergedBounds: RangeBounds = {
            startRow: Math.min(current.bounds.startRow, ranges[j]!.bounds.startRow),
            endRow: Math.max(current.bounds.endRow, ranges[j]!.bounds.endRow),
            startCol: Math.min(current.bounds.startCol, ranges[j]!.bounds.startCol),
            endCol: Math.max(current.bounds.endCol, ranges[j]!.bounds.endCol),
          };
          current = {
            ...current,
            start: { rowIndex: mergedBounds.startRow, colIndex: mergedBounds.startCol },
            end: { rowIndex: mergedBounds.endRow, colIndex: mergedBounds.endCol },
            bounds: mergedBounds,
          };
          used.add(j);
          didMerge = true;
        }
      }
    }

    merged.push(current);
  }

  return merged;
}

/**
 * Reset the internal range counter (useful for tests).
 */
export function resetRangeCounter(): void {
  rangeCounter = 0;
}
