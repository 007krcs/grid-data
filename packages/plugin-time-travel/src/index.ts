// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── @gridstorm/plugin-time-travel — Public API ───

export { TimeTravelPlugin } from './time-travel-plugin';
export { computeDiff, diffSerializedStates } from './diff-engine';
export {
  captureFullSnapshot,
  captureDeltaSnapshot,
  serializeGridState,
  restoreSnapshot,
  resolveFullState,
  trimSnapshots,
} from './snapshot-store';
export type {
  TimeTravelPluginOptions,
  TimeTravelState,
  StateSnapshot,
  SerializedGridState,
  StateDelta,
  CellDelta,
  DiffResult,
  StateBranch,
} from './types';
