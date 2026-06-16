// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
//
// ─── YjsCellsPlugin ────────────────────────────────────────────────────────
//
// The plugin that wires GridStorm cell edits to a Yjs CRDT. Two-way binding:
//
//   • Local cell edits (from cell:editingStopped or grid:setCellValue
//     commands) write into the Y.Doc, which encodes the change as a binary
//     update and broadcasts via the transport adapter.
//
//   • Remote updates arrive via transport, get applied to the Y.Doc, and
//     observed via Y.Map.observe — each remote change becomes a cell:remoteChange
//     event AND a quiet grid:applyExternalEdit command so the renderer
//     updates without triggering a re-broadcast.
//
// Convergence: two users editing the same cell concurrently produces a
// deterministic merged value chosen by Yjs's algorithm (client ID + clock).
// No last-writer-wins, no lost updates, no locking required.

import type { GridPlugin, PluginContext } from '@gridstorm/core';
import * as Y from 'yjs';
import type {
  CrdtTransport,
  CrdtTransportHandlers,
  CrdtUpdate,
  RemoteCellChange,
  YjsCellsPluginOptions,
  YjsCellsState,
} from './types';

const STATE_KEY = 'yjsCells';
const ROOT_MAP_KEY = 'rows';

function randomOrigin(): string {
  return 'yjs-' + Math.random().toString(36).slice(2, 10);
}

export function YjsCellsPlugin(options: YjsCellsPluginOptions): GridPlugin {
  return {
    id: 'yjs-cells',
    name: 'Yjs Cell Sync',
    version: '0.1.0',

    install(ctx: PluginContext): () => void {
      const doc = options.doc ?? new Y.Doc();
      const origin = options.origin ?? randomOrigin();
      const root = doc.getMap<Y.Map<unknown>>(ROOT_MAP_KEY);
      const transport: CrdtTransport | undefined = options.transport;

      ctx.registerState<YjsCellsState>(STATE_KEY, {
        connected: false,
        cellCount: 0,
        lastError: null,
        origin,
      });

      /** Guard so remote updates don't get re-broadcast as local edits. */
      let suppressBroadcast = 0;

      function isSyncedColumn(colId: string): boolean {
        return !options.syncedColumns || options.syncedColumns.includes(colId);
      }

      /** Re-count cells (used for debug visibility). */
      function recountCells(): void {
        let count = 0;
        for (const rowMap of root.values()) {
          count += rowMap.size;
        }
        ctx.setState<YjsCellsState>(STATE_KEY, (prev) => ({ ...prev, cellCount: count }));
      }

      /** Apply a value to the Y.Doc, transactionally tagged with our origin. */
      function writeCell(rowId: string, colId: string, value: unknown): void {
        suppressBroadcast++;
        try {
          doc.transact(() => {
            let rowMap = root.get(rowId);
            if (!rowMap) {
              rowMap = new Y.Map<unknown>();
              root.set(rowId, rowMap);
            }
            rowMap.set(colId, value);
          }, origin);
        } finally {
          suppressBroadcast--;
        }
        recountCells();
      }

      /** Apply a remote Y.Map change to the grid state. */
      function applyRemoteCellChange(rowId: string, colId: string, value: unknown): void {
        // Update the row's data field. We do NOT dispatch through the
        // command bus to avoid re-entering writeCell via cell:valueChanged.
        // Instead we go direct to the store, mirroring how the streaming
        // plugin applies external updates.
        const node = ctx.api.getRowNode?.(rowId);
        if (node && node.data) {
          (node.data as Record<string, unknown>)[colId] = value;
          node.version = (node.version ?? 0) + 1;
          // Touch rowNodes so the renderer rebuilds the affected cell.
          ctx.store.setState((prev) => ({ ...prev, rowNodes: new Map(prev.rowNodes) }));
        }
        const change: RemoteCellChange = { rowId, colId, value, origin: 'remote' };
        ctx.eventBus.emit('yjsCells:remoteChange' as never, change as never);
      }

      // ── Doc observer: react to ANY change (local or remote) ─────────────
      //
      // We attach a deep observer on the root Y.Map. For local writes,
      // suppressBroadcast > 0 so we know the change came from us — we still
      // encode the update and broadcast it out, but we skip applying it back
      // to the grid (the grid already has the value because the user typed it).
      //
      // For remote updates, suppressBroadcast === 0 — we apply the change
      // to the grid AND emit yjsCells:remoteChange so UIs can flash the cell.

      const docUpdateHandler = (update: Uint8Array, updateOrigin: unknown) => {
        if (updateOrigin === origin) {
          // Our own write — broadcast, don't apply.
          if (transport && ctx.getState<YjsCellsState>(STATE_KEY).connected) {
            try {
              Promise.resolve(transport.broadcast(update)).catch(handleError);
            } catch (e) {
              handleError(e);
            }
          }
          return;
        }
        // Remote write — apply to grid. The actual cell values are surfaced
        // via Y.Map.observe below; this handler just exists to gate the
        // suppressBroadcast guard correctly.
      };
      doc.on('update', docUpdateHandler);

      // Y.Map deep observer fires for any nested map mutation. Each event
      // carries the changed key + transaction; we walk the changes and
      // route them to grid state when they came from a remote origin.
      const observeHandler = (events: Y.YEvent<Y.Map<unknown>>[], transaction: Y.Transaction) => {
        if (transaction.origin === origin) return; // ignore self
        for (const event of events) {
          // `event.target` is the Y.Map that changed. The path tells us
          // which row map fired. For root-level changes (new rows), we walk
          // the new row's existing cells. For row-level changes, we walk
          // the changed keys.
          const target = event.target;
          if (target === root) {
            // Root changed — new rows added (typically because a remote
            // peer set the first cell in a row). For each added rowId,
            // apply all its current cells.
            event.changes.keys.forEach((change, rowId) => {
              if (change.action === 'add' || change.action === 'update') {
                const rowMap = root.get(rowId);
                if (rowMap) {
                  for (const [colId, value] of rowMap.entries()) {
                    if (isSyncedColumn(colId)) {
                      applyRemoteCellChange(rowId, colId, value);
                    }
                  }
                }
              }
            });
          } else {
            // A row map changed. Find its rowId by reverse-lookup on the
            // root map (target identity comparison).
            let rowId: string | undefined;
            for (const [candidateId, candidateMap] of root.entries()) {
              if (candidateMap === target) {
                rowId = candidateId;
                break;
              }
            }
            if (!rowId) continue;
            event.changes.keys.forEach((change, colId) => {
              if (!isSyncedColumn(colId)) return;
              if (change.action === 'delete') {
                applyRemoteCellChange(rowId!, colId, undefined);
              } else {
                const value = target.get(colId);
                applyRemoteCellChange(rowId!, colId, value);
              }
            });
          }
        }
        recountCells();
      };
      root.observeDeep(observeHandler);

      // ── Cell-edit interception ──────────────────────────────────────────
      // Listen for the standard cell:valueChanged event. When the event
      // origin is local (no externalSync flag), mirror it into the Y.Doc.

      const unsubCellChanged = ctx.eventBus.on('cell:valueChanged' as never, (((
        payload: { node?: { id?: string }; colId?: string; newValue?: unknown; externalSync?: boolean },
      ) => {
        if (payload?.externalSync) return; // came from us via applyRemoteCellChange
        const rowId = payload?.node?.id;
        const colId = payload?.colId;
        if (!rowId || !colId) return;
        if (!isSyncedColumn(colId)) return;
        writeCell(rowId, colId, payload?.newValue);
      }) as never));

      function handleError(e: unknown): void {
        const error = e instanceof Error ? e : new Error(String(e));
        ctx.setState<YjsCellsState>(STATE_KEY, (prev) => ({ ...prev, lastError: error }));
        ctx.eventBus.emit('yjsCells:error' as never, { error } as never);
      }

      // ── Adapter wiring ──────────────────────────────────────────────────
      const adapterHandlers: CrdtTransportHandlers = {
        onUpdate(update: CrdtUpdate) {
          try {
            Y.applyUpdate(doc, update, 'remote');
          } catch (e) {
            handleError(e);
          }
        },
        onError(error: Error) {
          handleError(error);
        },
      };

      if (transport) {
        try {
          const initialState = Y.encodeStateAsUpdate(doc);
          Promise.resolve(transport.connect(initialState, adapterHandlers))
            .then(() => {
              ctx.setState<YjsCellsState>(STATE_KEY, (prev) => ({ ...prev, connected: true }));
              ctx.eventBus.emit('yjsCells:connected' as never, { origin } as never);
            })
            .catch(handleError);
        } catch (e) {
          handleError(e);
        }
      }

      // ── Manual sync command ────────────────────────────────────────────
      const unregisterSync = ctx.commandBus.registerHandler(
        'yjsCells:sync' as never,
        () => {
          if (!transport?.sync) return;
          const state = Y.encodeStateAsUpdate(doc);
          try {
            Promise.resolve(transport.sync(state)).catch(handleError);
          } catch (e) {
            handleError(e);
          }
        },
      );

      // ── Disposer ────────────────────────────────────────────────────────
      return () => {
        doc.off('update', docUpdateHandler);
        root.unobserveDeep(observeHandler);
        unsubCellChanged();
        unregisterSync();
        try {
          transport?.disconnect();
        } catch {
          /* swallow during teardown */
        }
        if (!options.doc) {
          // Only destroy the Doc if we created it. External Docs are owned
          // by the caller.
          doc.destroy();
        }
      };
    },
  };
}
