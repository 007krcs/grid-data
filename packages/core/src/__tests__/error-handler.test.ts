import { describe, it, expect, vi } from 'vitest';
import { ErrorHandler, getGlobalErrorHandler } from '../errors/error-handler';

describe('ErrorHandler', () => {
  it('should call registered error handlers with structured context', () => {
    const handler = new ErrorHandler();
    handler.setSuppressConsole(true);
    const spy = vi.fn();

    handler.onError(spy);
    handler.report(new Error('test error'), {
      source: 'command',
      commandType: 'sort:set',
      severity: 'error',
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const gridError = spy.mock.calls[0][0];
    expect(gridError.error.message).toBe('test error');
    expect(gridError.context.source).toBe('command');
    expect(gridError.context.commandType).toBe('sort:set');
    expect(gridError.context.severity).toBe('error');
    expect(gridError.context.timestamp).toBeDefined();
  });

  it('should support multiple error handlers', () => {
    const handler = new ErrorHandler();
    handler.setSuppressConsole(true);
    const spy1 = vi.fn();
    const spy2 = vi.fn();

    handler.onError(spy1);
    handler.onError(spy2);
    handler.report(new Error('test'), { source: 'event', severity: 'error' });

    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledTimes(1);
  });

  it('should allow unsubscribing error handlers', () => {
    const handler = new ErrorHandler();
    handler.setSuppressConsole(true);
    const spy = vi.fn();

    const unsub = handler.onError(spy);
    unsub();
    handler.report(new Error('test'), { source: 'command', severity: 'error' });

    expect(spy).not.toHaveBeenCalled();
  });

  it('should log to console by default', () => {
    const handler = new ErrorHandler();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    handler.report(new Error('visible error'), { source: 'command', severity: 'error' });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should suppress console when configured', () => {
    const handler = new ErrorHandler();
    handler.setSuppressConsole(true);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    handler.report(new Error('suppressed'), { source: 'command', severity: 'error' });

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should use console.warn for warning severity', () => {
    const handler = new ErrorHandler();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    handler.report(new Error('warning'), { source: 'plugin', severity: 'warning' });

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should convert non-Error values to Error objects', () => {
    const handler = new ErrorHandler();
    handler.setSuppressConsole(true);
    const spy = vi.fn();

    handler.onError(spy);
    handler.report('string error', { source: 'unknown', severity: 'error' });

    const gridError = spy.mock.calls[0][0];
    expect(gridError.error).toBeInstanceOf(Error);
    expect(gridError.error.message).toBe('string error');
  });

  it('should include event context for event errors', () => {
    const handler = new ErrorHandler();
    handler.setSuppressConsole(true);
    const spy = vi.fn();

    handler.onError(spy);
    handler.report(new Error('event error'), {
      source: 'event',
      eventType: 'sort:changed',
      severity: 'error',
    });

    expect(spy.mock.calls[0][0].context.eventType).toBe('sort:changed');
  });

  it('should include plugin context for plugin errors', () => {
    const handler = new ErrorHandler();
    handler.setSuppressConsole(true);
    const spy = vi.fn();

    handler.onError(spy);
    handler.report(new Error('plugin error'), {
      source: 'plugin',
      pluginId: 'sorting',
      severity: 'error',
    });

    expect(spy.mock.calls[0][0].context.pluginId).toBe('sorting');
  });

  it('should not crash if an error handler itself throws', () => {
    const handler = new ErrorHandler();
    handler.setSuppressConsole(true);

    handler.onError(() => {
      throw new Error('handler crash');
    });
    const spy = vi.fn();
    handler.onError(spy);

    expect(() =>
      handler.report(new Error('test'), { source: 'command', severity: 'error' }),
    ).not.toThrow();

    // Second handler still gets called
    expect(spy).toHaveBeenCalled();
  });

  it('should clear all handlers on clear()', () => {
    const handler = new ErrorHandler();
    const spy = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    handler.onError(spy);
    handler.setSuppressConsole(true);
    handler.clear();

    // clear() resets suppressConsole to false, so console.error would fire — mock it
    handler.report(new Error('test'), { source: 'command', severity: 'error' });
    expect(spy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should return a singleton via getGlobalErrorHandler()', () => {
    const a = getGlobalErrorHandler();
    const b = getGlobalErrorHandler();
    expect(a).toBe(b);
  });

  it('should include metadata in error context', () => {
    const handler = new ErrorHandler();
    handler.setSuppressConsole(true);
    const spy = vi.fn();

    handler.onError(spy);
    handler.report(new Error('test'), {
      source: 'command',
      severity: 'error',
      metadata: { userId: '123', gridId: 'main' },
    });

    expect(spy.mock.calls[0][0].context.metadata).toEqual({
      userId: '123',
      gridId: 'main',
    });
  });
});
