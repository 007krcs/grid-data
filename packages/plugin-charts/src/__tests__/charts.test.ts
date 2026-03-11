import { describe, it, expect } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { ChartsPlugin } from '../charts-plugin';
import { renderBarChart } from '../charts/bar-chart';
import { renderLineChart } from '../charts/line-chart';
import { renderPieChart } from '../charts/pie-chart';
import { renderScatterChart } from '../charts/scatter-chart';
import { createSvg, scaleValue, resolveColor, defaultColors, escapeXml } from '../chart-renderer';
import type { ChartDataPoint, ChartState } from '../types';

// ── Sample Data Factories ──

function makeSampleData(): ChartDataPoint[] {
  return [
    { label: 'A', value: 10 },
    { label: 'B', value: 25 },
    { label: 'C', value: 15 },
    { label: 'D', value: 30 },
    { label: 'E', value: 20 },
  ];
}

function makeColoredData(): ChartDataPoint[] {
  return [
    { label: 'Red', value: 40, color: '#ff0000' },
    { label: 'Green', value: 60, color: '#00ff00' },
    { label: 'Blue', value: 20, color: '#0000ff' },
  ];
}

// ── SVG Utility Tests ──

describe('chart-renderer utilities', () => {
  it('createSvg wraps content in an SVG element', () => {
    const result = createSvg(100, 50, '<rect/>');
    expect(result).toContain('<svg');
    expect(result).toContain('width="100"');
    expect(result).toContain('height="50"');
    expect(result).toContain('<rect/>');
    expect(result).toContain('</svg>');
  });

  it('scaleValue maps zero to the bottom of the plot area', () => {
    const padding = { top: 4, right: 4, bottom: 14, left: 4 };
    const y = scaleValue(0, 100, 50, padding);
    expect(y).toBe(50 - 14); // height - padding.bottom
  });

  it('scaleValue maps max value to the top of the plot area', () => {
    const padding = { top: 4, right: 4, bottom: 14, left: 4 };
    const y = scaleValue(100, 100, 50, padding);
    expect(y).toBe(4); // padding.top
  });

  it('scaleValue handles zero maxValue gracefully', () => {
    const padding = { top: 4, right: 4, bottom: 14, left: 4 };
    const y = scaleValue(0, 0, 50, padding);
    expect(y).toBe(50 - 14);
  });

  it('resolveColor uses data color first', () => {
    expect(resolveColor(0, '#abc', ['#000'])).toBe('#abc');
  });

  it('resolveColor falls back to config colors', () => {
    expect(resolveColor(0, undefined, ['#111', '#222'])).toBe('#111');
    expect(resolveColor(1, undefined, ['#111', '#222'])).toBe('#222');
  });

  it('resolveColor cycles through default colors when no config', () => {
    expect(resolveColor(0, undefined, undefined)).toBe(defaultColors[0]);
    expect(resolveColor(8, undefined, undefined)).toBe(defaultColors[0]); // wraps around
  });

  it('escapeXml escapes special characters', () => {
    expect(escapeXml('a<b>c&d"e')).toBe('a&lt;b&gt;c&amp;d&quot;e');
  });
});

// ── Bar Chart Tests ──

describe('renderBarChart', () => {
  it('returns valid SVG with bars for sample data', () => {
    const svg = renderBarChart(makeSampleData(), 200, 40, {});
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('<rect');
  });

  it('renders one rect per data point', () => {
    const data = makeSampleData();
    const svg = renderBarChart(data, 200, 40, {});
    const rectCount = (svg.match(/<rect /g) ?? []).length;
    expect(rectCount).toBe(data.length);
  });

  it('returns empty SVG for empty data', () => {
    const svg = renderBarChart([], 200, 40, {});
    expect(svg).toContain('<svg');
    expect(svg).not.toContain('<rect');
  });

  it('uses custom data colors', () => {
    const svg = renderBarChart(makeColoredData(), 200, 40, {});
    expect(svg).toContain('#ff0000');
    expect(svg).toContain('#00ff00');
    expect(svg).toContain('#0000ff');
  });

  it('draws axes when showAxes is true', () => {
    const svg = renderBarChart(makeSampleData(), 200, 40, { showAxes: true });
    expect(svg).toContain('<line');
  });

  it('draws grid lines when showGrid and showAxes are true', () => {
    const svg = renderBarChart(makeSampleData(), 200, 40, {
      showAxes: true,
      showGrid: true,
    });
    expect(svg).toContain('stroke-dasharray');
  });

  it('renders labels below bars', () => {
    const svg = renderBarChart(makeSampleData(), 200, 40, {});
    expect(svg).toContain('<text');
    expect(svg).toContain('A');
  });
});

// ── Line Chart Tests ──

describe('renderLineChart', () => {
  it('returns valid SVG with a polyline', () => {
    const svg = renderLineChart(makeSampleData(), 200, 40, {});
    expect(svg).toContain('<svg');
    expect(svg).toContain('<polyline');
  });

  it('renders dot markers for each point', () => {
    const data = makeSampleData();
    const svg = renderLineChart(data, 200, 40, {});
    const circleCount = (svg.match(/<circle /g) ?? []).length;
    expect(circleCount).toBe(data.length);
  });

  it('renders area fill polygon', () => {
    const svg = renderLineChart(makeSampleData(), 200, 40, {});
    expect(svg).toContain('<polygon');
    expect(svg).toContain('fill-opacity="0.15"');
  });

  it('returns empty SVG for empty data', () => {
    const svg = renderLineChart([], 200, 40, {});
    expect(svg).toContain('<svg');
    expect(svg).not.toContain('<polyline');
    expect(svg).not.toContain('<circle');
  });

  it('handles a single data point', () => {
    const svg = renderLineChart([{ label: 'X', value: 42 }], 200, 40, {});
    expect(svg).toContain('<circle');
    // Single point => no polyline
    expect(svg).not.toContain('<polyline');
  });

  it('draws axes when showAxes is true', () => {
    const svg = renderLineChart(makeSampleData(), 200, 40, { showAxes: true });
    expect(svg).toContain('<line');
  });
});

// ── Pie Chart Tests ──

describe('renderPieChart', () => {
  it('returns valid SVG with arc paths', () => {
    const svg = renderPieChart(makeSampleData(), 100, 100, {});
    expect(svg).toContain('<svg');
    expect(svg).toContain('<path');
  });

  it('renders a full circle for a single data point', () => {
    const svg = renderPieChart([{ label: 'Only', value: 100 }], 100, 100, {});
    expect(svg).toContain('<circle');
  });

  it('renders percentage labels for large enough slices', () => {
    const svg = renderPieChart(makeSampleData(), 200, 200, {});
    expect(svg).toContain('%');
  });

  it('returns empty SVG for empty data', () => {
    const svg = renderPieChart([], 100, 100, {});
    expect(svg).toContain('<svg');
    expect(svg).not.toContain('<path');
    expect(svg).not.toContain('<circle');
  });

  it('renders grey circle when all values are zero', () => {
    const data: ChartDataPoint[] = [
      { label: 'A', value: 0 },
      { label: 'B', value: 0 },
    ];
    const svg = renderPieChart(data, 100, 100, {});
    expect(svg).toContain('<circle');
    expect(svg).toContain('#e0e0e0');
  });

  it('uses custom data colors for slices', () => {
    const svg = renderPieChart(makeColoredData(), 200, 200, {});
    expect(svg).toContain('#ff0000');
    expect(svg).toContain('#00ff00');
    expect(svg).toContain('#0000ff');
  });
});

// ── Scatter Chart Tests ──

describe('renderScatterChart', () => {
  it('returns valid SVG with circles for each point', () => {
    const data = makeSampleData();
    const svg = renderScatterChart(data, 200, 40, {});
    expect(svg).toContain('<svg');
    const circleCount = (svg.match(/<circle /g) ?? []).length;
    expect(circleCount).toBe(data.length);
  });

  it('returns empty SVG for empty data', () => {
    const svg = renderScatterChart([], 200, 40, {});
    expect(svg).toContain('<svg');
    expect(svg).not.toContain('<circle');
  });

  it('uses custom data colors', () => {
    const svg = renderScatterChart(makeColoredData(), 200, 40, {});
    expect(svg).toContain('#ff0000');
  });

  it('draws axes when showAxes is true', () => {
    const svg = renderScatterChart(makeSampleData(), 200, 40, { showAxes: true });
    expect(svg).toContain('<line');
  });

  it('draws grid lines when showGrid and showAxes are true', () => {
    const svg = renderScatterChart(makeSampleData(), 200, 40, {
      showAxes: true,
      showGrid: true,
    });
    expect(svg).toContain('stroke-dasharray');
  });
});

// ── ChartsPlugin Factory Tests ──

describe('ChartsPlugin', () => {
  it('creates a valid GridPlugin object', () => {
    const plugin = ChartsPlugin();
    expect(plugin.id).toBe('charts');
    expect(plugin.name).toBe('Charts');
    expect(plugin.version).toBe('0.1.0');
    expect(typeof plugin.install).toBe('function');
  });

  it('installs successfully in a grid', () => {
    const engine = createGrid({
      columns: [{ field: 'name' }],
      rowData: [{ name: 'test' }],
      plugins: [ChartsPlugin()],
    });

    expect(engine.api).toBeDefined();
    engine.destroy();
  });

  it('registers chart state on install', () => {
    const engine = createGrid({
      columns: [{ field: 'name' }],
      rowData: [{ name: 'test' }],
      plugins: [ChartsPlugin()],
    });

    const state = engine.store.getState();
    const chartState = state.pluginState['charts'] as ChartState;
    expect(chartState).toBeDefined();
    expect(chartState.charts).toEqual({});

    engine.destroy();
  });

  it('charts:create command adds a chart to state', () => {
    const engine = createGrid({
      columns: [{ field: 'name' }],
      rowData: [{ name: 'test' }],
      plugins: [ChartsPlugin()],
    });

    engine.commandBus.dispatch('charts:create', {
      id: 'my-chart',
      config: { type: 'bar' },
      data: [
        { label: 'A', value: 10 },
        { label: 'B', value: 20 },
      ],
    });

    const chartState = engine.store.getState().pluginState['charts'] as ChartState;
    expect(chartState.charts['my-chart']).toBeDefined();
    expect(chartState.charts['my-chart']!.config.type).toBe('bar');
    expect(chartState.charts['my-chart']!.data).toHaveLength(2);

    engine.destroy();
  });

  it('charts:destroy command removes a chart from state', () => {
    const engine = createGrid({
      columns: [{ field: 'name' }],
      rowData: [{ name: 'test' }],
      plugins: [ChartsPlugin()],
    });

    // Create a chart
    engine.commandBus.dispatch('charts:create', {
      id: 'to-remove',
      config: { type: 'line' },
      data: [{ label: 'X', value: 50 }],
    });

    // Verify it exists
    let chartState = engine.store.getState().pluginState['charts'] as ChartState;
    expect(chartState.charts['to-remove']).toBeDefined();

    // Destroy it
    engine.commandBus.dispatch('charts:destroy', { id: 'to-remove' });

    // Verify it's gone
    chartState = engine.store.getState().pluginState['charts'] as ChartState;
    expect(chartState.charts['to-remove']).toBeUndefined();

    engine.destroy();
  });

  it('charts:create preserves existing charts', () => {
    const engine = createGrid({
      columns: [{ field: 'name' }],
      rowData: [{ name: 'test' }],
      plugins: [ChartsPlugin()],
    });

    engine.commandBus.dispatch('charts:create', {
      id: 'chart-1',
      config: { type: 'bar' },
      data: [{ label: 'A', value: 10 }],
    });

    engine.commandBus.dispatch('charts:create', {
      id: 'chart-2',
      config: { type: 'pie' },
      data: [{ label: 'B', value: 20 }],
    });

    const chartState = engine.store.getState().pluginState['charts'] as ChartState;
    expect(Object.keys(chartState.charts)).toHaveLength(2);
    expect(chartState.charts['chart-1']).toBeDefined();
    expect(chartState.charts['chart-2']).toBeDefined();

    engine.destroy();
  });

  it('charts:destroy does not affect other charts', () => {
    const engine = createGrid({
      columns: [{ field: 'name' }],
      rowData: [{ name: 'test' }],
      plugins: [ChartsPlugin()],
    });

    engine.commandBus.dispatch('charts:create', {
      id: 'keep',
      config: { type: 'scatter' },
      data: [{ label: 'K', value: 99 }],
    });

    engine.commandBus.dispatch('charts:create', {
      id: 'remove',
      config: { type: 'line' },
      data: [{ label: 'R', value: 1 }],
    });

    engine.commandBus.dispatch('charts:destroy', { id: 'remove' });

    const chartState = engine.store.getState().pluginState['charts'] as ChartState;
    expect(chartState.charts['keep']).toBeDefined();
    expect(chartState.charts['remove']).toBeUndefined();

    engine.destroy();
  });

  it('registers a chart cell renderer', () => {
    const engine = createGrid({
      columns: [{ field: 'name' }],
      rowData: [{ name: 'test' }],
      plugins: [ChartsPlugin()],
    });

    const renderer = engine.pluginManager.getCellRenderer('chart');
    expect(renderer).toBeDefined();

    engine.destroy();
  });
});
