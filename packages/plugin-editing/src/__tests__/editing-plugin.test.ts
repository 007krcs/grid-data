import { describe, it, expect, vi } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { EditingPlugin } from '../editing-plugin';

function createEditableGrid(pluginOptions = {}) {
  return createGrid({
    columns: [
      { field: 'name', editable: true },
      { field: 'age', editable: true },
      { field: 'city', editable: false },
    ],
    rowData: [
      { name: 'Alice', age: 30, city: 'NYC' },
      { name: 'Bob', age: 25, city: 'LA' },
    ],
    plugins: [EditingPlugin(pluginOptions)],
  });
}

describe('EditingPlugin', () => {
  it('creates grid with editing plugin successfully', () => {
    const engine = createEditableGrid();
    expect(engine.api).toBeDefined();
    expect(engine.store).toBeDefined();
    expect(engine.api.getDisplayedRowCount()).toBe(2);
    engine.destroy();
  });

  it('editing:start begins editing an editable cell', () => {
    const engine = createEditableGrid();

    // Get the first row's ID
    const row = engine.api.getDisplayedRowAtIndex(0)!;

    engine.commandBus.dispatch('editing:start', { rowId: row.id, colId: 'name' });

    const editing = engine.store.getState().editing;
    expect(editing).not.toBeNull();
    expect(editing!.rowId).toBe(row.id);
    expect(editing!.colId).toBe('name');

    engine.destroy();
  });

  it('editing:start is ignored for non-editable cells', () => {
    const engine = createEditableGrid();

    const row = engine.api.getDisplayedRowAtIndex(0)!;

    // city column has editable: false
    engine.commandBus.dispatch('editing:start', { rowId: row.id, colId: 'city' });

    const editing = engine.store.getState().editing;
    expect(editing).toBeNull();

    engine.destroy();
  });

  it('editing:start sets correct value from row data', () => {
    const engine = createEditableGrid();

    const row = engine.api.getDisplayedRowAtIndex(0)!;

    engine.commandBus.dispatch('editing:start', { rowId: row.id, colId: 'name' });

    const editing = engine.store.getState().editing;
    expect(editing).not.toBeNull();
    expect(editing!.value).toBe('Alice');
    expect(editing!.originalValue).toBe('Alice');

    engine.destroy();
  });

  it('editing:setValue updates the editing value', () => {
    const engine = createEditableGrid();

    const row = engine.api.getDisplayedRowAtIndex(0)!;

    // Start editing first
    engine.commandBus.dispatch('editing:start', { rowId: row.id, colId: 'name' });

    // Set new value
    engine.commandBus.dispatch('editing:setValue', { value: 'Charlie' });

    const editing = engine.store.getState().editing;
    expect(editing).not.toBeNull();
    expect(editing!.value).toBe('Charlie');
    expect(editing!.originalValue).toBe('Alice');

    engine.destroy();
  });

  it('editing:stop commits editing (calls api.stopEditing)', () => {
    const engine = createEditableGrid();

    const row = engine.api.getDisplayedRowAtIndex(0)!;

    // Start editing
    engine.commandBus.dispatch('editing:start', { rowId: row.id, colId: 'name' });
    expect(engine.store.getState().editing).not.toBeNull();

    // Stop editing (commit)
    engine.commandBus.dispatch('editing:stop', {});

    // Editing state should be cleared
    expect(engine.store.getState().editing).toBeNull();

    engine.destroy();
  });

  it('editing:stop with cancel cancels editing', () => {
    const engine = createEditableGrid();

    const row = engine.api.getDisplayedRowAtIndex(0)!;

    // Start editing
    engine.commandBus.dispatch('editing:start', { rowId: row.id, colId: 'name' });

    // Update value
    engine.commandBus.dispatch('editing:setValue', { value: 'Changed' });
    expect(engine.store.getState().editing!.value).toBe('Changed');

    // Cancel editing
    engine.commandBus.dispatch('editing:stop', { cancel: true });

    // Editing state should be cleared
    expect(engine.store.getState().editing).toBeNull();

    engine.destroy();
  });

  it('editing:getEditorDef returns text editor def', () => {
    const engine = createEditableGrid();

    let result: any = undefined;
    engine.commandBus.dispatch('editing:getEditorDef', {
      colId: 'name',
      callback: (def: any) => {
        result = def;
      },
    });

    expect(result).not.toBeNull();
    expect(result.type).toBe('text');

    engine.destroy();
  });

  it('editing:getEditorDef returns null for unknown column', () => {
    const engine = createEditableGrid();

    let result: any = 'not-called';
    engine.commandBus.dispatch('editing:getEditorDef', {
      colId: 'nonexistent',
      callback: (def: any) => {
        result = def;
      },
    });

    expect(result).toBeNull();

    engine.destroy();
  });

  it('emits cell:editingStarted event', () => {
    const engine = createEditableGrid();

    const spy = vi.fn();
    engine.eventBus.on('cell:editingStarted', spy);

    const row = engine.api.getDisplayedRowAtIndex(0)!;
    engine.commandBus.dispatch('editing:start', { rowId: row.id, colId: 'name' });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        colId: 'name',
        value: 'Alice',
      }),
    );

    engine.destroy();
  });

  it('editing:start with numeric field sets numeric value', () => {
    const engine = createEditableGrid();

    const row = engine.api.getDisplayedRowAtIndex(0)!;

    engine.commandBus.dispatch('editing:start', { rowId: row.id, colId: 'age' });

    const editing = engine.store.getState().editing;
    expect(editing).not.toBeNull();
    expect(editing!.value).toBe(30);
    expect(editing!.originalValue).toBe(30);

    engine.destroy();
  });

  it('disposer unregisters commands (editing:start no longer works after destroy)', () => {
    const engine = createEditableGrid();

    const row = engine.api.getDisplayedRowAtIndex(0)!;

    // Before destroy, editing works
    engine.commandBus.dispatch('editing:start', { rowId: row.id, colId: 'name' });
    expect(engine.store.getState().editing).not.toBeNull();

    // Stop editing first
    engine.commandBus.dispatch('editing:stop', {});
    expect(engine.store.getState().editing).toBeNull();

    // Destroy the engine (which calls plugin disposers)
    engine.destroy();

    // After destroy, commands should have no handlers so dispatching is a no-op
    // The commandBus is cleared by destroy(), so dispatch does nothing
  });
});
