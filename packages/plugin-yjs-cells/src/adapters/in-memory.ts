// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
//
// ─── InMemoryCrdtTransport ─────────────────────────────────────────────────
//
// Reference transport that shares Yjs updates across all adapters with the
// same docId in the current process. Same pattern as InMemoryPresenceAdapter.
// Use cases:
//
//   • Unit tests for CRDT convergence without any network.
//   • Multi-grid Storybook stories where two <GridStorm /> instances share
//     a doc.
//   • Demos where the "second user" is faked in JS.

import * as Y from 'yjs';
import type { CrdtTransport, CrdtTransportHandlers, CrdtUpdate } from '../types';

interface Session {
  members: Set<{
    handlers: CrdtTransportHandlers;
    origin?: string;
  }>;
  /** Cumulative state — broadcast to late joiners. Stored as a Y.Doc that
   *  absorbs every update; on connect we re-encode it as a single update
   *  for the new joiner. Yjs's binary update format is NOT just
   *  concatenable bytes — naive concatenation does not produce a valid
   *  update. Y.mergeUpdates() is the right primitive; a Y.Doc accumulator
   *  is simpler still. */
  stateDoc: Y.Doc;
}

const sessions = new Map<string, Session>();

function getSession(docId: string): Session {
  let s = sessions.get(docId);
  if (!s) {
    s = { members: new Set(), stateDoc: new Y.Doc() };
    sessions.set(docId, s);
  }
  return s;
}

export interface InMemoryCrdtTransportOptions {
  /** Same as YjsCellsPluginOptions.docId — adapters with the same docId
   *  share state. */
  docId: string;
}

export class InMemoryCrdtTransport implements CrdtTransport {
  private session: Session | null = null;
  private member: { handlers: CrdtTransportHandlers; origin?: string } | null = null;

  constructor(private options: InMemoryCrdtTransportOptions) {}

  connect(initialState: CrdtUpdate, handlers: CrdtTransportHandlers): void {
    this.session = getSession(this.options.docId);
    this.member = { handlers };
    this.session.members.add(this.member);

    // Send the late joiner the entire accumulated state so they catch up
    // to every prior edit. We encode the session's Y.Doc as a single update;
    // the receiver applies it via Y.applyUpdate which is idempotent.
    const cumulative = Y.encodeStateAsUpdate(this.session.stateDoc);
    if (cumulative.length > 0) {
      handlers.onUpdate(cumulative);
    }

    // Absorb the joiner's initial state into the session Doc so future
    // joiners inherit it.
    Y.applyUpdate(this.session.stateDoc, initialState);

    // And broadcast the joiner's initial state to existing peers.
    for (const m of this.session.members) {
      if (m === this.member) continue;
      try {
        m.handlers.onUpdate(initialState);
      } catch (e) {
        console.error('[InMemoryCrdtTransport] handler.onUpdate threw:', e);
      }
    }
  }

  broadcast(update: CrdtUpdate): void {
    if (!this.session || !this.member) return;
    // Absorb into session accumulator so late joiners get this edit too.
    Y.applyUpdate(this.session.stateDoc, update);
    for (const m of this.session.members) {
      if (m === this.member) continue;
      try {
        m.handlers.onUpdate(update);
      } catch (e) {
        console.error('[InMemoryCrdtTransport] handler.onUpdate threw:', e);
      }
    }
  }

  disconnect(): void {
    if (this.session && this.member) {
      this.session.members.delete(this.member);
      if (this.session.members.size === 0) {
        this.session.stateDoc.destroy();
        sessions.delete(this.options.docId);
      }
    }
    this.session = null;
    this.member = null;
  }
}

/**
 * Test-only helper. Wipes the global session registry between tests.
 * @internal
 */
export function _resetInMemoryCrdtSessions(): void {
  sessions.clear();
}
