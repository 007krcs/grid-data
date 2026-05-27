// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Kitchen-sink playground. Six plugins active simultaneously so you can feel
// how features interact: sort while a filter is applied, range-select after
// sort, edit a cell and watch sort order update, resize columns, etc.

import type { Meta, StoryObj } from '@storybook/html';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import { SelectionPlugin } from '@gridstorm/plugin-selection';
import { EditingPlugin } from '@gridstorm/plugin-editing';
import { ColumnResizePlugin } from '@gridstorm/plugin-column-resize';
import { ColumnPinningPlugin } from '@gridstorm/plugin-column-pinning';
import { makeEmployees, mountGridStory, formatCurrency, formatBool, type Employee } from './_helpers';

interface Args {
  rowCount: number;
  enableSorting: boolean;
  enableFiltering: boolean;
  enableSelection: boolean;
  enableEditing: boolean;
  enableColumnResize: boolean;
  pinIdColumn: boolean;
}

const meta: Meta<Args> = {
  title: '6 · Playground/Kitchen Sink',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'All the core plugins at once. Toggle each plugin off and on from ' +
          'the Controls panel to see how features compose. Try this sequence:\n\n' +
          '1. Type "engineering" in the quick filter.\n' +
          '2. Click the **Salary** column header to sort the filtered view.\n' +
          '3. Shift-click two rows to range-select.\n' +
          '4. Double-click a Name cell and edit it.\n' +
          '5. Drag the column borders to resize.\n\n' +
          'Toggle plugins off mid-interaction to confirm graceful degradation ' +
          '— the grid keeps working, the feature just goes away.',
      },
    },
  },
  argTypes: {
    rowCount: { control: { type: 'range', min: 20, max: 5000, step: 20 } },
    enableSorting: { control: 'boolean' },
    enableFiltering: { control: 'boolean' },
    enableSelection: { control: 'boolean' },
    enableEditing: { control: 'boolean' },
    enableColumnResize: { control: 'boolean' },
    pinIdColumn: { control: 'boolean' },
  },
  args: {
    rowCount: 500,
    enableSorting: true,
    enableFiltering: true,
    enableSelection: true,
    enableEditing: true,
    enableColumnResize: true,
    pinIdColumn: false,
  },
  render: (args: Args) => {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '8px';

    const statusBar = document.createElement('div');
    statusBar.style.display = 'flex';
    statusBar.style.gap = '12px';
    statusBar.style.padding = '8px 12px';
    statusBar.style.background = '#f8fafc';
    statusBar.style.border = '1px solid #e2e8f0';
    statusBar.style.borderRadius = '6px';
    statusBar.style.font = '12px ui-monospace, SFMono-Regular, monospace';

    const counts = document.createElement('span');
    const filterInput = document.createElement('input');
    filterInput.type = 'text';
    filterInput.placeholder = 'Quick filter…';
    filterInput.style.flex = '1';
    filterInput.style.padding = '4px 8px';
    filterInput.style.border = '1px solid #cbd5e1';
    filterInput.style.borderRadius = '4px';
    filterInput.style.font = 'inherit';

    statusBar.appendChild(counts);
    if (args.enableFiltering) statusBar.appendChild(filterInput);
    wrapper.appendChild(statusBar);

    const plugins = [];
    if (args.enableSorting) plugins.push(SortingPlugin());
    if (args.enableFiltering) plugins.push(FilteringPlugin({ caseSensitive: false }));
    if (args.enableSelection) plugins.push(SelectionPlugin({ mode: 'multiple' }));
    if (args.enableEditing) plugins.push(EditingPlugin({ editType: 'double-click' }));
    if (args.enableColumnResize) plugins.push(ColumnResizePlugin());
    if (args.pinIdColumn) plugins.push(ColumnPinningPlugin());

    const data = makeEmployees(args.rowCount);

    const gridContainer = mountGridStory<Employee>({
      config: {
        columns: [
          {
            field: 'id', headerName: 'ID', width: 80,
            sortable: args.enableSorting, filterable: args.enableFiltering,
            resizable: args.enableColumnResize,
            pinned: args.pinIdColumn ? 'left' : undefined,
          },
          { field: 'name', headerName: 'Name', width: 180, sortable: args.enableSorting, filterable: args.enableFiltering, editable: args.enableEditing, resizable: args.enableColumnResize },
          { field: 'role', headerName: 'Role', width: 160, sortable: args.enableSorting, filterable: args.enableFiltering, editable: args.enableEditing, resizable: args.enableColumnResize },
          { field: 'department', headerName: 'Department', width: 160, sortable: args.enableSorting, filterable: args.enableFiltering, editable: args.enableEditing, resizable: args.enableColumnResize },
          { field: 'city', headerName: 'City', width: 140, sortable: args.enableSorting, filterable: args.enableFiltering, resizable: args.enableColumnResize },
          { field: 'salary', headerName: 'Salary', width: 130, sortable: args.enableSorting, editable: args.enableEditing, resizable: args.enableColumnResize, valueFormatter: formatCurrency },
          { field: 'active', headerName: 'Active', width: 90, valueFormatter: formatBool },
          { field: 'rating', headerName: 'Rating', width: 100, sortable: args.enableSorting, editable: args.enableEditing },
        ],
        rowData: data,
        getRowId: ({ data: d }) => String((d as Employee).id),
        rowSelection: args.enableSelection ? 'multiple' : undefined,
        plugins,
      },
      height: '480px',
      onReady: (engine) => {
        const updateStatus = () => {
          const total = data.length;
          const visible = engine.api.getDisplayedRowCount();
          const selected = engine.api.getSelectedNodes().length;
          counts.textContent =
            `Total: ${total.toLocaleString()} · Visible: ${visible.toLocaleString()} · Selected: ${selected}`;
        };
        updateStatus();
        engine.eventBus.on('filter:changed' as never, updateStatus);
        engine.eventBus.on('selection:changed' as never, updateStatus);
        engine.eventBus.on('rowData:changed' as never, updateStatus);
        engine.eventBus.on('cell:valueChanged' as never, updateStatus);

        if (args.enableFiltering) {
          filterInput.addEventListener('input', () => {
            engine.api.setQuickFilter(filterInput.value);
          });
        }
      },
    });

    wrapper.appendChild(gridContainer);
    return wrapper;
  },
};

export default meta;
type Story = StoryObj<Args>;

export const Everything: Story = { name: 'Everything enabled' };

export const ReadOnlyView: Story = {
  name: 'Read-only (no edit, no selection)',
  args: { enableEditing: false, enableSelection: false },
  parameters: {
    docs: { description: { story: 'Sort and filter remain; cells can no longer be edited and rows cannot be selected.' } },
  },
};

export const PinnedIdColumn: Story = {
  name: 'Pinned ID column',
  args: { pinIdColumn: true },
  parameters: {
    docs: { description: { story: 'The ID column stays fixed on the left while you scroll horizontally.' } },
  },
};
