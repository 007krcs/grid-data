// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
//
// ─── BroadcastChannelCrdtTransport ─────────────────────────────────────────
//
// Same-origin same-browser CRDT transport. Tabs / windows / iframes that
// open the same `docId` see each other's edits without any server.
//
// Use cases:
//   • Local development & demos — open two tabs, watch them converge.
//   • Cross-tab awareness inside a single user's workspace.
//   • Offline-capable apps that still want multi-tab consistency.
//
// What this is NOT:
//   • Cross-device — each device runs its own BroadcastChannel.
//   • Cross-origin — origin boundary applies.
//   • Persistent — last tab closing dissolves the session. Use a
//     server-backed transport (y-websocket, Liveblocks Yjs Provider) for
//     real multi-device collaboration.

import * as Y from 'yjs';
import type { CrdtTransport, CrdtTransportHandlers, CrdtUpdate } from '../types';

type WireMessage =
  | { kind: 'update'; bytes: number[]; from: string }
  | { kind: 'hello'; from: string }
  | { kind: 'sync-request'; from: string }
  | { kind: 'sync-response'; bytes: number[]; from: string };

export interface BroadcastChannelCrdtTransportOptions {
  docId: string;
  /**
   * Persist the CRDT document to localStorage so state survives closing
   * every tab. On connect, previously stored state is loaded and merged;
   * afterwards each local or remote update schedules a debounced save.
   *
   * Storage key: `gridstorm-yjs-persist:<docId>`. Note localStorage caps
   * at ~5MB per origin — suitable for comments/cell edits, not huge docs.
   * Default: false (previous behavior — state dissolves with the last tab).
   */
  persist?: boolean;
  /** Debounce for persisted writes, ms. Default 500. */
  persistDebounceMs?: number;
}

const PERSIST_PREFIX = 'gridstorm-yjs-persist:';

function b64FromBytes(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

function bytesFromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export class BroadcastChannelCrdtTransport implements CrdtTransport {
  private channel: BroadcastChannel | null = null;
  private handlers: CrdtTransportHandlers | null = null;
  /** Local accumulator so we can respond to sync-requests from late joiners. */
  private mirror: Y.Doc | null = null;
  private readonly selfId = randomId();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private options: BroadcastChannelCrdtTransportOptions) {}

  connect(initialState: CrdtUpdate, handlers: CrdtTransportHandlers): void {
    if (typeof BroadcastChannel === 'undefined') {
      handlers.onError(
        new Error('BroadcastChannel API not available in this environment'),
      );
      return;
    }
    this.channel = new BroadcastChannel(`gridstorm-yjs:${this.options.docId}`);
    this.handlers = handlers;
    this.mirror = new Y.Doc();
    Y.applyUpdate(this.mirror, initialState);

    // Load persisted state (if enabled) BEFORE talking to peers, so a fresh
    // session that is the only open tab still restores prior comments/edits.
    if (this.options.persist) {
      const stored = this.loadPersisted();
      if (stored) {
        try {
          Y.applyUpdate(this.mirror, stored);
          handlers.onUpdate(stored);
        } catch (e) {
          handlers.onError(e instanceof Error ? e : new Error(String(e)));
        }
      }
    }

    this.channel.onmessage = (ev: MessageEvent<WireMessage>) => {
      this.handleMessage(ev.data);
    };

    // Announce arrival and ask for the current state.
    this.send({ kind: 'hello', from: this.selfId });
    this.send({ kind: 'sync-request', from: this.selfId });
  }

  broadcast(update: CrdtUpdate): void {
    if (!this.channel || !this.mirror) return;
    Y.applyUpdate(this.mirror, update);
    this.send({ kind: 'update', bytes: Array.from(update), from: this.selfId });
    this.schedulePersist();
  }

  disconnect(): void {
    // Flush any pending persist so the very last edit isn't lost on close.
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
      this.persistNow();
    }
    this.channel?.close();
    this.channel = null;
    this.mirror?.destroy();
    this.mirror = null;
    this.handlers = null;
  }

  private handleMessage(msg: WireMessage): void {
    if (msg.from === this.selfId) return; // ignore self-echoes
    if (!this.handlers || !this.mirror) return;

    switch (msg.kind) {
      case 'update': {
        const update = new Uint8Array(msg.bytes);
        Y.applyUpdate(this.mirror, update);
        this.handlers.onUpdate(update);
        this.schedulePersist();
        return;
      }
      case 'hello': {
        // Welcome a new peer by sending them our state so they catch up.
        const state = Y.encodeStateAsUpdate(this.mirror);
        this.send({
          kind: 'sync-response',
          bytes: Array.from(state),
          from: this.selfId,
        });
        return;
      }
      case 'sync-request': {
        const state = Y.encodeStateAsUpdate(this.mirror);
        this.send({
          kind: 'sync-response',
          bytes: Array.from(state),
          from: this.selfId,
        });
        return;
      }
      case 'sync-response': {
        const update = new Uint8Array(msg.bytes);
        Y.applyUpdate(this.mirror, update);
        this.handlers.onUpdate(update);
        this.schedulePersist();
        return;
      }
    }
  }

  private send(msg: WireMessage): void {
    this.channel?.postMessage(msg);
  }

  // ── Persistence (opt-in via options.persist) ─────────────────────────────

  private storageKey(): string {
    return `${PERSIST_PREFIX}${this.options.docId}`;
  }

  private loadPersisted(): Uint8Array | null {
    try {
      const raw = globalThis.localStorage?.getItem(this.storageKey());
      return raw ? bytesFromB64(raw) : null;
    } catch {
      return null; // storage unavailable (sandboxed iframe, SSR) — fail soft
    }
  }

  private schedulePersist(): void {
    if (!this.options.persist) return;
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.persistNow();
    }, this.options.persistDebounceMs ?? 500);
  }

  private persistNow(): void {
    if (!this.options.persist || !this.mirror) return;
    try {
      const state = Y.encodeStateAsUpdate(this.mirror);
      globalThis.localStorage?.setItem(this.storageKey(), b64FromBytes(state));
    } catch (e) {
      // Quota exceeded or storage disabled — surface once, keep running.
      this.handlers?.onError(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
