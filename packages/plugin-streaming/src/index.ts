// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── @gridstorm/plugin-streaming — Public API ───

// Register custom-event typings on GridEventMap.
import './events';

export { StreamingPlugin } from './streaming-plugin';
export type {
  StreamingPluginOptions,
  StreamAdapter,
  StreamHandlers,
  RowUpdate,
  CellChange,
  StreamingState,
} from './streaming-plugin';
