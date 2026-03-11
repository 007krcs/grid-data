// ─── Chart Types ───

export type ChartType = 'bar' | 'line' | 'pie' | 'scatter';

export interface ChartConfig {
  type: ChartType;
  width?: number;
  height?: number;
  title?: string;
  colors?: string[];
  showAxes?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  animate?: boolean;
}

export interface SeriesConfig {
  field: string;
  label?: string;
  color?: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ChartState {
  charts: Record<string, { config: ChartConfig; data: ChartDataPoint[] }>;
}
