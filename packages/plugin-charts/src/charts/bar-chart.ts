// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Bar Chart Renderer ───

import type { ChartConfig, ChartDataPoint } from '../types';
import {
  createSvg,
  drawAxis,
  scaleValue,
  resolveColor,
  escapeXml,
  AXIS_PADDING,
} from '../chart-renderer';

/**
 * Renders a vertical bar chart as an SVG string.
 *
 * Each data point becomes a bar. Bars are auto-scaled based on the maximum
 * value. Labels are drawn below each bar. Colors cycle through the provided
 * config colors or the default palette.
 */
export function renderBarChart(
  data: ChartDataPoint[],
  width: number,
  height: number,
  config: Partial<ChartConfig>,
): string {
  if (data.length === 0) {
    return createSvg(width, height, '');
  }

  const padding = { ...AXIS_PADDING };
  const showAxes = config.showAxes ?? false;
  const showGrid = config.showGrid ?? false;

  const maxValue = Math.max(...data.map((d) => d.value), 0);
  const plotLeft = padding.left;
  const plotWidth = width - padding.left - padding.right;
  const barCount = data.length;
  const gap = Math.max(1, Math.floor(plotWidth * 0.1 / barCount));
  const barWidth = Math.max(1, (plotWidth - gap * (barCount + 1)) / barCount);

  let content = '';

  // Draw axes and grid
  if (showAxes) {
    content += drawAxis(width, height, maxValue, showGrid, padding);
  }

  // Draw bars
  for (let i = 0; i < barCount; i++) {
    const point = data[i]!;
    const color = resolveColor(i, point.color, config.colors);
    const x = plotLeft + gap + i * (barWidth + gap);
    const barTop = scaleValue(point.value, maxValue, height, padding);
    const barBottom = height - padding.bottom;
    const barHeight = Math.max(0, barBottom - barTop);

    content += `<rect x="${x}" y="${barTop}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="1"/>`;

    // Label below bar
    if (height >= 20) {
      const labelX = x + barWidth / 2;
      const labelY = height - 1;
      content += `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="8" fill="#666">${escapeXml(point.label)}</text>`;
    }
  }

  return createSvg(width, height, content);
}
