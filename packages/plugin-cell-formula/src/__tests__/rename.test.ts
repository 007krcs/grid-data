// © 2025 GridStorm / Tekivex — All Rights Reserved
// Tests for the formula:* → computedColumn:* rename and collision defense.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { CellFormulaPlugin, _resetDeprecationWarningsForTests } from '../index';

interface Row { id: string; a: number; b: number; sum: number | null; }

function makeGrid() {
  return createGrid<Row>({
    columns: [{ field: 'a' }, { field: 'b' }, { field: 'sum' }],
    rowData: [
      { id: '1', a: 1, b: 2, sum: 0 },
      { id: '2', a: 10, b: 20, sum: 0 },
    ],
    getRowId: ({ data }: { data: Row }) => data.id,
    plugins: [CellFormulaPlugin()],
  });
}

beforeEach(() => {
  _resetDeprecationWarningsForTests();
});

describe('canonical computedColumn:* commands', () => {
  it('computedColumn:define registers a column and computes it', () => {
    const engine = makeGrid();
    engine.commandBus.dispatch('computedColumn:define' as any, {
      columnId: 'sum',
      compute: (row: Row) => row.a + row.b,
    } as any);

    const node1 = engine.api.getRowNode('1');
    const node2 = engine.api.getRowNode('2');
    expect((node1!.data as Row).sum).toBe(3);
    expect((node2!.data as Row).sum).toBe(30);
  });

  it('computedColumn:remove clears the computed column', () => {
    const engine = makeGrid();
    engine.commandBus.dispatch('computedColumn:define' as any, {
      columnId: 'sum',
      compute: (row: Row) => row.a + row.b,
    } as any);
    expect((engine.api.getRowNode('1')!.data as Row).sum).toBe(3);

    engine.commandBus.dispatch('computedColumn:remove' as any, { columnId: 'sum' });
    expect((engine.api.getRowNode('1')!.data as Row).sum).toBeNull();
  });

  it('computedColumn:recalculate recomputes on demand', () => {
    const engine = makeGrid();
    let multiplier = 1;
    engine.commandBus.dispatch('computedColumn:define' as any, {
      columnId: 'sum',
      compute: (row: Row) => (row.a + row.b) * multiplier,
    } as any);
    expect((engine.api.getRowNode('1')!.data as Row).sum).toBe(3);

    multiplier = 10;
    engine.commandBus.dispatch('computedColumn:recalculate' as any, {});
    expect((engine.api.getRowNode('1')!.data as Row).sum).toBe(30);
  });

  it('emits computedColumn:computed event after recompute', () => {
    const engine = makeGrid();
    const events: unknown[] = [];
    engine.eventBus.on('computedColumn:computed' as any, (e) => events.push(e));

    engine.commandBus.dispatch('computedColumn:define' as any, {
      columnId: 'sum',
      compute: (row: Row) => row.a + row.b,
    } as any);

    expect(events.length).toBeGreaterThan(0);
  });

  it('emits computedColumn:error event on compute failure', () => {
    const engine = createGrid<Row>({
      columns: [{ field: 'a' }, { field: 'b' }, { field: 'sum' }],
      rowData: [{ id: '1', a: 1, b: 2, sum: 0 }],
      getRowId: ({ data }: { data: Row }) => data.id,
      plugins: [CellFormulaPlugin({ onError: 'report' })],
    });
    const errors: unknown[] = [];
    engine.eventBus.on('computedColumn:error' as any, (e) => errors.push(e));

    engine.commandBus.dispatch('computedColumn:define' as any, {
      columnId: 'sum',
      compute: () => {
        throw new Error('boom');
      },
    } as any);

    expect(errors.length).toBe(1);
  });
});

describe('deprecated formula:* aliases', () => {
  it('formula:define still works (forwards to computedColumn:define)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const engine = makeGrid();
    engine.commandBus.dispatch('formula:define' as any, {
      columnId: 'sum',
      compute: (row: Row) => row.a + row.b,
    } as any);
    expect((engine.api.getRowNode('1')!.data as Row).sum).toBe(3);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('deprecated'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('computedColumn:define'));
    warn.mockRestore();
  });

  it('deprecation warning fires only ONCE per command name across many calls', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const engine = makeGrid();
    for (let i = 0; i < 5; i++) {
      engine.commandBus.dispatch('formula:define' as any, {
        columnId: 'sum',
        compute: () => i,
      } as any);
    }
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('emits the deprecated formula:computed event alongside the new one', () => {
    const engine = makeGrid();
    const old: unknown[] = [];
    const fresh: unknown[] = [];
    engine.eventBus.on('formula:computed' as any, (e) => old.push(e));
    engine.eventBus.on('computedColumn:computed' as any, (e) => fresh.push(e));

    engine.commandBus.dispatch('computedColumn:define' as any, {
      columnId: 'sum',
      compute: (row: Row) => row.a + row.b,
    } as any);

    // Both fire — listeners on either name see the same data.
    expect(old.length).toBeGreaterThan(0);
    expect(fresh.length).toBe(old.length);
  });
});

describe('collision defense (the actual bug this rename fixes)', () => {
  // @gridstorm/plugin-formula's formula:remove uses {rowId, colId}, not
  // {columnId}. Both plugins register on formula:remove and the CommandBus
  // broadcasts to both. Before this fix, dispatching with plugin-formula's
  // payload would scribble null over every column of every row because
  // `columnId` was undefined and `undefined in node.data` was being checked.
  //
  // After: handleRemove no-ops when columnId is missing. We don't have
  // @gridstorm/plugin-formula installed in this test (it would be a
  // cross-package import), but we can simulate the bad-payload broadcast by
  // dispatching formula:remove directly with the wrong shape.

  it('formula:remove with {rowId, colId} payload does NOT wipe row data', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const engine = makeGrid();
    engine.commandBus.dispatch('computedColumn:define' as any, {
      columnId: 'sum',
      compute: (row: Row) => row.a + row.b,
    } as any);
    expect((engine.api.getRowNode('1')!.data as Row).sum).toBe(3);

    // The shape plugin-formula would dispatch — note no `columnId`.
    engine.commandBus.dispatch('formula:remove' as any, {
      rowId: '1',
      colId: 'sum',
    } as any);

    // Computed value preserved; no nulling-out happened.
    const r1 = engine.api.getRowNode('1')!.data as Row;
    expect(r1.sum).toBe(3);
    expect(r1.a).toBe(1);
    expect(r1.b).toBe(2);
    warn.mockRestore();
  });

  it('formula:remove with the correct {columnId} payload still removes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const engine = makeGrid();
    engine.commandBus.dispatch('computedColumn:define' as any, {
      columnId: 'sum',
      compute: (row: Row) => row.a + row.b,
    } as any);
    engine.commandBus.dispatch('formula:remove' as any, { columnId: 'sum' });
    expect((engine.api.getRowNode('1')!.data as Row).sum).toBeNull();
    warn.mockRestore();
  });
});
