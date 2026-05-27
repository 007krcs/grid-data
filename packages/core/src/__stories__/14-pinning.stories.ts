// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Column + row pinning story. Columns can be pinned to the left or right,
// rows can be pinned to the top or bottom. Pinned regions are sticky during
// horizontal/vertical scroll. Controls let you flip pin states live.

import type { Meta, StoryObj } from '@storybook/html';
import { ColumnPinningPlugin } from '@gridstorm/plugin-column-pinning';
import { RowPinningPlugin } from '@gridstorm/plugin-row-pinning';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { ColumnResizePlugin } from '@gridstorm/plugin-column-resize';
import { makeEmployees, mountGridStory, formatCurrency, type Employee } from './_helpers';

interface Args {
  rowCount: number;
  pinIdLeft: boolean;
  pinSalaryRight: boolean;
  pinnedTopCount: number;
  pinnedBottomCount: number;
}

const meta: Meta<Args> = {
  title: '5 · Enterprise Features/Column & Row Pinning',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Pinned columns stay fixed during horizontal scroll. Pinned rows ' +
          'stay fixed during vertical scroll (floating rows). Resize columns ' +
          'wider than the grid and scroll horizontally to feel the column ' +
          'pinning effect. Pinned rows usually carry summary or "highlight" ' +
          'data — try the `pinnedTopCount` slider to add a few.',
      },
    },
  },
  argTypes: {
    rowCount: { control: { type: 'range', min: 20, max: 500, step: 10 } },
    pinIdLeft: { control: 'boolean' },
    pinSalaryRight: { control: 'boolean' },
    pinnedTopCount: { control: { type: 'range', min: 0, max: 5, step: 1 } },
    pinnedBottomCount: { control: { type: 'range', min: 0, max: 5, step: 1 } },
  },
  args: {
    rowCount: 80,
    pinIdLeft: true,
    pinSalaryRight: false,
    pinnedTopCount: 1,
    pinnedBottomCount: 0,
  },
  render: (args: Args) => {
    const rows = makeEmployees(args.rowCount);
    const pinnedTopRowData = rows.slice(0, args.pinnedTopCount);
    const pinnedBottomRowData = rows.slice(rows.length - args.pinnedBottomCount, rows.length);
    return mountGridStory<Employee>({
      config: {
        columns: [
          { field: 'id', headerName: 'ID', width: 80, pinned: args.pinIdLeft ? 'left' : undefined, sortable: true },
          { field: 'name', headerName: 'Name', width: 200, sortable: true, resizable: true },
          { field: 'role', headerName: 'Role', width: 180, sortable: true, resizable: true },
          { field: 'department', headerName: 'Department', width: 180, sortable: true, resizable: true },
          { field: 'city', headerName: 'City', width: 180, sortable: true, resizable: true },
          { field: 'rating', headerName: 'Rating', width: 110, sortable: true, resizable: true },
          { field: 'salary', headerName: 'Salary', width: 150, sortable: true, valueFormatter: formatCurrency, pinned: args.pinSalaryRight ? 'right' : undefined },
        ],
        rowData: rows,
        getRowId: ({ data }) => String((data as Employee).id),
        pinnedTopRowData,
        pinnedBottomRowData,
        plugins: [
          SortingPlugin(),
          ColumnResizePlugin(),
          ColumnPinningPlugin(),
          RowPinningPlugin({ pinnedTopRowData, pinnedBottomRowData }),
        ],
      },
      height: '440px',
    });
  },
};

export default meta;
type Story = StoryObj<Args>;

export const Playground: Story = {};

export const BothEdgesPinned: Story = {
  name: 'ID pinned left, Salary pinned right',
  args: { pinIdLeft: true, pinSalaryRight: true },
  parameters: {
    docs: { description: { story: 'Classic enterprise data-grid layout — identity column anchored on the left, currency column anchored on the right. Scroll horizontally to feel both edges stick.' } },
  },
};

export const FloatingTopAndBottom: Story = {
  name: 'Pinned summary rows top + bottom',
  args: { pinnedTopCount: 2, pinnedBottomCount: 1 },
  parameters: {
    docs: { description: { story: 'Two highlighted rows at the top, one totals-style row at the bottom. Scroll vertically — they stay anchored.' } },
  },
};
