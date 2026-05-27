// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Conditional formatting story. Rules drive style or class application on
// matching cells. The Controls panel exposes the most useful rule types so
// visitors can flip a "salary > X" or "color scale on rating" rule on/off
// and immediately see the rendered grid update.

import type { Meta, StoryObj } from '@storybook/html';
import { ConditionalFormattingPlugin, type FormattingRule } from '@gridstorm/plugin-conditional-formatting';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { makeEmployees, mountGridStory, formatCurrency, type Employee } from './_helpers';

interface Args {
  rowCount: number;
  highlightHighSalary: boolean;
  highSalaryThreshold: number;
  colorScaleRating: boolean;
  dataBarSalary: boolean;
  iconSetRating: boolean;
  duplicateCity: boolean;
}

const meta: Meta<Args> = {
  title: '5 · Enterprise Features/Conditional Formatting',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Rules apply style or CSS classes to cells that match a condition. ' +
          'Toggle each rule from the Controls panel:\n\n' +
          '• **Highlight high salary** — `greaterThan` condition with bg color.\n' +
          '• **Color scale on rating** — interpolated red→green gradient.\n' +
          '• **Data bar on salary** — inline horizontal bar sized to value.\n' +
          '• **Icon set on rating** — 🔴 🟡 🟢 by threshold.\n' +
          '• **Duplicate city detector** — every duplicate value gets a tint.',
      },
    },
  },
  argTypes: {
    rowCount: { control: { type: 'range', min: 20, max: 500, step: 10 } },
    highlightHighSalary: { control: 'boolean' },
    highSalaryThreshold: { control: { type: 'range', min: 50_000, max: 250_000, step: 5_000 } },
    colorScaleRating: { control: 'boolean' },
    dataBarSalary: { control: 'boolean' },
    iconSetRating: { control: 'boolean' },
    duplicateCity: { control: 'boolean' },
  },
  args: {
    rowCount: 60,
    highlightHighSalary: true,
    highSalaryThreshold: 150_000,
    colorScaleRating: true,
    dataBarSalary: false,
    iconSetRating: false,
    duplicateCity: false,
  },
  render: (args: Args) => {
    const rules: FormattingRule[] = [];
    if (args.highlightHighSalary) {
      rules.push({
        id: 'high-salary',
        columns: ['salary'],
        condition: { type: 'greaterThan', value: args.highSalaryThreshold },
        style: { backgroundColor: '#fef3c7', fontWeight: '600', color: '#92400e' },
      });
    }
    if (args.colorScaleRating) {
      rules.push({
        id: 'rating-scale',
        columns: ['rating'],
        condition: { type: 'colorScale', min: 1, max: 5, minColor: '#fee2e2', maxColor: '#bbf7d0' },
        style: {},
      });
    }
    if (args.dataBarSalary) {
      rules.push({
        id: 'salary-bar',
        columns: ['salary'],
        condition: { type: 'dataBar', min: 50_000, max: 250_000, color: '#93c5fd' },
        style: {},
      });
    }
    if (args.iconSetRating) {
      rules.push({
        id: 'rating-icons',
        columns: ['rating'],
        condition: { type: 'iconSet', thresholds: [2, 3.5], icons: ['🔴', '🟡', '🟢'] },
        style: {},
      });
    }
    if (args.duplicateCity) {
      rules.push({
        id: 'city-dupes',
        columns: ['city'],
        condition: { type: 'duplicates' },
        style: { backgroundColor: '#dbeafe', fontStyle: 'italic' },
      });
    }

    return mountGridStory<Employee>({
      config: {
        columns: [
          { field: 'name', headerName: 'Name', width: 180, sortable: true },
          { field: 'department', headerName: 'Department', width: 160, sortable: true },
          { field: 'city', headerName: 'City', width: 140, sortable: true },
          { field: 'salary', headerName: 'Salary', width: 150, sortable: true, valueFormatter: formatCurrency },
          { field: 'rating', headerName: 'Rating', width: 110, sortable: true },
        ],
        rowData: makeEmployees(args.rowCount),
        plugins: [SortingPlugin(), ConditionalFormattingPlugin({ rules })],
      },
      height: '460px',
    });
  },
};

export default meta;
type Story = StoryObj<Args>;

export const Playground: Story = {};

export const DataBars: Story = {
  name: 'Data bars (Salary)',
  args: {
    highlightHighSalary: false,
    colorScaleRating: false,
    dataBarSalary: true,
  },
  parameters: {
    docs: { description: { story: 'Inline horizontal bars sized proportionally to the salary value.' } },
  },
};

export const IconSet: Story = {
  name: 'Icon set (Rating)',
  args: {
    highlightHighSalary: false,
    colorScaleRating: false,
    iconSetRating: true,
  },
  parameters: {
    docs: { description: { story: '🔴 below 2.0, 🟡 between 2.0 and 3.5, 🟢 above 3.5.' } },
  },
};
