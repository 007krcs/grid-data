// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Sorting story. Click a column header to sort; the SortingPlugin's
// configurable `sortCycle` and `multiSort` are wired to Controls so you can
// see the difference between single-click cycles and shift-click multi-sort.

import type { Meta, StoryObj } from '@storybook/html';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { makeEmployees, mountGridStory, formatCurrency, type Employee } from './_helpers';

interface Args {
  rowCount: number;
  multiSort: boolean;
  cycle: 'asc-desc-null' | 'asc-desc' | 'desc-asc-null';
  maxSortColumns: number;
}

const meta: Meta<Args> = {
  title: '2 · Plugins/Sorting',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Click a sortable column header to cycle through sort directions. ' +
          'Hold **Shift** while clicking a second column to sort by multiple ' +
          'columns at once (requires `multiSort: true`, the default). The ' +
          '`sortCycle` option controls what the click sequence is per column.',
      },
    },
  },
  argTypes: {
    rowCount: { control: { type: 'range', min: 10, max: 1000, step: 10 } },
    multiSort: { control: 'boolean' },
    cycle: { control: { type: 'inline-radio' }, options: ['asc-desc-null', 'asc-desc', 'desc-asc-null'] },
    maxSortColumns: { control: { type: 'range', min: 1, max: 5, step: 1 } },
  },
  args: {
    rowCount: 200,
    multiSort: true,
    cycle: 'asc-desc-null',
    maxSortColumns: 3,
  },
  render: (args: Args) => {
    const cycleMap: Record<Args['cycle'], Array<'asc' | 'desc' | null>> = {
      'asc-desc-null': ['asc', 'desc', null],
      'asc-desc': ['asc', 'desc'],
      'desc-asc-null': ['desc', 'asc', null],
    };
    return mountGridStory<Employee>({
      config: {
        columns: [
          { field: 'name', headerName: 'Name', width: 180, sortable: true },
          { field: 'role', headerName: 'Role', width: 160, sortable: true },
          { field: 'department', headerName: 'Department', width: 160, sortable: true },
          { field: 'salary', headerName: 'Salary', width: 130, sortable: true, valueFormatter: formatCurrency },
          { field: 'rating', headerName: 'Rating', width: 100, sortable: true },
          { field: 'joinedAt', headerName: 'Joined', width: 130, sortable: true },
        ],
        rowData: makeEmployees(args.rowCount),
        plugins: [
          SortingPlugin({
            multiSort: args.multiSort,
            sortCycle: cycleMap[args.cycle],
            maxSortColumns: args.maxSortColumns,
          }),
        ],
      },
      height: '450px',
    });
  },
};

export default meta;
type Story = StoryObj<Args>;

export const Playground: Story = {};

export const TwoColumnCycle: Story = {
  name: 'Two-state cycle (asc → desc → asc)',
  args: { cycle: 'asc-desc' },
  parameters: {
    docs: { description: { story: 'A two-state cycle keeps the column always sorted; clicks toggle direction but never clear.' } },
  },
};

export const SingleSortOnly: Story = {
  name: 'Single-column sort only',
  args: { multiSort: false },
  parameters: {
    docs: { description: { story: 'Shift-click no longer adds columns; clicking a new header replaces the previous sort.' } },
  },
};
