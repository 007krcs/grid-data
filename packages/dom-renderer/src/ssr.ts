// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── SSR (Server-Side Rendering) Utilities ───
// Provides environment detection and safe wrappers for DOM APIs
// so the dom-renderer can be safely imported in Node.js, Deno, and Bun.

// ── Environment Detection ──

/**
 * Returns `true` when running in a non-browser environment (Node.js, Deno, Bun)
 * where `window` or `document` are not available.
 */
export function isServer(): boolean {
  return (
    typeof window === 'undefined' ||
    typeof document === 'undefined'
  );
}

/**
 * Returns `true` when running in a browser environment with full DOM access.
 */
export function isBrowser(): boolean {
  return !isServer();
}

// ── Safe DOM API Wrappers ──

/**
 * Safe wrapper for `requestAnimationFrame`.
 * Falls back to `setTimeout(fn, 16)` on the server (~60fps equivalent).
 */
export function safeRequestAnimationFrame(callback: FrameRequestCallback): number {
  if (isBrowser() && typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame(callback);
  }
  // Return a timer ID; setTimeout returns a NodeJS.Timeout in Node but
  // we cast to number for compatibility with the rAF return type.
  return setTimeout(callback, 16) as unknown as number;
}

/**
 * Safe wrapper for `cancelAnimationFrame`.
 * Falls back to `clearTimeout` on the server.
 */
export function safeCancelAnimationFrame(id: number): void {
  if (isBrowser() && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(id);
  } else {
    clearTimeout(id);
  }
}

/**
 * Safe wrapper that returns a `ResizeObserver` if available, or `null` on the server.
 * Usage:
 * ```ts
 * const observer = safeResizeObserver(callback);
 * observer?.observe(element);
 * ```
 */
export function safeResizeObserver(
  callback: ResizeObserverCallback,
): ResizeObserver | null {
  if (isBrowser() && typeof ResizeObserver !== 'undefined') {
    return new ResizeObserver(callback);
  }
  return null;
}

// ── NoopRenderer ──

/**
 * A no-op renderer that implements the same public interface as `DomRenderer`
 * but performs no DOM operations. Use this in SSR contexts where importing
 * the renderer is necessary but DOM is unavailable.
 *
 * ```ts
 * import { isServer, NoopRenderer, DomRenderer } from '@gridstorm/dom-renderer';
 *
 * const renderer = isServer()
 *   ? new NoopRenderer()
 *   : new DomRenderer({ container, engine });
 * ```
 */
export class NoopRenderer {
  /** No-op mount. Does nothing on the server. */
  mount(): void {
    // Intentionally empty — no DOM available.
  }

  /** No-op destroy. Safe to call on the server. */
  destroy(): void {
    // Intentionally empty — nothing to clean up.
  }
}
