// ─── Collab Plugin ───
// Multi-user presence tracking for GridStorm. Tracks which user is focused
// on which cell, broadcasts presence changes, and implements optimistic
// cell-level locking for concurrent edits.

import type { GridPlugin, PluginContext } from '@gridstorm/core';
import type {
  CollabPluginOptions,
  CollabUser,
  CellFocus,
  CellLock,
  CollabMessage,
  CollabTransport,
  CollabPresence,
} from './types';

// ─── In-memory transport for testing / single-tab use ───

export function createInMemoryTransport(): CollabTransport {
  const listeners: Array<(msg: CollabMessage) => void> = [];
  return {
    send(message: CollabMessage) {
      // Simulate async delivery (broadcast to all listeners)
      setTimeout(() => {
        for (const l of listeners) l(message);
      }, 0);
    },
    onMessage(handler: (message: CollabMessage) => void) {
      listeners.push(handler);
      return () => {
        const i = listeners.indexOf(handler);
        if (i >= 0) listeners.splice(i, 1);
      };
    },
  };
}

// ─── Plugin factory ───

export function CollabPlugin(options: CollabPluginOptions = {}): GridPlugin {
  const {
    user: initialUser,
    transport: providedTransport,
    lockTimeout = 30_000,
    maxUsers = 20,
  } = options;

  return {
    id: 'collab',
    name: 'Collaboration',
    version: '0.1.0',

    install(ctx: PluginContext) {
      const unsubscribers: Array<() => void> = [];

      // Internal state
      const users = new Map<string, CollabUser>();
      // key: `${userId}:${rowId}:${columnId}`
      const cellFocuses = new Map<string, CellFocus>();
      // key: `${rowId}:${columnId}`
      const cellLocks = new Map<string, CellLock>();
      // Track lock expiry timers: key → setTimeout id
      const lockTimers = new Map<string, ReturnType<typeof setTimeout>>();

      // Current local user (set via collab:join command)
      let localUserId: string | undefined = initialUser?.id;

      const transport: CollabTransport = providedTransport ?? createInMemoryTransport();

      const bus = ctx.eventBus as unknown as {
        emit: (event: string, payload: unknown) => void;
      };

      // ─── Helper: build current presence snapshot ───

      function getPresence(): CollabPresence {
        return {
          users: Array.from(users.values()),
          cellFocuses: Array.from(cellFocuses.values()),
          cellLocks: Array.from(cellLocks.values()),
        };
      }

      // ─── Helper: release all focuses for a user ───

      function releaseFocusesForUser(userId: string): void {
        for (const [key, focus] of cellFocuses) {
          if (focus.userId === userId) {
            cellFocuses.delete(key);
            bus.emit('collab:cell-unfocused', {
              userId: focus.userId,
              rowId: focus.rowId,
              columnId: focus.columnId,
            });
          }
        }
      }

      // ─── Helper: release all locks for a user ───

      function releaseLocksForUser(userId: string): void {
        for (const [key, lock] of cellLocks) {
          if (lock.userId === userId) {
            const timer = lockTimers.get(key);
            if (timer !== undefined) {
              clearTimeout(timer);
              lockTimers.delete(key);
            }
            cellLocks.delete(key);
            bus.emit('collab:cell-unlocked', {
              userId: lock.userId,
              rowId: lock.rowId,
              columnId: lock.columnId,
            });
          }
        }
      }

      // ─── Helper: expire a lock by key ───

      function expireLock(key: string): void {
        const lock = cellLocks.get(key);
        if (lock !== undefined) {
          cellLocks.delete(key);
          lockTimers.delete(key);
          bus.emit('collab:cell-unlocked', {
            userId: lock.userId,
            rowId: lock.rowId,
            columnId: lock.columnId,
          });
        }
      }

      // ─── Handle incoming transport messages ───

      const removeTransportListener = transport.onMessage((message: CollabMessage) => {
        switch (message.type) {
          case 'join': {
            const user = message.payload as CollabUser | undefined;
            if (user !== undefined && users.size < maxUsers) {
              users.set(user.id, user);
              bus.emit('collab:user-joined', { user });
            }
            break;
          }
          case 'leave': {
            const userId = message.userId;
            const user = users.get(userId);
            if (user !== undefined) {
              users.delete(userId);
              releaseFocusesForUser(userId);
              releaseLocksForUser(userId);
              bus.emit('collab:user-left', { userId });
            }
            break;
          }
          case 'focus': {
            const p = message.payload as { rowId: string; columnId: string; since: number } | undefined;
            if (p !== undefined) {
              const focusKey = `${message.userId}:${p.rowId}:${p.columnId}`;
              const focus: CellFocus = {
                userId: message.userId,
                rowId: p.rowId,
                columnId: p.columnId,
                since: p.since,
              };
              cellFocuses.set(focusKey, focus);
              bus.emit('collab:cell-focused', focus);
            }
            break;
          }
          case 'unfocus': {
            const p = message.payload as { rowId: string; columnId: string } | undefined;
            if (p !== undefined) {
              const focusKey = `${message.userId}:${p.rowId}:${p.columnId}`;
              cellFocuses.delete(focusKey);
              bus.emit('collab:cell-unfocused', {
                userId: message.userId,
                rowId: p.rowId,
                columnId: p.columnId,
              });
            }
            break;
          }
          case 'lock': {
            const p = message.payload as CellLock | undefined;
            if (p !== undefined) {
              const lockKey = `${p.rowId}:${p.columnId}`;
              // Only apply if not already locked by another user
              const existing = cellLocks.get(lockKey);
              if (existing === undefined || existing.userId === message.userId) {
                cellLocks.set(lockKey, p);
                bus.emit('collab:cell-locked', p);
              }
            }
            break;
          }
          case 'unlock': {
            const p = message.payload as { rowId: string; columnId: string } | undefined;
            if (p !== undefined) {
              const lockKey = `${p.rowId}:${p.columnId}`;
              const existing = cellLocks.get(lockKey);
              if (existing !== undefined && existing.userId === message.userId) {
                const timer = lockTimers.get(lockKey);
                if (timer !== undefined) {
                  clearTimeout(timer);
                  lockTimers.delete(lockKey);
                }
                cellLocks.delete(lockKey);
                bus.emit('collab:cell-unlocked', {
                  userId: message.userId,
                  rowId: p.rowId,
                  columnId: p.columnId,
                });
              }
            }
            break;
          }
          case 'presence-sync': {
            const presence = message.payload as CollabPresence | undefined;
            if (presence !== undefined) {
              for (const user of presence.users) {
                if (!users.has(user.id)) {
                  users.set(user.id, user);
                }
              }
            }
            break;
          }
        }
      });

      // ─── collab:join ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('collab:join', (payload: CollabUser) => {
          if (users.size >= maxUsers) return;
          localUserId = payload.id;
          users.set(payload.id, payload);
          bus.emit('collab:user-joined', { user: payload });
          transport.send({ type: 'join', userId: payload.id, payload });
        }),
      );

      // ─── collab:leave ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('collab:leave', (payload: { userId: string }) => {
          const userId = payload.userId;
          const user = users.get(userId);
          if (user === undefined) return;

          users.delete(userId);
          releaseFocusesForUser(userId);
          releaseLocksForUser(userId);
          bus.emit('collab:user-left', { userId });
          transport.send({ type: 'leave', userId });
        }),
      );

      // ─── collab:focus-cell ───
      unsubscribers.push(
        ctx.commandBus.registerHandler(
          'collab:focus-cell',
          (payload: { rowId: string; columnId: string }) => {
            if (localUserId === undefined) return;
            const since = Date.now();
            const focusKey = `${localUserId}:${payload.rowId}:${payload.columnId}`;
            const focus: CellFocus = {
              userId: localUserId,
              rowId: payload.rowId,
              columnId: payload.columnId,
              since,
            };
            cellFocuses.set(focusKey, focus);
            bus.emit('collab:cell-focused', focus);
            transport.send({
              type: 'focus',
              userId: localUserId,
              payload: { rowId: payload.rowId, columnId: payload.columnId, since },
            });
          },
        ),
      );

      // ─── collab:unfocus-cell ───
      unsubscribers.push(
        ctx.commandBus.registerHandler(
          'collab:unfocus-cell',
          (payload: { rowId: string; columnId: string }) => {
            if (localUserId === undefined) return;
            const focusKey = `${localUserId}:${payload.rowId}:${payload.columnId}`;
            cellFocuses.delete(focusKey);
            bus.emit('collab:cell-unfocused', {
              userId: localUserId,
              rowId: payload.rowId,
              columnId: payload.columnId,
            });
            transport.send({
              type: 'unfocus',
              userId: localUserId,
              payload: { rowId: payload.rowId, columnId: payload.columnId },
            });
          },
        ),
      );

      // ─── collab:lock-cell ───
      unsubscribers.push(
        ctx.commandBus.registerHandler(
          'collab:lock-cell',
          (payload: { rowId: string; columnId: string }) => {
            if (localUserId === undefined) return;
            const lockKey = `${payload.rowId}:${payload.columnId}`;
            const existing = cellLocks.get(lockKey);

            if (existing !== undefined && existing.userId !== localUserId) {
              // Already locked by someone else
              bus.emit('collab:cell-lock-failed', {
                userId: localUserId,
                rowId: payload.rowId,
                columnId: payload.columnId,
                lockedBy: existing.userId,
              });
              return;
            }

            const now = Date.now();
            const lock: CellLock = {
              userId: localUserId,
              rowId: payload.rowId,
              columnId: payload.columnId,
              lockedAt: now,
              expiresAt: now + lockTimeout,
            };

            // Clear previous timer if re-locking
            const prevTimer = lockTimers.get(lockKey);
            if (prevTimer !== undefined) {
              clearTimeout(prevTimer);
            }

            cellLocks.set(lockKey, lock);

            // Auto-expire after lockTimeout
            const timerId = setTimeout(() => expireLock(lockKey), lockTimeout);
            lockTimers.set(lockKey, timerId);

            bus.emit('collab:cell-locked', lock);
            transport.send({ type: 'lock', userId: localUserId, payload: lock });
          },
        ),
      );

      // ─── collab:unlock-cell ───
      unsubscribers.push(
        ctx.commandBus.registerHandler(
          'collab:unlock-cell',
          (payload: { rowId: string; columnId: string }) => {
            if (localUserId === undefined) return;
            const lockKey = `${payload.rowId}:${payload.columnId}`;
            const existing = cellLocks.get(lockKey);

            if (existing === undefined || existing.userId !== localUserId) return;

            const timer = lockTimers.get(lockKey);
            if (timer !== undefined) {
              clearTimeout(timer);
              lockTimers.delete(lockKey);
            }

            cellLocks.delete(lockKey);
            bus.emit('collab:cell-unlocked', {
              userId: localUserId,
              rowId: payload.rowId,
              columnId: payload.columnId,
            });
            transport.send({
              type: 'unlock',
              userId: localUserId,
              payload: { rowId: payload.rowId, columnId: payload.columnId },
            });
          },
        ),
      );

      // ─── collab:get-presence ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('collab:get-presence', () => {
          bus.emit('collab:presence-updated', getPresence());
        }),
      );

      // If initial user was provided, register them immediately
      if (initialUser !== undefined) {
        users.set(initialUser.id, initialUser);
      }

      return () => {
        for (const u of unsubscribers) u();
        removeTransportListener();
        // Clear all lock timers
        for (const timer of lockTimers.values()) {
          clearTimeout(timer);
        }
        lockTimers.clear();
      };
    },
  };
}
