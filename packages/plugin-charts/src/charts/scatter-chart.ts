// ─── Scatter Chart Renderer ───

import type { ChartConfig, ChartDataPoint } from '../types';
import {
  createSvg,
  drawAxis,
  scaleValue,
  resolveColor,
  AXIS_PADDING,
} from '../chart-renderer';

/**
 * Renders a scatter plot as an SVG string.
 *
 * Each data point is rendered as a circle positioned by its index (X)
 * and value (Y). Auto-scaled axes and optional grid are supported.
 */
export function renderScatterChart(
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

  // Calculate evenly spaced X positions
  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : plotWidth / 2;

  let content = '';

  // Draw axes and grid
  if (showAxes) {
    content += drawAxis(width, height, maxValue, showGrid, padding);
  }

  // Draw scatter dots
  for (let i = 0; i < data.length; i++) {
    const point = data[i]!;
    const color = resolveColor(i, point.color, config.colors);
    const x = plotLeft + (data.length > 1 ? i * stepX : plotWidth / 2);
    const y = scaleValue(point.value, maxValue, height, padding);
    const dotRadius = Math.max(2, Math.min(4, width / (data.length * 3)));

    content += `<circle cx="${x}" cy="${y}" r="${dotRadius}" fill="${color}" fill-opacity="0.8"/>`;
  }

  return createSvg(width, height, content);
}
