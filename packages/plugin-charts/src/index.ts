// ─── @gridstorm/plugin-charts — Public API ───

// Plugin factory
export { ChartsPlugin } from './charts-plugin';

// Types
export type {
  ChartType,
  ChartConfig,
  SeriesConfig,
  ChartDataPoint,
  ChartState,
} from './types';

// Individual chart renderers
export { renderBarChart } from './charts/bar-chart';
export { renderLineChart } from './charts/line-chart';
export { renderPieChart } from './charts/pie-chart';
export { renderScatterChart } from './charts/scatter-chart';

// SVG utilities
export {
  createSvg,
  drawAxis,
  scaleValue,
  resolveColor,
  defaultColors,
  escapeXml,
  AXIS_PADDING,
  NO_AXIS_PADDING,
} from './chart-renderer';
export type { Padding } from './chart-renderer';
