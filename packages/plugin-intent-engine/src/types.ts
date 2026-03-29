export type IntentAction = 'sort' | 'filter' | 'hide' | 'show' | 'reorder' | 'resize' | 'quickFilter';

export interface IntentRecord {
  columnId: string;
  action: IntentAction;
  timestamp: number;
  weight: number; // action weight: sort=3, filter=3, hide=2, show=1, reorder=2, resize=1, quickFilter=1
}

export interface ColumnScore {
  columnId: string;
  score: number;
  frequency: number;
  /** Exponential-decay-weighted recency score */
  recency: number;
  lastInteracted: number;
}

export interface IntentState {
  records: IntentRecord[];
  ranking: ColumnScore[];
  /** Timestamp of last apply-ranking call; null if never applied */
  lastApplied: number | null;
}

export interface IntentEngineOptions {
  maxRecords?: number;   // default 500
  halfLifeMs?: number;   // ms, default 7 days
  /** When true, subscribe to sort/filter/visibility events automatically. Default: true */
  autoTrack?: boolean;
  /** When true, reorder columns immediately whenever ranking changes. Default: false */
  autoApplyRanking?: boolean;
  /** Called whenever the ranking is recalculated — use for UI visualisation. */
  onRankingUpdated?: (ranking: ColumnScore[]) => void;
}
