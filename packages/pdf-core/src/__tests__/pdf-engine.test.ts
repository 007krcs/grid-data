import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPdfEngine } from '../engine/pdf-engine';
import type { PdfEngine } from '../engine/pdf-engine';
import type { UndoableCommand } from '../commands/undoable';
import type { PdfDocumentState } from '../types/document';
import type { PdfPlugin } from '../types/plugin';

describe('createPdfEngine', () => {
  let engine: PdfEngine;

  beforeEach(() => {
    engine = createPdfEngine();
  });

  it('creates an engine with default state', () => {
    const state = engine.api.getState();
    expect(state.loaded).toBe(false);
    expect(state.zoom).toBe(1.0);
    expect(state.activePageIndex).toBe(0);
    expect(state.toolMode).toBe('select');
    expect(state.pages).toEqual([]);
    expect(state.annotations).toEqual({});
  });

  it('applies initial config options', () => {
    const e = createPdfEngine({ initialZoom: 1.5, initialPage: 2 });
    expect(e.api.getZoom()).toBe(1.5);
    expect(e.api.getCurrentPage()).toBe(2);
    e.destroy();
  });

  it('destroys cleanly', () => {
    engine.destroy();
    // Should not throw
  });
});

describe('PdfApi - Navigation', () => {
  let engine: PdfEngine;

  beforeEach(async () => {
    engine = createPdfEngine();
    // Load a dummy document to have pages
    await engine.api.loadDocument(new ArrayBuffer(10));
  });

  it('goes to a page', () => {
    expect(engine.api.getCurrentPage()).toBe(0);
    engine.api.goToPage(0);
    expect(engine.api.getCurrentPage()).toBe(0);
  });

  it('clamps page index to valid range', () => {
    engine.api.goToPage(-5);
    expect(engine.api.getCurrentPage()).toBe(0);
    engine.api.goToPage(999);
    expect(engine.api.getCurrentPage()).toBe(0); // only 1 page
  });

  it('reports page count', () => {
    expect(engine.api.getPageCount()).toBe(1);
  });
});

describe('PdfApi - Zoom', () => {
  let engine: PdfEngine;

  beforeEach(() => {
    engine = createPdfEngine();
  });

  it('sets zoom level', () => {
    engine.api.setZoom(2.0);
    expect(engine.api.getZoom()).toBe(2.0);
  });

  it('clamps zoom to valid range', () => {
    engine.api.setZoom(0.01);
    expect(engine.api.getZoom()).toBe(0.1);
    engine.api.setZoom(20);
    expect(engine.api.getZoom()).toBe(10);
  });

  it('emits zoom:changed event', () => {
    const listener = vi.fn();
    engine.api.addEventListener('zoom:changed', listener);
    engine.api.setZoom(1.5);
    expect(listener).toHaveBeenCalledWith({ zoom: 1.5 });
  });
});

describe('PdfApi - Tool Mode', () => {
  let engine: PdfEngine;

  beforeEach(() => {
    engine = createPdfEngine();
  });

  it('sets tool mode', () => {
    engine.api.setToolMode('hand');
    expect(engine.api.getToolMode()).toBe('hand');
  });

  it('emits tool:changed event', () => {
    const listener = vi.fn();
    engine.api.addEventListener('tool:changed', listener);
    engine.api.setToolMode('annotation-highlight');
    expect(listener).toHaveBeenCalledWith({ mode: 'annotation-highlight' });
  });
});

describe('PdfApi - Document Lifecycle', () => {
  let engine: PdfEngine;

  beforeEach(() => {
    engine = createPdfEngine();
  });

  it('loads a document', async () => {
    const listener = vi.fn();
    engine.api.addEventListener('document:loaded', listener);
    await engine.api.loadDocument(new ArrayBuffer(10));
    expect(engine.api.getState().loaded).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]![0].pageCount).toBe(1);
  });

  it('saves a document', async () => {
    const listener = vi.fn();
    engine.api.addEventListener('document:saved', listener);
    const blob = await engine.api.saveDocument();
    expect(blob).toBeInstanceOf(Blob);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('closes a document', async () => {
    await engine.api.loadDocument(new ArrayBuffer(10));
    const listener = vi.fn();
    engine.api.addEventListener('document:closed', listener);
    engine.api.closeDocument();
    expect(engine.api.getState().loaded).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('PdfApi - Annotations', () => {
  let engine: PdfEngine;

  beforeEach(() => {
    engine = createPdfEngine();
  });

  it('returns empty annotations initially', () => {
    expect(engine.api.getAnnotations()).toEqual([]);
  });

  it('returns undefined for non-existent annotation', () => {
    expect(engine.api.getAnnotation('nonexistent')).toBeUndefined();
  });

  it('selects annotations via command', () => {
    const listener = vi.fn();
    engine.api.addEventListener('annotation:selected', listener);
    engine.commandBus.dispatch('annotation:select', { annotationIds: ['a1', 'a2'] });
    expect(engine.api.getState().selectedAnnotationIds).toEqual(['a1', 'a2']);
    expect(listener).toHaveBeenCalledWith({ annotationIds: ['a1', 'a2'] });
  });

  it('deselects annotations via command', () => {
    engine.commandBus.dispatch('annotation:select', { annotationIds: ['a1'] });
    engine.commandBus.dispatch('annotation:deselect', {});
    expect(engine.api.getState().selectedAnnotationIds).toEqual([]);
  });
});

describe('PdfCommandBus - Undo/Redo', () => {
  let engine: PdfEngine;

  function makeSetZoomCommand(zoom: number, prevZoom: number): UndoableCommand {
    return {
      type: 'zoom:set',
      description: `Set zoom to ${zoom}`,
      execute(state: PdfDocumentState) {
        return { ...state, zoom };
      },
      undo(state: PdfDocumentState) {
        return { ...state, zoom: prevZoom };
      },
    };
  }

  beforeEach(() => {
    engine = createPdfEngine();
  });

  it('starts with empty undo/redo stacks', () => {
    expect(engine.api.canUndo()).toBe(false);
    expect(engine.api.canRedo()).toBe(false);
  });

  it('executes an undoable command', () => {
    engine.commandBus.dispatchUndoable(makeSetZoomCommand(2.0, 1.0));
    expect(engine.api.getZoom()).toBe(2.0);
    expect(engine.api.canUndo()).toBe(true);
    expect(engine.api.canRedo()).toBe(false);
  });

  it('undoes a command', () => {
    engine.commandBus.dispatchUndoable(makeSetZoomCommand(2.0, 1.0));
    engine.api.undo();
    expect(engine.api.getZoom()).toBe(1.0);
    expect(engine.api.canUndo()).toBe(false);
    expect(engine.api.canRedo()).toBe(true);
  });

  it('redoes a command', () => {
    engine.commandBus.dispatchUndoable(makeSetZoomCommand(2.0, 1.0));
    engine.api.undo();
    engine.api.redo();
    expect(engine.api.getZoom()).toBe(2.0);
    expect(engine.api.canUndo()).toBe(true);
    expect(engine.api.canRedo()).toBe(false);
  });

  it('clears redo stack on new action', () => {
    engine.commandBus.dispatchUndoable(makeSetZoomCommand(2.0, 1.0));
    engine.api.undo();
    engine.commandBus.dispatchUndoable(makeSetZoomCommand(3.0, 1.0));
    expect(engine.api.canRedo()).toBe(false);
  });

  it('supports multiple undo/redo steps', () => {
    engine.commandBus.dispatchUndoable(makeSetZoomCommand(2.0, 1.0));
    engine.commandBus.dispatchUndoable(makeSetZoomCommand(3.0, 2.0));
    engine.commandBus.dispatchUndoable(makeSetZoomCommand(4.0, 3.0));

    expect(engine.api.getZoom()).toBe(4.0);
    engine.api.undo();
    expect(engine.api.getZoom()).toBe(3.0);
    engine.api.undo();
    expect(engine.api.getZoom()).toBe(2.0);
    engine.api.undo();
    expect(engine.api.getZoom()).toBe(1.0);
    expect(engine.api.canUndo()).toBe(false);
  });

  it('emits history:changed events', () => {
    const listener = vi.fn();
    engine.api.addEventListener('history:changed', listener);
    engine.commandBus.dispatchUndoable(makeSetZoomCommand(2.0, 1.0));
    expect(listener).toHaveBeenCalledWith({ canUndo: true, canRedo: false });

    engine.api.undo();
    expect(listener).toHaveBeenCalledWith({ canUndo: false, canRedo: true });
  });

  it('clears history', () => {
    engine.commandBus.dispatchUndoable(makeSetZoomCommand(2.0, 1.0));
    engine.commandBus.clearHistory();
    expect(engine.api.canUndo()).toBe(false);
    expect(engine.api.canRedo()).toBe(false);
  });

  it('respects max history size', () => {
    const e = createPdfEngine({ maxHistorySize: 3 });
    e.commandBus.dispatchUndoable(makeSetZoomCommand(2.0, 1.0));
    e.commandBus.dispatchUndoable(makeSetZoomCommand(3.0, 2.0));
    e.commandBus.dispatchUndoable(makeSetZoomCommand(4.0, 3.0));
    e.commandBus.dispatchUndoable(makeSetZoomCommand(5.0, 4.0));

    expect(e.commandBus.getUndoStackSize()).toBe(3);
    e.destroy();
  });
});

describe('PdfCommandBus - Batch Operations', () => {
  let engine: PdfEngine;

  beforeEach(() => {
    engine = createPdfEngine();
  });

  it('groups batch commands into one undo step', () => {
    engine.commandBus.beginBatch('Batch zoom changes');
    engine.commandBus.dispatchUndoable({
      type: 'zoom:set',
      description: 'Set zoom to 2',
      execute: (s) => ({ ...s, zoom: 2.0 }),
      undo: (s) => ({ ...s, zoom: 1.0 }),
    });
    engine.commandBus.dispatchUndoable({
      type: 'tool:set',
      description: 'Set tool to hand',
      execute: (s) => ({ ...s, toolMode: 'hand' as const }),
      undo: (s) => ({ ...s, toolMode: 'select' as const }),
    });
    engine.commandBus.endBatch();

    expect(engine.api.getZoom()).toBe(2.0);
    expect(engine.api.getToolMode()).toBe('hand');
    expect(engine.commandBus.getUndoStackSize()).toBe(1); // single compound command

    engine.api.undo();
    expect(engine.api.getZoom()).toBe(1.0);
    expect(engine.api.getToolMode()).toBe('select');
  });
});

describe('PdfCommandBus - Middleware', () => {
  let engine: PdfEngine;

  beforeEach(() => {
    engine = createPdfEngine();
  });

  it('executes middleware before command', () => {
    const log: string[] = [];
    engine.commandBus.use((ctx) => {
      log.push(`mw:${ctx.commandType}`);
    });
    engine.commandBus.registerHandler('test:cmd', () => {
      log.push('handler');
    });

    engine.commandBus.dispatch('test:cmd', {});
    expect(log).toEqual(['mw:test:cmd', 'handler']);
  });

  it('allows middleware to cancel commands', () => {
    engine.commandBus.use((ctx) => {
      if (ctx.commandType === 'blocked') ctx.cancel();
    });
    const handler = vi.fn();
    engine.commandBus.registerHandler('blocked', handler);
    engine.commandBus.dispatch('blocked', {});
    expect(handler).not.toHaveBeenCalled();
  });

  it('applies middleware to undoable commands', () => {
    engine.commandBus.use((ctx) => {
      if (ctx.commandType === 'blocked') ctx.cancel();
    });
    engine.commandBus.dispatchUndoable({
      type: 'blocked',
      description: 'Blocked',
      execute: (s) => ({ ...s, zoom: 9.0 }),
      undo: (s) => ({ ...s, zoom: 1.0 }),
    });
    expect(engine.api.getZoom()).toBe(1.0); // unchanged
  });
});

describe('Store', () => {
  let engine: PdfEngine;

  beforeEach(() => {
    engine = createPdfEngine();
  });

  it('batches state updates', () => {
    const listener = vi.fn();
    engine.store.subscribe(listener);

    engine.store.batch(() => {
      engine.store.setState((s) => ({ ...s, zoom: 2.0 }));
      engine.store.setState((s) => ({ ...s, activePageIndex: 5 }));
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(engine.store.getState().zoom).toBe(2.0);
    expect(engine.store.getState().activePageIndex).toBe(5);
  });

  it('supports selector subscriptions', () => {
    const listener = vi.fn();
    engine.store.select(
      (s) => s.zoom,
      listener,
    );

    engine.store.setState((s) => ({ ...s, zoom: 3.0 }));
    expect(listener).toHaveBeenCalledWith(3.0, 1.0);

    // Updating non-zoom field should NOT fire
    engine.store.setState((s) => ({ ...s, activePageIndex: 2 }));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('EventBus', () => {
  let engine: PdfEngine;

  beforeEach(() => {
    engine = createPdfEngine();
  });

  it('subscribes and emits events', () => {
    const listener = vi.fn();
    engine.eventBus.on('zoom:changed', listener);
    engine.eventBus.emit('zoom:changed', { zoom: 2.0 });
    expect(listener).toHaveBeenCalledWith({ zoom: 2.0 });
  });

  it('unsubscribes from events', () => {
    const listener = vi.fn();
    const unsub = engine.eventBus.on('zoom:changed', listener);
    unsub();
    engine.eventBus.emit('zoom:changed', { zoom: 2.0 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('handles multiple listeners', () => {
    const l1 = vi.fn();
    const l2 = vi.fn();
    engine.eventBus.on('zoom:changed', l1);
    engine.eventBus.on('zoom:changed', l2);
    engine.eventBus.emit('zoom:changed', { zoom: 2.0 });
    expect(l1).toHaveBeenCalledTimes(1);
    expect(l2).toHaveBeenCalledTimes(1);
  });
});

describe('PluginManager', () => {
  it('installs plugins', () => {
    const installFn = vi.fn();
    const plugin: PdfPlugin = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      install: installFn,
    };

    const engine = createPdfEngine({ plugins: [plugin] });
    expect(installFn).toHaveBeenCalledTimes(1);
    engine.destroy();
  });

  it('resolves plugin dependencies', () => {
    const order: string[] = [];
    const pluginA: PdfPlugin = {
      id: 'a',
      name: 'A',
      version: '1.0.0',
      dependencies: ['b'],
      install: () => { order.push('a'); },
    };
    const pluginB: PdfPlugin = {
      id: 'b',
      name: 'B',
      version: '1.0.0',
      install: () => { order.push('b'); },
    };

    const engine = createPdfEngine({ plugins: [pluginA, pluginB] });
    expect(order).toEqual(['b', 'a']);
    engine.destroy();
  });

  it('throws on circular dependencies', () => {
    const pluginA: PdfPlugin = {
      id: 'a',
      name: 'A',
      version: '1.0.0',
      dependencies: ['b'],
      install: () => {},
    };
    const pluginB: PdfPlugin = {
      id: 'b',
      name: 'B',
      version: '1.0.0',
      dependencies: ['a'],
      install: () => {},
    };

    expect(() => createPdfEngine({ plugins: [pluginA, pluginB] })).toThrow(/Circular/);
  });

  it('provides plugin context with registerState/getState/setState', () => {
    let capturedCtx: any;
    const plugin: PdfPlugin = {
      id: 'stateful',
      name: 'Stateful',
      version: '1.0.0',
      install: (ctx) => {
        capturedCtx = ctx;
        ctx.registerState('myState', { count: 0 });
      },
    };

    const engine = createPdfEngine({ plugins: [plugin] });
    expect(capturedCtx.getState('myState')).toEqual({ count: 0 });

    capturedCtx.setState('myState', (prev: { count: number }) => ({
      count: prev.count + 1,
    }));
    expect(capturedCtx.getState('myState')).toEqual({ count: 1 });
    engine.destroy();
  });

  it('provides plugin context with registerCommand', () => {
    const handler = vi.fn();
    const plugin: PdfPlugin = {
      id: 'cmd-plugin',
      name: 'Cmd',
      version: '1.0.0',
      install: (ctx) => {
        ctx.registerCommand('custom:action', handler);
      },
    };

    const engine = createPdfEngine({ plugins: [plugin] });
    engine.commandBus.dispatch('custom:action', { data: 42 });
    expect(handler).toHaveBeenCalledWith({ data: 42 });
    engine.destroy();
  });

  it('calls disposer on destroy', () => {
    const disposer = vi.fn();
    const plugin: PdfPlugin = {
      id: 'disposable',
      name: 'Disposable',
      version: '1.0.0',
      install: () => disposer,
    };

    const engine = createPdfEngine({ plugins: [plugin] });
    engine.destroy();
    expect(disposer).toHaveBeenCalledTimes(1);
  });
});
