// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Pagination story. Page nav at the bottom; page-size selector lets you
// switch between 25/50/100/250 rows per page. Useful contrast to the virtual
// scrolling story — pagination is the alternative for datasets where the
// users prefer explicit page boundaries.

import type { Meta, StoryObj } from '@storybook/html';
import { PaginationPlugin } from '@gridstorm/plugin-pagination';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import { makeEmployees, mountGridStory, formatCurrency, type Employee } from './_helpers';

interface Args {
  rowCount: number;
  pageSize: number;
  showPageSizeSelector: boolean;
}

const meta: Meta<Args> = {
  title: '5 · Enterprise Features/Pagination',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Client-side pagination. The plugin slices the displayed-row list ' +
          'into pages and renders only the current page. Combine with ' +
          'filtering: type a query and the page count drops, because ' +
          'pagination operates on the filtered subset.\n\n' +
          'Note: this is the alternative to virtual scrolling. Pagination ' +
          'is best when users expect to navigate by page (think enterprise ' +
          'apps); virtual scrolling is best when they want continuous scroll.',
      },
    },
  },
  argTypes: {
    rowCount: { control: { type: 'range', min: 50, max: 5000, step: 50 } },
    pageSize: { control: { type: 'inline-radio' }, options: [10, 25, 50, 100, 250] },
    showPageSizeSelector: { control: 'boolean' },
  },
  args: { rowCount: 500, pageSize: 25, showPageSizeSelector: true },
  render: (args: Args) => {
    return mountGridStory<Employee>({
      config: {
        columns: [
          { field: 'id', headerName: 'ID', width: 70 },
          { field: 'name', headerName: 'Name', width: 180, sortable: true, filterable: true },
          { field: 'department', headerName: 'Department', width: 160, sortable: true, filterable: true },
          { field: 'city', headerName: 'City', width: 140, sortable: true, filterable: true },
          { field: 'salary', headerName: 'Salary', width: 130, sortable: true, valueFormatter: formatCurrency },
        ],
        rowData: makeEmployees(args.rowCount),
        plugins: [
          SortingPlugin(),
          FilteringPlugin({ caseSensitive: false }),
          PaginationPlugin({
            pageSize: args.pageSize,
            pageSizeOptions: [10, 25, 50, 100, 250],
            showPageSizeSelector: args.showPageSizeSelector,
          }),
        ],
      },
      height: '480px',
    });
  },
};

export default meta;
type Story = StoryObj<Args>;

export const Playground: Story = {};

export const LargeDataset: Story = {
  name: 'Large dataset (5000 rows)',
  args: { rowCount: 5000, pageSize: 50 },
  parameters: {
    docs: { description: { story: 'Pagination keeps the rendered surface small no matter how big the source dataset.' } },
  },
};
