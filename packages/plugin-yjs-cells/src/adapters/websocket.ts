// © 2026 GridStorm Contributors — MIT License
//
// ─── WebSocketCrdtTransport ────────────────────────────────────────────────
//
// Cross-device CRDT transport over a plain WebSocket relay. This closes the
// gap the BroadcastChannel transport leaves open: BroadcastChannel only
// reaches tabs of the same browser on the same machine; a WebSocket relay
// reaches every connected client anywhere.
//
// Server contract (deliberately minimal — ~20 lines with the `ws` package):
//   • Clients connect to `${url}?room=${docId}`.
//   • The server relays every text frame it receives to every OTHER client
//     connected to the same room. No parsing, no persistence required.
//
//   Reference relay (Node + ws):
//     import { WebSocketServer } from 'ws';
//     const wss = new WebSocketServer({ port: 8081 });
//     const rooms = new Map();
//     wss.on('connection', (socket, req) => {
//       const room = new URL(req.url, 'http://x').searchParams.get('room');
//       if (!rooms.has(room)) rooms.set(room, new Set());
//       const peers = rooms.get(room);
//       peers.add(socket);
//       socket.on('message', (data) => {
//         for (const peer of peers) if (peer !== socket) peer.send(data.toString());
//       });
//       socket.on('close', () => peers.delete(socket));
//     });
//
// For production-grade collaboration (auth, persistence, horizontal scale),
// prefer a y-websocket server or Liveblocks Yjs Provider — this transport's
// wire format is intentionally simple, not the y-protocol.
//
// Wire format: JSON text frames, same message kinds as the BroadcastChannel
// transport (hello / sync-request / sync-response / update). Update bytes are
// base64-encoded to keep frames compact.

import * as Y from 'yjs';
import type { CrdtTransport, CrdtTransportHandlers, CrdtUpdate } from '../types';

type WireMessage =
  | { kind: 'update'; b64: string; from: string }
  | { kind: 'hello'; from: string }
  | { kind: 'sync-request'; from: string }
  | { kind: 'sync-response'; b64: string; from: string };

export interface WebSocketCrdtTransportOptions {
  /** Relay URL, e.g. "wss://collab.example.com". `?room=<docId>` is appended. */
  url: string;
  /** Document/room identifier. Clients sharing a docId share state. */
  docId: string;
  /**
   * Maximum reconnect attempts after an unexpected close. Default 10.
   * Backoff doubles from 500ms, capped at 15s. Set 0 to disable reconnect.
   */
  maxReconnects?: number;
  /** WebSocket constructor override (tests, Node with `ws`). */
  webSocketImpl?: typeof WebSocket;
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function toB64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export class WebSocketCrdtTransport implements CrdtTransport {
  private socket: WebSocket | null = null;
  private handlers: CrdtTransportHandlers | null = null;
  /** Local accumulator so we can answer sync-requests and resync on reconnect. */
  private mirror: Y.Doc | null = null;
  private readonly selfId = randomId();
  private reconnects = 0;
  private closedByUs = false;
  /** Frames queued while the socket is still CONNECTING. */
  private sendQueue: string[] = [];

  constructor(private options: WebSocketCrdtTransportOptions) {}

  connect(initialState: CrdtUpdate, handlers: CrdtTransportHandlers): void {
    this.handlers = handlers;
    this.mirror = new Y.Doc();
    Y.applyUpdate(this.mirror, initialState);
    this.closedByUs = false;
    this.open();
  }

  broadcast(update: CrdtUpdate): void {
    if (!this.mirror) return;
    Y.applyUpdate(this.mirror, update);
    this.send({ kind: 'update', b64: toB64(update), from: this.selfId });
  }

  sync(currentState: CrdtUpdate): void {
    if (this.mirror) Y.applyUpdate(this.mirror, currentState);
    this.send({ kind: 'sync-request', from: this.selfId });
  }

  disconnect(): void {
    this.closedByUs = true;
    this.socket?.close();
    this.socket = null;
    this.mirror?.destroy();
    this.mirror = null;
    this.handlers = null;
    this.sendQueue = [];
  }

  private open(): void {
    const WS = this.options.webSocketImpl ?? (typeof WebSocket !== 'undefined' ? WebSocket : undefined);
    if (!WS) {
      this.handlers?.onError(new Error('WebSocket API not available in this environment'));
      return;
    }
    const sep = this.options.url.includes('?') ? '&' : '?';
    const url = `${this.options.url}${sep}room=${encodeURIComponent(this.options.docId)}`;
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
      // Flush anything queued while connecting, then announce + request sync.
      for (const frame of this.sendQueue.splice(0)) socket.send(frame);
      this.sendRaw(socket, { kind: 'hello', from: this.selfId });
      this.sendRaw(socket, { kind: 'sync-request', from: this.selfId });
    };

    socket.onmessage = (ev: MessageEvent) => {
      try {
        this.handleMessage(JSON.parse(String(ev.data)) as WireMessage);
      } catch (e) {
        this.handlers?.onError(e instanceof Error ? e : new Error(String(e)));
      }
    };

    socket.onerror = () => {
      // The close handler decides whether to reconnect; onerror alone
      // carries no useful detail in the browser WebSocket API.
    };

    socket.onclose = () => {
      if (this.closedByUs || !this.handlers) return;
      const max = this.options.maxReconnects ?? 10;
      if (this.reconnects >= max) {
        this.handlers.onError(
          new Error(`WebSocketCrdtTransport: gave up after ${max} reconnect attempts`),
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
    if (msg.from === this.selfId) return;
    if (!this.handlers || !this.mirror) return;

    switch (msg.kind) {
      case 'update': {
        const update = fromB64(msg.b64);
        Y.applyUpdate(this.mirror, update);
        this.handlers.onUpdate(update);
        return;
      }
      case 'hello':
      case 'sync-request': {
        const state = Y.encodeStateAsUpdate(this.mirror);
        this.send({ kind: 'sync-response', b64: toB64(state), from: this.selfId });
        return;
      }
      case 'sync-response': {
        const update = fromB64(msg.b64);
        Y.applyUpdate(this.mirror, update);
        this.handlers.onUpdate(update);
        return;
      }
    }
  }

  private send(msg: WireMessage): void {
    const frame = JSON.stringify(msg);
    if (this.socket && this.socket.readyState === 1 /* OPEN */) {
      this.socket.send(frame);
    } else {
      // Queue until onopen flushes; drop if the queue grows unreasonably
      // (a dead relay shouldn't grow memory unboundedly).
      if (this.sendQueue.length < 1000) this.sendQueue.push(frame);
    }
  }

  private sendRaw(socket: WebSocket, msg: WireMessage): void {
    socket.send(JSON.stringify(msg));
  }
}
