// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
export interface TemporalSnapshot {
  id: string;
  label: string;
  timestamp: number;
  sortModel: unknown[];
  filterModel: Record<string, unknown>;
  quickFilterText: string;
}

export interface TemporalState {
  snapshots: TemporalSnapshot[];
  undoStack: TemporalSnapshot[];  // past states
  redoStack: TemporalSnapshot[];  // undone states
  current: TemporalSnapshot | null;
}

export interface TemporalOptions {
  /** Max undo history size. Default: 50 */
  maxHistory?: number;
  /** Auto-snapshot on sort/filter changes. Default: false */
  autoSnapshot?: boolean;
  /** Label generator for auto-snapshots */
  autoLabel?: (trigger: string) => string;
}
