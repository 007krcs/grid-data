// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── @gridstorm/angular — Public API ───

// Component
export { GridStormComponent } from './gridstorm.component';

// Service
export { GridStormService } from './gridstorm.service';

// Types
export type {
  GridStormInputs,
  GridStormOutputs,
  GridRegistration,
} from './types';

// Re-export commonly needed core types for convenience
export type {
  GridApi,
  GridConfig,
  GridEngine,
  ColumnDef,
  GridPlugin,
} from '@gridstorm/core';
