import { describe, it, expect } from 'vitest';
import {
  resolveColumns,
  applyFlexSizing,
  partitionColumns,
  findColumn,
  updateColumn,
} from '../engine/column-model';
import type { ColumnDef } from '../types/column';

describe('resolveColumns', () => {
  it('should resolve basic column definitions', () => {
    const defs: ColumnDef[] = [
      { field: 'name', headerName: 'Name' },
      { field: 'age', headerName: 'Age', width: 100 },
    ];

    const columns = resolveColumns(defs);

    expect(columns).toHaveLength(2);
    expect(columns[0]!.colId).toBe('name');
    expect(columns[0]!.headerName).toBe('Name');
    expect(columns[0]!.width).toBe(200); // default
    expect(columns[1]!.width).toBe(100);
  });

  it('should apply defaultColDef', () => {
    const defs: ColumnDef[] = [{ field: 'name' }, { field: 'age' }];
    const defaults = { sortable: true, width: 150 };

    const columns = resolveColumns(defs, defaults);

    expect(columns[0]!.sortable).toBe(true);
    expect(columns[0]!.width).toBe(150);
    expect(columns[1]!.sortable).toBe(true);
  });

  it('should override defaults with column-specific values', () => {
    const defs: ColumnDef[] = [{ field: 'name', width: 300, sortable: false }];
    const defaults = { sortable: true, width: 150 };

    const columns = resolveColumns(defs, defaults);

    expect(columns[0]!.sortable).toBe(false);
    expect(columns[0]!.width).toBe(300);
  });

  it('should flatten column groups', () => {
    const defs: ColumnDef[] = [
      {
        groupId: 'personal',
        headerName: 'Personal',
        children: [{ field: 'name' }, { field: 'age' }],
      },
      { field: 'email' },
    ];

    const columns = resolveColumns(defs);

    expect(columns).toHaveLength(3);
    expect(columns.map((c) => c.colId)).toEqual(['name', 'age', 'email']);
  });

  it('should auto-generate colId from field', () => {
    const columns = resolveColumns([{ field: 'name' }]);
    expect(columns[0]!.colId).toBe('name');
  });
});

describe('applyFlexSizing', () => {
  it('should distribute available width among flex columns', () => {
    const columns = resolveColumns([
      { field: 'a', width: 100 },
      { field: 'b', flex: 1 },
      { field: 'c', flex: 2 },
    ]);

    const sized = applyFlexSizing(columns, 700);

    expect(sized[0]!.width).toBe(100); // fixed
    expect(sized[1]!.width).toBe(200); // 1/3 of 600
    expect(sized[2]!.width).toBe(400); // 2/3 of 600
  });

  it('should respect min/max width on flex columns', () => {
    const columns = resolveColumns([
      { field: 'a', flex: 1, minWidth: 300 },
    ]);

    const sized = applyFlexSizing(columns, 200);

    expect(sized[0]!.width).toBe(300); // clamped to min
  });
});

describe('partitionColumns', () => {
  it('should separate columns by pin position', () => {
    const columns = resolveColumns([
      { field: 'a', pinned: 'left' },
      { field: 'b' },
      { field: 'c', pinned: 'right' },
      { field: 'd' },
    ]);

    const { left, center, right } = partitionColumns(columns);

    expect(left.map((c) => c.colId)).toEqual(['a']);
    expect(center.map((c) => c.colId)).toEqual(['b', 'd']);
    expect(right.map((c) => c.colId)).toEqual(['c']);
  });

  it('should exclude hidden columns', () => {
    const columns = resolveColumns([
      { field: 'a' },
      { field: 'b', hide: true },
    ]);

    const { center } = partitionColumns(columns);
    expect(center).toHaveLength(1);
    expect(center[0]!.colId).toBe('a');
  });
});

describe('findColumn', () => {
  it('should find column by ID', () => {
    const columns = resolveColumns([{ field: 'name' }, { field: 'age' }]);
    const found = findColumn(columns, 'name');
    expect(found?.colId).toBe('name');
  });

  it('should return undefined for missing column', () => {
    const columns = resolveColumns([{ field: 'name' }]);
    expect(findColumn(columns, 'missing')).toBeUndefined();
  });
});

describe('updateColumn', () => {
  it('should update a single column', () => {
    const columns = resolveColumns([{ field: 'name' }, { field: 'age' }]);
    const updated = updateColumn(columns, 'name', { width: 300 });

    expect(updated[0]!.width).toBe(300);
    expect(updated[1]!.width).toBe(200); // unchanged
  });
});
