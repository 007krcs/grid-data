import type { Meta, StoryObj } from '@storybook/html';
import { createGrid } from '@gridstorm/core';
import { DomRenderer } from '@gridstorm/dom-renderer';

interface Employee {
  name: string;
  role: string;
  salary: number;
}

const sampleData: Employee[] = [
  { name: 'Alice Johnson', role: 'Engineer', salary: 120000 },
  { name: 'Bob Smith', role: 'Designer', salary: 95000 },
  { name: 'Carol Williams', role: 'Product Manager', salary: 130000 },
  { name: 'David Brown', role: 'Engineer', salary: 115000 },
  { name: 'Eve Davis', role: 'QA Lead', salary: 105000 },
  { name: 'Frank Miller', role: 'DevOps', salary: 125000 },
  { name: 'Grace Wilson', role: 'Designer', salary: 98000 },
  { name: 'Hank Moore', role: 'Engineer', salary: 118000 },
];

const meta: Meta = {
  title: 'GridStorm/BasicGrid',
  render: () => {
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '400px';

    const engine = createGrid<Employee>({
      columns: [
        { field: 'name', headerName: 'Name', width: 200 },
        { field: 'role', headerName: 'Role', width: 180 },
        {
          field: 'salary',
          headerName: 'Salary',
          width: 150,
          valueFormatter: ({ value }) => `$${Number(value).toLocaleString()}`,
        },
      ],
      rowData: sampleData,
    });

    const renderer = new DomRenderer({
      container,
      engine,
    });

    // Mount after the element is added to the DOM
    requestAnimationFrame(() => {
      renderer.mount();
    });

    // Clean up when Storybook removes the element
    const observer = new MutationObserver(() => {
      if (!document.body.contains(container)) {
        renderer.destroy();
        engine.destroy();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return container;
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const WithManyRows: Story = {
  render: () => {
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '400px';

    const manyRows: Employee[] = Array.from({ length: 200 }, (_, i) => ({
      name: `Employee ${i + 1}`,
      role: ['Engineer', 'Designer', 'Product Manager', 'QA Lead', 'DevOps'][i % 5],
      salary: 80000 + Math.floor(Math.random() * 70000),
    }));

    const engine = createGrid<Employee>({
      columns: [
        { field: 'name', headerName: 'Name', width: 200 },
        { field: 'role', headerName: 'Role', width: 180 },
        {
          field: 'salary',
          headerName: 'Salary',
          width: 150,
          valueFormatter: ({ value }) => `$${Number(value).toLocaleString()}`,
        },
      ],
      rowData: manyRows,
    });

    const renderer = new DomRenderer({
      container,
      engine,
    });

    requestAnimationFrame(() => {
      renderer.mount();
    });

    const observer = new MutationObserver(() => {
      if (!document.body.contains(container)) {
        renderer.destroy();
        engine.destroy();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return container;
  },
};
