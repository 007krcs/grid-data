import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../events/event-bus';

interface TestEvents {
  'test:event': { value: number };
  'test:other': { text: string };
}

describe('EventBus', () => {
  it('should emit events to listeners', () => {
    const bus = new EventBus<TestEvents>();
    const listener = vi.fn();

    bus.on('test:event', listener);
    bus.emit('test:event', { value: 42 });

    expect(listener).toHaveBeenCalledWith({ value: 42 });
  });

  it('should support multiple listeners for same event', () => {
    const bus = new EventBus<TestEvents>();
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    bus.on('test:event', listener1);
    bus.on('test:event', listener2);
    bus.emit('test:event', { value: 1 });

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  it('should return unsubscribe function from on()', () => {
    const bus = new EventBus<TestEvents>();
    const listener = vi.fn();

    const unsub = bus.on('test:event', listener);
    unsub();
    bus.emit('test:event', { value: 1 });

    expect(listener).not.toHaveBeenCalled();
  });

  it('should remove specific listener with off()', () => {
    const bus = new EventBus<TestEvents>();
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    bus.on('test:event', listener1);
    bus.on('test:event', listener2);
    bus.off('test:event', listener1);
    bus.emit('test:event', { value: 1 });

    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalled();
  });

  it('should remove all listeners for an event', () => {
    const bus = new EventBus<TestEvents>();
    bus.on('test:event', vi.fn());
    bus.on('test:event', vi.fn());

    bus.removeAllListeners('test:event');
    expect(bus.listenerCount('test:event')).toBe(0);
  });

  it('should remove all listeners when no event specified', () => {
    const bus = new EventBus<TestEvents>();
    bus.on('test:event', vi.fn());
    bus.on('test:other', vi.fn());

    bus.removeAllListeners();
    expect(bus.listenerCount('test:event')).toBe(0);
    expect(bus.listenerCount('test:other')).toBe(0);
  });

  it('should not crash when listener throws', () => {
    const bus = new EventBus<TestEvents>();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    bus.on('test:event', () => {
      throw new Error('boom');
    });
    const good = vi.fn();
    bus.on('test:event', good);

    bus.emit('test:event', { value: 1 });

    expect(good).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should allow unsubscribing during emission', () => {
    const bus = new EventBus<TestEvents>();
    let unsub: () => void;
    const listener = vi.fn(() => unsub());

    unsub = bus.on('test:event', listener);
    bus.emit('test:event', { value: 1 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(bus.listenerCount('test:event')).toBe(0);
  });
});
