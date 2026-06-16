// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
//
// ─── CommentsPlugin ────────────────────────────────────────────────────────
//
// Reuses the Yjs CRDT primitive (same library as plugin-yjs-cells) to store
// comment threads in a top-level Y.Map keyed by anchor. The plugin observes
// the Y.Map deeply and projects the current state into a JS-friendly
// `byAnchor: Map<anchor, Comment[]>` so consumers can render without
// learning Yjs.

import type { GridPlugin, PluginContext } from '@gridstorm/core';
import type { CrdtTransportHandlers } from '@gridstorm/plugin-yjs-cells';
import * as Y from 'yjs';
import type {
  Comment,
  CommentAuthor,
  CommentsPluginOptions,
  CommentsState,
} from './types';

const STATE_KEY = 'comments';
const ROOT_MAP_KEY = 'comments';

function newCommentId(): string {
  // 8-char base36 + timestamp — collision risk negligible for human-scale
  // comment volumes.
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function newOrigin(): string {
  return 'comments-' + Math.random().toString(36).slice(2, 10);
}

function readCommentFromYMap(map: Y.Map<unknown>): Comment | null {
  const id = map.get('id');
  const anchor = map.get('anchor');
  const body = map.get('body');
  const author = map.get('author');
  const createdAt = map.get('createdAt');
  const resolved = map.get('resolved');
  if (
    typeof id !== 'string' ||
    typeof anchor !== 'string' ||
    typeof body !== 'string' ||
    !author ||
    typeof createdAt !== 'number'
  ) {
    return null;
  }
  const editedAt = map.get('editedAt');
  return {
    id,
    anchor,
    body,
    author: author as CommentAuthor,
    createdAt,
    editedAt: typeof editedAt === 'number' ? editedAt : undefined,
    resolved: Boolean(resolved),
  };
}

function writeCommentToYMap(map: Y.Map<unknown>, comment: Comment): void {
  map.set('id', comment.id);
  map.set('anchor', comment.anchor);
  map.set('body', comment.body);
  map.set('author', comment.author);
  map.set('createdAt', comment.createdAt);
  if (comment.editedAt !== undefined) map.set('editedAt', comment.editedAt);
  map.set('resolved', comment.resolved);
}

export function CommentsPlugin(options: CommentsPluginOptions): GridPlugin {
  return {
    id: 'comments',
    name: 'Cell Comments',
    version: '0.1.0',

    install(ctx: PluginContext): () => void {
      const doc = options.doc ?? new Y.Doc();
      const origin = options.origin ?? newOrigin();
      const root = doc.getMap<Y.Array<Y.Map<unknown>>>(ROOT_MAP_KEY);
      const transport = options.transport;

      ctx.registerState<CommentsState>(STATE_KEY, {
        connected: false,
        byAnchor: new Map(),
        total: 0,
        lastError: null,
        origin,
      });

      // ── Project Y.Doc state into plain JS for consumers ──────────────
      function project(): { byAnchor: Map<string, Comment[]>; total: number } {
        const byAnchor = new Map<string, Comment[]>();
        let total = 0;
        for (const [anchor, arr] of root.entries()) {
          const list: Comment[] = [];
          for (let i = 0; i < arr.length; i++) {
            const item = arr.get(i);
            if (item instanceof Y.Map) {
              const c = readCommentFromYMap(item);
              if (c) list.push(c);
            }
          }
          if (list.length > 0) {
            // Sort by createdAt so threads display chronologically regardless
            // of Y.Array insertion order from concurrent peers.
            list.sort((a, b) => a.createdAt - b.createdAt);
            byAnchor.set(anchor, list);
            total += list.length;
          }
        }
        return { byAnchor, total };
      }

      function publish(prev: CommentsState): void {
        const projected = project();
        ctx.setState<CommentsState>(STATE_KEY, () => ({
          ...prev,
          byAnchor: projected.byAnchor,
          total: projected.total,
        }));
        ctx.eventBus.emit('comments:state-changed' as never, {
          byAnchor: projected.byAnchor,
          total: projected.total,
        } as never);
      }

      // Observe the entire comments map for any change (local or remote).
      const observeHandler = (events: Y.YEvent<Y.AbstractType<unknown>>[]) => {
        const prev = ctx.getState<CommentsState>(STATE_KEY);
        const projected = project();
        ctx.setState<CommentsState>(STATE_KEY, () => ({
          ...prev,
          byAnchor: projected.byAnchor,
          total: projected.total,
        }));
        // Walk events to fire fine-grained events. Top-level Y.Map gives us
        // the per-anchor add/delete signal; nested events give us per-
        // comment changes.
        for (const event of events) {
          if (event.target === root) {
            event.changes.keys.forEach((change, anchor) => {
              if (change.action === 'add') {
                const list = projected.byAnchor.get(anchor) ?? [];
                for (const c of list) {
                  ctx.eventBus.emit('comments:added' as never, { comment: c } as never);
                }
              } else if (change.action === 'delete') {
                ctx.eventBus.emit('comments:anchor-cleared' as never, { anchor } as never);
              }
            });
          }
          // Nested events handled implicitly through the projection above.
        }
        ctx.eventBus.emit('comments:state-changed' as never, {
          byAnchor: projected.byAnchor,
          total: projected.total,
        } as never);
      };
      root.observeDeep(observeHandler);

      // ── Commands ────────────────────────────────────────────────────────

      const unregisterAdd = ctx.commandBus.registerHandler(
        'comments:add' as never,
        (payload: unknown) => {
          const p = payload as {
            anchor?: string;
            body?: string;
            author?: CommentAuthor;
          };
          if (!p?.anchor || !p?.body) return;
          const author = p.author ?? options.author;
          const comment: Comment = {
            id: newCommentId(),
            anchor: p.anchor,
            body: p.body,
            author,
            createdAt: Date.now(),
            resolved: false,
          };
          doc.transact(() => {
            let arr = root.get(p.anchor!);
            if (!arr) {
              arr = new Y.Array<Y.Map<unknown>>();
              root.set(p.anchor!, arr);
            }
            const cm = new Y.Map<unknown>();
            writeCommentToYMap(cm, comment);
            arr.push([cm]);
          }, origin);
        },
      );

      const unregisterEdit = ctx.commandBus.registerHandler(
        'comments:edit' as never,
        (payload: unknown) => {
          const p = payload as { anchor?: string; commentId?: string; body?: string };
          if (!p?.anchor || !p?.commentId || typeof p.body !== 'string') return;
          const arr = root.get(p.anchor);
          if (!arr) return;
          doc.transact(() => {
            for (let i = 0; i < arr.length; i++) {
              const item = arr.get(i);
              if (item instanceof Y.Map && item.get('id') === p.commentId) {
                item.set('body', p.body);
                item.set('editedAt', Date.now());
                return;
              }
            }
          }, origin);
        },
      );

      const unregisterResolve = ctx.commandBus.registerHandler(
        'comments:setResolved' as never,
        (payload: unknown) => {
          const p = payload as { anchor?: string; commentId?: string; resolved?: boolean };
          if (!p?.anchor || !p?.commentId || typeof p.resolved !== 'boolean') return;
          const arr = root.get(p.anchor);
          if (!arr) return;
          doc.transact(() => {
            for (let i = 0; i < arr.length; i++) {
              const item = arr.get(i);
              if (item instanceof Y.Map && item.get('id') === p.commentId) {
                item.set('resolved', p.resolved);
                return;
              }
            }
          }, origin);
        },
      );

      const unregisterDelete = ctx.commandBus.registerHandler(
        'comments:delete' as never,
        (payload: unknown) => {
          const p = payload as { anchor?: string; commentId?: string };
          if (!p?.anchor || !p?.commentId) return;
          const arr = root.get(p.anchor);
          if (!arr) return;
          doc.transact(() => {
            for (let i = 0; i < arr.length; i++) {
              const item = arr.get(i);
              if (item instanceof Y.Map && item.get('id') === p.commentId) {
                arr.delete(i, 1);
                return;
              }
            }
          }, origin);
        },
      );

      const unregisterClear = ctx.commandBus.registerHandler(
        'comments:clearAnchor' as never,
        (payload: unknown) => {
          const p = payload as { anchor?: string };
          if (!p?.anchor) return;
          doc.transact(() => {
            root.delete(p.anchor!);
          }, origin);
        },
      );

      function handleError(e: unknown): void {
        const error = e instanceof Error ? e : new Error(String(e));
        ctx.setState<CommentsState>(STATE_KEY, (prev) => ({ ...prev, lastError: error }));
        ctx.eventBus.emit('comments:error' as never, { error } as never);
      }

      // ── Transport wiring ────────────────────────────────────────────────
      const transportHandlers: CrdtTransportHandlers = {
        onUpdate(update) {
          try {
            Y.applyUpdate(doc, update, 'remote');
          } catch (e) {
            handleError(e);
          }
        },
        onError(err) {
          handleError(err);
        },
      };

      const docUpdateHandler = (update: Uint8Array, updateOrigin: unknown) => {
        if (updateOrigin === origin && transport && ctx.getState<CommentsState>(STATE_KEY).connected) {
          try {
            Promise.resolve(transport.broadcast(update)).catch(handleError);
          } catch (e) {
            handleError(e);
          }
        }
      };
      doc.on('update', docUpdateHandler);

      if (transport) {
        try {
          const initialState = Y.encodeStateAsUpdate(doc);
          Promise.resolve(transport.connect(initialState, transportHandlers))
            .then(() => {
              ctx.setState<CommentsState>(STATE_KEY, (prev) => ({ ...prev, connected: true }));
              ctx.eventBus.emit('comments:connected' as never, { origin } as never);
              // Reproject once connected — late-arriving state from peers
              // may have populated the doc.
              publish(ctx.getState<CommentsState>(STATE_KEY));
            })
            .catch(handleError);
        } catch (e) {
          handleError(e);
        }
      }

      // ── Disposer ────────────────────────────────────────────────────────
      return () => {
        doc.off('update', docUpdateHandler);
        root.unobserveDeep(observeHandler);
        unregisterAdd();
        unregisterEdit();
        unregisterResolve();
        unregisterDelete();
        unregisterClear();
        try {
          transport?.disconnect();
        } catch {
          /* swallow during teardown */
        }
        if (!options.doc) doc.destroy();
      };
    },
  };
}
