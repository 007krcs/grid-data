import { describe, it, expect, vi } from 'vitest';
import { createGrid } from '../engine/grid-engine';
import type { GridPlugin } from '../types/plugin';

describe('PluginManager', () => {
  it('should install plugins during grid creation', () => {
    const install = vi.fn();
    const plugin: GridPlugin = {
      id: 'test-plugin',
      name: 'Test',
      version: '1.0.0',
      install,
    };

    const engine = createGrid({
      columns: [{ field: 'name' }],
      rowData: [],
      plugins: [plugin],
    });

    expect(install).toHaveBeenCalledTimes(1);
    engine.destroy();
  });

  it('should pass PluginContext to install', () => {
    let receivedContext: any;
    const plugin: GridPlugin = {
      id: 'ctx-test',
      name: 'Ctx Test',
      version: '1.0.0',
      install(ctx) {
        receivedContext = ctx;
      },
    };

    const engine = createGrid({
      columns: [],
      rowData: [],
      plugins: [plugin],
    });

    expect(receivedContext).toBeDefined();
    expect(receivedContext.api).toBeDefined();
    expect(receivedContext.store).toBeDefined();
    expect(receivedContext.eventBus).toBeDefined();
    expect(receivedContext.commandBus).toBeDefined();
    expect(receivedContext.config).toBeDefined();
    engine.destroy();
  });

  it('should resolve dependencies in correct order', () => {
    const order: string[] = [];

    const pluginA: GridPlugin = {
      id: 'a',
      name: 'A',
      version: '1.0.0',
      dependencies: ['b'],
      install() {
        order.push('a');
      },
    };

    const pluginB: GridPlugin = {
      id: 'b',
      name: 'B',
      version: '1.0.0',
      install() {
        order.push('b');
      },
    };

    const engine = createGrid({
      columns: [],
      rowData: [],
      plugins: [pluginA, pluginB],
    });

    expect(order).toEqual(['b', 'a']);
    engine.destroy();
  });

  it('should detect circular dependencies', () => {
    const pluginA: GridPlugin = {
      id: 'a',
      name: 'A',
      version: '1.0.0',
      dependencies: ['b'],
      install() {},
    };

    const pluginB: GridPlugin = {
      id: 'b',
      name: 'B',
      version: '1.0.0',
      dependencies: ['a'],
      install() {},
    };

    expect(() =>
      createGrid({
        columns: [],
        rowData: [],
        plugins: [pluginA, pluginB],
      }),
    ).toThrow(/Circular plugin dependency/);
  });

  it('should call disposers in reverse order on destroy', () => {
    const order: string[] = [];

    const pluginA: GridPlugin = {
      id: 'a',
      name: 'A',
      version: '1.0.0',
      install() {
        return () => order.push('dispose-a');
      },
    };

    const pluginB: GridPlugin = {
      id: 'b',
      name: 'B',
      version: '1.0.0',
      install() {
        return () => order.push('dispose-b');
      },
    };

    const engine = createGrid({
      columns: [],
      rowData: [],
      plugins: [pluginA, pluginB],
    });

    engine.destroy();
    expect(order).toEqual(['dispose-b', 'dispose-a']);
  });

  it('should support plugin-owned state slices', () => {
    const plugin: GridPlugin = {
      id: 'stateful',
      name: 'Stateful',
      version: '1.0.0',
      install(ctx) {
        ctx.registerState('myState', { count: 0 });
        ctx.setState('myState', (prev: any) => ({ ...prev, count: 42 }));
      },
    };

    const engine = createGrid({
      columns: [],
      rowData: [],
      plugins: [plugin],
    });

    const state = engine.store.getState();
    expect(state.pluginState['myState']).toEqual({ count: 42 });
    engine.destroy();
  });
});
