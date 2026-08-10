// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── @gridstorm/plugin-presence — Public API ───

export { PresencePlugin } from './presence-plugin';
export type {
  PresenceAdapter,
  PresenceHandlers,
  PresencePluginOptions,
  PresenceSnapshot,
  PresenceState,
  UserPresence,
} from './types';

export { InMemoryPresenceAdapter, _resetInMemoryPresenceSessions } from './adapters/in-memory';
export type { InMemoryPresenceAdapterOptions } from './adapters/in-memory';

export { BroadcastChannelPresenceAdapter } from './adapters/broadcast-channel';
export type { BroadcastChannelPresenceAdapterOptions } from './adapters/broadcast-channel';

export { WebSocketPresenceAdapter } from './adapters/websocket';
export type { WebSocketPresenceAdapterOptions } from './adapters/websocket';
