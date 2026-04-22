// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
import type { SparklineParams } from '../types';

/**
 * Renders an SVG bar sparkline from an array of numeric values.
 *
 * Draws vertical bars for each value. Positive bars are drawn upward
 * from the baseline using `color`, negative bars are drawn downward
 * using `negativeColor`. Bars have equal width with configurable gaps.
 */
export function renderBarSparkline(
  values: number[],
  width: number,
  height: number,
  params: SparklineParams,
): string {
  if (!values || values.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"></svg>`;
  }

  const color = params.color || '#3b82f6';
  const negativeColor = params.negativeColor || '#ef4444';
  const barGap = params.barGap ?? 1;

  const padding = 2;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  const totalGaps = (values.length - 1) * barGap;
  const barWidth = Math.max(1, (plotWidth - totalGaps) / values.length);

  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;

  // Baseline Y position (where zero is)
  const baselineY = padding + plotHeight - ((0 - min) / range) * plotHeight;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

  values.forEach((v, i) => {
    const x = padding + i * (barWidth + barGap);
    const barColor = v >= 0 ? color : negativeColor;

    const valueY = padding + plotHeight - ((v - min) / range) * plotHeight;

    const barX = x;
    let barY: number;
    let barHeight: number;

    if (v >= 0) {
      barY = valueY;
      barHeight = baselineY - valueY;
    } else {
      barY = baselineY;
      barHeight = valueY - baselineY;
    }

    // Ensure minimum visible bar height
    barHeight = Math.max(barHeight, 0.5);

    svg += `<rect x="${barX.toFixed(2)}" y="${barY.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${barHeight.toFixed(2)}" fill="${barColor}" rx="0.5"/>`;
  });

  svg += '</svg>';
  return svg;
}
