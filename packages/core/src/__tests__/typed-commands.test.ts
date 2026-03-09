import { describe, it, expect, vi } from 'vitest';
import { CommandBus } from '../events/command-bus';
import type { CommandMap } from '../types/commands';

describe('Typed Command Map', () => {
  it('should dispatch typed commands to registered handlers', () => {
    const bus = new CommandBus();
    const handler = vi.fn();

    bus.registerHandler('sort:set', handler);
    bus.dispatch('sort:set', { sortModel: [{ colId: 'name', sort: 'asc' }] });

    expect(handler).toHaveBeenCalledWith({
      sortModel: [{ colId: 'name', sort: 'asc' }],
    });
  });

  it('should dispatch typed commands with empty payloads', () => {
    const bus = new CommandBus();
    const handler = vi.fn();

    bus.registerHandler('rows:reprocess', handler);
    bus.dispatch('rows:reprocess', {});

    expect(handler).toHaveBeenCalledWith({});
  });

  it('should support typed group commands', () => {
    const bus = new CommandBus();
    const handler = vi.fn();

    bus.registerHandler('group:addColumn', handler);
    bus.dispatch('group:addColumn', { colId: 'department' });

    expect(handler).toHaveBeenCalledWith({ colId: 'department' });
  });

  it('should support typed tree commands', () => {
    const bus = new CommandBus();
    const handler = vi.fn();

    bus.registerHandler('tree:toggle', handler);
    bus.dispatch('tree:toggle', { nodeId: 'node-1' });

    expect(handler).toHaveBeenCalledWith({ nodeId: 'node-1' });
  });

  it('should support typed filter commands', () => {
    const bus = new CommandBus();
    const handler = vi.fn();

    bus.registerHandler('filter:set', handler);
    bus.dispatch('filter:set', {
      filterModel: {
        name: { filterType: 'text', type: 'contains', filter: 'Smith' },
      },
    });

    expect(handler).toHaveBeenCalledWith({
      filterModel: {
        name: { filterType: 'text', type: 'contains', filter: 'Smith' },
      },
    });
  });

  it('should support typed SSRM commands', () => {
    const bus = new CommandBus();
    const handler = vi.fn();

    bus.registerHandler('ssrm:ensureRows', handler);
    bus.dispatch('ssrm:ensureRows', { startRow: 0, endRow: 50 });

    expect(handler).toHaveBeenCalledWith({ startRow: 0, endRow: 50 });
  });

  it('should support typed detail commands', () => {
    const bus = new CommandBus();
    const handler = vi.fn();

    bus.registerHandler('detail:expand', handler);
    bus.dispatch('detail:expand', { nodeId: 'row-5' });

    expect(handler).toHaveBeenCalledWith({ nodeId: 'row-5' });
  });

  it('should maintain backward compatibility with untyped commands', () => {
    const bus = new CommandBus();
    const handler = vi.fn();

    // Untyped custom command — the [key: string]: any fallback
    bus.registerHandler('custom:myAction', handler);
    bus.dispatch('custom:myAction', { customData: 42 });

    expect(handler).toHaveBeenCalledWith({ customData: 42 });
  });

  it('should support multiple typed handlers for the same command', () => {
    const bus = new CommandBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    bus.registerHandler('group:expand', handler1);
    bus.registerHandler('group:expand', handler2);
    bus.dispatch('group:expand', { groupId: 'group-1' });

    expect(handler1).toHaveBeenCalledWith({ groupId: 'group-1' });
    expect(handler2).toHaveBeenCalledWith({ groupId: 'group-1' });
  });

  it('should allow unregistering typed handlers', () => {
    const bus = new CommandBus();
    const handler = vi.fn();

    const unsub = bus.registerHandler('sort:set', handler);
    unsub();
    bus.dispatch('sort:set', { sortModel: [] });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should support middleware with typed commands', () => {
    const bus = new CommandBus();
    const order: string[] = [];

    bus.use((ctx) => {
      order.push(`middleware:${ctx.commandType}`);
    });
    bus.registerHandler('group:collapseAll', () => {
      order.push('handler');
    });

    bus.dispatch('group:collapseAll', {});
    expect(order).toEqual(['middleware:group:collapseAll', 'handler']);
  });

  it('should allow middleware to cancel typed commands', () => {
    const bus = new CommandBus();
    const handler = vi.fn();

    bus.use((ctx) => {
      if (ctx.commandType === 'excel:exportExcel') {
        ctx.cancel();
      }
    });
    bus.registerHandler('excel:exportExcel', handler);
    bus.dispatch('excel:exportExcel', {});

    expect(handler).not.toHaveBeenCalled();
  });
});
