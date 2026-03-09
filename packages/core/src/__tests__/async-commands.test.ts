import { describe, it, expect, vi } from 'vitest';
import { CommandBus } from '../events/command-bus';

describe('Async Command Support', () => {
  describe('dispatchAsync', () => {
    it('should execute sync handlers before async handlers', async () => {
      const bus = new CommandBus();
      const order: string[] = [];

      bus.registerHandler('ssrm:refresh', () => {
        order.push('sync');
      });
      bus.registerAsyncHandler('ssrm:refresh', async () => {
        order.push('async');
      });

      await bus.dispatchAsync('ssrm:refresh', {});

      expect(order).toEqual(['sync', 'async']);
    });

    it('should execute async handlers sequentially', async () => {
      const bus = new CommandBus();
      const order: string[] = [];

      bus.registerAsyncHandler('ssrm:refresh', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        order.push('first');
      });
      bus.registerAsyncHandler('ssrm:refresh', async () => {
        order.push('second');
      });

      await bus.dispatchAsync('ssrm:refresh', {});

      // Second should only run after first completes
      expect(order).toEqual(['first', 'second']);
    });

    it('should pass payload to async handlers', async () => {
      const bus = new CommandBus();
      const handler = vi.fn().mockResolvedValue(undefined);

      bus.registerAsyncHandler('ssrm:ensureRows', handler);
      await bus.dispatchAsync('ssrm:ensureRows', { startRow: 0, endRow: 50 });

      expect(handler).toHaveBeenCalledWith({ startRow: 0, endRow: 50 });
    });

    it('should run middleware before async handlers', async () => {
      const bus = new CommandBus();
      const order: string[] = [];

      bus.use((ctx) => {
        order.push(`middleware:${ctx.commandType}`);
      });
      bus.registerAsyncHandler('ssrm:refresh', async () => {
        order.push('async-handler');
      });

      await bus.dispatchAsync('ssrm:refresh', {});

      expect(order).toEqual(['middleware:ssrm:refresh', 'async-handler']);
    });

    it('should allow middleware to cancel async dispatch', async () => {
      const bus = new CommandBus();
      const syncHandler = vi.fn();
      const asyncHandler = vi.fn().mockResolvedValue(undefined);

      bus.use((ctx) => {
        ctx.cancel();
      });
      bus.registerHandler('ssrm:refresh', syncHandler);
      bus.registerAsyncHandler('ssrm:refresh', asyncHandler);

      await bus.dispatchAsync('ssrm:refresh', {});

      expect(syncHandler).not.toHaveBeenCalled();
      expect(asyncHandler).not.toHaveBeenCalled();
    });

    it('should not crash when no handlers are registered', async () => {
      const bus = new CommandBus();
      await expect(bus.dispatchAsync('ssrm:refresh', {})).resolves.toBeUndefined();
    });

    it('should catch errors in async handlers without stopping execution', async () => {
      const bus = new CommandBus();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const goodHandler = vi.fn().mockResolvedValue(undefined);

      bus.registerAsyncHandler('ssrm:refresh', async () => {
        throw new Error('Async handler error');
      });
      bus.registerAsyncHandler('ssrm:refresh', goodHandler);

      await bus.dispatchAsync('ssrm:refresh', {});

      expect(consoleSpy).toHaveBeenCalled();
      expect(goodHandler).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should catch errors in sync handlers during async dispatch', async () => {
      const bus = new CommandBus();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const asyncHandler = vi.fn().mockResolvedValue(undefined);

      bus.registerHandler('ssrm:refresh', () => {
        throw new Error('Sync handler error');
      });
      bus.registerAsyncHandler('ssrm:refresh', asyncHandler);

      await bus.dispatchAsync('ssrm:refresh', {});

      expect(consoleSpy).toHaveBeenCalled();
      expect(asyncHandler).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should work with typed command payloads', async () => {
      const bus = new CommandBus();
      const handler = vi.fn().mockResolvedValue(undefined);

      bus.registerAsyncHandler('ssrm:ensureRows', handler);
      await bus.dispatchAsync('ssrm:ensureRows', { startRow: 10, endRow: 20 });

      expect(handler).toHaveBeenCalledWith({ startRow: 10, endRow: 20 });
    });
  });

  describe('registerAsyncHandler', () => {
    it('should return an unsubscribe function', async () => {
      const bus = new CommandBus();
      const handler = vi.fn().mockResolvedValue(undefined);

      const unsub = bus.registerAsyncHandler('ssrm:refresh', handler);

      await bus.dispatchAsync('ssrm:refresh', {});
      expect(handler).toHaveBeenCalledTimes(1);

      unsub();

      await bus.dispatchAsync('ssrm:refresh', {});
      expect(handler).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should support multiple async handlers for the same command', async () => {
      const bus = new CommandBus();
      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockResolvedValue(undefined);

      bus.registerAsyncHandler('ssrm:refresh', handler1);
      bus.registerAsyncHandler('ssrm:refresh', handler2);

      await bus.dispatchAsync('ssrm:refresh', {});

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should not be invoked by sync dispatch', () => {
      const bus = new CommandBus();
      const asyncHandler = vi.fn().mockResolvedValue(undefined);

      bus.registerAsyncHandler('ssrm:refresh', asyncHandler);
      bus.dispatch('ssrm:refresh', {});

      // Sync dispatch should not trigger async handlers
      expect(asyncHandler).not.toHaveBeenCalled();
    });
  });

  describe('removeHandlers', () => {
    it('should remove both sync and async handlers', async () => {
      const bus = new CommandBus();
      const syncHandler = vi.fn();
      const asyncHandler = vi.fn().mockResolvedValue(undefined);

      bus.registerHandler('ssrm:refresh', syncHandler);
      bus.registerAsyncHandler('ssrm:refresh', asyncHandler);

      bus.removeHandlers('ssrm:refresh');

      bus.dispatch('ssrm:refresh', {});
      await bus.dispatchAsync('ssrm:refresh', {});

      expect(syncHandler).not.toHaveBeenCalled();
      expect(asyncHandler).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should clear all sync and async handlers', async () => {
      const bus = new CommandBus();
      const syncHandler = vi.fn();
      const asyncHandler = vi.fn().mockResolvedValue(undefined);

      bus.registerHandler('ssrm:refresh', syncHandler);
      bus.registerAsyncHandler('ssrm:refresh', asyncHandler);

      bus.clear();

      bus.dispatch('ssrm:refresh', {});
      await bus.dispatchAsync('ssrm:refresh', {});

      expect(syncHandler).not.toHaveBeenCalled();
      expect(asyncHandler).not.toHaveBeenCalled();
    });
  });

  describe('backward compatibility', () => {
    it('should work with untyped custom async commands', async () => {
      const bus = new CommandBus();
      const handler = vi.fn().mockResolvedValue(undefined);

      bus.registerAsyncHandler('custom:fetchData', handler);
      await bus.dispatchAsync('custom:fetchData', { url: '/api/data' });

      expect(handler).toHaveBeenCalledWith({ url: '/api/data' });
    });
  });
});
