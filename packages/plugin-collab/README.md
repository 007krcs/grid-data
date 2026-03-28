# @gridstorm/plugin-collab

Multi-user collaboration plugin for GridStorm. Tracks which user is focused on which cell, broadcasts presence changes, and implements optimistic cell-level locking for concurrent edits. Works with any transport layer (WebSocket, BroadcastChannel, or in-memory for testing).

## Installation

```bash
pnpm add @gridstorm/plugin-collab
```

## Quick Start

```typescript
import { createGrid } from '@gridstorm/core';
import { CollabPlugin, createInMemoryTransport } from '@gridstorm/plugin-collab';

const currentUser = {
  id: 'user-123',
  name: 'Alice',
  color: '#ff5722',
  joinedAt: Date.now(),
};

const grid = createGrid({
  columns: [{ field: 'name' }, { field: 'email' }, { field: 'status' }],
  rowData: [...],
  plugins: [
    CollabPlugin({
      user: currentUser,
      lockTimeout: 30_000, // 30 seconds before lock auto-expires
      maxUsers: 20,
    }),
  ],
});
```

## Joining and Leaving

```typescript
// Join the collaboration session
grid.commandBus.dispatch('collab:join', {
  id: 'user-123',
  name: 'Alice',
  color: '#ff5722',
  joinedAt: Date.now(),
});

// Leave the session (releases all locks and focuses)
grid.commandBus.dispatch('collab:leave', { userId: 'user-123' });
```

## Cell Focus Tracking

Show other users where colleagues are currently focused:

```typescript
// When user clicks a cell
grid.commandBus.dispatch('collab:focus-cell', { rowId: 'row-42', columnId: 'status' });

// When user leaves the cell
grid.commandBus.dispatch('collab:unfocus-cell', { rowId: 'row-42', columnId: 'status' });

// Render focus indicators
grid.eventBus.on('collab:cell-focused', (focus) => {
  const user = getUser(focus.userId);
  highlightCell(focus.rowId, focus.columnId, user.color);
});

grid.eventBus.on('collab:cell-unfocused', ({ userId, rowId, columnId }) => {
  clearCellHighlight(rowId, columnId, userId);
});
```

## Lock / Unlock Flow

Prevent concurrent edits with optimistic cell locks:

```typescript
// Try to acquire lock before editing
grid.commandBus.dispatch('collab:lock-cell', { rowId: 'row-42', columnId: 'status' });

grid.eventBus.on('collab:cell-locked', (lock) => {
  if (lock.userId === currentUser.id) {
    // We got the lock — proceed with edit
    enableCellEditing(lock.rowId, lock.columnId);
  }
});

grid.eventBus.on('collab:cell-lock-failed', ({ rowId, columnId, lockedBy }) => {
  const user = getUser(lockedBy);
  showToast(`Cell is being edited by ${user.name}`);
});

// Release lock after edit
grid.commandBus.dispatch('collab:unlock-cell', { rowId: 'row-42', columnId: 'status' });
```

Locks auto-expire after `lockTimeout` milliseconds even if `collab:unlock-cell` is never called.

## Presence Snapshot

```typescript
// Get full presence state at any time
grid.commandBus.dispatch('collab:get-presence', {});

grid.eventBus.on('collab:presence-updated', ({ users, cellFocuses, cellLocks }) => {
  updateUserAvatarBar(users);
  renderFocusIndicators(cellFocuses);
  renderLockIcons(cellLocks);
});
```

## Commands

| Command | Payload | Description |
|---|---|---|
| `collab:join` | `CollabUser` | Register user and broadcast join |
| `collab:leave` | `{ userId: string }` | Remove user, release locks and focuses |
| `collab:focus-cell` | `{ rowId, columnId }` | Record cell focus for local user |
| `collab:unfocus-cell` | `{ rowId, columnId }` | Remove cell focus for local user |
| `collab:lock-cell` | `{ rowId, columnId }` | Acquire optimistic lock |
| `collab:unlock-cell` | `{ rowId, columnId }` | Release lock |
| `collab:get-presence` | — | Emit full presence snapshot |

## Events

| Event | Payload | Description |
|---|---|---|
| `collab:user-joined` | `{ user: CollabUser }` | New user joined |
| `collab:user-left` | `{ userId: string }` | User left |
| `collab:cell-focused` | `CellFocus` | User focused a cell |
| `collab:cell-unfocused` | `{ userId, rowId, columnId }` | User unfocused a cell |
| `collab:cell-locked` | `CellLock` | Lock acquired |
| `collab:cell-lock-failed` | `{ userId, rowId, columnId, lockedBy }` | Lock attempt failed |
| `collab:cell-unlocked` | `{ userId, rowId, columnId }` | Lock released |
| `collab:presence-updated` | `CollabPresence` | Full presence snapshot |

## Implementing a Custom WebSocket Transport

```typescript
import type { CollabTransport, CollabMessage } from '@gridstorm/plugin-collab';

function createWebSocketTransport(url: string): CollabTransport {
  const ws = new WebSocket(url);
  const listeners: Array<(msg: CollabMessage) => void> = [];

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data) as CollabMessage;
    for (const l of listeners) l(message);
  });

  return {
    send(message: CollabMessage) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    },
    onMessage(handler) {
      listeners.push(handler);
      return () => {
        const i = listeners.indexOf(handler);
        if (i >= 0) listeners.splice(i, 1);
      };
    },
  };
}

// Usage
const grid = createGrid({
  plugins: [
    CollabPlugin({
      user: currentUser,
      transport: createWebSocketTransport('wss://collab.example.com/grid'),
    }),
  ],
});
```

## Using BroadcastChannel for Multi-Tab (Same Origin)

```typescript
function createBroadcastTransport(channelName: string): CollabTransport {
  const channel = new BroadcastChannel(channelName);
  const listeners: Array<(msg: CollabMessage) => void> = [];

  channel.addEventListener('message', (event) => {
    for (const l of listeners) l(event.data as CollabMessage);
  });

  return {
    send(message) { channel.postMessage(message); },
    onMessage(handler) {
      listeners.push(handler);
      return () => {
        const i = listeners.indexOf(handler);
        if (i >= 0) listeners.splice(i, 1);
      };
    },
  };
}
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `user` | `CollabUser` | — | Initial local user (auto-registered) |
| `transport` | `CollabTransport` | In-memory | Transport implementation |
| `lockTimeout` | `number` | `30000` | Lock auto-expiry in milliseconds |
| `maxUsers` | `number` | `20` | Maximum concurrent users |
