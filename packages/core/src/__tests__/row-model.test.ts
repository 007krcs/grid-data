import { describe, it, expect } from 'vitest';
import {
  createRowNodes,
  sortRowNodes,
  filterRowNodes,
  getValueFromData,
  defaultComparator,
  assignDisplayPositions,
} from '../engine/row-model';
import type { ColumnState } from '../types/column';

// Helper to create minimal column state
function col(colId: string, field: string): ColumnState {
  return {
    colId,
    field,
    headerName: colId,
    width: 100,
    minWidth: 50,
    maxWidth: Infinity,
    flex: null,
    hide: false,
    pinned: null,
    sort: null,
    sortIndex: null,
    sortable: true,
    filterable: true,
    resizable: true,
    editable: false,
    rowGroup: false,
    rowGroupIndex: null,
    pivot: false,
    pivotIndex: null,
    aggFunc: null,
    originalDef: { field } as any,
  };
}

describe('createRowNodes', () => {
  it('should create row nodes from data', () => {
    const data = [{ name: 'Alice' }, { name: 'Bob' }];
    const nodes = createRowNodes(data);

    expect(nodes).toHaveLength(2);
    expect(nodes[0]!.id).toBe('row-0');
    expect(nodes[0]!.data).toBe(data[0]);
    expect(nodes[1]!.id).toBe('row-1');
  });

  it('should use custom getRowId', () => {
    const data = [{ id: 'abc' }, { id: 'def' }];
    const nodes = createRowNodes(data, ({ data }) => data.id);

    expect(nodes[0]!.id).toBe('abc');
    expect(nodes[1]!.id).toBe('def');
  });

  it('should assign row heights and positions', () => {
    const data = [{ name: 'A' }, { name: 'B' }];
    const nodes = createRowNodes(data, undefined, 50);

    expect(nodes[0]!.rowHeight).toBe(50);
    expect(nodes[0]!.rowTop).toBe(0);
    expect(nodes[1]!.rowTop).toBe(50);
  });
});

describe('getValueFromData', () => {
  it('should get simple field values', () => {
    expect(getValueFromData({ name: 'Alice' }, 'name')).toBe('Alice');
  });

  it('should get nested field values with dot notation', () => {
    expect(getValueFromData({ address: { city: 'NYC' } }, 'address.city')).toBe('NYC');
  });

  it('should return undefined for missing paths', () => {
    expect(getValueFromData({ name: 'Alice' }, 'age')).toBeUndefined();
  });

  it('should return undefined for null data', () => {
    expect(getValueFromData(null, 'name')).toBeUndefined();
  });

  it('should return undefined for undefined field', () => {
    expect(getValueFromData({ name: 'Alice' }, undefined)).toBeUndefined();
  });
});

describe('sortRowNodes', () => {
  it('should sort by single column ascending', () => {
    const data = [{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }];
    const nodes = createRowNodes(data);
    const columns = [col('name', 'name')];

    const sorted = sortRowNodes(nodes, [{ colId: 'name', sort: 'asc' }], columns);

    expect(sorted.map((n) => n.data!.name)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('should sort descending', () => {
    const data = [{ name: 'Alice' }, { name: 'Charlie' }, { name: 'Bob' }];
    const nodes = createRowNodes(data);
    const columns = [col('name', 'name')];

    const sorted = sortRowNodes(nodes, [{ colId: 'name', sort: 'desc' }], columns);

    expect(sorted.map((n) => n.data!.name)).toEqual(['Charlie', 'Bob', 'Alice']);
  });

  it('should return same array when no sort model', () => {
    const nodes = createRowNodes([{ name: 'A' }]);
    const result = sortRowNodes(nodes, [], []);
    expect(result).toBe(nodes);
  });

  it('should handle numeric sorting', () => {
    const data = [{ age: 30 }, { age: 10 }, { age: 20 }];
    const nodes = createRowNodes(data);
    const columns = [col('age', 'age')];

    const sorted = sortRowNodes(nodes, [{ colId: 'age', sort: 'asc' }], columns);

    expect(sorted.map((n) => n.data!.age)).toEqual([10, 20, 30]);
  });
});

describe('sortRowNodes (precomputed keys)', () => {
  function naiveSort(nodes: ReturnType<typeof createRowNodes>, model: { colId: string; sort: 'asc' | 'desc' }[], columns: ReturnType<typeof col>[]) {
    // Reference implementation: the original per-comparison algorithm.
    return [...nodes].sort((a, b) => {
      for (const item of model) {
        const c = columns.find((x) => x.colId === item.colId)!;
        const r = defaultComparator(getValueFromData(a.data, c.field), getValueFromData(b.data, c.field));
        if (r !== 0) return item.sort === 'desc' ? -r : r;
      }
      return 0;
    });
  }

  it('matches the reference comparator on mixed numbers, strings, nulls, and case', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const pool = [3, 'b', null, 'A', 10, undefined, 'a', '2', 2, 'B', '', 'zeta', 0, -1];
    const data = Array.from({ length: 500 }, () => ({
      x: pool[Math.floor(rnd() * pool.length)],
      y: pool[Math.floor(rnd() * pool.length)],
    }));
    const nodes = createRowNodes(data);
    const columns = [col('x', 'x'), col('y', 'y')];
    for (const model of [
      [{ colId: 'x', sort: 'asc' as const }],
      [{ colId: 'x', sort: 'desc' as const }],
      [{ colId: 'x', sort: 'asc' as const }, { colId: 'y', sort: 'desc' as const }],
    ]) {
      const fast = sortRowNodes(nodes, model, columns).map((n) => n.id);
      const slow = naiveSort(nodes, model, columns).map((n) => n.id);
      expect(fast).toEqual(slow);
    }
  });

  it('is stable: equal keys keep source order', () => {
    const data = Array.from({ length: 50 }, (_, i) => ({ g: i % 3, i }));
    const nodes = createRowNodes(data);
    const sorted = sortRowNodes(nodes, [{ colId: 'g', sort: 'asc' }], [col('g', 'g')]);
    const zeros = sorted.filter((n) => n.data!.g === 0).map((n) => n.data!.i);
    expect(zeros).toEqual([...zeros].sort((a, b) => a - b));
  });

  it('still honours a custom comparator with raw values and nodes', () => {
    const data = [{ v: 'bb' }, { v: 'a' }, { v: 'cccc' }];
    const nodes = createRowNodes(data);
    const c = col('v', 'v');
    (c.originalDef as any).comparator = (a: string, b: string) => a.length - b.length;
    const sorted = sortRowNodes(nodes, [{ colId: 'v', sort: 'desc' }], [c]);
    expect(sorted.map((n) => n.data!.v)).toEqual(['cccc', 'bb', 'a']);
  });

  it('ignores sort items whose column does not exist', () => {
    const nodes = createRowNodes([{ a: 2 }, { a: 1 }]);
    const sorted = sortRowNodes(nodes, [{ colId: 'missing', sort: 'asc' }, { colId: 'a', sort: 'asc' }], [col('a', 'a')]);
    expect(sorted.map((n) => n.data!.a)).toEqual([1, 2]);
  });

  it('sorts 100k rows by a string column well under a second', () => {
    const data = Array.from({ length: 100_000 }, (_, i) => ({ name: `Person ${(i * 7919) % 100_000}` }));
    const nodes = createRowNodes(data);
    const t0 = performance.now();
    const sorted = sortRowNodes(nodes, [{ colId: 'name', sort: 'asc' }], [col('name', 'name')]);
    const ms = performance.now() - t0;
    expect(sorted).toHaveLength(100_000);
    expect(sorted[0]!.data!.name).toBe('Person 0');
    expect(ms).toBeLessThan(1000);
  });
});

describe('defaultComparator', () => {
  it('should compare numbers', () => {
    expect(defaultComparator(1, 2)).toBeLessThan(0);
    expect(defaultComparator(2, 1)).toBeGreaterThan(0);
    expect(defaultComparator(1, 1)).toBe(0);
  });

  it('should compare strings case-insensitively', () => {
    expect(defaultComparator('apple', 'Banana')).toBeLessThan(0);
    expect(defaultComparator('Banana', 'apple')).toBeGreaterThan(0);
  });

  it('should sort nulls to end', () => {
    expect(defaultComparator(null, 1)).toBe(1);
    expect(defaultComparator(1, null)).toBe(-1);
    expect(defaultComparator(null, null)).toBe(0);
  });
});

describe('filterRowNodes', () => {
  it('should filter with equals operator', () => {
    const data = [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Alice' }];
    const nodes = createRowNodes(data);
    const columns = [col('name', 'name')];

    const filtered = filterRowNodes(
      nodes,
      { name: { filterType: 'text', type: 'equals', filter: 'Alice' } },
      columns,
      '',
    );

    expect(filtered).toHaveLength(2);
  });

  it('should filter with contains operator', () => {
    const data = [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Alex' }];
    const nodes = createRowNodes(data);
    const columns = [col('name', 'name')];

    const filtered = filterRowNodes(
      nodes,
      { name: { filterType: 'text', type: 'contains', filter: 'Al' } },
      columns,
      '',
    );

    expect(filtered).toHaveLength(2);
  });

  it('should apply quick filter across all visible columns', () => {
    const data = [
      { name: 'Alice', city: 'NYC' },
      { name: 'Bob', city: 'LA' },
      { name: 'Charlie', city: 'Chicago' },
    ];
    const nodes = createRowNodes(data);
    const columns = [col('name', 'name'), col('city', 'city')];

    const filtered = filterRowNodes(nodes, {}, columns, 'chi');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.data!.city).toBe('Chicago');
  });

  it('should return all rows when no filters active', () => {
    const nodes = createRowNodes([{ a: 1 }, { a: 2 }]);
    const result = filterRowNodes(nodes, {}, [], '');
    expect(result).toBe(nodes);
  });
});

describe('assignDisplayPositions', () => {
  it('should assign sequential indices and cumulative tops', () => {
    const nodes = createRowNodes([{ a: 1 }, { a: 2 }, { a: 3 }]);

    assignDisplayPositions(nodes);

    expect(nodes[0]!.displayIndex).toBe(0);
    expect(nodes[1]!.displayIndex).toBe(1);
    expect(nodes[2]!.displayIndex).toBe(2);
    expect(nodes[0]!.rowTop).toBe(0);
    expect(nodes[1]!.rowTop).toBe(40); // default height
    expect(nodes[2]!.rowTop).toBe(80);
  });
});
