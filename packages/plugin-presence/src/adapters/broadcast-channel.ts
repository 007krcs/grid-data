// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
//
// ─── BroadcastChannelPresenceAdapter ───────────────────────────────────────
//
// Same-origin same-browser presence transport. Uses the standard
// BroadcastChannel API (https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)
// to sync presence across tabs / windows / iframes of the same origin.
//
// Use cases:
//   • Local dev: open two tabs, see each other immediately. No server.
//   • Cross-tab awareness inside a single user's workspace (e.g. "you have
//     this grid open in another tab").
//   • A baseline transport for offline-capable apps that don't always have
//     a server reachable.
//
// What this is NOT:
//   • Cross-origin (you don't get presence between gridstorm.dev and
//     tekivex.com — that's an HTTP/IPC concern outside this adapter).
//   • Cross-device (each device runs its own BroadcastChannel).
//   • Persistent across tab close — when the last tab closes, the session
//     dissolves. A server-backed adapter is the answer for persistence.

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

export interface BroadcastChannelPresenceAdapterOptions {
  /** BroadcastChannel name. Tabs sharing this name share a presence session. */
  channelName: string;
}

export class BroadcastChannelPresenceAdapter implements PresenceAdapter {
  private channel: BroadcastChannel | null = null;
  private peers = new Map<string, UserPresence>();
  private localUser: UserPresence | null = null;
  private handlers: PresenceHandlers | null = null;

  constructor(private options: BroadcastChannelPresenceAdapterOptions) {}

  connect(local: UserPresence, handlers: PresenceHandlers): void {
    if (typeof BroadcastChannel === 'undefined') {
      // Older browsers and some test environments lack BroadcastChannel.
      // Fail-soft: the plugin still tracks the local user and behaves as
      // single-user; we just don't sync.
      handlers.onError(new Error('BroadcastChannel API not available in this environment'));
      return;
    }
    this.channel = new BroadcastChannel(this.options.channelName);
    this.localUser = { ...local };
    this.handlers = handlers;

    this.channel.onmessage = (ev: MessageEvent<WireMessage>) => {
      this.handleMessage(ev.data);
    };

    // Announce arrival, then ask everyone else for their current state.
    this.send({ kind: 'hello', presence: this.localUser });
    this.send({ kind: 'discover', from: this.localUser.userId });
    this.emitSnapshot();
  }

  updateLocal(local: UserPresence): void {
    if (!this.channel || !this.localUser) return;
    this.localUser = { ...local };
    this.send({ kind: 'update', presence: this.localUser });
  }

  disconnect(): void {
    if (!this.channel || !this.localUser) return;
    this.send({ kind: 'bye', userId: this.localUser.userId });
    this.channel.close();
    this.channel = null;
    this.peers.clear();
    this.localUser = null;
    this.handlers = null;
  }

  private handleMessage(msg: WireMessage): void {
    if (!this.localUser) return;
    switch (msg.kind) {
      case 'hello':
      case 'update': {
        if (msg.presence.userId === this.localUser.userId) return; // ignore self echoes
        this.peers.set(msg.presence.userId, msg.presence);
        if (msg.kind === 'hello') {
          // Respond to a new arrival with our current state so they don't have
          // to wait for our next throttled tick.
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
        // Reply with our local user so the requester can build a full roster.
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
      console.error('[BroadcastChannelPresenceAdapter] handler.onPresence threw:', e);
    }
  }

  private send(msg: WireMessage): void {
    this.channel?.postMessage(msg);
  }
}
