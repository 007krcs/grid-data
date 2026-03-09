// ─── SSR Compatibility Tests ───
// Verifies that the dom-renderer can be safely used in server-side
// environments where DOM globals are unavailable.

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isServer,
  isBrowser,
  safeRequestAnimationFrame,
  safeCancelAnimationFrame,
  safeResizeObserver,
  NoopRenderer,
} from '../ssr';
import { createGrid } from '@gridstorm/core';
import { DomRenderer } from '../renderer';

// ── 1. Environment Detection (jsdom) ──

describe('Environment detection (jsdom)', () => {
  it('isServer() should return false in jsdom environment', () => {
    // jsdom provides window and document, so we are not on the server
    expect(isServer()).toBe(false);
  });

  it('isBrowser() should return true in jsdom environment', () => {
    expect(isBrowser()).toBe(true);
  });

  it('isBrowser() should be the inverse of isServer()', () => {
    expect(isBrowser()).toBe(!isServer());
  });
});

// ── 2. Environment Detection (simulated server) ──

describe('Environment detection (simulated server)', () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;

  afterEach(() => {
    // Restore globals
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'document', {
      value: originalDocument,
      writable: true,
      configurable: true,
    });
  });

  it('isServer() should return true when window is undefined', () => {
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    expect(isServer()).toBe(true);
    expect(isBrowser()).toBe(false);
  });

  it('isServer() should return true when document is undefined', () => {
    Object.defineProperty(globalThis, 'document', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    expect(isServer()).toBe(true);
    expect(isBrowser()).toBe(false);
  });
});

// ── 3. Safe DOM API Wrappers ──

describe('Safe DOM API wrappers', () => {
  describe('safeRequestAnimationFrame', () => {
    it('should call requestAnimationFrame in browser environment', () => {
      const spy = vi.spyOn(globalThis, 'requestAnimationFrame');
      const callback = vi.fn();

      safeRequestAnimationFrame(callback);

      expect(spy).toHaveBeenCalledWith(callback);
      spy.mockRestore();
    });

    it('should return a numeric handle', () => {
      const id = safeRequestAnimationFrame(() => {});
      expect(typeof id).toBe('number');
      cancelAnimationFrame(id);
    });
  });

  describe('safeCancelAnimationFrame', () => {
    it('should call cancelAnimationFrame in browser environment', () => {
      const spy = vi.spyOn(globalThis, 'cancelAnimationFrame');

      safeCancelAnimationFrame(123);

      expect(spy).toHaveBeenCalledWith(123);
      spy.mockRestore();
    });
  });

  describe('safeResizeObserver', () => {
    it('should return a ResizeObserver instance in browser environment', () => {
      const observer = safeResizeObserver(() => {});
      expect(observer).not.toBeNull();
      expect(observer).toBeInstanceOf(ResizeObserver);
      observer?.disconnect();
    });

    it('should return null when ResizeObserver is unavailable', () => {
      const original = globalThis.ResizeObserver;
      // @ts-expect-error — deliberately removing to simulate server
      delete globalThis.ResizeObserver;

      const observer = safeResizeObserver(() => {});
      expect(observer).toBeNull();

      // Restore
      globalThis.ResizeObserver = original;
    });
  });
});

// ── 4. NoopRenderer ──

describe('NoopRenderer', () => {
  it('should be instantiable without errors', () => {
    expect(() => new NoopRenderer()).not.toThrow();
  });

  it('should have a mount() method that does not throw', () => {
    const renderer = new NoopRenderer();
    expect(() => renderer.mount()).not.toThrow();
  });

  it('should have a destroy() method that does not throw', () => {
    const renderer = new NoopRenderer();
    expect(() => renderer.destroy()).not.toThrow();
  });

  it('should be safe to call mount() then destroy() sequentially', () => {
    const renderer = new NoopRenderer();
    expect(() => {
      renderer.mount();
      renderer.destroy();
    }).not.toThrow();
  });

  it('should be safe to call destroy() multiple times', () => {
    const renderer = new NoopRenderer();
    expect(() => {
      renderer.destroy();
      renderer.destroy();
      renderer.destroy();
    }).not.toThrow();
  });
});

// ── 5. DomRenderer SSR Guard ──

describe('DomRenderer SSR guard', () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;

  afterEach(() => {
    // Restore globals
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'document', {
      value: originalDocument,
      writable: true,
      configurable: true,
    });
  });

  it('mount() should be a no-op when isServer() returns true', () => {
    // Create engine and container in the browser-like jsdom env first
    const container = document.createElement('div');
    document.body.appendChild(container);

    const engine = createGrid({
      columns: [{ field: 'name', headerName: 'Name', width: 100 }],
      rowData: [{ name: 'Alice' }],
    });

    const renderer = new DomRenderer({ container, engine });

    // Now simulate server environment
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    // mount() should return early — no DOM should be created
    expect(() => renderer.mount()).not.toThrow();
    expect(container.querySelector('.gs-root')).toBeNull();

    // Restore so cleanup works
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    });

    renderer.destroy();
    engine.destroy();
    container.remove();
  });

  it('destroy() should be safe when mount() was never called', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const engine = createGrid({
      columns: [{ field: 'name', headerName: 'Name', width: 100 }],
      rowData: [{ name: 'Alice' }],
    });

    const renderer = new DomRenderer({ container, engine });

    // Destroy without mounting — should not throw
    expect(() => renderer.destroy()).not.toThrow();

    engine.destroy();
    container.remove();
  });

  it('destroy() should be safe when called on the server', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const engine = createGrid({
      columns: [{ field: 'name', headerName: 'Name', width: 100 }],
      rowData: [{ name: 'Alice' }],
    });

    const renderer = new DomRenderer({ container, engine });

    // Simulate server
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    expect(() => renderer.destroy()).not.toThrow();

    // Restore
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    });

    engine.destroy();
    container.remove();
  });
});

// ── 6. Safe Wrappers Fallback Under Server Simulation ──

describe('Safe wrappers fallback (simulated server)', () => {
  const originalRAF = globalThis.requestAnimationFrame;
  const originalCAF = globalThis.cancelAnimationFrame;
  const originalRO = globalThis.ResizeObserver;

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRAF;
    globalThis.cancelAnimationFrame = originalCAF;
    globalThis.ResizeObserver = originalRO;
  });

  it('safeRequestAnimationFrame should fall back to setTimeout when rAF is missing', () => {
    // Remove rAF to simulate server
    // @ts-expect-error — deliberately removing
    delete globalThis.requestAnimationFrame;

    const callback = vi.fn();
    const id = safeRequestAnimationFrame(callback);
    // In Node/jsdom, setTimeout returns a Timeout object; in browsers a number.
    // Either way, we get a truthy handle back.
    expect(id).toBeDefined();

    // Clean up the timer
    clearTimeout(id);
  });

  it('safeCancelAnimationFrame should fall back to clearTimeout when cAF is missing', () => {
    // @ts-expect-error — deliberately removing
    delete globalThis.cancelAnimationFrame;

    const spy = vi.spyOn(globalThis, 'clearTimeout');

    safeCancelAnimationFrame(42);

    expect(spy).toHaveBeenCalledWith(42);
    spy.mockRestore();
  });
});
