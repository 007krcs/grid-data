// ─── Anomaly Detector ───
// Statistical anomaly detection using Z-Score and IQR methods.
// Works entirely locally with pure computation — no external dependencies.

// ─── Types ───

export interface AnomalyIndex {
  /** Index of the anomalous value in the input data array. */
  index: number;
  /** The anomalous value. */
  value: number;
  /** Z-score of the value (how many std deviations from mean). */
  zScore: number;
  /** Whether this value is an outlier by the IQR method. */
  isIQROutlier: boolean;
  /** Severity classification based on deviation magnitude. */
  severity: 'low' | 'medium' | 'high';
}

export interface AnomalyDetectorOptions {
  /** Z-score threshold for flagging anomalies. Default: 2.5 */
  zScoreThreshold: number;
  /** IQR multiplier for outlier fencing. Default: 1.5 */
  iqrMultiplier: number;
}

// ─── Statistical Helpers ───

/**
 * Calculate the arithmetic mean of a numeric array.
 */
export function mean(data: number[]): number {
  if (data.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i]!;
  }
  return sum / data.length;
}

/**
 * Calculate the standard deviation (population) of a numeric array.
 */
export function standardDeviation(data: number[]): number {
  if (data.length === 0) return 0;
  const avg = mean(data);
  let sumSqDiff = 0;
  for (let i = 0; i < data.length; i++) {
    const diff = data[i]! - avg;
    sumSqDiff += diff * diff;
  }
  return Math.sqrt(sumSqDiff / data.length);
}

/**
 * Calculate the median (50th percentile) of a numeric array.
 */
export function median(data: number[]): number {
  return percentile(data, 50);
}

/**
 * Calculate a given percentile of a numeric array.
 *
 * Uses linear interpolation between closest ranks.
 *
 * @param data - Array of numbers (does not need to be sorted).
 * @param p - Percentile value between 0 and 100.
 * @returns The percentile value.
 */
export function percentile(data: number[], p: number): number {
  if (data.length === 0) return 0;
  if (data.length === 1) return data[0]!;

  const sorted = [...data].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);

  if (lower === upper) return sorted[lower]!;

  const fraction = rank - lower;
  return sorted[lower]! + fraction * (sorted[upper]! - sorted[lower]!);
}

// ─── Anomaly Detection ───

/**
 * Classify severity based on how extreme the anomaly is.
 */
function classifySeverity(absZScore: number, threshold: number): 'low' | 'medium' | 'high' {
  if (absZScore >= threshold * 2) return 'high';
  if (absZScore >= threshold * 1.5) return 'medium';
  return 'low';
}

/**
 * Detect anomalies in a numeric dataset using both Z-Score and IQR methods.
 *
 * A value is considered anomalous if it is flagged by EITHER method:
 * - Z-Score: |z| > zScoreThreshold
 * - IQR: value < Q1 - multiplier*IQR or value > Q3 + multiplier*IQR
 *
 * @param data - Array of numeric values to analyze.
 * @param options - Detection thresholds.
 * @returns Array of detected anomalies with their indices and statistics.
 */
export function detectAnomalies(
  data: number[],
  options: AnomalyDetectorOptions,
): AnomalyIndex[] {
  if (data.length < 3) return []; // Need at least 3 data points for meaningful detection

  const { zScoreThreshold, iqrMultiplier } = options;

  // Compute Z-score statistics
  const avg = mean(data);
  const stdDev = standardDeviation(data);

  // Compute IQR statistics
  const q1 = percentile(data, 25);
  const q3 = percentile(data, 75);
  const iqr = q3 - q1;
  const lowerFence = q1 - iqrMultiplier * iqr;
  const upperFence = q3 + iqrMultiplier * iqr;

  const anomalies: AnomalyIndex[] = [];

  for (let i = 0; i < data.length; i++) {
    const value = data[i]!;

    // Z-score calculation (guard against zero std dev)
    const zScore = stdDev === 0 ? 0 : (value - avg) / stdDev;
    const absZScore = Math.abs(zScore);
    const isZScoreOutlier = absZScore > zScoreThreshold;

    // IQR outlier check
    const isIQROutlier = value < lowerFence || value > upperFence;

    // Flag if either method detects anomaly
    if (isZScoreOutlier || isIQROutlier) {
      anomalies.push({
        index: i,
        value,
        zScore: Math.round(zScore * 1000) / 1000, // Round to 3 decimals
        isIQROutlier,
        severity: classifySeverity(absZScore, zScoreThreshold),
      });
    }
  }

  return anomalies;
}
