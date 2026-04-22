// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Platform Event Bus ───
// Lightweight cross-product pub/sub.
// Products can emit events (e.g. "user exported data") and
// other products can react (e.g. "show PDF ready notification").

import type { PlatformEvent, PlatformEventType, PlatformEventHandler } from './types';

type AnyHandler = PlatformEventHandler<any>;

class PlatformEventBus {
  private _listeners = new Map<PlatformEventType, Set<AnyHandler>>();

  on<T>(type: PlatformEventType, handler: PlatformEventHandler<T>): () => void {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, new Set());
    }
    this._listeners.get(type)!.add(handler as AnyHandler);
    return () => this.off(type, handler);
  }

  off<T>(type: PlatformEventType, handler: PlatformEventHandler<T>): void {
    this._listeners.get(type)?.delete(handler as AnyHandler);
  }

  emit<T>(event: PlatformEvent<T>): void {
    const handlers = this._listeners.get(event.type);
    if (!handlers) return;
    for (const h of handlers) {
      try { h(event); } catch { /* isolate handler errors */ }
    }
  }

  /** Convenience: emit without building the full event object */
  dispatch<T>(
    type: PlatformEventType,
    sourceProductId: string,
    payload: T
  ): void {
    this.emit({ type, sourceProductId, payload, timestamp: Date.now() });
  }
}

/** Global platform event bus — use sparingly for genuine cross-product needs */
export const platformEventBus = new PlatformEventBus();
