// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Filtering story. Two filter surfaces: a quick-filter input (matches across
// all columns) and a programmatic filterModel (per-column structured filter).
// Both are wired up so you can play with case sensitivity and debounce timing.

import type { Meta, StoryObj } from '@storybook/html';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import { makeEmployees, mountGridStory, formatCurrency, type Employee } from './_helpers';

interface Args {
  rowCount: number;
  caseSensitive: boolean;
  quickFilter: string;
  initialDepartmentFilter: string;
}

const meta: Meta<Args> = {
  title: '2 · Plugins/Filtering',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Type into the quick-filter input above the grid to filter rows by ' +
          'substring across all columns. The `initialDepartmentFilter` arg ' +
          'demonstrates a programmatic per-column filter applied at startup ' +
          'via the FilterModel — combine both to see how the layers stack.',
      },
    },
  },
  argTypes: {
    rowCount: { control: { type: 'range', min: 10, max: 2000, step: 10 } },
    caseSensitive: { control: 'boolean', description: 'Whether the quick filter matches case.' },
    quickFilter: { control: 'text', description: 'Initial quick-filter value. Type into the live input to change it after mount.' },
    initialDepartmentFilter: {
      control: { type: 'inline-radio' },
      options: ['', 'Engineering', 'Design', 'Product', 'Sales'],
      description: 'Optional per-column filter applied via FilterModel at mount.',
    },
  },
  args: {
    rowCount: 200,
    caseSensitive: false,
    quickFilter: '',
    initialDepartmentFilter: '',
  },
  render: (args: Args) => {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '8px';

    const filterInput = document.createElement('input');
    filterInput.type = 'text';
    filterInput.placeholder = 'Quick filter across all columns…';
    filterInput.value = args.quickFilter;
    filterInput.style.padding = '8px 12px';
    filterInput.style.border = '1px solid #cbd5e1';
    filterInput.style.borderRadius = '6px';
    filterInput.style.font = 'inherit';
    wrapper.appendChild(filterInput);

    const gridContainer = mountGridStory<Employee>({
      config: {
        columns: [
          { field: 'id', headerName: 'ID', width: 70, filterable: true },
          { field: 'name', headerName: 'Name', width: 180, sortable: true, filterable: true },
          { field: 'role', headerName: 'Role', width: 160, sortable: true, filterable: true },
          { field: 'department', headerName: 'Department', width: 160, sortable: true, filterable: true },
          { field: 'city', headerName: 'City', width: 140, filterable: true },
          { field: 'salary', headerName: 'Salary', width: 130, sortable: true, valueFormatter: formatCurrency },
        ],
        rowData: makeEmployees(args.rowCount),
        plugins: [SortingPlugin(), FilteringPlugin({ caseSensitive: args.caseSensitive })],
      },
      height: '420px',
      onReady: (engine) => {
        if (args.quickFilter) engine.api.setQuickFilter(args.quickFilter);
        if (args.initialDepartmentFilter) {
          engine.api.setFilterModel({
            department: { filterType: 'text', type: 'equals', filter: args.initialDepartmentFilter },
          });
        }
        filterInput.addEventListener('input', () => {
          engine.api.setQuickFilter(filterInput.value);
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

export const CaseSensitive: Story = {
  name: 'Case-sensitive quick filter',
  args: { caseSensitive: true, quickFilter: 'Alice' },
  parameters: {
    docs: { description: { story: 'With case sensitivity on, "Alice" matches but "alice" does not.' } },
  },
};

export const PrefilteredByDepartment: Story = {
  name: 'FilterModel applied at startup',
  args: { initialDepartmentFilter: 'Engineering' },
  parameters: {
    docs: { description: { story: 'Demonstrates programmatic filter via `api.setFilterModel()` — applied before the grid renders.' } },
  },
};
