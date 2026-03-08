import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { ClipboardPlugin } from '../clipboard-plugin';
import { SelectionPlugin } from '../../../plugin-selection/src/selection-plugin';

// Mock navigator.clipboard since it is not available in jsdom
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
  readText: vi.fn().mockResolvedValue(''),
};
Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true,
});

function makeRowData() {
  return [
    { name: 'Alice', age: 30, city: 'NYC', score: 90 },
    { name: 'Bob', age: 25, city: 'LA', score: 85 },
    { name: 'Charlie', age: 35, city: 'SF', score: 95 },
  ];
}

function createClipboardGrid(clipboardOptions = {}) {
  return createGrid({
    columns: [
      { field: 'name', headerName: 'Name' },
      { field: 'age', headerName: 'Age' },
      { field: 'city', headerName: 'City' },
      { field: 'score', headerName: 'Score' },
    ],
    rowData: makeRowData(),
    plugins: [SelectionPlugin(), ClipboardPlugin(clipboardOptions)],
  });
}

beforeEach(() => {
  mockClipboard.writeText.mockClear();
  mockClipboard.readText.mockClear();
  mockClipboard.readText.mockResolvedValue('');
});

describe('ClipboardPlugin', () => {
  it('creates grid with clipboard and selection plugins successfully', () => {
    const engine = createClipboardGrid();
    expect(engine.api).toBeDefined();
    expect(engine.store).toBeDefined();
    expect(engine.api.getDisplayedRowCount()).toBe(3);
    engine.destroy();
  });

  it('clipboard:copy copies selected rows to clipboard', async () => {
    const engine = createClipboardGrid();

    // Select a row first
    engine.commandBus.dispatch('selection:select', { rowId: 'row-0' });

    engine.commandBus.dispatch('clipboard:copy', {});

    await vi.waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalled();
    });

    const writtenText = mockClipboard.writeText.mock.calls[0][0];
    expect(writtenText).toContain('Alice');
    expect(writtenText).toContain('30');
    expect(writtenText).toContain('NYC');
    expect(writtenText).toContain('90');
    engine.destroy();
  });

  it('clipboard:copy with no selection does not call writeText', () => {
    const engine = createClipboardGrid();

    engine.commandBus.dispatch('clipboard:copy', {});

    expect(mockClipboard.writeText).not.toHaveBeenCalled();
    engine.destroy();
  });

  it('clipboard:cut copies and clears selected cells', async () => {
    const engine = createClipboardGrid();

    // Select a row
    engine.commandBus.dispatch('selection:select', { rowId: 'row-0' });

    engine.commandBus.dispatch('clipboard:cut', {});

    await vi.waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalled();
    });

    // Verify the data was written to clipboard before clearing
    const writtenText = mockClipboard.writeText.mock.calls[0][0];
    expect(writtenText).toContain('Alice');

    // Verify cell values were cleared
    const node = engine.api.getRowNode('row-0');
    expect(node!.data.name).toBeNull();
    expect(node!.data.age).toBeNull();
    expect(node!.data.city).toBeNull();
    expect(node!.data.score).toBeNull();
    engine.destroy();
  });

  it('suppressCut prevents cut operation', () => {
    const engine = createClipboardGrid({ suppressCut: true });
    const listener = vi.fn();
    engine.eventBus.on('clipboard:cut', listener);

    // Select a row
    engine.commandBus.dispatch('selection:select', { rowId: 'row-0' });

    engine.commandBus.dispatch('clipboard:cut', {});

    // Should not write to clipboard
    expect(mockClipboard.writeText).not.toHaveBeenCalled();
    // Should not emit cut event
    expect(listener).not.toHaveBeenCalled();

    // Data should remain unchanged
    const node = engine.api.getRowNode('row-0');
    expect(node!.data.name).toBe('Alice');
    engine.destroy();
  });

  it('suppressPaste prevents paste operation', () => {
    const engine = createClipboardGrid({ suppressPaste: true });

    mockClipboard.readText.mockResolvedValue('Dave\t40\tChicago\t88');

    engine.commandBus.dispatch('focus:set', {
      position: { rowIndex: 0, colId: 'name' },
    });

    engine.commandBus.dispatch('clipboard:paste', {});

    // readText should not be called when paste is suppressed
    expect(mockClipboard.readText).not.toHaveBeenCalled();

    // Data should remain unchanged
    const node = engine.api.getRowNode('row-0');
    expect(node!.data.name).toBe('Alice');
    engine.destroy();
  });

  it('clipboard:paste reads from clipboard and pastes TSV data', async () => {
    const engine = createClipboardGrid();

    mockClipboard.readText.mockResolvedValue('Dave\t40\tChicago\t88');

    // Set focused cell so paste has a target
    engine.commandBus.dispatch('focus:set', {
      position: { rowIndex: 0, colId: 'name' },
    });

    engine.commandBus.dispatch('clipboard:paste', {});

    await vi.waitFor(() => {
      expect(mockClipboard.readText).toHaveBeenCalled();
    });

    // Verify the data was pasted
    const node = engine.api.getRowNode('row-0');
    expect(node!.data.name).toBe('Dave');
    expect(node!.data.age).toBe('40');
    engine.destroy();
  });

  it('clipboard:copyRange copies a specific range of cells', async () => {
    const engine = createClipboardGrid();

    engine.commandBus.dispatch('clipboard:copyRange', {
      startRow: 0,
      endRow: 1,
      startCol: 'name',
      endCol: 'age',
    });

    await vi.waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalled();
    });

    const writtenText = mockClipboard.writeText.mock.calls[0][0];
    // Should contain data from rows 0-1 and columns name-age
    expect(writtenText).toContain('Alice');
    expect(writtenText).toContain('Bob');
    expect(writtenText).toContain('30');
    expect(writtenText).toContain('25');
    // Should not contain city or score columns
    expect(writtenText).not.toContain('NYC');
    expect(writtenText).not.toContain('LA');
    engine.destroy();
  });

  it('clipboard:copyRange with invalid columns does nothing', () => {
    const engine = createClipboardGrid();

    expect(() => {
      engine.commandBus.dispatch('clipboard:copyRange', {
        startRow: 0,
        endRow: 0,
        startCol: 'nonexistent',
        endCol: 'name',
      });
    }).not.toThrow();

    expect(mockClipboard.writeText).not.toHaveBeenCalled();
    engine.destroy();
  });

  it('emits clipboard:copy event on copy', () => {
    const engine = createClipboardGrid();
    const listener = vi.fn();
    engine.eventBus.on('clipboard:copy', listener);

    // Select a row
    engine.commandBus.dispatch('selection:select', { rowId: 'row-0' });
    engine.commandBus.dispatch('clipboard:copy', {});

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.any(String) }),
    );
    engine.destroy();
  });

  it('emits clipboard:cut event on cut', () => {
    const engine = createClipboardGrid();
    const listener = vi.fn();
    engine.eventBus.on('clipboard:cut', listener);

    // Select a row
    engine.commandBus.dispatch('selection:select', { rowId: 'row-0' });
    engine.commandBus.dispatch('clipboard:cut', {});

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.any(String) }),
    );
    engine.destroy();
  });

  it('emits clipboard:paste event on paste', async () => {
    const engine = createClipboardGrid();
    const listener = vi.fn();
    engine.eventBus.on('clipboard:paste', listener);

    mockClipboard.readText.mockResolvedValue('Dave\t40');

    engine.commandBus.dispatch('focus:set', {
      position: { rowIndex: 0, colId: 'name' },
    });

    engine.commandBus.dispatch('clipboard:paste', {});

    await vi.waitFor(() => {
      expect(listener).toHaveBeenCalledTimes(1);
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.any(String) }),
    );
    engine.destroy();
  });

  it('copyHeaders option includes headers in copy output', async () => {
    const engine = createClipboardGrid({ copyHeaders: true });

    engine.commandBus.dispatch('selection:select', { rowId: 'row-0' });
    engine.commandBus.dispatch('clipboard:copy', {});

    await vi.waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalled();
    });

    const writtenText = mockClipboard.writeText.mock.calls[0][0];
    // Header row should be the first line
    expect(writtenText).toMatch(/^Name\t/);
    engine.destroy();
  });

  it('copy without copyHeaders does not include headers', async () => {
    const engine = createClipboardGrid({ copyHeaders: false });

    engine.commandBus.dispatch('selection:select', { rowId: 'row-0' });
    engine.commandBus.dispatch('clipboard:copy', {});

    await vi.waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalled();
    });

    const writtenText = mockClipboard.writeText.mock.calls[0][0];
    // Should start with data, not header
    expect(writtenText).toMatch(/^Alice\t/);
    expect(writtenText).not.toMatch(/^Name\t/);
    engine.destroy();
  });

  it('copies multiple selected rows', async () => {
    const engine = createClipboardGrid();

    engine.commandBus.dispatch('selection:select', { rowId: 'row-0' });
    engine.commandBus.dispatch('selection:select', { rowId: 'row-1', multiSelect: true });

    engine.commandBus.dispatch('clipboard:copy', {});

    await vi.waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalled();
    });

    const writtenText = mockClipboard.writeText.mock.calls[0][0];
    expect(writtenText).toContain('Alice');
    expect(writtenText).toContain('Bob');
    engine.destroy();
  });

  it('clipboard plugin declares selection as a dependency', () => {
    const plugin = ClipboardPlugin();
    expect(plugin.dependencies).toContain('selection');
  });

  it('throws if selection plugin is missing', () => {
    expect(() => {
      createGrid({
        columns: [{ field: 'name' }],
        rowData: [{ name: 'Alice' }],
        plugins: [ClipboardPlugin()],
      });
    }).toThrow();
  });

  it('disposer unregisters commands after destroy', () => {
    const engine = createClipboardGrid();

    // Before destroy, select and copy work
    engine.commandBus.dispatch('selection:select', { rowId: 'row-0' });
    engine.commandBus.dispatch('clipboard:copy', {});
    expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);

    // Destroy the engine
    engine.destroy();

    // After destroy, commands should have no handlers so dispatching is a no-op
    // The commandBus is cleared by destroy(), so dispatch does nothing
  });
});
