import { describe, it, expect, vi } from 'vitest';
import React from 'react';

// Since we're in jsdom without full React rendering,
// test the hooks and engine lifecycle logic directly

describe('React Adapter', () => {
  describe('GridStorm component', () => {
    it('should export GridStorm component', async () => {
      const mod = await import('../GridStorm');
      expect(mod.GridStorm).toBeDefined();
      expect(typeof mod.GridStorm).toBe('function');
    });

    it('should export useGridState hook', async () => {
      const mod = await import('../hooks/useGridState');
      expect(mod.useGridState).toBeDefined();
    });

    it('should export useGridColumn hook', async () => {
      const mod = await import('../hooks/useGridColumn');
      expect(mod.useGridColumn).toBeDefined();
    });

    it('should export useGridSort hook', async () => {
      const mod = await import('../hooks/useGridSort');
      expect(mod.useGridSort).toBeDefined();
    });

    it('should export useGridFilter hook', async () => {
      const mod = await import('../hooks/useGridFilter');
      expect(mod.useGridFilter).toBeDefined();
    });

    it('should export useGridSelection hook', async () => {
      const mod = await import('../hooks/useGridSelection');
      expect(mod.useGridSelection).toBeDefined();
    });

    it('should export useGridPagination hook', async () => {
      const mod = await import('../hooks/useGridPagination');
      expect(mod.useGridPagination).toBeDefined();
    });
  });

  describe('Engine lifecycle', () => {
    it('should create and destroy engine via createGrid', async () => {
      const { createGrid } = await import('../../../core/src/engine/grid-engine');
      const engine = createGrid({
        columns: [{ field: 'name' }],
        rowData: [{ name: 'Alice' }, { name: 'Bob' }],
      });

      expect(engine.api.getDisplayedRowCount()).toBe(2);
      engine.destroy();
    });

    it('should handle StrictMode double-mount pattern', async () => {
      const { createGrid } = await import('../../../core/src/engine/grid-engine');

      // Simulate StrictMode: create, destroy, create again
      const engine1 = createGrid({
        columns: [{ field: 'name' }],
        rowData: [{ name: 'Alice' }],
        getRowId: ({ data }) => data.name,
      });
      expect(engine1.api.getDisplayedRowCount()).toBe(1);
      engine1.destroy();

      // Second mount should work fine
      const engine2 = createGrid({
        columns: [{ field: 'name' }],
        rowData: [{ name: 'Bob' }],
        getRowId: ({ data }) => data.name,
      });
      expect(engine2.api.getDisplayedRowCount()).toBe(1);
      expect(engine2.api.getRowNode('Bob')?.data?.name).toBe('Bob');
      engine2.destroy();
    });

    it('should support transaction updates after creation', async () => {
      const { createGrid } = await import('../../../core/src/engine/grid-engine');
      const engine = createGrid({
        columns: [{ field: 'name' }],
        rowData: [{ name: 'Alice' }],
        getRowId: ({ data }) => data.name,
      });

      engine.api.addRows([{ name: 'Bob' }]);
      expect(engine.api.getDisplayedRowCount()).toBe(2);

      engine.api.removeRows(['Alice']);
      expect(engine.api.getDisplayedRowCount()).toBe(1);

      engine.destroy();
    });
  });
});
