// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Pie Chart Renderer ───

import type { ChartConfig, ChartDataPoint } from '../types';
import { createSvg, resolveColor, escapeXml, NO_AXIS_PADDING } from '../chart-renderer';

/**
 * Renders a pie chart as an SVG string.
 *
 * Each data point becomes a slice. Slice angles are proportional to the
 * data values. Labels with percentages are positioned around the chart.
 * Uses SVG arc path commands calculated from sin/cos and the large-arc-flag.
 */
export function renderPieChart(
  data: ChartDataPoint[],
  width: number,
  height: number,
  config: Partial<ChartConfig>,
): string {
  if (data.length === 0) {
    return createSvg(width, height, '');
  }

  const padding = NO_AXIS_PADDING;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(
    width - padding.left - padding.right,
    height - padding.top - padding.bottom,
  ) / 2;

  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0);

  // Handle zero total — draw a grey circle
  if (total === 0) {
    const circle = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="#e0e0e0"/>`;
    return createSvg(width, height, circle);
  }

  let content = '';
  let currentAngle = -Math.PI / 2; // Start from top (12 o'clock)

  for (let i = 0; i < data.length; i++) {
    const point = data[i]!;
    const value = Math.max(0, point.value);
    if (value === 0) continue;

    const sliceAngle = (value / total) * 2 * Math.PI;
    const color = resolveColor(i, point.color, config.colors);

    // Special case: single data point that covers the full circle
    if (data.length === 1 || sliceAngle >= 2 * Math.PI - 0.001) {
      content += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${color}"/>`;
    } else {
      const startX = cx + radius * Math.cos(currentAngle);
      const startY = cy + radius * Math.sin(currentAngle);
      const endX = cx + radius * Math.cos(currentAngle + sliceAngle);
      const endY = cy + radius * Math.sin(currentAngle + sliceAngle);
      const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

      content +=
        `<path d="M ${cx} ${cy} L ${startX} ${startY} ` +
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z" ` +
        `fill="${color}"/>`;
    }

    // Label with percentage at the midpoint angle
    const midAngle = currentAngle + sliceAngle / 2;
    const percentage = Math.round((value / total) * 100);
    if (radius > 15 && percentage >= 5) {
      const labelRadius = radius * 0.65;
      const labelX = cx + labelRadius * Math.cos(midAngle);
      const labelY = cy + labelRadius * Math.sin(midAngle);
      content += `<text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="central" font-size="7" fill="#fff" font-weight="bold">${escapeXml(String(percentage))}%</text>`;
    }

    currentAngle += sliceAngle;
  }

  return createSvg(width, height, content);
}
