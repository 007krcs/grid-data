// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Grouping story. Pick a column to group by; rows collapse into expandable
// groups. Buttons above the grid wire the group:expandAll / collapseAll
// commands.

import type { Meta, StoryObj } from '@storybook/html';
import { GroupingPlugin } from '@gridstorm/plugin-grouping';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { makeEmployees, mountGridStory, formatCurrency, type Employee } from './_helpers';

interface Args {
  rowCount: number;
  groupBy: 'department' | 'city' | 'role' | 'none';
  defaultExpanded: boolean;
}

const meta: Meta<Args> = {
  title: '5 · Enterprise Features/Row Grouping',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Pick a grouping column from Controls. Click ▸/▾ markers in the ' +
          'group row to expand/collapse a single group, or use the buttons ' +
          'above the grid to expand/collapse all at once. Multi-level ' +
          'grouping works the same way — set `rowGroup: true` on more than ' +
          'one column def.',
      },
    },
  },
  argTypes: {
    rowCount: { control: { type: 'range', min: 20, max: 500, step: 10 } },
    groupBy: { control: { type: 'inline-radio' }, options: ['department', 'city', 'role', 'none'] },
    defaultExpanded: { control: 'boolean' },
  },
  args: { rowCount: 100, groupBy: 'department', defaultExpanded: true },
  render: (args: Args) => {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '8px';

    const toolbar = document.createElement('div');
    toolbar.style.display = 'flex';
    toolbar.style.gap = '8px';
    const expandBtn = document.createElement('button');
    const collapseBtn = document.createElement('button');
    expandBtn.textContent = 'Expand all';
    collapseBtn.textContent = 'Collapse all';
    for (const b of [expandBtn, collapseBtn]) {
      b.style.cssText = 'padding: 6px 12px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; font: inherit;';
    }
    toolbar.appendChild(expandBtn);
    toolbar.appendChild(collapseBtn);
    wrapper.appendChild(toolbar);

    const columns = [
      { field: 'name', headerName: 'Name', width: 180, sortable: true },
      { field: 'department', headerName: 'Department', width: 160, sortable: true, rowGroup: args.groupBy === 'department' },
      { field: 'role', headerName: 'Role', width: 160, sortable: true, rowGroup: args.groupBy === 'role' },
      { field: 'city', headerName: 'City', width: 140, sortable: true, rowGroup: args.groupBy === 'city' },
      { field: 'salary', headerName: 'Salary', width: 130, sortable: true, valueFormatter: formatCurrency },
      { field: 'rating', headerName: 'Rating', width: 100, sortable: true },
    ];

    const gridContainer = mountGridStory<Employee>({
      config: {
        columns,
        rowData: makeEmployees(args.rowCount),
        getRowId: ({ data }) => String((data as Employee).id),
        plugins: [SortingPlugin(), GroupingPlugin({ defaultExpanded: args.defaultExpanded })],
      },
      height: '480px',
      onReady: (engine) => {
        expandBtn.addEventListener('click', () => {
          engine.commandBus.dispatch('group:expandAll' as any, {} as any);
        });
        collapseBtn.addEventListener('click', () => {
          engine.commandBus.dispatch('group:collapseAll' as any, {} as any);
        });
      },
    });
    wrapper.appendChild(gridContainer);
    return wrapper;
  },
};

export default meta;
type Story = StoryObj<Args>;

export const Playground: Story = {};

export const GroupedByCity: Story = {
  name: 'Grouped by City',
  args: { groupBy: 'city', defaultExpanded: false },
  parameters: {
    docs: { description: { story: 'Starts collapsed — click a city to expand its employees.' } },
  },
};

export const Ungrouped: Story = {
  name: 'No grouping (flat view)',
  args: { groupBy: 'none' },
  parameters: {
    docs: { description: { story: 'Plugin is installed but no column has `rowGroup: true`, so rows render flat.' } },
  },
};
