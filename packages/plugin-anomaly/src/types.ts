// ─── Anomaly Plugin Types ───

export type AnomalySeverity = 'watch' | 'warning' | 'critical';

export interface ColumnAnomalyConfig {
  columnId: string;
  watchThreshold?: number;    // z-score, default 2.0
  warningThreshold?: number;  // default 2.5
  criticalThreshold?: number; // default 3.0
  windowSize?: number;        // rolling window size, default 100
}

export interface ColumnStats {
  columnId: string;
  count: number;
  mean: number;
  variance: number;
  stdDev: number;
  min: number;
  max: number;
  window: number[];  // circular buffer of last windowSize values
}

export interface AnomalyEvent {
  id: string;        // unique anomaly id
  rowId: string;
  columnId: string;
  value: number;
  zscore: number;
  severity: AnomalySeverity;
  baseline: { mean: number; stdDev: number };
  detectedAt: number;
  acknowledged: boolean;
}

export interface AnomalyPluginOptions {
  columns?: ColumnAnomalyConfig[];
  autoWatch?: boolean;  // auto-detect numeric columns, default false
  onAnomaly?: (event: AnomalyEvent) => void;  // direct callback
}
