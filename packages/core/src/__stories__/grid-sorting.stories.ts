import type { Meta, StoryObj } from '@storybook/html';
import { createGrid } from '@gridstorm/core';
import { DomRenderer } from '@gridstorm/dom-renderer';
import { SortingPlugin } from '@gridstorm/plugin-sorting';

interface Product {
  name: string;
  category: string;
  price: number;
  stock: number;
}

const sampleData: Product[] = [
  { name: 'Laptop Pro', category: 'Electronics', price: 1299, stock: 45 },
  { name: 'Wireless Mouse', category: 'Accessories', price: 29, stock: 200 },
  { name: 'Standing Desk', category: 'Furniture', price: 549, stock: 30 },
  { name: 'Monitor 27"', category: 'Electronics', price: 399, stock: 80 },
  { name: 'Keyboard', category: 'Accessories', price: 79, stock: 150 },
  { name: 'Desk Lamp', category: 'Furniture', price: 45, stock: 120 },
  { name: 'USB Hub', category: 'Accessories', price: 35, stock: 300 },
  { name: 'Webcam HD', category: 'Electronics', price: 89, stock: 95 },
  { name: 'Office Chair', category: 'Furniture', price: 450, stock: 25 },
  { name: 'Tablet Stand', category: 'Accessories', price: 25, stock: 180 },
  { name: 'Headphones', category: 'Electronics', price: 199, stock: 60 },
  { name: 'Cable Organizer', category: 'Accessories', price: 15, stock: 500 },
];

const meta: Meta = {
  title: 'GridStorm/Sorting',
  render: () => {
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';

    const hint = document.createElement('p');
    hint.textContent = 'Click column headers to sort. Click again to toggle sort direction.';
    hint.style.margin = '8px 12px';
    hint.style.fontSize = '14px';
    hint.style.color = '#666';
    wrapper.appendChild(hint);

    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '400px';
    wrapper.appendChild(container);

    const engine = createGrid<Product>({
      columns: [
        { field: 'name', headerName: 'Product', width: 200, sortable: true },
        { field: 'category', headerName: 'Category', width: 150, sortable: true },
        {
          field: 'price',
          headerName: 'Price',
          width: 120,
          sortable: true,
          valueFormatter: ({ value }) => `$${Number(value).toFixed(2)}`,
        },
        { field: 'stock', headerName: 'In Stock', width: 120, sortable: true },
      ],
      rowData: sampleData,
      plugins: [new SortingPlugin()],
    });

    const renderer = new DomRenderer({
      container,
      engine,
    });

    requestAnimationFrame(() => {
      renderer.mount();
    });

    const observer = new MutationObserver(() => {
      if (!document.body.contains(wrapper)) {
        renderer.destroy();
        engine.destroy();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return wrapper;
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const PreSortedByPrice: Story = {
  render: () => {
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';

    const hint = document.createElement('p');
    hint.textContent = 'Grid is pre-sorted by Price (ascending). Click headers to change sorting.';
    hint.style.margin = '8px 12px';
    hint.style.fontSize = '14px';
    hint.style.color = '#666';
    wrapper.appendChild(hint);

    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '400px';
    wrapper.appendChild(container);

    const engine = createGrid<Product>({
      columns: [
        { field: 'name', headerName: 'Product', width: 200, sortable: true },
        { field: 'category', headerName: 'Category', width: 150, sortable: true },
        {
          field: 'price',
          headerName: 'Price',
          width: 120,
          sortable: true,
          sort: 'asc',
          valueFormatter: ({ value }) => `$${Number(value).toFixed(2)}`,
        },
        { field: 'stock', headerName: 'In Stock', width: 120, sortable: true },
      ],
      rowData: sampleData,
      plugins: [new SortingPlugin()],
    });

    const renderer = new DomRenderer({
      container,
      engine,
    });

    requestAnimationFrame(() => {
      renderer.mount();
    });

    const observer = new MutationObserver(() => {
      if (!document.body.contains(wrapper)) {
        renderer.destroy();
        engine.destroy();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return wrapper;
  },
};
