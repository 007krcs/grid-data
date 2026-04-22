// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
export type SparklineType = 'line' | 'bar' | 'area' | 'winloss';

export interface SparklineConfig {
  defaultType?: SparklineType;
  defaultColor?: string;
  defaultNegativeColor?: string;
  defaultHeight?: number;
}

export interface SparklineParams {
  type?: SparklineType;
  color?: string;
  negativeColor?: string;
  fillOpacity?: number;
  strokeWidth?: number;
  barGap?: number;
  showMin?: boolean;
  showMax?: boolean;
  showLast?: boolean;
}
