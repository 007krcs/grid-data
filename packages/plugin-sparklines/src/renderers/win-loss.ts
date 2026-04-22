// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
import type { SparklineParams } from '../types';

/**
 * Renders an SVG win/loss sparkline from an array of numeric values.
 *
 * Each value is classified as a "win" (positive, drawn above the center line)
 * or a "loss" (negative or zero, drawn below the center line). All bars have
 * the same height — only direction differs.
 */
export function renderWinLossSparkline(
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

  // Center line divides the plot in half
  const centerY = padding + plotHeight / 2;
  const halfHeight = plotHeight / 2 - 1; // leave a 1px gap at center

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

  values.forEach((v, i) => {
    const x = padding + i * (barWidth + barGap);
    const isWin = v > 0;
    const barColor = isWin ? color : negativeColor;

    let barY: number;

    if (isWin) {
      // Draw above center line
      barY = centerY - halfHeight;
    } else {
      // Draw below center line (loss or zero)
      barY = centerY + 1; // 1px gap below center
    }

    svg += `<rect x="${x.toFixed(2)}" y="${barY.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${halfHeight.toFixed(2)}" fill="${barColor}" rx="0.5"/>`;
  });

  svg += '</svg>';
  return svg;
}
