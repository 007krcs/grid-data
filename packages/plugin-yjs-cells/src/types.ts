// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
//
// ─── @gridstorm/plugin-yjs-cells — Type model ──────────────────────────────
//
// CRDT-backed concurrent cell editing for GridStorm. Built on Yjs (mature,
// battle-tested CRDT library). Every cell value is a key in a Y.Map; edits
// become Y.Map operations that converge deterministically without locking
// or last-writer-wins.
//
// Why Yjs:
//   • Battle-tested in TipTap, BlockNote, etc. — has shipped at scale.
//   • Tight binary encoding; updates are typically tens of bytes.
//   • Awareness API for cursor/selection (we use plugin-presence instead).
//   • Works with any transport — y-websocket, y-webrtc, custom adapters.
//
// Architecture:
//
//   1. The plugin owns a Y.Doc. Inside it, one Y.Map per row maps
//      colId → cell value. Row IDs map to Y.Map instances stored in a
//      top-level Y.Map keyed by rowId.
//
//   2. When the user edits a cell, the existing cell:editingStopped /
//      grid:setCellValue commands flow through as normal. The plugin
//      observes them and writes into the Y.Doc as the SAME transaction.
//      Remote Y.Doc updates → grid state via the inverse path.
//
//   3. Conflict resolution is what Yjs does: parallel edits to the same
//      cell converge via a deterministic ordering. Last-writer-wins is
//      avoided; users see each other's edits merge naturally.
//
//   4. Transport is an adapter (CrdtTransport) — same pattern as
//      plugin-presence. Reference: in-memory (tests), pluggable for
//      y-websocket / y-webrtc / Liveblocks Yjs Provider.

import type * as Y from 'yjs';

/**
 * Encoded Yjs update — opaque binary blob. Transports treat these as
 * payloads; they don't need to know the Yjs format. This is how Yjs
 * propagates state diffs: each `Doc.applyUpdate(bytes)` is idempotent and
 * commutative with respect to other updates.
 */
export type CrdtUpdate = Uint8Array;

/**
 * Adapter contract. The plugin gives the adapter encoded updates to
 * broadcast; the adapter delivers remote updates via onUpdate. Either side
 * may call sync() to request a fresh diff exchange (e.g. after a network
 * blip).
 */
export interface CrdtTransport {
  /**
   * Connect to the transport. The plugin passes its current Y.Doc state
   * encoded as an update so the adapter can broadcast the initial state
   * to peers.
   */
  connect(initialState: CrdtUpdate, handlers: CrdtTransportHandlers): Promise<void> | void;

  /** Broadcast a local update to peers. */
  broadcast(update: CrdtUpdate): Promise<void> | void;

  /** Request a sync — adapter should re-exchange diffs with peers. */
  sync?(currentState: CrdtUpdate): Promise<void> | void;

  /** Disconnect cleanly. */
  disconnect(): Promise<void> | void;
}

export interface CrdtTransportHandlers {
  /** Called with each remote update. Plugin applies it to its Y.Doc. */
  onUpdate(update: CrdtUpdate, origin?: string): void;
  /** Transport errors. Non-fatal — the plugin continues using its local Doc. */
  onError(error: Error): void;
}

export interface YjsCellsPluginOptions {
  /**
   * CRDT identifier — typically the grid/document the user is editing.
   * Adapters use this to scope peers; two plugins with the same docId
   * share state, different docIds are independent.
   */
  docId: string;
  /**
   * Transport adapter. Required for multi-user; omit for "local-only" mode
   * where the plugin runs the CRDT layer for its versioning + undo
   * guarantees without networking.
   */
  transport?: CrdtTransport;
  /**
   * Columns the plugin should sync. If omitted, all columns sync.
   * Useful when some columns are derived/computed and shouldn't go through
   * CRDT (the formula engine, for example).
   */
  syncedColumns?: string[];
  /**
   * Origin tag for local updates. Helps adapters distinguish self-echoes
   * from remote updates. Defaults to a random string per plugin instance.
   */
  origin?: string;
  /**
   * Optional Y.Doc instance to use instead of constructing a new one. Allows
   * advanced consumers to share a Doc with other apps (e.g. a Yjs-backed
   * comments plugin uses the same Doc).
   */
  doc?: Y.Doc;
}

export interface YjsCellsState {
  /** Connected = transport.connect() resolved. */
  connected: boolean;
  /** Total cells we currently track in the CRDT. */
  cellCount: number;
  /** Last error from the transport, if any. */
  lastError: Error | null;
  /**
   * Local origin tag for this plugin instance. Used to filter self-echoes
   * from remote update streams.
   */
  origin: string;
}

/**
 * Public event payload — emitted whenever a remote peer's edit lands.
 * Consumers wire this to cell flash animations or audit logs.
 */
export interface RemoteCellChange {
  rowId: string;
  colId: string;
  value: unknown;
  origin: string;
}
