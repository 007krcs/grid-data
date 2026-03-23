import { describe, it, expect, beforeEach } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { CellRangePlugin } from '../cell-range-plugin';
import {
  createRange,
  expandRange,
  isInRange,
  getRangeCells,
  normalizeRange,
  mergeRanges,
  resetRangeCounter,
} from '../range-model';
import { detectPattern } from '../pattern-detector';
import { generateFillValues } from '../fill-engine';
import type { CellRangeState } from '../types';

// ── Helpers ──

function createTestGrid(pluginOptions = {}) {
  return createGrid({
    columns: [
      { field: 'name' },
      { field: 'value' },
      { field: 'category' },
    ],
    rowData: [
      { name: 'Item 1', value: 10, category: 'A' },
      { name: 'Item 2', value: 20, category: 'B' },
      { name: 'Item 3', value: 30, category: 'A' },
      { name: 'Item 4', value: 40, category: 'B' },
      { name: 'Item 5', value: 50, category: 'A' },
    ],
    plugins: [CellRangePlugin(pluginOptions)],
  });
}

function getPluginState(engine: ReturnType<typeof createGrid>): CellRangeState {
  return engine.api.getState().pluginState['cellRange'] as CellRangeState;
}

// ════════════════════════════════════════
// Range Model Tests
// ════════════════════════════════════════

describe('Range Model', () => {
  beforeEach(() => {
    resetRangeCounter();
  });

  it('normalizeRange ensures start <= end', () => {
    const bounds = normalizeRange(
      { rowIndex: 5, colIndex: 3 },
      { rowIndex: 2, colIndex: 1 },
    );
    expect(bounds.startRow).toBe(2);
    expect(bounds.endRow).toBe(5);
    expect(bounds.startCol).toBe(1);
    expect(bounds.endCol).toBe(3);
  });

  it('createRange produces a range with normalized bounds', () => {
    const range = createRange(
      { rowIndex: 3, colIndex: 2 },
      { rowIndex: 1, colIndex: 0 },
    );
    expect(range.id).toBe('range-1');
    expect(range.start).toEqual({ rowIndex: 3, colIndex: 2 });
    expect(range.end).toEqual({ rowIndex: 1, colIndex: 0 });
    expect(range.bounds.startRow).toBe(1);
    expect(range.bounds.endRow).toBe(3);
    expect(range.bounds.startCol).toBe(0);
    expect(range.bounds.endCol).toBe(2);
  });

  it('expandRange updates end and recalculates bounds', () => {
    const range = createRange(
      { rowIndex: 0, colIndex: 0 },
      { rowIndex: 1, colIndex: 1 },
    );
    const expanded = expandRange(range, { rowIndex: 4, colIndex: 3 });
    expect(expanded.end).toEqual({ rowIndex: 4, colIndex: 3 });
    expect(expanded.bounds.endRow).toBe(4);
    expect(expanded.bounds.endCol).toBe(3);
    // Start stays the same
    expect(expanded.start).toEqual({ rowIndex: 0, colIndex: 0 });
  });

  it('isInRange correctly checks point membership', () => {
    const range = createRange(
      { rowIndex: 1, colIndex: 1 },
      { rowIndex: 3, colIndex: 3 },
    );
    expect(isInRange({ rowIndex: 2, colIndex: 2 }, range)).toBe(true);
    expect(isInRange({ rowIndex: 1, colIndex: 1 }, range)).toBe(true);
    expect(isInRange({ rowIndex: 3, colIndex: 3 }, range)).toBe(true);
    expect(isInRange({ rowIndex: 0, colIndex: 0 }, range)).toBe(false);
    expect(isInRange({ rowIndex: 4, colIndex: 2 }, range)).toBe(false);
  });

  it('getRangeCells enumerates all cells in row-major order', () => {
    const range = createRange(
      { rowIndex: 0, colIndex: 0 },
      { rowIndex: 1, colIndex: 2 },
    );
    const cells = getRangeCells(range);
    expect(cells).toHaveLength(6); // 2 rows * 3 cols
    expect(cells[0]).toEqual({ rowIndex: 0, colIndex: 0 });
    expect(cells[1]).toEqual({ rowIndex: 0, colIndex: 1 });
    expect(cells[2]).toEqual({ rowIndex: 0, colIndex: 2 });
    expect(cells[3]).toEqual({ rowIndex: 1, colIndex: 0 });
    expect(cells[5]).toEqual({ rowIndex: 1, colIndex: 2 });
  });

  it('mergeRanges combines overlapping ranges', () => {
    const r1 = createRange({ rowIndex: 0, colIndex: 0 }, { rowIndex: 2, colIndex: 2 });
    const r2 = createRange({ rowIndex: 1, colIndex: 1 }, { rowIndex: 3, colIndex: 3 });
    const merged = mergeRanges([r1, r2]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.bounds.startRow).toBe(0);
    expect(merged[0]!.bounds.endRow).toBe(3);
    expect(merged[0]!.bounds.startCol).toBe(0);
    expect(merged[0]!.bounds.endCol).toBe(3);
  });

  it('mergeRanges keeps non-overlapping ranges separate', () => {
    const r1 = createRange({ rowIndex: 0, colIndex: 0 }, { rowIndex: 1, colIndex: 1 });
    const r2 = createRange({ rowIndex: 5, colIndex: 5 }, { rowIndex: 6, colIndex: 6 });
    const merged = mergeRanges([r1, r2]);
    expect(merged).toHaveLength(2);
  });

  it('multiple ranges with unique IDs', () => {
    const r1 = createRange({ rowIndex: 0, colIndex: 0 }, { rowIndex: 0, colIndex: 0 });
    const r2 = createRange({ rowIndex: 1, colIndex: 1 }, { rowIndex: 1, colIndex: 1 });
    expect(r1.id).not.toBe(r2.id);
  });
});

// ════════════════════════════════════════
// Pattern Detection Tests
// ════════════════════════════════════════

describe('Pattern Detection', () => {
  it('detects positive number increment', () => {
    const pattern = detectPattern([1, 2, 3, 4, 5]);
    expect(pattern.type).toBe('number-increment');
    if (pattern.type === 'number-increment') {
      expect(pattern.start).toBe(1);
      expect(pattern.step).toBe(1);
    }
  });

  it('detects negative number increment', () => {
    const pattern = detectPattern([10, 8, 6, 4]);
    expect(pattern.type).toBe('number-increment');
    if (pattern.type === 'number-increment') {
      expect(pattern.start).toBe(10);
      expect(pattern.step).toBe(-2);
    }
  });

  it('detects decimal number increment', () => {
    const pattern = detectPattern([0.5, 1.0, 1.5, 2.0]);
    expect(pattern.type).toBe('number-increment');
    if (pattern.type === 'number-increment') {
      expect(pattern.start).toBe(0.5);
      expect(pattern.step).toBeCloseTo(0.5);
    }
  });

  it('detects large number steps', () => {
    const pattern = detectPattern([10, 20, 30]);
    expect(pattern.type).toBe('number-increment');
    if (pattern.type === 'number-increment') {
      expect(pattern.step).toBe(10);
    }
  });

  it('detects daily date increment', () => {
    const pattern = detectPattern(['2024-01-01', '2024-01-02', '2024-01-03']);
    expect(pattern.type).toBe('date-increment');
    if (pattern.type === 'date-increment') {
      expect(pattern.stepMs).toBe(86400000); // 1 day in ms
    }
  });

  it('detects text series like "Item 1", "Item 2"', () => {
    const pattern = detectPattern(['Item 1', 'Item 2', 'Item 3']);
    expect(pattern.type).toBe('text-series');
    if (pattern.type === 'text-series') {
      expect(pattern.prefix).toBe('Item ');
      expect(pattern.numStart).toBe(1);
      expect(pattern.step).toBe(1);
      expect(pattern.suffix).toBe('');
    }
  });

  it('detects text series with suffix', () => {
    const pattern = detectPattern(['Row1x', 'Row2x', 'Row3x']);
    expect(pattern.type).toBe('text-series');
    if (pattern.type === 'text-series') {
      expect(pattern.prefix).toBe('Row');
      expect(pattern.suffix).toBe('x');
      expect(pattern.step).toBe(1);
    }
  });

  it('detects repeating pattern', () => {
    const pattern = detectPattern(['A', 'B', 'A', 'B']);
    expect(pattern.type).toBe('repeat');
    if (pattern.type === 'repeat') {
      expect(pattern.values).toEqual(['A', 'B']);
    }
  });

  it('single value returns copy', () => {
    const pattern = detectPattern([42]);
    expect(pattern.type).toBe('copy');
    if (pattern.type === 'copy') {
      expect(pattern.value).toBe(42);
    }
  });

  it('empty array returns copy with undefined', () => {
    const pattern = detectPattern([]);
    expect(pattern.type).toBe('copy');
    if (pattern.type === 'copy') {
      expect(pattern.value).toBeUndefined();
    }
  });

  it('mixed types fall back to copy', () => {
    const pattern = detectPattern([1, 'two', 3, 'four']);
    expect(pattern.type).toBe('copy');
  });
});

// ════════════════════════════════════════
// Fill Engine Tests
// ════════════════════════════════════════

describe('Fill Engine', () => {
  it('fills number increment downward', () => {
    const pattern = detectPattern([1, 2, 3]);
    const values = generateFillValues(pattern, 3, 3);
    expect(values).toEqual([4, 5, 6]);
  });

  it('fills text series', () => {
    const pattern = detectPattern(['Item 1', 'Item 2', 'Item 3']);
    const values = generateFillValues(pattern, 2, 3);
    expect(values).toEqual(['Item 4', 'Item 5']);
  });

  it('fills repeating pattern', () => {
    const pattern = detectPattern(['A', 'B', 'A', 'B']);
    const values = generateFillValues(pattern, 4, 4);
    expect(values).toEqual(['A', 'B', 'A', 'B']);
  });

  it('fills copy pattern', () => {
    const pattern = detectPattern([42]);
    const values = generateFillValues(pattern, 3, 1);
    expect(values).toEqual([42, 42, 42]);
  });

  it('fills date increment', () => {
    const pattern = detectPattern(['2024-01-01', '2024-01-02', '2024-01-03']);
    const values = generateFillValues(pattern, 2, 3);
    expect(values).toEqual(['2024-01-04', '2024-01-05']);
  });
});

// ════════════════════════════════════════
// Plugin Integration Tests
// ════════════════════════════════════════

describe('CellRangePlugin Integration', () => {
  it('creates grid with cell-range plugin', () => {
    const engine = createTestGrid();
    expect(engine.api).toBeDefined();
    const state = getPluginState(engine);
    expect(state.ranges).toEqual([]);
    expect(state.activeRangeId).toBeNull();
    engine.destroy();
  });

  it('range:select command creates a range', () => {
    const engine = createTestGrid();

    engine.commandBus.dispatch('range:select', {
      startRow: 0,
      startCol: 0,
      endRow: 2,
      endCol: 1,
    });

    const state = getPluginState(engine);
    expect(state.ranges).toHaveLength(1);
    expect(state.ranges[0]!.bounds.startRow).toBe(0);
    expect(state.ranges[0]!.bounds.endRow).toBe(2);
    expect(state.ranges[0]!.bounds.startCol).toBe(0);
    expect(state.ranges[0]!.bounds.endCol).toBe(1);
    expect(state.activeRangeId).toBe(state.ranges[0]!.id);
    engine.destroy();
  });

  it('range:select with append adds multiple ranges', () => {
    const engine = createTestGrid({ multiRange: true });

    engine.commandBus.dispatch('range:select', {
      startRow: 0, startCol: 0, endRow: 0, endCol: 0,
    });
    engine.commandBus.dispatch('range:select', {
      startRow: 2, startCol: 2, endRow: 2, endCol: 2, append: true,
    });

    const state = getPluginState(engine);
    expect(state.ranges).toHaveLength(2);
    engine.destroy();
  });

  it('range:clear removes all ranges', () => {
    const engine = createTestGrid();

    engine.commandBus.dispatch('range:select', {
      startRow: 0, startCol: 0, endRow: 2, endCol: 2,
    });

    let state = getPluginState(engine);
    expect(state.ranges).toHaveLength(1);

    engine.commandBus.dispatch('range:clear', {});

    state = getPluginState(engine);
    expect(state.ranges).toHaveLength(0);
    expect(state.activeRangeId).toBeNull();
    engine.destroy();
  });

  it('range:fill with number pattern fills cells', () => {
    const engine = createTestGrid();

    // Select the 'value' column (index 1), rows 0-2 (values: 10, 20, 30)
    engine.commandBus.dispatch('range:select', {
      startRow: 0, startCol: 1, endRow: 2, endCol: 1,
    });

    // Fill down 2 rows
    engine.commandBus.dispatch('range:fill', {
      direction: 'down',
      count: 2,
    });

    // Check that rows 3 and 4 now have value 40 and 50
    const gridState = engine.api.getState();
    const row3Id = gridState.displayedRowIds[3]!;
    const row4Id = gridState.displayedRowIds[4]!;
    const row3 = gridState.rowNodes.get(row3Id);
    const row4 = gridState.rowNodes.get(row4Id);
    expect((row3!.data as any).value).toBe(40);
    expect((row4!.data as any).value).toBe(50);
    engine.destroy();
  });

  it('range:delete clears values in selected range', () => {
    const engine = createTestGrid();

    // Select value column, rows 0-1
    engine.commandBus.dispatch('range:select', {
      startRow: 0, startCol: 1, endRow: 1, endCol: 1,
    });

    engine.commandBus.dispatch('range:delete', {});

    const gridState = engine.api.getState();
    const row0Id = gridState.displayedRowIds[0]!;
    const row1Id = gridState.displayedRowIds[1]!;
    const row0 = gridState.rowNodes.get(row0Id);
    const row1 = gridState.rowNodes.get(row1Id);
    expect((row0!.data as any).value).toBeNull();
    expect((row1!.data as any).value).toBeNull();
    engine.destroy();
  });

  it('range:selectAll selects entire grid', () => {
    const engine = createTestGrid();

    engine.commandBus.dispatch('range:selectAll', {});

    const state = getPluginState(engine);
    expect(state.ranges).toHaveLength(1);
    expect(state.ranges[0]!.bounds.startRow).toBe(0);
    expect(state.ranges[0]!.bounds.endRow).toBe(4); // 5 rows, index 0-4
    expect(state.ranges[0]!.bounds.startCol).toBe(0);
    expect(state.ranges[0]!.bounds.endCol).toBe(2); // 3 columns, index 0-2
    engine.destroy();
  });

  it('range:expand updates the active range end position', () => {
    const engine = createTestGrid();

    engine.commandBus.dispatch('range:select', {
      startRow: 0, startCol: 0, endRow: 1, endCol: 1,
    });

    engine.commandBus.dispatch('range:expand', {
      endRow: 3, endCol: 2,
    });

    const state = getPluginState(engine);
    expect(state.ranges[0]!.bounds.endRow).toBe(3);
    expect(state.ranges[0]!.bounds.endCol).toBe(2);
    engine.destroy();
  });
});
