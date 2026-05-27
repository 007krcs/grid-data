// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Editing story. Double-click an editable cell or press F2/Enter while it's
// focused. The activity log under the grid records every `cell:valueChanged`
// event so you can see the edit pipeline fire.

import type { Meta, StoryObj } from '@storybook/html';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { EditingPlugin } from '@gridstorm/plugin-editing';
import { makeEmployees, mountGridStory, formatCurrency, type Employee } from './_helpers';

interface Args {
  rowCount: number;
  editType: 'single-click' | 'double-click';
  stopOnBlur: boolean;
}

const meta: Meta<Args> = {
  title: '2 · Plugins/Editing',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Inline cell editing. Click into an editable cell (or double-click ' +
          'depending on `editType`), type, press Enter or Tab to commit, ' +
          'Escape to cancel. The log under the grid records every ' +
          '`cell:valueChanged` event with old + new values so you can verify ' +
          'the edit pipeline fired correctly.',
      },
    },
  },
  argTypes: {
    rowCount: { control: { type: 'range', min: 5, max: 200, step: 5 } },
    editType: { control: { type: 'inline-radio' }, options: ['single-click', 'double-click'] },
    stopOnBlur: { control: 'boolean' },
  },
  args: { rowCount: 30, editType: 'double-click', stopOnBlur: true },
  render: (args: Args) => {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '8px';

    const log = document.createElement('div');
    log.style.padding = '8px 12px';
    log.style.background = '#fafafa';
    log.style.border = '1px solid #e5e7eb';
    log.style.borderRadius = '6px';
    log.style.font = '12px ui-monospace, SFMono-Regular, monospace';
    log.style.maxHeight = '120px';
    log.style.overflow = 'auto';
    log.textContent = 'Edit a cell — events will appear here.';

    const gridContainer = mountGridStory<Employee>({
      config: {
        columns: [
          { field: 'id', headerName: 'ID', width: 70 },
          { field: 'name', headerName: 'Name', width: 180, editable: true },
          { field: 'role', headerName: 'Role', width: 160, editable: true },
          { field: 'department', headerName: 'Department', width: 160, editable: true },
          { field: 'salary', headerName: 'Salary', width: 130, editable: true, valueFormatter: formatCurrency },
          { field: 'rating', headerName: 'Rating', width: 100, editable: true },
        ],
        rowData: makeEmployees(args.rowCount),
        getRowId: ({ data }) => String((data as Employee).id),
        plugins: [
          SortingPlugin(),
          EditingPlugin({ editType: args.editType, stopEditingWhenCellsLoseFocus: args.stopOnBlur }),
        ],
      },
      height: '380px',
      onReady: (engine) => {
        engine.eventBus.on('cell:valueChanged' as never, (e: any) => {
          const stamp = new Date().toLocaleTimeString();
          const line = document.createElement('div');
          line.textContent = `[${stamp}] ${e.colId} on row ${e.node?.id}: ${JSON.stringify(e.oldValue)} → ${JSON.stringify(e.newValue)}`;
          if (log.textContent?.startsWith('Edit a cell')) log.textContent = '';
          log.prepend(line);
        });
      },
    });
    wrapper.appendChild(gridContainer);
    wrapper.appendChild(log);
    return wrapper;
  },
};

export default meta;
type Story = StoryObj<Args>;

export const Playground: Story = {};

export const SingleClickToEdit: Story = {
  name: 'Single-click to edit',
  args: { editType: 'single-click' },
  parameters: {
    docs: { description: { story: 'A single click puts the cell in edit mode — useful for spreadsheet-like fast entry.' } },
  },
};
