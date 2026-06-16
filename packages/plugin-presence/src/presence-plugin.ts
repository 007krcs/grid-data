// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
//
// ─── PresencePlugin ────────────────────────────────────────────────────────
//
// The plugin that owns:
//
//   • The local user's broadcast state.
//   • A peers map populated from PresenceAdapter snapshots.
//   • Throttled local-state broadcasts so dragging a selection across 100
//     cells doesn't fire 100 updates.
//   • Commands (presence:update-self, presence:set-identity, presence:disconnect)
//     and events (presence:peers-changed, presence:local-updated,
//     presence:peer-joined, presence:peer-left) that other plugins consume.
//
// Pillar 1.2 wires this plugin's `update-self` command to selection /
// focused-cell events. Pillar 1.3 (CRDT) treats the presence map as the
// awareness layer and only handles CRUD via Yjs.

import type { GridPlugin, PluginContext } from '@gridstorm/core';
import type {
  PresenceAdapter,
  PresencePluginOptions,
  PresenceSnapshot,
  PresenceState,
  UserPresence,
} from './types';

const STATE_KEY = 'presence';

/**
 * Deterministically pick a hex color from a userId so anonymous users get
 * a stable avatar tint across sessions. Twelve distinct hues at 60% saturation
 * — readable on light and dark themes.
 */
function colorForUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  const palette = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16',
    '#10b981', '#06b6d4', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
  ];
  return palette[Math.abs(hash) % palette.length]!;
}

export function PresencePlugin(options: PresencePluginOptions): GridPlugin {
  return {
    id: 'presence',
    name: 'Presence',
    version: '0.1.0',

    install(ctx: PluginContext): () => void {
      // ── Initial state ──────────────────────────────────────────────────
      const initialLocal: UserPresence = {
        userId: options.userId,
        displayName: options.displayName,
        color: options.color ?? colorForUserId(options.userId),
        avatarUrl: options.avatarUrl,
        lastSeen: typeof performance !== 'undefined' && performance.now ? Date.now() : 0,
      };

      ctx.registerState<PresenceState>(STATE_KEY, {
        connected: false,
        peers: new Map(),
        localUser: initialLocal,
        lastError: null,
      });

      const adapter: PresenceAdapter | undefined = options.adapter;
      let throttleTimer: ReturnType<typeof setTimeout> | null = null;
      let pendingLocal: UserPresence | null = null;
      const throttleMs = options.throttleMs ?? 100;

      // ── Helpers ────────────────────────────────────────────────────────
      function getLocal(): UserPresence {
        const state = ctx.getState<PresenceState>(STATE_KEY);
        return state.localUser ?? initialLocal;
      }

      function snapshotToMap(snapshot: PresenceSnapshot): Map<string, UserPresence> {
        const map = new Map<string, UserPresence>();
        for (const peer of snapshot.peers) {
          map.set(peer.userId, peer);
        }
        return map;
      }

      function emitPeersChanged(prev: Map<string, UserPresence>, next: Map<string, UserPresence>): void {
        for (const peer of next.values()) {
          if (!prev.has(peer.userId)) {
            ctx.eventBus.emit('presence:peer-joined' as never, { peer } as never);
          }
        }
        for (const [userId, peer] of prev) {
          if (!next.has(userId)) {
            ctx.eventBus.emit('presence:peer-left' as never, { peer } as never);
          }
        }
        ctx.eventBus.emit('presence:peers-changed' as never, { peers: [...next.values()] } as never);
      }

      function flushLocal(): void {
        throttleTimer = null;
        if (!pendingLocal) return;
        const toSend = pendingLocal;
        pendingLocal = null;
        try {
          adapter?.updateLocal(toSend);
        } catch (e) {
          handleError(e);
        }
        ctx.eventBus.emit('presence:local-updated' as never, { local: toSend } as never);
      }

      function scheduleBroadcast(next: UserPresence): void {
        pendingLocal = next;
        if (throttleTimer !== null) return;
        throttleTimer = setTimeout(flushLocal, throttleMs);
      }

      function handleError(e: unknown): void {
        const error = e instanceof Error ? e : new Error(String(e));
        ctx.setState<PresenceState>(STATE_KEY, (prev) => ({ ...prev, lastError: error }));
        ctx.eventBus.emit('presence:error' as never, { error } as never);
      }

      // ── Adapter wiring ──────────────────────────────────────────────────
      const adapterHandlers = {
        onPresence(snapshot: PresenceSnapshot): void {
          const prevState = ctx.getState<PresenceState>(STATE_KEY);
          const nextPeers = snapshotToMap(snapshot);
          ctx.setState<PresenceState>(STATE_KEY, (prev) => ({ ...prev, peers: nextPeers }));
          emitPeersChanged(prevState.peers, nextPeers);
        },
        onError(error: Error): void {
          handleError(error);
        },
      };

      if (adapter) {
        try {
          Promise.resolve(adapter.connect(initialLocal, adapterHandlers))
            .then(() => {
              ctx.setState<PresenceState>(STATE_KEY, (prev) => ({ ...prev, connected: true }));
              ctx.eventBus.emit('presence:connected' as never, { local: initialLocal } as never);
            })
            .catch(handleError);
        } catch (e) {
          handleError(e);
        }
      }

      // ── Commands ────────────────────────────────────────────────────────

      // presence:update-self — partial update to the local user's presence.
      // Pillar 1.2 dispatches this from selection-changed and focus events.
      const unregisterUpdate = ctx.commandBus.registerHandler(
        'presence:update-self' as never,
        (payload: unknown) => {
          const patch = (payload ?? {}) as Partial<UserPresence>;
          const current = getLocal();
          const next: UserPresence = {
            ...current,
            ...patch,
            // Identity fields are NOT overridable via update-self; use
            // presence:set-identity to change them.
            userId: current.userId,
            lastSeen: Date.now(),
          };
          ctx.setState<PresenceState>(STATE_KEY, (prev) => ({ ...prev, localUser: next }));
          scheduleBroadcast(next);
        },
      );

      // presence:set-identity — update displayName / color / avatarUrl.
      // Identity changes are broadcast immediately (no throttle) because they
      // are rare and visible signal to other users.
      const unregisterSetIdentity = ctx.commandBus.registerHandler(
        'presence:set-identity' as never,
        (payload: unknown) => {
          const patch = (payload ?? {}) as Partial<
            Pick<UserPresence, 'displayName' | 'color' | 'avatarUrl'>
          >;
          const current = getLocal();
          const next: UserPresence = { ...current, ...patch, lastSeen: Date.now() };
          ctx.setState<PresenceState>(STATE_KEY, (prev) => ({ ...prev, localUser: next }));
          try {
            adapter?.updateLocal(next);
          } catch (e) {
            handleError(e);
          }
          ctx.eventBus.emit('presence:local-updated' as never, { local: next } as never);
        },
      );

      // presence:disconnect — manual disconnect (the plugin's own disposer
      // will also call this on grid destroy).
      const unregisterDisconnect = ctx.commandBus.registerHandler(
        'presence:disconnect' as never,
        () => {
          try {
            adapter?.disconnect();
          } catch (e) {
            handleError(e);
          }
          ctx.setState<PresenceState>(STATE_KEY, (prev) => ({
            ...prev,
            connected: false,
          }));
          ctx.eventBus.emit('presence:disconnected' as never, {} as never);
        },
      );

      // ── Pillar 1.2 wiring (optional) ────────────────────────────────────
      // If the consumer turns on `broadcastSelection`, we listen for the
      // core grid's selection / focus events and translate them into
      // presence:update-self dispatches. Plugins still own their own state;
      // the presence plugin just broadcasts a derived projection.
      const unsubscribers: Array<() => void> = [];

      if (options.broadcastSelection) {
        unsubscribers.push(
          ctx.eventBus.on('cell:focused' as never, ((payload: { rowId?: string; colId?: string }) => {
            if (!payload?.rowId || !payload?.colId) return;
            ctx.commandBus.dispatch('presence:update-self' as never, {
              focusedCell: { rowId: payload.rowId, colId: payload.colId },
            } as never);
          }) as never),
        );
        unsubscribers.push(
          ctx.eventBus.on('selection:changed' as never, ((payload: {
            selectedRowIds?: string[];
            selectedColIds?: string[];
          }) => {
            const rowIds = payload?.selectedRowIds ?? [];
            const colIds = payload?.selectedColIds ?? [];
            const selection = rowIds.length === 0 && colIds.length === 0 ? null : { rowIds, colIds };
            ctx.commandBus.dispatch('presence:update-self' as never, { selection } as never);
          }) as never),
        );
      }

      if (options.broadcastViewport) {
        unsubscribers.push(
          ctx.eventBus.on('viewport:changed' as never, ((payload: { firstRow?: number; lastRow?: number }) => {
            if (typeof payload?.firstRow !== 'number' || typeof payload?.lastRow !== 'number') return;
            ctx.commandBus.dispatch('presence:update-self' as never, {
              viewport: { firstRow: payload.firstRow, lastRow: payload.lastRow },
            } as never);
          }) as never),
        );
      }

      // ── Disposer ────────────────────────────────────────────────────────
      return () => {
        if (throttleTimer !== null) {
          clearTimeout(throttleTimer);
          throttleTimer = null;
        }
        for (const off of unsubscribers) off();
        try {
          adapter?.disconnect();
        } catch {
          /* swallow during teardown */
        }
        unregisterUpdate();
        unregisterSetIdentity();
        unregisterDisconnect();
      };
    },
  };
}
