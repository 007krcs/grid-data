// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── PDF Event Bus ───
// Mirrors GridStorm's EventBus pattern exactly.

export type EventListener<T = any> = (payload: T) => void;

export class EventBus<TEventMap extends Record<string, any>> {
  private listeners = new Map<keyof TEventMap, Set<EventListener>>();

  on<K extends keyof TEventMap>(event: K, listener: EventListener<TEventMap[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);

    return () => {
      set!.delete(listener);
      if (set!.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  emit<K extends keyof TEventMap>(event: K, payload: TEventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of [...set]) {
      try {
        listener(payload);
      } catch (err) {
        console.error(`[GridStorm PDF] Error in event listener for "${String(event)}":`, err);
      }
    }
  }

  off<K extends keyof TEventMap>(event: K, listener: EventListener<TEventMap[K]>): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(listener);
    if (set.size === 0) {
      this.listeners.delete(event);
    }
  }

  removeAllListeners(event?: keyof TEventMap): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  listenerCount(event: keyof TEventMap): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
