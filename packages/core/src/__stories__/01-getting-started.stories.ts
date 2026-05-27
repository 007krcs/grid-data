// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// First story most visitors will see. Demonstrates the minimum viable grid
// (just createGrid + DomRenderer, no plugins) and exposes a few knobs in the
// Controls panel so you can feel how row-count and column-width changes
// affect the display in real time.

import type { Meta, StoryObj } from '@storybook/html';
import { makeEmployees, mountGridStory, formatCurrency, formatNumber, formatBool, type Employee } from './_helpers';

interface Args {
  rowCount: number;
  rowHeight: number;
  showSalary: boolean;
  showJoinedAt: boolean;
  showActive: boolean;
  containerHeight: number;
  theme: 'light' | 'dark' | 'high-contrast';
  density: 'compact' | 'comfortable' | 'spacious';
}

const meta: Meta<Args> = {
  title: '1 · Getting Started/Basic Grid',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The minimum viable GridStorm: pass `columns` and `rowData` to ' +
          '`createGrid()`, hand the engine to `DomRenderer`, mount it. ' +
          'Everything else is opt-in via plugins. Tweak the Controls panel ' +
          'below to see how row count, theme, density, and column visibility ' +
          'change the rendered output.',
      },
    },
  },
  argTypes: {
    rowCount: { control: { type: 'range', min: 1, max: 5000, step: 50 }, description: 'Number of rows to render. Virtual scrolling means only the visible ~30 rows hit the DOM regardless.' },
    rowHeight: { control: { type: 'range', min: 24, max: 96, step: 4 }, description: 'Row height in pixels.' },
    showSalary: { control: 'boolean', description: 'Toggle the Salary column.' },
    showJoinedAt: { control: 'boolean', description: 'Toggle the Joined column.' },
    showActive: { control: 'boolean', description: 'Toggle the Active column.' },
    containerHeight: { control: { type: 'range', min: 200, max: 800, step: 50 }, description: 'Outer container height in pixels.' },
    theme: { control: { type: 'inline-radio' }, options: ['light', 'dark', 'high-contrast'] },
    density: { control: { type: 'inline-radio' }, options: ['compact', 'comfortable', 'spacious'] },
  },
  args: {
    rowCount: 50,
    rowHeight: 40,
    showSalary: true,
    showJoinedAt: true,
    showActive: true,
    containerHeight: 400,
    theme: 'light',
    density: 'comfortable',
  },
  render: (args: Args) => {
    const columns: NonNullable<Parameters<typeof mountGridStory<Employee>>[0]['config']['columns']> = [
      { field: 'id', headerName: 'ID', width: 70 },
      { field: 'name', headerName: 'Name', width: 180 },
      { field: 'role', headerName: 'Role', width: 160 },
      { field: 'department', headerName: 'Department', width: 160 },
      { field: 'city', headerName: 'City', width: 140 },
    ];
    if (args.showSalary) columns.push({ field: 'salary', headerName: 'Salary', width: 130, valueFormatter: formatCurrency });
    if (args.showJoinedAt) columns.push({ field: 'joinedAt', headerName: 'Joined', width: 130 });
    if (args.showActive) columns.push({ field: 'active', headerName: 'Active', width: 90, valueFormatter: formatBool });
    columns.push({ field: 'rating', headerName: 'Rating', width: 100, valueFormatter: formatNumber });

    return mountGridStory<Employee>({
      config: {
        columns,
        rowData: makeEmployees(args.rowCount),
        rowHeight: args.rowHeight,
      },
      height: `${args.containerHeight}px`,
      theme: args.theme,
      density: args.density,
    });
  },
};

export default meta;
type Story = StoryObj<Args>;

export const Playground: Story = {};

export const TinyDataset: Story = {
  name: '8 rows (small fixture)',
  args: { rowCount: 8 },
  parameters: {
    docs: { description: { story: 'A handful of rows — useful for screenshots and visual diffs.' } },
  },
};

export const TenThousandRows: Story = {
  name: '10,000 rows (virtual scrolling)',
  args: { rowCount: 10_000, containerHeight: 500 },
  parameters: {
    docs: {
      description: {
        story:
          'Ten thousand rows; only the ~30 rows in the viewport are real DOM elements. ' +
          'Scroll fast and watch the row pool recycle.',
      },
    },
  },
};
