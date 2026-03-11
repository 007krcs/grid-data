import type { SparklineParams } from '../types';

/**
 * Renders an SVG area sparkline from an array of numeric values.
 *
 * Similar to the line sparkline but always includes a filled area
 * beneath the line with a default fill opacity of 0.3.
 */
export function renderAreaSparkline(
  values: number[],
  width: number,
  height: number,
  params: SparklineParams,
): string {
  if (!values || values.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"></svg>`;
  }

  const color = params.color || '#3b82f6';
  const strokeWidth = params.strokeWidth ?? 1.5;
  const fillOpacity = params.fillOpacity ?? 0.3;
  const showMin = params.showMin ?? false;
  const showMax = params.showMax ?? false;
  const showLast = params.showLast ?? false;

  const padding = 2;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Map each value to an (x, y) coordinate
  const points = values.map((v, i) => {
    const x = padding + (values.length === 1 ? plotWidth / 2 : (i / (values.length - 1)) * plotWidth);
    const y = padding + plotHeight - ((v - min) / range) * plotHeight;
    return { x, y, value: v };
  });

  const polylinePoints = points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

  // Filled area (always present for area sparkline)
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const bottomY = padding + plotHeight;
  const areaPath =
    `M ${first.x.toFixed(2)},${bottomY.toFixed(2)} ` +
    points.map((p) => `L ${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') +
    ` L ${last.x.toFixed(2)},${bottomY.toFixed(2)} Z`;
  svg += `<path d="${areaPath}" fill="${color}" fill-opacity="${fillOpacity}" stroke="none"/>`;

  // Polyline on top
  svg += `<polyline points="${polylinePoints}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;

  // Markers for min/max/last
  const markers: Array<{ x: number; y: number; markerColor: string }> = [];

  if (showMin) {
    const minIdx = values.indexOf(min);
    const minPoint = points[minIdx]!;
    markers.push({ x: minPoint.x, y: minPoint.y, markerColor: params.negativeColor || '#ef4444' });
  }

  if (showMax) {
    const maxIdx = values.indexOf(max);
    const maxPoint = points[maxIdx]!;
    markers.push({ x: maxPoint.x, y: maxPoint.y, markerColor: '#22c55e' });
  }

  if (showLast) {
    const lastPoint = points[points.length - 1]!;
    markers.push({ x: lastPoint.x, y: lastPoint.y, markerColor: color });
  }

  for (const marker of markers) {
    svg += `<circle cx="${marker.x.toFixed(2)}" cy="${marker.y.toFixed(2)}" r="2" fill="${marker.markerColor}"/>`;
  }

  svg += '</svg>';
  return svg;
}
