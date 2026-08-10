// © 2026 GridStorm Contributors — MIT License
//
// ─── WebSocketPresenceAdapter ──────────────────────────────────────────────
//
// Cross-device presence over a plain WebSocket relay — the same relay
// contract as WebSocketCrdtTransport in @gridstorm/plugin-yjs-cells:
// clients connect to `${url}?room=${channelName}` and the server forwards
// every text frame to every other client in the room. See that file's
// header for a ~20-line reference relay.
//
// Wire format: JSON text frames using the same message kinds as the
// BroadcastChannel presence adapter (hello / update / bye / discover /
// roster).

import type {
  PresenceAdapter,
  PresenceHandlers,
  PresenceSnapshot,
  UserPresence,
} from '../types';

type WireMessage =
  | { kind: 'hello'; presence: UserPresence }
  | { kind: 'update'; presence: UserPresence }
  | { kind: 'bye'; userId: string }
  | { kind: 'discover'; from: string }
  | { kind: 'roster'; presences: UserPresence[] };

export interface WebSocketPresenceAdapterOptions {
  /** Relay URL, e.g. "wss://collab.example.com". `?room=<channelName>` is appended. */
  url: string;
  /** Room identifier. Clients sharing a channelName see each other. */
  channelName: string;
  /** Max reconnect attempts after unexpected close. Default 10; 0 disables. */
  maxReconnects?: number;
  /** WebSocket constructor override (tests, Node with `ws`). */
  webSocketImpl?: typeof WebSocket;
}

export class WebSocketPresenceAdapter implements PresenceAdapter {
  private socket: WebSocket | null = null;
  private peers = new Map<string, UserPresence>();
  private localUser: UserPresence | null = null;
  private handlers: PresenceHandlers | null = null;
  private reconnects = 0;
  private closedByUs = false;

  constructor(private options: WebSocketPresenceAdapterOptions) {}

  connect(local: UserPresence, handlers: PresenceHandlers): void {
    this.localUser = { ...local };
    this.handlers = handlers;
    this.closedByUs = false;
    this.open();
    this.emitSnapshot();
  }

  updateLocal(local: UserPresence): void {
    if (!this.localUser) return;
    this.localUser = { ...local };
    this.send({ kind: 'update', presence: this.localUser });
  }

  disconnect(): void {
    if (this.localUser) this.send({ kind: 'bye', userId: this.localUser.userId });
    this.closedByUs = true;
    this.socket?.close();
    this.socket = null;
    this.peers.clear();
    this.localUser = null;
    this.handlers = null;
  }

  private open(): void {
    const WS = this.options.webSocketImpl ?? (typeof WebSocket !== 'undefined' ? WebSocket : undefined);
    if (!WS) {
      this.handlers?.onError(new Error('WebSocket API not available in this environment'));
      return;
    }
    const sep = this.options.url.includes('?') ? '&' : '?';
    const url = `${this.options.url}${sep}room=${encodeURIComponent(this.options.channelName)}`;
    let socket: WebSocket;
    try {
      socket = new WS(url);
    } catch (e) {
      this.handlers?.onError(e instanceof Error ? e : new Error(String(e)));
      return;
    }
    this.socket = socket;

    socket.onopen = () => {
      this.reconnects = 0;
      if (!this.localUser) return;
      this.sendRaw(socket, { kind: 'hello', presence: this.localUser });
      this.sendRaw(socket, { kind: 'discover', from: this.localUser.userId });
    };

    socket.onmessage = (ev: MessageEvent) => {
      try {
        this.handleMessage(JSON.parse(String(ev.data)) as WireMessage);
      } catch (e) {
        this.handlers?.onError(e instanceof Error ? e : new Error(String(e)));
      }
    };

    socket.onclose = () => {
      if (this.closedByUs || !this.handlers) return;
      const max = this.options.maxReconnects ?? 10;
      if (this.reconnects >= max) {
        this.handlers.onError(
          new Error(`WebSocketPresenceAdapter: gave up after ${max} reconnect attempts`),
        );
        return;
      }
      const delay = Math.min(500 * 2 ** this.reconnects, 15_000);
      this.reconnects++;
      setTimeout(() => {
        if (!this.closedByUs && this.handlers) this.open();
      }, delay);
    };
  }

  private handleMessage(msg: WireMessage): void {
    if (!this.localUser) return;
    switch (msg.kind) {
      case 'hello':
      case 'update': {
        if (msg.presence.userId === this.localUser.userId) return;
        this.peers.set(msg.presence.userId, msg.presence);
        if (msg.kind === 'hello') {
          this.send({ kind: 'update', presence: this.localUser });
        }
        this.emitSnapshot();
        break;
      }
      case 'bye': {
        if (msg.userId === this.localUser.userId) return;
        if (this.peers.delete(msg.userId)) this.emitSnapshot();
        break;
      }
      case 'discover': {
        if (msg.from === this.localUser.userId) return;
        this.send({ kind: 'roster', presences: [this.localUser] });
        break;
      }
      case 'roster': {
        let changed = false;
        for (const presence of msg.presences) {
          if (presence.userId === this.localUser.userId) continue;
          this.peers.set(presence.userId, presence);
          changed = true;
        }
        if (changed) this.emitSnapshot();
        break;
      }
    }
  }

  private emitSnapshot(): void {
    if (!this.handlers) return;
    const snapshot: PresenceSnapshot = { peers: [...this.peers.values()] };
    try {
      this.handlers.onPresence(snapshot);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[WebSocketPresenceAdapter] handler.onPresence threw:', e);
    }
  }

  private send(msg: WireMessage): void {
    if (this.socket && this.socket.readyState === 1 /* OPEN */) {
      this.socket.send(JSON.stringify(msg));
    }
  }

  private sendRaw(socket: WebSocket, msg: WireMessage): void {
    socket.send(JSON.stringify(msg));
  }
}
