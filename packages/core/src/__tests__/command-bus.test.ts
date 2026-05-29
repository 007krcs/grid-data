import { describe, it, expect, vi } from 'vitest';
import { CommandBus, STOP_PROPAGATION } from '../events/command-bus';

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

  it('should stop the handler chain when a handler returns STOP_PROPAGATION', () => {
    const bus = new CommandBus();
    const order: string[] = [];

    bus.registerHandler('test:command', () => {
      order.push('first');
    });
    bus.registerHandler('test:command', () => {
      order.push('second');
      return STOP_PROPAGATION;
    });
    bus.registerHandler('test:command', () => {
      order.push('third');
    });

    bus.dispatch('test:command', {});
    expect(order).toEqual(['first', 'second']);
  });

  it('should stop the async handler chain when an async handler returns STOP_PROPAGATION', async () => {
    const bus = new CommandBus();
    const order: string[] = [];

    bus.registerAsyncHandler('test:command', async (): Promise<typeof STOP_PROPAGATION> => {
      order.push('a1');
      return STOP_PROPAGATION;
    });
    bus.registerAsyncHandler('test:command', async () => {
      order.push('a2');
    });

    await bus.dispatchAsync('test:command', {});
    expect(order).toEqual(['a1']);
  });

  it('should run multiple validators as a chain (first failure wins)', () => {
    const bus = new CommandBus();
    const handler = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const v1 = vi.fn(() => null);
    const v2 = vi.fn(() => 'v2 rejects');
    const v3 = vi.fn(() => null);
    bus.registerValidator('test:command', v1);
    bus.registerValidator('test:command', v2);
    bus.registerValidator('test:command', v3);
    bus.registerHandler('test:command', handler);

    bus.dispatch('test:command', {});

    expect(v1).toHaveBeenCalled();
    expect(v2).toHaveBeenCalled();
    // v3 is never reached because v2 already rejected.
    expect(v3).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should not let a second validator silently overwrite the first', () => {
    const bus = new CommandBus();
    const handler = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // First validator blocks; second always passes. Before the chain fix the
    // second registration clobbered the first and the command went through.
    bus.registerValidator('test:command', () => 'blocked by first');
    bus.registerValidator('test:command', () => null);
    bus.registerHandler('test:command', handler);

    bus.dispatch('test:command', {});
    expect(handler).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should remove only the unsubscribed validator from the chain', () => {
    const bus = new CommandBus();
    const handler = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const unsubBlock = bus.registerValidator('test:command', () => 'blocked');
    bus.registerValidator('test:command', () => null);
    bus.registerHandler('test:command', handler);

    bus.dispatch('test:command', {});
    expect(handler).not.toHaveBeenCalled();

    // Removing the blocking validator leaves the passing one in place.
    unsubBlock();
    bus.dispatch('test:command', {});
    expect(handler).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });
});
