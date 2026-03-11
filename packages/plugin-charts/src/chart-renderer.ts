// ─── Base Chart SVG Utilities ───

/** Default color palette for chart series. */
export const defaultColors: readonly string[] = [
  '#4e79a7',
  '#f28e2b',
  '#e15759',
  '#76b7b2',
  '#59a14f',
  '#edc948',
  '#b07aa1',
  '#ff9da7',
];

/** Create an SVG root element string with the given dimensions. */
export function createSvg(width: number, height: number, content: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}" role="img">` +
    content +
    '</svg>'
  );
}

/** Draw X/Y axes with optional grid lines. Returns SVG markup for the axes. */
export function drawAxis(
  width: number,
  height: number,
  maxValue: number,
  showGrid: boolean,
  padding: Padding,
): string {
  const plotLeft = padding.left;
  const plotRight = width - padding.right;
  const plotTop = padding.top;
  const plotBottom = height - padding.bottom;

  let markup = '';

  // Y axis
  markup += `<line x1="${plotLeft}" y1="${plotTop}" x2="${plotLeft}" y2="${plotBottom}" stroke="#999" stroke-width="1"/>`;
  // X axis
  markup += `<line x1="${plotLeft}" y1="${plotBottom}" x2="${plotRight}" y2="${plotBottom}" stroke="#999" stroke-width="1"/>`;

  if (showGrid && maxValue > 0) {
    const gridLines = 4;
    for (let i = 1; i <= gridLines; i++) {
      const y = plotBottom - ((plotBottom - plotTop) * i) / gridLines;
      markup += `<line x1="${plotLeft}" y1="${y}" x2="${plotRight}" y2="${y}" stroke="#e0e0e0" stroke-width="0.5" stroke-dasharray="3,3"/>`;
    }
  }

  return markup;
}

/** Scale a data value to SVG Y coordinate within the chart area. */
export function scaleValue(
  value: number,
  maxValue: number,
  height: number,
  padding: Padding,
): number {
  if (maxValue === 0) return height - padding.bottom;
  const plotHeight = height - padding.top - padding.bottom;
  return height - padding.bottom - (value / maxValue) * plotHeight;
}

/** Resolve a color for a given index, using custom colors or the default palette. */
export function resolveColor(
  index: number,
  dataColor: string | undefined,
  configColors: string[] | undefined,
): string {
  if (dataColor) return dataColor;
  const palette = configColors ?? defaultColors;
  return palette[index % palette.length] ?? defaultColors[0]!;
}

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Standard padding for charts with axes. */
export const AXIS_PADDING: Padding = { top: 4, right: 4, bottom: 14, left: 4 };

/** Standard padding for charts without axes (e.g., pie). */
export const NO_AXIS_PADDING: Padding = { top: 4, right: 4, bottom: 4, left: 4 };

/** Escape a string for safe inclusion in SVG text elements. */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
