import { describe, it, expect, vi } from 'vitest';
import { CommandBus } from '../events/command-bus';

describe('CommandBus', () => {
  it('should dispatch commands to registered handlers', () => {
    const bus = new CommandBus();
    const handler = vi.fn();

    bus.registerHandler('test:command', handler);
    bus.dispatch('test:command', { data: 'hello' });

    expect(handler).toHaveBeenCalledWith({ data: 'hello' });
  });

  it('should support multiple handlers per command', () => {
    const bus = new CommandBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    bus.registerHandler('test:command', handler1);
    bus.registerHandler('test:command', handler2);
    bus.dispatch('test:command', {});

    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });

  it('should allow unregistering handlers', () => {
    const bus = new CommandBus();
    const handler = vi.fn();

    const unsub = bus.registerHandler('test:command', handler);
    unsub();
    bus.dispatch('test:command', {});

    expect(handler).not.toHaveBeenCalled();
  });

  it('should run middleware before handlers', () => {
    const bus = new CommandBus();
    const order: string[] = [];

    bus.use((ctx) => {
      order.push(`middleware:${ctx.commandType}`);
    });
    bus.registerHandler('test:command', () => {
      order.push('handler');
    });

    bus.dispatch('test:command', {});
    expect(order).toEqual(['middleware:test:command', 'handler']);
  });

  it('should allow middleware to cancel commands', () => {
    const bus = new CommandBus();
    const handler = vi.fn();

    bus.use((ctx) => {
      ctx.cancel();
    });
    bus.registerHandler('test:command', handler);
    bus.dispatch('test:command', {});

    expect(handler).not.toHaveBeenCalled();
  });

  it('should not crash when dispatching without handlers', () => {
    const bus = new CommandBus();
    expect(() => bus.dispatch('unknown:command', {})).not.toThrow();
  });

  it('should catch handler errors without crashing', () => {
    const bus = new CommandBus();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    bus.registerHandler('test:command', () => {
      throw new Error('handler error');
    });
    const good = vi.fn();
    bus.registerHandler('test:command', good);

    bus.dispatch('test:command', {});
    expect(good).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should clear all handlers and middleware', () => {
    const bus = new CommandBus();
    const handler = vi.fn();
    const mw = vi.fn();

    bus.registerHandler('test:command', handler);
    bus.use(mw);
    bus.clear();

    bus.dispatch('test:command', {});
    expect(handler).not.toHaveBeenCalled();
    expect(mw).not.toHaveBeenCalled();
  });
});
