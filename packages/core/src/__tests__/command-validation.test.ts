import { describe, it, expect, vi } from 'vitest';
import { CommandBus } from '../events/command-bus';
import { ErrorHandler } from '../errors/error-handler';

describe('Command Validation', () => {
  it('should validate payloads before dispatching', () => {
    const bus = new CommandBus();
    const handler = vi.fn();

    bus.registerHandler('sort:set', handler);
    bus.registerValidator('sort:set', (payload: any) => {
      if (!payload.sortModel || !Array.isArray(payload.sortModel)) {
        return 'sortModel must be an array';
      }
      return null;
    });

    // Invalid payload — handler should NOT be called
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    bus.dispatch('sort:set', { sortModel: 'invalid' } as any);
    expect(handler).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should dispatch when validation passes', () => {
    const bus = new CommandBus();
    const handler = vi.fn();

    bus.registerHandler('sort:set', handler);
    bus.registerValidator('sort:set', (payload: any) => {
      if (!payload.sortModel || !Array.isArray(payload.sortModel)) {
        return 'sortModel must be an array';
      }
      return null;
    });

    bus.dispatch('sort:set', { sortModel: [{ colId: 'name', sort: 'asc' }] });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should report validation errors to ErrorHandler when attached', () => {
    const bus = new CommandBus();
    const errorHandler = new ErrorHandler();
    errorHandler.setSuppressConsole(true);
    bus.setErrorHandler(errorHandler);

    const errorSpy = vi.fn();
    errorHandler.onError(errorSpy);

    bus.registerValidator('sort:set', () => 'always fails');
    bus.dispatch('sort:set', { sortModel: [] });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const gridError = errorSpy.mock.calls[0]![0]!;
    expect(gridError.context.source).toBe('validation');
    expect(gridError.context.commandType).toBe('sort:set');
    expect(gridError.error.message).toContain('always fails');
  });

  it('should validate async dispatches', async () => {
    const bus = new CommandBus();
    const handler = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    bus.registerAsyncHandler('ssrm:ensureRows', handler);
    bus.registerValidator('ssrm:ensureRows', (payload: any) => {
      if (typeof payload.startRow !== 'number') return 'startRow must be a number';
      if (typeof payload.endRow !== 'number') return 'endRow must be a number';
      return null;
    });

    await bus.dispatchAsync('ssrm:ensureRows', { startRow: 'bad', endRow: 10 } as any);
    expect(handler).not.toHaveBeenCalled();

    await bus.dispatchAsync('ssrm:ensureRows', { startRow: 0, endRow: 10 });
    expect(handler).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  it('should allow unregistering validators', () => {
    const bus = new CommandBus();
    const handler = vi.fn();

    bus.registerHandler('sort:set', handler);
    const unsub = bus.registerValidator('sort:set', () => 'blocked');

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    bus.dispatch('sort:set', { sortModel: [] });
    expect(handler).not.toHaveBeenCalled();
    consoleSpy.mockRestore();

    unsub();
    bus.dispatch('sort:set', { sortModel: [] });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should clear validators on bus.clear()', () => {
    const bus = new CommandBus();
    const handler = vi.fn();

    bus.registerValidator('sort:set', () => 'blocked');
    bus.registerHandler('sort:set', handler);
    bus.clear();

    bus.registerHandler('sort:set', handler);
    bus.dispatch('sort:set', { sortModel: [] });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should route handler errors through ErrorHandler', () => {
    const bus = new CommandBus();
    const errorHandler = new ErrorHandler();
    errorHandler.setSuppressConsole(true);
    bus.setErrorHandler(errorHandler);

    const errorSpy = vi.fn();
    errorHandler.onError(errorSpy);

    bus.registerHandler('sort:set', () => {
      throw new Error('handler crash');
    });

    bus.dispatch('sort:set', { sortModel: [] });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const gridError = errorSpy.mock.calls[0]![0]!;
    expect(gridError.context.source).toBe('command');
    expect(gridError.context.commandType).toBe('sort:set');
  });

  it('should dispatch without validator when none registered', () => {
    const bus = new CommandBus();
    const handler = vi.fn();

    bus.registerHandler('test:command', handler);
    bus.dispatch('test:command', { any: 'payload' });

    expect(handler).toHaveBeenCalledWith({ any: 'payload' });
  });
});
