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
  }

  disconnect(): void {
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
        return;
      }
    }
  }

  private send(msg: WireMessage): void {
    this.channel?.postMessage(msg);
  }
}
