// ─── Charts Plugin ───

import type { GridPlugin, PluginContext } from '@gridstorm/core';
import type { ChartConfig, ChartDataPoint, ChartState } from './types';
import { renderBarChart } from './charts/bar-chart';
import { renderLineChart } from './charts/line-chart';
import { renderPieChart } from './charts/pie-chart';
import { renderScatterChart } from './charts/scatter-chart';

const CHART_RENDERERS = {
  bar: renderBarChart,
  line: renderLineChart,
  pie: renderPieChart,
  scatter: renderScatterChart,
} as const;

/**
 * Creates the Charts plugin for GridStorm.
 *
 * Provides:
 * - A `'chart'` cell renderer that renders inline SVG charts from array cell values.
 *   Configure via `cellRendererParams` on the column definition: `chartType`, `colors`,
 *   `showAxes`, `showGrid`.
 * - `charts:create` and `charts:destroy` commands for standalone chart state management.
 */
export function ChartsPlugin(): GridPlugin {
  return {
    id: 'charts',
    name: 'Charts',
    version: '0.1.0',

    install(ctx: PluginContext) {
      // Register plugin state slice
      ctx.registerState<ChartState>('charts', { charts: {} });

      // Register the 'chart' cell renderer
      ctx.registerCellRenderer('chart', (params: any) => {
        const value = params.value;
        if (!Array.isArray(value) || value.length === 0) return '';

        const rendererParams = params.colDef?.cellRendererParams || {};
        const chartType = rendererParams.chartType || 'bar';
        const config: Partial<ChartConfig> = {
          type: chartType,
          colors: rendererParams.colors,
          showAxes: rendererParams.showAxes ?? false,
          showGrid: rendererParams.showGrid ?? false,
        };

        const data: ChartDataPoint[] = value.map((v: any, i: number) => ({
          label: String(i),
          value: typeof v === 'number' ? v : 0,
        }));

        const colWidth = params.colDef?.width || 200;
        const rowHeight = (params.node?.rowHeight || 36) - 8;

        const renderer =
          CHART_RENDERERS[chartType as keyof typeof CHART_RENDERERS] || renderBarChart;

        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'center';
        div.innerHTML = renderer(data, colWidth - 16, rowHeight, config);
        return div;
      });

      // Register commands for standalone chart management
      const unregCreate = ctx.commandBus.registerHandler(
        'charts:create',
        (payload: { id: string; config: ChartConfig; data: ChartDataPoint[] }) => {
          ctx.setState<ChartState>('charts', (prev) => ({
            charts: {
              ...prev.charts,
              [payload.id]: { config: payload.config, data: payload.data },
            },
          }));
          ctx.eventBus.emit('charts:rendered' as any, { chartId: payload.id });
        },
      );

      const unregDestroy = ctx.commandBus.registerHandler(
        'charts:destroy',
        (payload: { id: string }) => {
          ctx.setState<ChartState>('charts', (prev) => {
            const { [payload.id]: _removed, ...rest } = prev.charts;
            return { charts: rest };
          });
        },
      );

      // Return disposer
      return () => {
        unregCreate();
        unregDestroy();
      };
    },
  };
}
