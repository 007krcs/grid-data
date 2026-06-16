// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
//
// ─── InMemoryPresenceAdapter ───────────────────────────────────────────────
//
// Reference adapter for tests and single-process multi-grid scenarios. All
// adapters built from this prototype share a static `_sessions` registry so
// instances pointing at the same `sessionId` see each other.
//
// Use cases:
//   • Unit tests for the presence plugin without any I/O.
//   • Multi-grid Storybook stories where two <GridStorm /> instances mounted
//     in the same page should show each other's cursors.
//   • Demos where the "second user" is faked in JS for a screenshot/video.

import type {
  PresenceAdapter,
  PresenceHandlers,
  PresenceSnapshot,
  UserPresence,
} from '../types';

interface Session {
  /** Map of userId → UserPresence for every connected adapter in this session. */
  presences: Map<string, UserPresence>;
  /** Map of adapter → handlers, so we can notify everyone in the session
   *  when a peer joins/leaves/updates. */
  members: Map<InMemoryPresenceAdapter, PresenceHandlers>;
}

const sessions = new Map<string, Session>();

function getSession(id: string): Session {
  let session = sessions.get(id);
  if (!session) {
    session = { presences: new Map(), members: new Map() };
    sessions.set(id, session);
  }
  return session;
}

function notifySession(session: Session, except?: InMemoryPresenceAdapter): void {
  const all = [...session.presences.values()];
  for (const [adapter, handlers] of session.members) {
    if (adapter === except) continue;
    const local = adapter.getLocalUserId();
    const snapshot: PresenceSnapshot = {
      peers: all.filter((p) => p.userId !== local),
    };
    try {
      handlers.onPresence(snapshot);
    } catch (e) {
      // Handler exceptions are isolated — a buggy consumer must not break
      // the whole session.
      // eslint-disable-next-line no-console
      console.error('[InMemoryPresenceAdapter] handler.onPresence threw:', e);
    }
  }
}

export interface InMemoryPresenceAdapterOptions {
  /** Session identifier. Adapters with the same sessionId see each other. */
  sessionId: string;
}

export class InMemoryPresenceAdapter implements PresenceAdapter {
  private session: Session | null = null;
  private localUserId: string | null = null;

  constructor(private options: InMemoryPresenceAdapterOptions) {}

  connect(local: UserPresence, handlers: PresenceHandlers): void {
    this.session = getSession(this.options.sessionId);
    this.localUserId = local.userId;
    this.session.presences.set(local.userId, local);
    this.session.members.set(this, handlers);
    // Tell the joining adapter about everyone else.
    handlers.onPresence({
      peers: [...this.session.presences.values()].filter((p) => p.userId !== local.userId),
    });
    // Tell the rest of the session about the new arrival.
    notifySession(this.session, this);
  }

  updateLocal(local: UserPresence): void {
    if (!this.session) return;
    this.session.presences.set(local.userId, local);
    this.localUserId = local.userId;
    notifySession(this.session, this);
  }

  disconnect(): void {
    if (!this.session || !this.localUserId) return;
    this.session.presences.delete(this.localUserId);
    this.session.members.delete(this);
    notifySession(this.session);
    if (this.session.presences.size === 0) {
      sessions.delete(this.options.sessionId);
    }
    this.session = null;
    this.localUserId = null;
  }

  /** @internal — needed by the static notify helper. */
  getLocalUserId(): string | null {
    return this.localUserId;
  }
}

/**
 * Test-only helper. Wipes the global session registry between tests so
 * leftover state from prior tests doesn't bleed into the next.
 * @internal
 */
export function _resetInMemoryPresenceSessions(): void {
  sessions.clear();
}
