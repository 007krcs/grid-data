// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Theme + density story. CSS-custom-property-driven theming: switch at
// runtime via `data-theme` / `data-density` attributes — no JS or rerender
// needed. The Controls panel toggles those attributes live.

import type { Meta, StoryObj } from '@storybook/html';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { makeEmployees, mountGridStory, formatCurrency, type Employee } from './_helpers';

interface Args {
  theme: 'light' | 'dark' | 'high-contrast';
  density: 'compact' | 'comfortable' | 'spacious';
  accentColor: string;
  rowCount: number;
}

const meta: Meta<Args> = {
  title: '4 · Theming/Themes & Density',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Theming is **CSS custom properties only**. There is no JS theme ' +
          'runtime — change `data-theme` or `data-density` on the grid root ' +
          'element and the browser repaints. The `Accent color` control ' +
          'demonstrates: pick a color and the `--gs-color-accent` token is ' +
          'overridden inline on the root, immediately changing sort icons, ' +
          'focus rings, and selection highlights.',
      },
    },
  },
  argTypes: {
    theme: { control: { type: 'inline-radio' }, options: ['light', 'dark', 'high-contrast'] },
    density: { control: { type: 'inline-radio' }, options: ['compact', 'comfortable', 'spacious'] },
    accentColor: { control: 'color', description: 'Overrides --gs-color-accent on the grid root.' },
    rowCount: { control: { type: 'range', min: 10, max: 500, step: 10 } },
  },
  args: { theme: 'light', density: 'comfortable', accentColor: '#3b82f6', rowCount: 80 },
  render: (args: Args) => {
    const container = mountGridStory<Employee>({
      config: {
        columns: [
          { field: 'id', headerName: 'ID', width: 70 },
          { field: 'name', headerName: 'Name', width: 180, sortable: true },
          { field: 'role', headerName: 'Role', width: 160, sortable: true },
          { field: 'department', headerName: 'Department', width: 160, sortable: true },
          { field: 'salary', headerName: 'Salary', width: 130, sortable: true, valueFormatter: formatCurrency },
        ],
        rowData: makeEmployees(args.rowCount),
        plugins: [SortingPlugin()],
      },
      height: '420px',
      theme: args.theme,
      density: args.density,
    });
    if (args.accentColor) {
      container.style.setProperty('--gs-color-accent', args.accentColor);
    }
    return container;
  },
};

export default meta;
type Story = StoryObj<Args>;

export const Light: Story = { args: { theme: 'light' } };
export const Dark: Story = { args: { theme: 'dark' } };
export const HighContrast: Story = { name: 'High contrast (WCAG AAA)', args: { theme: 'high-contrast' } };

export const Compact: Story = { name: 'Compact density', args: { density: 'compact' } };
export const Spacious: Story = { name: 'Spacious density', args: { density: 'spacious' } };

export const CustomAccent: Story = {
  name: 'Custom accent color',
  args: { accentColor: '#ec4899' },
  parameters: {
    docs: { description: { story: 'Override `--gs-color-accent` to brand the grid. No build step, no JS.' } },
  },
};
