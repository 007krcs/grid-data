import { describe, it, expect } from 'vitest';
import { renderLineSparkline } from '../renderers/line';
import { renderBarSparkline } from '../renderers/bar';
import { renderAreaSparkline } from '../renderers/area';
import { renderWinLossSparkline } from '../renderers/win-loss';
import { SparklinePlugin } from '../sparkline-plugin';
import type { SparklineParams } from '../types';

const sampleData = [1, 3, 2, 5, 4];
const defaultParams: SparklineParams = {
  color: '#3b82f6',
  negativeColor: '#ef4444',
  fillOpacity: 0.1,
  strokeWidth: 1.5,
  barGap: 1,
  showMin: false,
  showMax: false,
  showLast: false,
};

// ─── Line Sparkline ───

describe('renderLineSparkline', () => {
  it('should return valid SVG with polyline for sample data', () => {
    const svg = renderLineSparkline(sampleData, 100, 24, defaultParams);
    expect(svg).toContain('<svg');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('<polyline');
    expect(svg).toContain('</svg>');
  });

  it('should return empty SVG for empty array', () => {
    const svg = renderLineSparkline([], 100, 24, defaultParams);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).not.toContain('<polyline');
  });

  it('should handle single value', () => {
    const svg = renderLineSparkline([5], 100, 24, defaultParams);
    expect(svg).toContain('<svg');
    expect(svg).toContain('<polyline');
  });

  it('should include filled area when fillOpacity > 0', () => {
    const params: SparklineParams = { ...defaultParams, fillOpacity: 0.2 };
    const svg = renderLineSparkline(sampleData, 100, 24, params);
    expect(svg).toContain('<path');
    expect(svg).toContain('fill-opacity="0.2"');
  });

  it('should not include filled area when fillOpacity is 0', () => {
    const params: SparklineParams = { ...defaultParams, fillOpacity: 0 };
    const svg = renderLineSparkline(sampleData, 100, 24, params);
    expect(svg).not.toContain('<path');
  });

  it('should render min marker when showMin is true', () => {
    const params: SparklineParams = { ...defaultParams, showMin: true };
    const svg = renderLineSparkline(sampleData, 100, 24, params);
    expect(svg).toContain('<circle');
    expect(svg).toContain('fill="#ef4444"');
  });

  it('should render max marker when showMax is true', () => {
    const params: SparklineParams = { ...defaultParams, showMax: true };
    const svg = renderLineSparkline(sampleData, 100, 24, params);
    expect(svg).toContain('<circle');
    expect(svg).toContain('fill="#22c55e"');
  });

  it('should render last marker when showLast is true', () => {
    const params: SparklineParams = { ...defaultParams, showLast: true };
    const svg = renderLineSparkline(sampleData, 100, 24, params);
    expect(svg).toContain('<circle');
  });

  it('should use custom color', () => {
    const params: SparklineParams = { ...defaultParams, color: '#ff0000' };
    const svg = renderLineSparkline(sampleData, 100, 24, params);
    expect(svg).toContain('stroke="#ff0000"');
  });

  it('should set correct width and height attributes', () => {
    const svg = renderLineSparkline(sampleData, 150, 30, defaultParams);
    expect(svg).toContain('width="150"');
    expect(svg).toContain('height="30"');
    expect(svg).toContain('viewBox="0 0 150 30"');
  });
});

// ─── Bar Sparkline ───

describe('renderBarSparkline', () => {
  it('should return valid SVG with rect elements for sample data', () => {
    const svg = renderBarSparkline(sampleData, 100, 24, defaultParams);
    expect(svg).toContain('<svg');
    expect(svg).toContain('<rect');
    expect(svg).toContain('</svg>');
  });

  it('should return empty SVG for empty array', () => {
    const svg = renderBarSparkline([], 100, 24, defaultParams);
    expect(svg).toContain('<svg');
    expect(svg).not.toContain('<rect');
  });

  it('should handle single value', () => {
    const svg = renderBarSparkline([5], 100, 24, defaultParams);
    expect(svg).toContain('<rect');
  });

  it('should use negative color for negative values', () => {
    const data = [3, -2, 1, -4, 5];
    const svg = renderBarSparkline(data, 100, 24, defaultParams);
    expect(svg).toContain('fill="#3b82f6"');
    expect(svg).toContain('fill="#ef4444"');
  });

  it('should render correct number of bars', () => {
    const svg = renderBarSparkline(sampleData, 100, 24, defaultParams);
    const rectCount = (svg.match(/<rect/g) || []).length;
    expect(rectCount).toBe(sampleData.length);
  });

  it('should handle all negative values', () => {
    const data = [-5, -3, -1, -4, -2];
    const svg = renderBarSparkline(data, 100, 24, defaultParams);
    expect(svg).toContain('<rect');
    // All bars should use negative color
    const matches = svg.match(/fill="#ef4444"/g) || [];
    expect(matches.length).toBe(5);
  });

  it('should handle all zero values', () => {
    const data = [0, 0, 0];
    const svg = renderBarSparkline(data, 100, 24, defaultParams);
    expect(svg).toContain('<svg');
  });

  it('should use custom bar gap', () => {
    const params: SparklineParams = { ...defaultParams, barGap: 3 };
    const svg = renderBarSparkline(sampleData, 100, 24, params);
    expect(svg).toContain('<rect');
  });
});

// ─── Area Sparkline ───

describe('renderAreaSparkline', () => {
  it('should return valid SVG with path and polyline', () => {
    const svg = renderAreaSparkline(sampleData, 100, 24, defaultParams);
    expect(svg).toContain('<svg');
    expect(svg).toContain('<path');
    expect(svg).toContain('<polyline');
    expect(svg).toContain('</svg>');
  });

  it('should return empty SVG for empty array', () => {
    const svg = renderAreaSparkline([], 100, 24, defaultParams);
    expect(svg).toContain('<svg');
    expect(svg).not.toContain('<path');
    expect(svg).not.toContain('<polyline');
  });

  it('should handle single value', () => {
    const svg = renderAreaSparkline([5], 100, 24, defaultParams);
    expect(svg).toContain('<path');
    expect(svg).toContain('<polyline');
  });

  it('should always have a filled area with default opacity of 0.3', () => {
    const params: SparklineParams = { ...defaultParams, fillOpacity: undefined };
    const svg = renderAreaSparkline(sampleData, 100, 24, params);
    expect(svg).toContain('fill-opacity="0.3"');
  });

  it('should render min/max/last markers', () => {
    const params: SparklineParams = {
      ...defaultParams,
      showMin: true,
      showMax: true,
      showLast: true,
    };
    const svg = renderAreaSparkline(sampleData, 100, 24, params);
    const circleCount = (svg.match(/<circle/g) || []).length;
    expect(circleCount).toBe(3);
  });

  it('should use custom fill opacity', () => {
    const params: SparklineParams = { ...defaultParams, fillOpacity: 0.5 };
    const svg = renderAreaSparkline(sampleData, 100, 24, params);
    expect(svg).toContain('fill-opacity="0.5"');
  });
});

// ─── Win/Loss Sparkline ───

describe('renderWinLossSparkline', () => {
  it('should return valid SVG with rect elements', () => {
    const svg = renderWinLossSparkline(sampleData, 100, 24, defaultParams);
    expect(svg).toContain('<svg');
    expect(svg).toContain('<rect');
    expect(svg).toContain('</svg>');
  });

  it('should return empty SVG for empty array', () => {
    const svg = renderWinLossSparkline([], 100, 24, defaultParams);
    expect(svg).toContain('<svg');
    expect(svg).not.toContain('<rect');
  });

  it('should handle single value', () => {
    const svg = renderWinLossSparkline([5], 100, 24, defaultParams);
    expect(svg).toContain('<rect');
  });

  it('should use color for positive values and negativeColor for negative/zero', () => {
    const data = [1, -1, 0, 2, -3];
    const svg = renderWinLossSparkline(data, 100, 24, defaultParams);
    // 2 positive (1, 2) should be blue, 3 negative/zero (-1, 0, -3) should be red
    const posMatches = svg.match(/fill="#3b82f6"/g) || [];
    const negMatches = svg.match(/fill="#ef4444"/g) || [];
    expect(posMatches.length).toBe(2);
    expect(negMatches.length).toBe(3);
  });

  it('should render correct number of bars', () => {
    const data = [1, -1, 1, -1, 1];
    const svg = renderWinLossSparkline(data, 100, 24, defaultParams);
    const rectCount = (svg.match(/<rect/g) || []).length;
    expect(rectCount).toBe(5);
  });

  it('should handle all wins', () => {
    const data = [1, 2, 3, 4, 5];
    const svg = renderWinLossSparkline(data, 100, 24, defaultParams);
    const posMatches = svg.match(/fill="#3b82f6"/g) || [];
    expect(posMatches.length).toBe(5);
    expect(svg).not.toContain('fill="#ef4444"');
  });

  it('should handle all losses', () => {
    const data = [-1, -2, -3, -4, -5];
    const svg = renderWinLossSparkline(data, 100, 24, defaultParams);
    const negMatches = svg.match(/fill="#ef4444"/g) || [];
    expect(negMatches.length).toBe(5);
    expect(svg).not.toContain('fill="#3b82f6"');
  });

  it('should treat zero as a loss', () => {
    const data = [0];
    const svg = renderWinLossSparkline(data, 100, 24, defaultParams);
    expect(svg).toContain('fill="#ef4444"');
    expect(svg).not.toContain('fill="#3b82f6"');
  });
});

// ─── SparklinePlugin Factory ───

describe('SparklinePlugin', () => {
  it('should create a valid GridPlugin object', () => {
    const plugin = SparklinePlugin();
    expect(plugin.id).toBe('sparklines');
    expect(plugin.name).toBe('Sparklines');
    expect(plugin.version).toBe('0.1.0');
    expect(typeof plugin.install).toBe('function');
  });

  it('should accept config options', () => {
    const plugin = SparklinePlugin({
      defaultType: 'bar',
      defaultColor: '#ff0000',
      defaultNegativeColor: '#00ff00',
      defaultHeight: 40,
    });
    expect(plugin.id).toBe('sparklines');
  });

  it('should register cell renderers when installed', () => {
    const plugin = SparklinePlugin();
    const registeredRenderers: Map<string, unknown> = new Map();

    const mockCtx = {
      registerCellRenderer: (name: string, renderer: unknown) => {
        registeredRenderers.set(name, renderer);
      },
    } as any;

    plugin.install(mockCtx);

    expect(registeredRenderers.has('sparkline')).toBe(true);
    expect(registeredRenderers.has('sparkline-line')).toBe(true);
    expect(registeredRenderers.has('sparkline-bar')).toBe(true);
    expect(registeredRenderers.has('sparkline-area')).toBe(true);
    expect(registeredRenderers.has('sparkline-winloss')).toBe(true);
    expect(registeredRenderers.size).toBe(5);
  });

  it('should return a cleanup function from install', () => {
    const plugin = SparklinePlugin();
    const mockCtx = {
      registerCellRenderer: () => {},
    } as any;

    const disposer = plugin.install(mockCtx);
    expect(typeof disposer).toBe('function');
  });
});
