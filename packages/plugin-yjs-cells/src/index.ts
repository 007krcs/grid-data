// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── @gridstorm/plugin-yjs-cells — Public API ───

export { YjsCellsPlugin } from './yjs-cells-plugin';
export type {
  CrdtTransport,
  CrdtTransportHandlers,
  CrdtUpdate,
  RemoteCellChange,
  YjsCellsPluginOptions,
  YjsCellsState,
} from './types';

export { InMemoryCrdtTransport, _resetInMemoryCrdtSessions } from './adapters/in-memory';
export type { InMemoryCrdtTransportOptions } from './adapters/in-memory';
