// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Selection story. Click rows, Ctrl+Click to toggle, Shift+Click for range.
// The selected count live-updates above the grid so you can watch the
// SelectionPlugin's events fire as you interact.

import type { Meta, StoryObj } from '@storybook/html';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { SelectionPlugin } from '@gridstorm/plugin-selection';
import { makeEmployees, mountGridStory, formatCurrency, type Employee } from './_helpers';

interface Args {
  rowCount: number;
  mode: 'single' | 'multiple';
}

const meta: Meta<Args> = {
  title: '2 · Plugins/Selection',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Click any row to select. **Ctrl+Click** toggles a row in/out of ' +
          'the selection. **Shift+Click** selects a contiguous range. The ' +
          'count above the grid is bound to `selection:changed` events from ' +
          "the engine — watch it update as you click. The selection is " +
          "tracked by row ID, so it survives sorting (click a column header " +
          'after selecting to verify).',
      },
    },
  },
  argTypes: {
    rowCount: { control: { type: 'range', min: 10, max: 1000, step: 10 } },
    mode: { control: { type: 'inline-radio' }, options: ['single', 'multiple'] },
  },
  args: { rowCount: 100, mode: 'multiple' },
  render: (args: Args) => {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '8px';

    const status = document.createElement('div');
    status.style.padding = '8px 12px';
    status.style.background = '#f1f5f9';
    status.style.borderRadius = '6px';
    status.style.font = 'inherit';
    status.textContent = 'Selected rows: 0';
    wrapper.appendChild(status);

    const gridContainer = mountGridStory<Employee>({
      config: {
        columns: [
          { field: 'id', headerName: 'ID', width: 70 },
          { field: 'name', headerName: 'Name', width: 180, sortable: true },
          { field: 'role', headerName: 'Role', width: 160, sortable: true },
          { field: 'department', headerName: 'Department', width: 160, sortable: true },
          { field: 'salary', headerName: 'Salary', width: 130, sortable: true, valueFormatter: formatCurrency },
        ],
        rowData: makeEmployees(args.rowCount),
        getRowId: ({ data }) => String((data as Employee).id),
        rowSelection: args.mode,
        plugins: [SortingPlugin(), SelectionPlugin({ mode: args.mode })],
      },
      height: '420px',
      onReady: (engine) => {
        engine.eventBus.on('selection:changed' as never, () => {
          const ids = engine.api.getSelectedNodes().map((n) => n.id);
          status.textContent =
            ids.length === 0
              ? 'Selected rows: 0 — click a row to select it'
              : `Selected rows: ${ids.length} · ids: ${ids.slice(0, 8).join(', ')}${ids.length > 8 ? '…' : ''}`;
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

export const SingleSelectOnly: Story = {
  name: 'Single-select mode',
  args: { mode: 'single' },
  parameters: {
    docs: { description: { story: 'Only one row can be selected at a time. Clicking a new row replaces the previous selection.' } },
  },
};

export const SelectionSurvivesSort: Story = {
  name: 'Selection survives sort',
  args: { rowCount: 30 },
  parameters: {
    docs: {
      description: {
        story:
          'Select a few rows by name, then click the Salary header to sort. ' +
          'The same rows stay selected — selection tracks row IDs, not ' +
          'display index. (This is the cross-plugin invariant exercised by the e2e suite.)',
      },
    },
  },
};
