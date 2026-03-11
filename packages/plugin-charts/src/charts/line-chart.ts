// ─── Line Chart Renderer ───

import type { ChartConfig, ChartDataPoint } from '../types';
import {
  createSvg,
  drawAxis,
  scaleValue,
  resolveColor,
  AXIS_PADDING,
} from '../chart-renderer';

/**
 * Renders a line chart as an SVG string.
 *
 * Data points are connected by a polyline with optional dot markers at each
 * point. An optional area fill is drawn beneath the line for visual emphasis.
 */
export function renderLineChart(
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
  const lineColor = resolveColor(0, undefined, config.colors);

  const maxValue = Math.max(...data.map((d) => d.value), 0);
  const plotLeft = padding.left;
  const plotWidth = width - padding.left - padding.right;
  const plotBottom = height - padding.bottom;

  // Calculate evenly spaced X positions for each data point
  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : plotWidth / 2;

  const points: Array<{ x: number; y: number }> = data.map((d, i) => ({
    x: plotLeft + (data.length > 1 ? i * stepX : plotWidth / 2),
    y: scaleValue(d.value, maxValue, height, padding),
  }));

  let content = '';

  // Draw axes and grid
  if (showAxes) {
    content += drawAxis(width, height, maxValue, showGrid, padding);
  }

  // Area fill beneath line
  if (points.length >= 2) {
    const areaPoints = points.map((p) => `${p.x},${p.y}`).join(' ');
    const firstX = points[0]!.x;
    const lastX = points[points.length - 1]!.x;
    content +=
      `<polygon points="${firstX},${plotBottom} ${areaPoints} ${lastX},${plotBottom}" ` +
      `fill="${lineColor}" fill-opacity="0.15"/>`;
  }

  // Polyline
  if (points.length >= 2) {
    const linePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
    content += `<polyline points="${linePoints}" fill="none" stroke="${lineColor}" stroke-width="1.5" stroke-linejoin="round"/>`;
  }

  // Dot markers
  for (const pt of points) {
    content += `<circle cx="${pt.x}" cy="${pt.y}" r="2" fill="${lineColor}"/>`;
  }

  return createSvg(width, height, content);
}
