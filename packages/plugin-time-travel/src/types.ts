// ─── Time Travel Plugin Types ───

export interface StateSnapshot {
  id: string;
  name?: string;
  timestamp: number;
  type: 'full' | 'delta';
  fullState?: SerializedGridState;
  delta?: StateDelta;
  metadata: {
    rowCount: number;
    columnCount: number;
    source: 'auto' | 'manual' | 'checkpoint';
  };
}

export interface SerializedGridState {
  rowData: Array<{ id: string; data: Record<string, unknown> }>;
  sortModel: Array<{ colId: string; sort: string }>;
  filterModel: Record<string, unknown>;
  columnOrder: string[];
  columnWidths: Record<string, number>;
  pluginState: Record<string, unknown>;
}

export interface StateDelta {
  cellChanges: CellDelta[];
  rowsAdded: Array<{ id: string; data: Record<string, unknown> }>;
  rowsRemoved: string[];
  sortModelChanged?: { from: unknown; to: unknown };
  filterModelChanged?: { from: unknown; to: unknown };
  prevSnapshotId: string;
}

export interface CellDelta {
  rowId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface DiffResult {
  cellChanges: CellDelta[];
  rowsAdded: string[];
  rowsRemoved: string[];
  sortChanged: boolean;
  filterChanged: boolean;
  summary: string;
}

export interface StateBranch {
  id: string;
  name: string;
  parentBranchId: string | null;
  forkPointSnapshotId: string;
  snapshots: StateSnapshot[];
  createdAt: number;
}

export interface TimeTravelState {
  currentBranchId: string;
  branches: Map<string, StateBranch>;
  currentSnapshotIndex: number;
  totalSnapshots: number;
  isDirty: boolean;
}

export interface TimeTravelPluginOptions {
  /** Maximum number of snapshots to retain per branch. Default: 100. */
  maxSnapshots?: number;
  /** Automatically capture snapshots on state changes. Default: true. */
  autoCapture?: boolean;
  /** Maximum number of branches. Default: 10. */
  maxBranches?: number;
}
