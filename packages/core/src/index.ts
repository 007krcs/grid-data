// ─── @gridstorm/core — Public API ───

// Main factory
export { createGrid } from './engine/grid-engine';
export type { GridEngine } from './engine/grid-engine';

// State
export { Store, createSelector } from './state/store';

// Events
export { EventBus } from './events/event-bus';
export { CommandBus } from './events/command-bus';
export type { CommandContext, CommandMiddleware } from './events/command-bus';

// Column utilities
export {
  resolveColumns,
  resolveColumnGroups,
  applyFlexSizing,
  partitionColumns,
  findColumn,
  updateColumn,
} from './engine/column-model';
export type { ColumnGroupInfo } from './engine/column-model';

// Row utilities
export {
  createRowNodes,
  sortRowNodes,
  filterRowNodes,
  getValueFromData,
  defaultComparator,
  assignDisplayPositions,
  calculateTotalHeight,
} from './engine/row-model';

// Selectors
export * from './state/selectors';

// Utilities
export { generateId, resetIdCounter, resolveRowId } from './utils/id';
export { memoizeOne, shallowEqual } from './utils/memoize';
export { createBatchedCallback, rafThrottle } from './utils/batch';

// All types
export type * from './types/index';
