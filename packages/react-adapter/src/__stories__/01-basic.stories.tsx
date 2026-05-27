// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Smallest viable React usage: <GridStorm columns={...} rowData={...} />.
// The component handles engine lifecycle and renderer mount; you just write
// JSX. Controls let you toggle column visibility, dataset size, theme, and
// dimensions without leaving Storybook.

import type { Meta, StoryObj } from '@storybook/react';
import { useMemo } from 'react';
import { GridStorm } from '@gridstorm/react';
import type { ColumnDef } from '@gridstorm/core';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { makeEmployees, formatCurrency, type Employee } from './_helpers';

interface Args {
  rowCount: number;
  height: number;
  showSalary: boolean;
  showRating: boolean;
  theme: 'light' | 'dark' | 'high-contrast';
  density: 'compact' | 'comfortable' | 'spacious';
}

const meta: Meta<Args> = {
  title: '1 · React/Basic GridStorm',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The `<GridStorm>` component owns the engine and renderer. Pass ' +
          '`columns` and `rowData` as React props; everything else is ' +
          'optional. Plugins go into the `plugins` array. The component ' +
          'cleans up when it unmounts (try toggling the dataset size and ' +
          'see the renderer re-mount cleanly).',
      },
    },
  },
  argTypes: {
    rowCount: { control: { type: 'range', min: 5, max: 5000, step: 5 } },
    height: { control: { type: 'range', min: 200, max: 800, step: 50 } },
    showSalary: { control: 'boolean' },
    showRating: { control: 'boolean' },
    theme: { control: { type: 'inline-radio' }, options: ['light', 'dark', 'high-contrast'] },
    density: { control: { type: 'inline-radio' }, options: ['compact', 'comfortable', 'spacious'] },
  },
  args: {
    rowCount: 50,
    height: 400,
    showSalary: true,
    showRating: true,
    theme: 'light',
    density: 'comfortable',
  },
};

export default meta;
type Story = StoryObj<Args>;

function Demo(args: Args) {
  const columns = useMemo<ColumnDef<Employee>[]>(() => {
    const base: ColumnDef<Employee>[] = [
      { field: 'id', headerName: 'ID', width: 70 },
      { field: 'name', headerName: 'Name', width: 180, sortable: true },
      { field: 'role', headerName: 'Role', width: 160, sortable: true },
      { field: 'department', headerName: 'Department', width: 160, sortable: true },
      { field: 'city', headerName: 'City', width: 140 },
    ];
    if (args.showSalary) base.push({ field: 'salary', headerName: 'Salary', width: 130, sortable: true, valueFormatter: formatCurrency });
    if (args.showRating) base.push({ field: 'rating', headerName: 'Rating', width: 100, sortable: true });
    return base;
  }, [args.showSalary, args.showRating]);

  const plugins = useMemo(() => [SortingPlugin()], []);
  const data = useMemo(() => makeEmployees(args.rowCount), [args.rowCount]);

  return (
    <div data-theme={args.theme} data-density={args.density} style={{ padding: 16 }}>
      <GridStorm columns={columns} rowData={data} plugins={plugins} height={args.height} />
    </div>
  );
}

export const Playground: Story = { render: (args) => <Demo {...args} /> };

export const TenThousandRows: Story = {
  name: '10,000 rows (virtual scrolling)',
  args: { rowCount: 10_000, height: 500 },
  render: (args) => <Demo {...args} />,
};
