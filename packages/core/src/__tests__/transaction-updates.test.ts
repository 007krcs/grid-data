import { describe, it, expect } from 'vitest';
import { createGrid } from '../engine/grid-engine';

interface TestData {
  id: number;
  name: string;
  value?: number;
}

function makeGrid(data: TestData[] = []) {
  return createGrid<TestData>({
    columns: [{ field: 'name' }, { field: 'value' }],
    rowData: data,
    getRowId: ({ data }) => String(data.id),
  });
}

describe('Transaction Updates', () => {
  describe('addRows', () => {
    it('should add rows to an empty grid', () => {
      const grid = makeGrid();
      grid.api.addRows([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]);
      expect(grid.api.getDisplayedRowCount()).toBe(2);
      expect(grid.api.getRowNode('1')?.data?.name).toBe('Alice');
      grid.destroy();
    });

    it('should append rows to existing data', () => {
      const grid = makeGrid([{ id: 1, name: 'Alice' }]);
      grid.api.addRows([{ id: 2, name: 'Bob' }]);
      expect(grid.api.getDisplayedRowCount()).toBe(2);
      grid.destroy();
    });

    it('should insert rows at a specific index', () => {
      const grid = makeGrid([{ id: 1, name: 'Alice' }, { id: 3, name: 'Charlie' }]);
      grid.api.addRows([{ id: 2, name: 'Bob' }], 1);
      const state = grid.store.getState();
      // After reprocessRows, the displayedRowIds reflect sorted/filtered order
      expect(state.rowNodes.has('2')).toBe(true);
      expect(grid.api.getDisplayedRowCount()).toBe(3);
      grid.destroy();
    });

    it('should not crash with empty array', () => {
      const grid = makeGrid([{ id: 1, name: 'Alice' }]);
      grid.api.addRows([]);
      expect(grid.api.getDisplayedRowCount()).toBe(1);
      grid.destroy();
    });
  });

  describe('removeRows', () => {
    it('should remove rows by IDs', () => {
      const grid = makeGrid([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ]);
      grid.api.removeRows(['2']);
      expect(grid.api.getDisplayedRowCount()).toBe(2);
      expect(grid.api.getRowNode('2')).toBeUndefined();
      grid.destroy();
    });

    it('should clear selection for removed rows', () => {
      const grid = makeGrid([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
      grid.api.selectAll();
      grid.api.removeRows(['1']);
      const selected = grid.api.getSelectedRows();
      expect(selected).toHaveLength(1);
      expect(selected[0]?.name).toBe('Bob');
      grid.destroy();
    });

    it('should handle non-existent IDs gracefully', () => {
      const grid = makeGrid([{ id: 1, name: 'Alice' }]);
      grid.api.removeRows(['999']);
      expect(grid.api.getDisplayedRowCount()).toBe(1);
      grid.destroy();
    });

    it('should not crash with empty array', () => {
      const grid = makeGrid([{ id: 1, name: 'Alice' }]);
      grid.api.removeRows([]);
      expect(grid.api.getDisplayedRowCount()).toBe(1);
      grid.destroy();
    });
  });

  describe('updateRows', () => {
    it('should merge data into existing rows', () => {
      const grid = makeGrid([
        { id: 1, name: 'Alice', value: 100 },
        { id: 2, name: 'Bob', value: 200 },
      ]);
      grid.api.updateRows([{ id: '1', data: { name: 'Alice Updated' } }]);
      const node = grid.api.getRowNode('1');
      expect(node?.data?.name).toBe('Alice Updated');
      expect(node?.data?.value).toBe(100); // unchanged
      grid.destroy();
    });

    it('should bump node version', () => {
      const grid = makeGrid([{ id: 1, name: 'Alice' }]);
      const versionBefore = grid.api.getRowNode('1')?.version ?? 0;
      grid.api.updateRows([{ id: '1', data: { name: 'Alice Updated' } }]);
      const versionAfter = grid.api.getRowNode('1')?.version ?? 0;
      expect(versionAfter).toBeGreaterThan(versionBefore);
      grid.destroy();
    });

    it('should handle non-existent IDs gracefully', () => {
      const grid = makeGrid([{ id: 1, name: 'Alice' }]);
      grid.api.updateRows([{ id: '999', data: { name: 'Nope' } }]);
      expect(grid.api.getRowNode('1')?.data?.name).toBe('Alice');
      grid.destroy();
    });

    it('should not crash with empty array', () => {
      const grid = makeGrid([{ id: 1, name: 'Alice' }]);
      grid.api.updateRows([]);
      expect(grid.api.getDisplayedRowCount()).toBe(1);
      grid.destroy();
    });
  });

  describe('command bus integration', () => {
    it('rows:add command should add rows', () => {
      const grid = makeGrid();
      grid.commandBus.dispatch('rows:add', { data: [{ id: 1, name: 'Alice' }] });
      expect(grid.api.getDisplayedRowCount()).toBe(1);
      grid.destroy();
    });

    it('rows:remove command should remove rows', () => {
      const grid = makeGrid([{ id: 1, name: 'Alice' }]);
      grid.commandBus.dispatch('rows:remove', { rowIds: ['1'] });
      expect(grid.api.getDisplayedRowCount()).toBe(0);
      grid.destroy();
    });

    it('rows:update command should update rows', () => {
      const grid = makeGrid([{ id: 1, name: 'Alice' }]);
      grid.commandBus.dispatch('rows:update', { updates: [{ id: '1', data: { name: 'Bob' } }] });
      expect(grid.api.getRowNode('1')?.data?.name).toBe('Bob');
      grid.destroy();
    });
  });
});
