import { describe, it, expect, vi } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { StatePersistencePlugin } from '../state-persistence-plugin';
import type { StorageAdapter, GridStateSnapshot } from '../state-persistence-plugin';

function createMockStorage(): StorageAdapter & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem(key: string) { return data.get(key) ?? null; },
    setItem(key: string, value: string) { data.set(key, value); },
    removeItem(key: string) { data.delete(key); },
  };
}

function makeColumns() {
  return [
    { field: 'name' },
    { field: 'age' },
    { field: 'score' },
  ];
}

function makeRowData() {
  return [
    { name: 'Alice', age: 30, score: 85 },
    { name: 'Bob', age: 25, score: 90 },
    { name: 'Charlie', age: 35, score: 75 },
  ];
}

describe('StatePersistencePlugin', () => {
  it('creates grid with state persistence plugin', () => {
    const storage = createMockStorage();
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [StatePersistencePlugin({ storage })],
    });

    expect(engine.api).toBeDefined();
    expect(engine.store).toBeDefined();

    engine.destroy();
  });

  it('state:save saves current state to storage', async () => {
    const storage = createMockStorage();
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [StatePersistencePlugin({ storage, autoSave: false })],
    });

    engine.commandBus.dispatch('state:save', {});

    // Allow async save to complete
    await vi.waitFor(() => {
      expect(storage.data.has('gridstorm-state')).toBe(true);
    });

    const saved = JSON.parse(storage.data.get('gridstorm-state')!) as Partial<GridStateSnapshot>;
    expect(saved.columnState).toBeDefined();
    expect(saved.columnState!.length).toBe(3);
    expect(saved.sortModel).toBeDefined();

    engine.destroy();
  });

  it('state:restore loads and applies state from storage', async () => {
    const storage = createMockStorage();

    // Pre-populate storage with a snapshot that has a sort model
    const snapshot: Partial<GridStateSnapshot> = {
      sortModel: [{ colId: 'age', sort: 'asc' }],
    };
    storage.setItem('gridstorm-state', JSON.stringify(snapshot));

    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [StatePersistencePlugin({ storage, autoSave: false })],
    });

    // state:restore is also called during install, wait for it
    await vi.waitFor(() => {
      const sortModel = engine.api.getSortModel();
      expect(sortModel).toHaveLength(1);
    });

    const sortModel = engine.api.getSortModel();
    expect(sortModel[0]!.colId).toBe('age');
    expect(sortModel[0]!.sort).toBe('asc');

    engine.destroy();
  });

  it('state:clear removes saved state', async () => {
    const storage = createMockStorage();
    storage.setItem('gridstorm-state', '{"sortModel":[]}');

    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [StatePersistencePlugin({ storage, autoSave: false })],
    });

    expect(storage.data.has('gridstorm-state')).toBe(true);

    engine.commandBus.dispatch('state:clear', {});

    await vi.waitFor(() => {
      expect(storage.data.has('gridstorm-state')).toBe(false);
    });

    engine.destroy();
  });

  it('state:export calls callback with serialized state', () => {
    const storage = createMockStorage();
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [StatePersistencePlugin({ storage, autoSave: false })],
    });

    let exported = '';
    engine.commandBus.dispatch('state:export', {
      callback: (serialized: string) => {
        exported = serialized;
      },
    });

    expect(exported).not.toBe('');
    const parsed = JSON.parse(exported) as Partial<GridStateSnapshot>;
    expect(parsed.columnState).toBeDefined();
    expect(Array.isArray(parsed.columnState)).toBe(true);

    engine.destroy();
  });

  it('state:import applies state from JSON string', () => {
    const storage = createMockStorage();
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [StatePersistencePlugin({ storage, autoSave: false })],
    });

    const importData: Partial<GridStateSnapshot> = {
      sortModel: [{ colId: 'score', sort: 'desc' }],
    };

    engine.commandBus.dispatch('state:import', {
      state: JSON.stringify(importData),
    });

    const sortModel = engine.api.getSortModel();
    expect(sortModel).toHaveLength(1);
    expect(sortModel[0]!.colId).toBe('score');
    expect(sortModel[0]!.sort).toBe('desc');

    engine.destroy();
  });

  it('include option limits which keys are saved', async () => {
    const storage = createMockStorage();
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [StatePersistencePlugin({
        storage,
        autoSave: false,
        include: ['sortModel'],
      })],
    });

    engine.commandBus.dispatch('state:save', {});

    await vi.waitFor(() => {
      expect(storage.data.has('gridstorm-state')).toBe(true);
    });

    const saved = JSON.parse(storage.data.get('gridstorm-state')!) as Record<string, unknown>;
    expect(saved.sortModel).toBeDefined();
    // columnState should not be included since only sortModel was whitelisted
    expect(saved.columnState).toBeUndefined();
    expect(saved.pagination).toBeUndefined();

    engine.destroy();
  });

  it('exclude option excludes specific keys', async () => {
    const storage = createMockStorage();
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [StatePersistencePlugin({
        storage,
        autoSave: false,
        exclude: ['scrollPosition', 'pagination'],
      })],
    });

    engine.commandBus.dispatch('state:save', {});

    await vi.waitFor(() => {
      expect(storage.data.has('gridstorm-state')).toBe(true);
    });

    const saved = JSON.parse(storage.data.get('gridstorm-state')!) as Record<string, unknown>;
    expect(saved.columnState).toBeDefined();
    expect(saved.sortModel).toBeDefined();
    expect(saved.scrollPosition).toBeUndefined();
    expect(saved.pagination).toBeUndefined();

    engine.destroy();
  });

  it('invalid JSON in storage is handled gracefully on restore', async () => {
    const storage = createMockStorage();
    storage.setItem('gridstorm-state', '{invalid json!!!}');

    // Should not throw
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [StatePersistencePlugin({ storage, autoSave: false })],
    });

    // Grid should still work normally
    expect(engine.api.getDisplayedRowCount()).toBe(3);
    expect(engine.api.getSortModel()).toHaveLength(0);

    engine.destroy();
  });

  it('uses custom storage key when provided', async () => {
    const storage = createMockStorage();
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [StatePersistencePlugin({
        storage,
        autoSave: false,
        storageKey: 'my-custom-key',
      })],
    });

    engine.commandBus.dispatch('state:save', {});

    await vi.waitFor(() => {
      expect(storage.data.has('my-custom-key')).toBe(true);
    });

    // Default key should not exist
    expect(storage.data.has('gridstorm-state')).toBe(false);

    engine.destroy();
  });
});
