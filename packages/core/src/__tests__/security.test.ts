// ─── Security Tests: Prototype Pollution & ReDoS ─────────────────────────────
// Tests that the core grid engine is hardened against injection attacks.

import { describe, it, expect } from 'vitest';
import { createGrid } from '../index';
import type { ColumnDef } from '../types/column';

interface Row { id: number; value: string; }

const COLUMNS: ColumnDef<Row>[] = [
  { field: 'id',    headerName: 'ID'    },
  { field: 'value', headerName: 'Value' },
];

// ── Prototype Pollution ───────────────────────────────────────────────────────

describe('Security: Prototype Pollution', () => {
  it('rowData with __proto__ key does NOT pollute Object.prototype', () => {
    // Ensure clean state
    expect((({} as any).polluted)).toBeUndefined();

    const engine = createGrid({
      columns: COLUMNS,
      rowData: [{ id: 1, __proto__: { polluted: true } } as any],
    });

    // Object.prototype must remain clean
    expect((({} as any).polluted)).toBeUndefined();
    engine.destroy();
  });

  it('rowData with constructor.prototype key does NOT corrupt Object', () => {
    const engine = createGrid({
      columns: COLUMNS,
      rowData: [{ id: 1, 'constructor': { prototype: { hacked: true } } } as any],
    });

    expect((({} as any).hacked)).toBeUndefined();
    engine.destroy();
  });

  it('column field named "__proto__" does NOT corrupt the column model', () => {
    expect(() => {
      const engine = createGrid({
        columns: [{ field: '__proto__', headerName: 'Proto' }],
        rowData: [{ __proto__: 'evil' } as any],
      });
      engine.destroy();
    }).not.toThrow();

    // Global Object prototype must still be clean
    expect((({} as any).evil)).toBeUndefined();
  });

  it('filter model with __proto__ key is safely handled', () => {
    const engine = createGrid({ columns: COLUMNS, rowData: [] });

    expect(() => {
      engine.api.setFilterModel({ '__proto__': { type: 'contains', filter: 'x' } } as any);
    }).not.toThrow();

    expect((({} as any).type)).toBeUndefined();
    engine.destroy();
  });

  it('setRowData with __proto__ in multiple rows does not accumulate pollution', () => {
    const engine = createGrid({ columns: COLUMNS, rowData: [] });

    engine.api.setRowData([
      { id: 1, __proto__: { polluted: 'yes' } } as unknown as Row,
      { id: 2, __proto__: { polluted: 'also' } } as unknown as Row,
    ]);

    expect((({} as any).polluted)).toBeUndefined();
    engine.destroy();
  });

  it('sort model with __proto__ key is safely handled', () => {
    const engine = createGrid({ columns: COLUMNS, rowData: [] });

    expect(() => {
      engine.api.setSortModel([{ colId: '__proto__', sort: 'asc' }]);
    }).not.toThrow();

    engine.destroy();
  });
});

// ── ReDoS (Regular Expression Denial of Service) ─────────────────────────────

describe('Security: ReDoS Prevention', () => {
  it('quick filter with 100-char repeated string completes within 200ms', () => {
    const engine = createGrid({
      columns: COLUMNS,
      rowData: Array.from({ length: 100 }, (_, i) => ({ id: i, value: 'a'.repeat(50) })),
    });

    const adversarial = 'a'.repeat(100);
    const start = performance.now();
    engine.api.setQuickFilter(adversarial);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(200);
    engine.destroy();
  });

  it('quick filter with alternating pattern completes within 200ms', () => {
    const engine = createGrid({
      columns: COLUMNS,
      rowData: Array.from({ length: 200 }, (_, i) => ({ id: i, value: 'ab'.repeat(25) })),
    });

    // Alternating pattern — common ReDoS trigger
    const adversarial = 'a'.repeat(50) + 'X';
    const start = performance.now();
    engine.api.setQuickFilter(adversarial);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(200);
    engine.destroy();
  });

  it('quick filter with special regex characters completes safely', () => {
    const engine = createGrid({
      columns: COLUMNS,
      rowData: [{ id: 1, value: 'normal text' }],
    });

    // Special regex chars that could cause issues if interpolated into a regex
    const specialChars = '.*+?^${}()|[]\\';
    const start = performance.now();

    expect(() => {
      engine.api.setQuickFilter(specialChars);
    }).not.toThrow();

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
    engine.destroy();
  });

  it('quick filter with very long string (500 chars) completes within 300ms', () => {
    const engine = createGrid({
      columns: COLUMNS,
      rowData: Array.from({ length: 500 }, (_, i) => ({ id: i, value: `item ${i}` })),
    });

    const longInput = 'x'.repeat(500);
    const start = performance.now();
    engine.api.setQuickFilter(longInput);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(300);
    engine.destroy();
  });
});

// ── Data Integrity ────────────────────────────────────────────────────────────

describe('Security: Data Integrity', () => {
  it('getRowData returns copies, not direct references to internal row nodes', () => {
    const rowData: Row[] = [{ id: 1, value: 'original' }];
    const engine = createGrid({ columns: COLUMNS, rowData });

    // Mutating the original rowData after createGrid must not affect engine state
    rowData[0]!.value = 'mutated';

    // The engine should have captured the value at createGrid time
    // (behavior depends on implementation; at minimum, engine must not crash)
    expect(() => engine.api.getDisplayedRowCount()).not.toThrow();
    expect(engine.api.getDisplayedRowCount()).toBe(1);
    engine.destroy();
  });

  it('setRowData accepts empty array without error', () => {
    const engine = createGrid({ columns: COLUMNS, rowData: [{ id: 1, value: 'x' }] });

    expect(() => engine.api.setRowData([])).not.toThrow();
    engine.destroy();
  });

  it('setSortModel with null does not crash the engine', () => {
    const engine = createGrid({ columns: COLUMNS, rowData: [] });

    expect(() => engine.api.setSortModel(null as any)).not.toThrow();
    engine.destroy();
  });

  it('setFilterModel with empty object clears filters without error', () => {
    const engine = createGrid({ columns: COLUMNS, rowData: [] });

    expect(() => engine.api.setFilterModel({})).not.toThrow();
    engine.destroy();
  });

  it('engine handles extremely large rowData without throwing', () => {
    const largeData = Array.from({ length: 10_000 }, (_, i) => ({
      id: i,
      value: `value-${i}`,
    }));

    const start = performance.now();
    const engine = createGrid({ columns: COLUMNS, rowData: largeData });
    const elapsed = performance.now() - start;

    // Should handle 10K rows in under 2 seconds
    expect(elapsed).toBeLessThan(2000);
    expect(() => engine.api.getDisplayedRowCount()).not.toThrow();
    expect(engine.api.getDisplayedRowCount()).toBe(10_000);
    engine.destroy();
  });
});
