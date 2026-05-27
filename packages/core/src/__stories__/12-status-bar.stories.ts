// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Status bar story. Select rows and watch sum/avg/min/max/count auto-update
// for the selected numeric columns. With nothing selected, the bar shows
// stats for all visible rows.

import type { Meta, StoryObj } from '@storybook/html';
import { StatusBarPlugin } from '@gridstorm/plugin-status-bar';
import { SelectionPlugin } from '@gridstorm/plugin-selection';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { makeEmployees, mountGridStory, formatCurrency, type Employee } from './_helpers';

interface Args {
  rowCount: number;
  showOnSelection: boolean;
  showForAllRows: boolean;
}

const meta: Meta<Args> = {
  title: '5 · Enterprise Features/Status Bar',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The status bar at the bottom of the grid runs aggregations on ' +
          'numeric columns. With **showForAllRows** on, it reflects every ' +
          'visible row. Click a few rows to select them — with **showOnSelection** ' +
          'on, the bar switches to summarizing just the selected subset. ' +
          'Toggle both off to hide the bar entirely.',
      },
    },
  },
  argTypes: {
    rowCount: { control: { type: 'range', min: 20, max: 500, step: 10 } },
    showOnSelection: { control: 'boolean' },
    showForAllRows: { control: 'boolean' },
  },
  args: { rowCount: 80, showOnSelection: true, showForAllRows: true },
  render: (args: Args) => {
    return mountGridStory<Employee>({
      config: {
        columns: [
          { field: 'name', headerName: 'Name', width: 180, sortable: true },
          { field: 'department', headerName: 'Department', width: 160, sortable: true },
          { field: 'salary', headerName: 'Salary', width: 130, sortable: true, valueFormatter: formatCurrency },
          { field: 'rating', headerName: 'Rating', width: 110, sortable: true },
        ],
        rowData: makeEmployees(args.rowCount),
        getRowId: ({ data }) => String((data as Employee).id),
        rowSelection: 'multiple',
        plugins: [
          SortingPlugin(),
          SelectionPlugin({ mode: 'multiple' }),
          StatusBarPlugin({
            defaultAggregations: ['sum', 'avg', 'min', 'max', 'count'],
            showOnSelection: args.showOnSelection,
            showForAllRows: args.showForAllRows,
          }),
        ],
      },
      height: '460px',
    });
  },
};

export default meta;
type Story = StoryObj<Args>;

export const Playground: Story = {};

export const SelectionOnly: Story = {
  name: 'Status bar only when rows are selected',
  args: { showOnSelection: true, showForAllRows: false },
  parameters: {
    docs: { description: { story: 'Bar appears only after you click to select rows. Click outside or Ctrl-click again to clear and watch it disappear.' } },
  },
};
