// ─── Collab Plugin Types ───

export interface CollabUser {
  id: string;
  name: string;
  color: string;  // hex color
  avatar?: string;
  joinedAt: number;
}

export interface CellFocus {
  userId: string;
  rowId: string;
  columnId: string;
  since: number;
}

export interface CellLock {
  userId: string;
  rowId: string;
  columnId: string;
  lockedAt: number;
  expiresAt: number;  // auto-release after timeout
}

export interface CollabMessage {
  type: 'join' | 'leave' | 'focus' | 'unfocus' | 'lock' | 'unlock' | 'presence-sync';
  userId: string;
  payload?: unknown;
}

export interface CollabTransport {
  send(message: CollabMessage): void;
  onMessage(handler: (message: CollabMessage) => void): () => void;
}

export interface CollabPresence {
  users: CollabUser[];
  cellFocuses: CellFocus[];
  cellLocks: CellLock[];
}

export interface CollabPluginOptions {
  user?: CollabUser;
  transport?: CollabTransport;  // if not provided, uses in-memory (single-tab)
  lockTimeout?: number;  // ms before cell lock auto-expires, default 30000
  maxUsers?: number;  // default 20
}
