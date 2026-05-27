// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Virtual scrolling story. The whole point: no matter how many rows you
// load, only ~30 DOM elements exist at any moment. Open DevTools and inspect
// the .gs-body element while scrolling — the same row nodes get recycled.

import type { Meta, StoryObj } from '@storybook/html';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { makeProducts, mountGridStory, formatCurrency, formatNumber, type Product } from './_helpers';

interface Args {
  rowCount: number;
  rowHeight: number;
  overscan: number;
}

const meta: Meta<Args> = {
  title: '3 · Performance/Virtual Scrolling',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'GridStorm renders only the rows visible in the viewport plus a small ' +
          'overscan buffer above and below. **Open browser DevTools, expand the ' +
          '`.gs-body` element, and scroll**: you will see the same ~30 ' +
          '`.gs-row` elements get reused as their `top` style position changes. ' +
          'No DOM allocation per scroll tick = 60fps on a million rows.',
      },
    },
  },
  argTypes: {
    rowCount: {
      control: { type: 'select' },
      options: [100, 1000, 10_000, 100_000, 500_000],
      description: 'Number of rows in the data source.',
    },
    rowHeight: { control: { type: 'range', min: 24, max: 96, step: 4 } },
    overscan: { control: { type: 'range', min: 0, max: 20, step: 1 }, description: 'Extra rows rendered above/below the viewport.' },
  },
  args: { rowCount: 10_000, rowHeight: 40, overscan: 5 },
  render: (args: Args) => {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '8px';

    const counter = document.createElement('div');
    counter.style.padding = '8px 12px';
    counter.style.background = '#f1f5f9';
    counter.style.borderRadius = '6px';
    counter.style.font = '12px ui-monospace, SFMono-Regular, monospace';
    wrapper.appendChild(counter);

    const gridContainer = mountGridStory<Product>({
      config: {
        columns: [
          { field: 'sku', headerName: 'SKU', width: 130, sortable: true },
          { field: 'name', headerName: 'Name', width: 200, sortable: true },
          { field: 'category', headerName: 'Category', width: 140, sortable: true },
          { field: 'price', headerName: 'Price', width: 120, sortable: true, valueFormatter: formatCurrency },
          { field: 'stock', headerName: 'Stock', width: 110, sortable: true, valueFormatter: formatNumber },
          { field: 'rating', headerName: 'Rating', width: 100, sortable: true },
        ],
        rowData: makeProducts(args.rowCount),
        rowHeight: args.rowHeight,
        plugins: [SortingPlugin()],
      },
      height: '500px',
      onReady: (engine) => {
        const updateCounter = () => {
          const dom = document.querySelectorAll('.gs-row[data-row-id]').length;
          counter.textContent = `Total rows: ${args.rowCount.toLocaleString()} · ` +
            `Live DOM .gs-row elements: ${dom} · ` +
            `Ratio: 1:${Math.round(args.rowCount / Math.max(dom, 1)).toLocaleString()}`;
        };
        updateCounter();
        engine.eventBus.on('viewport:changed' as never, updateCounter);
        // Also update on scroll for the visual feedback effect.
        setTimeout(updateCounter, 100);
      },
    });
    wrapper.appendChild(gridContainer);
    return wrapper;
  },
};

export default meta;
type Story = StoryObj<Args>;

export const TenThousand: Story = { name: '10,000 rows', args: { rowCount: 10_000 } };

export const HundredThousand: Story = {
  name: '100,000 rows',
  args: { rowCount: 100_000 },
  parameters: {
    docs: { description: { story: 'A hundred thousand rows. Sort by Price — done in <100ms because comparison is O(n log n) with no DOM work.' } },
  },
};

export const HalfMillion: Story = {
  name: '500,000 rows (stress test)',
  args: { rowCount: 500_000 },
  parameters: {
    docs: {
      description: {
        story:
          'Half a million rows. Initial sort is the longest step (~1s). After that, scrolling stays at ' +
          '60fps because no DOM allocation happens per frame.',
      },
    },
  },
};
