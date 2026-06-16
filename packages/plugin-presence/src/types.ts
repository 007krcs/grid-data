// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
//
// ─── @gridstorm/plugin-presence — Type model ────────────────────────────────
//
// Presence is "who else is here, where are they looking?". Distinct from
// CRDT-based co-editing (Pillar 1.3, separate plugin) — presence is read-
// only, low-bandwidth, and doesn't need conflict resolution. It's the
// foundation everything else in the collab pillar builds on:
//
//   • Pillar 1.2 selection broadcast extends UserPresence with focusedCell
//     and selection fields (already in this type model — see below).
//   • Pillar 1.3 CRDT cell editing uses the same PresenceAdapter transport
//     for awareness signals (who's typing in which cell).
//   • Pillar 1.4 comment threads are anchored to (rowId, colId) keys but
//     surface the comment author through presence.
//
// Design rules:
//
//   1. ADAPTER, NOT TRANSPORT. The plugin defines the data shape and the
//      sync rules; PresenceAdapter is a swappable bridge to a real
//      transport (WebSocket, BroadcastChannel, Liveblocks, Yjs awareness).
//      Two reference impls ship in this package; consumers usually wire
//      their own to a hosted collaboration service.
//
//   2. STATE IS A SNAPSHOT, NOT A DIFF. Every broadcast carries the
//      sender's full UserPresence. Adapter authors don't need to think
//      about diff semantics; receivers do shallow merges.
//
//   3. THROTTLING IS THE PLUGIN'S JOB, NOT THE ADAPTER'S. The plugin
//      coalesces high-frequency local updates (selection drag, scroll)
//      into at most one broadcast per `throttleMs`. Adapters see clean,
//      paced traffic.
//
//   4. NO IDENTITY MANAGEMENT. The plugin accepts `userId` and `displayName`
//      from the consumer. It doesn't authenticate, it doesn't generate
//      anonymous IDs except as a debug fallback. Real apps wire to their
//      IDP via the install-time config.

/**
 * One user's currently-broadcast state. Optional fields are set when the
 * corresponding Pillar phase ships — `focusedCell` and `selection` are part
 * of Pillar 1.2 and already wired here so the type doesn't change shape
 * between phases.
 */
export interface UserPresence {
  /** Stable user identifier from the consuming application. */
  userId: string;
  /** Display name shown in avatar tooltips and badges. */
  displayName: string;
  /** Avatar color, hex string. Used for cursor / selection ghosting. */
  color: string;
  /** Optional avatar image URL. */
  avatarUrl?: string;
  /** Wall-clock ms when this presence was last updated by the user. */
  lastSeen: number;
  /**
   * What range of rows the user is currently looking at — sent by the
   * plugin when the viewport scrolls. Optional because not every adapter
   * surfaces scroll signals.
   */
  viewport?: { firstRow: number; lastRow: number };
  /**
   * Single cell the user has keyboard focus on (Pillar 1.2). Null when
   * the user is not interacting with a cell (e.g. typing in the quick
   * filter, focused outside the grid).
   */
  focusedCell?: { rowId: string; colId: string } | null;
  /**
   * Multi-cell selection bounds (Pillar 1.2). null when nothing is selected.
   */
  selection?: { rowIds: string[]; colIds: string[] } | null;
}

/**
 * The shape every adapter delivers to the plugin via its `onPresence`
 * callback. `peers` excludes the local user; the plugin tracks its own
 * presence separately.
 */
export interface PresenceSnapshot {
  peers: UserPresence[];
}

/**
 * Adapter contract. Two reference impls ship in this package
 * (InMemoryPresenceAdapter for tests, BroadcastChannelPresenceAdapter for
 * same-origin same-browser dev). Real apps implement this against their
 * collab transport: WebSocket / SSE / Liveblocks / Yjs awareness.
 */
export interface PresenceAdapter {
  /**
   * Connect and announce the local presence. The adapter is expected to
   * deliver an initial snapshot to `handlers.onPresence` synchronously or
   * shortly after, and subsequent updates as remote peers change.
   */
  connect(local: UserPresence, handlers: PresenceHandlers): Promise<void> | void;

  /**
   * Push the local user's updated presence. Adapters are free to debounce
   * or batch; the plugin already throttles upstream so adapters can
   * assume clean traffic.
   */
  updateLocal(local: UserPresence): Promise<void> | void;

  /** Disconnect and announce departure. */
  disconnect(): Promise<void> | void;
}

export interface PresenceHandlers {
  /** Called with the full peer set whenever any peer joins, leaves, or updates. */
  onPresence(snapshot: PresenceSnapshot): void;
  /** Called on transport errors. */
  onError(error: Error): void;
}

/**
 * Plugin-level config. Most fields are optional with sensible defaults; the
 * required ones are the local user identity (you must know who you are) and
 * the adapter (you must know how to reach the rest).
 */
export interface PresencePluginOptions {
  /** Local user identifier. Required. */
  userId: string;
  /** Local display name. Required. */
  displayName: string;
  /** Avatar color. Auto-assigned if omitted using a stable hash of userId. */
  color?: string;
  /** Avatar image URL. Optional. */
  avatarUrl?: string;
  /** Adapter for the transport. Required for real use; omit for "presence
   *  disabled" mode (the plugin still tracks the local user). */
  adapter?: PresenceAdapter;
  /** Throttle for local-state broadcasts, ms. Default 100. */
  throttleMs?: number;
  /**
   * Whether to broadcast viewport changes (scroll). Off by default — most
   * apps don't want to surface scroll position. Pillar 1.2 turns this on.
   */
  broadcastViewport?: boolean;
  /**
   * Whether to broadcast focused-cell and selection. Off by default — turned
   * on explicitly in Pillar 1.2.
   */
  broadcastSelection?: boolean;
}

/**
 * Plugin state slice. Stored under `pluginState.presence` in the grid's
 * GridState — consumers read it via the selector exported alongside.
 */
export interface PresenceState {
  /** Connected = the adapter's connect() has resolved. */
  connected: boolean;
  /** Map of userId → presence. Excludes the local user; access local via
   *  `localUser`. */
  peers: Map<string, UserPresence>;
  /** The local user's own broadcast state. */
  localUser: UserPresence | null;
  /** Connection error, if any. */
  lastError: Error | null;
}
