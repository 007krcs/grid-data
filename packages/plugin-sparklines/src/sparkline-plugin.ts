// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
import type { GridPlugin, PluginContext } from '@gridstorm/core';
import type { SparklineConfig, SparklineParams, SparklineType } from './types';
import { renderLineSparkline } from './renderers/line';
import { renderBarSparkline } from './renderers/bar';
import { renderAreaSparkline } from './renderers/area';
import { renderWinLossSparkline } from './renderers/win-loss';

const RENDERERS: Record<
  SparklineType,
  (values: number[], width: number, height: number, params: SparklineParams) => string
> = {
  line: renderLineSparkline,
  bar: renderBarSparkline,
  area: renderAreaSparkline,
  winloss: renderWinLossSparkline,
};

export function SparklinePlugin(config: SparklineConfig = {}): GridPlugin {
  return {
    id: 'sparklines',
    name: 'Sparklines',
    version: '0.1.0',

    install(ctx: PluginContext) {
      const defaultType = config.defaultType || 'line';
      const defaultColor = config.defaultColor || '#3b82f6';
      const defaultNegativeColor = config.defaultNegativeColor || '#ef4444';

      // Register a cell renderer for each type plus a generic 'sparkline' renderer
      function createSparklineRenderer(type: SparklineType) {
        return (cellParams: any) => {
          const value = cellParams.value;
          if (!Array.isArray(value) || value.length === 0) return '';

          const rendererParams: SparklineParams = cellParams.colDef?.cellRendererParams || {};
          const params: SparklineParams = {
            type,
            color: rendererParams.color || defaultColor,
            negativeColor: rendererParams.negativeColor || defaultNegativeColor,
            fillOpacity: rendererParams.fillOpacity ?? 0.1,
            strokeWidth: rendererParams.strokeWidth ?? 1.5,
            barGap: rendererParams.barGap ?? 1,
            showMin: rendererParams.showMin ?? false,
            showMax: rendererParams.showMax ?? false,
            showLast: rendererParams.showLast ?? false,
          };

          // Use cell dimensions
          const width = cellParams.colDef?.width || 120;
          const height = (cellParams.node?.rowHeight || 36) - 8; // padding

          const div = document.createElement('div');
          div.style.display = 'flex';
          div.style.alignItems = 'center';
          div.style.justifyContent = 'center';
          div.style.width = '100%';
          div.style.height = '100%';
          // eslint-disable-next-line no-unsanitized/property -- RENDERERS is the built-in sparkline SVG factory map; type is bounded enum and value is numeric, no user strings
          div.innerHTML = RENDERERS[type](value, width - 16, height, params);
          return div;
        };
      }

      // Register type-specific renderers
      ctx.registerCellRenderer('sparkline-line', createSparklineRenderer('line'));
      ctx.registerCellRenderer('sparkline-bar', createSparklineRenderer('bar'));
      ctx.registerCellRenderer('sparkline-area', createSparklineRenderer('area'));
      ctx.registerCellRenderer('sparkline-winloss', createSparklineRenderer('winloss'));

      // Register generic 'sparkline' renderer that reads type from params
      ctx.registerCellRenderer('sparkline', (cellParams: any) => {
        const rendererParams: SparklineParams = cellParams.colDef?.cellRendererParams || {};
        const type = rendererParams.type || defaultType;
        return createSparklineRenderer(type)(cellParams);
      });

      return () => {
        // Cleanup (cell renderers are cleaned up by the engine)
      };
    },
  };
}
