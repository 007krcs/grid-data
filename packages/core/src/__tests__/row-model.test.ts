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
