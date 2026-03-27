import type { Meta, StoryObj } from '@storybook/html';
import { createGrid } from '@gridstorm/core';
import { DomRenderer } from '@gridstorm/dom-renderer';

interface City {
  name: string;
  country: string;
  population: number;
}

const sampleData: City[] = [
  { name: 'Tokyo', country: 'Japan', population: 13960000 },
  { name: 'Delhi', country: 'India', population: 11030000 },
  { name: 'Shanghai', country: 'China', population: 24870000 },
  { name: 'Sao Paulo', country: 'Brazil', population: 12330000 },
  { name: 'Mexico City', country: 'Mexico', population: 9210000 },
  { name: 'Cairo', country: 'Egypt', population: 10230000 },
  { name: 'Mumbai', country: 'India', population: 12480000 },
  { name: 'Beijing', country: 'China', population: 21540000 },
  { name: 'Osaka', country: 'Japan', population: 2750000 },
  { name: 'New York', country: 'USA', population: 8340000 },
];

function createThemeButton(label: string, theme: string, renderer: DomRenderer): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = label;
  button.style.padding = '6px 16px';
  button.style.marginRight = '8px';
  button.style.border = '1px solid #ccc';
  button.style.borderRadius = '4px';
  button.style.cursor = 'pointer';
  button.style.fontSize = '13px';
  button.style.background = '#fff';
  button.addEventListener('click', () => {
    renderer.setTheme(theme);
  });
  return button;
}

const meta: Meta = {
  title: 'GridStorm/Themes',
  render: () => {
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';

    // Toolbar with theme buttons
    const toolbar = document.createElement('div');
    toolbar.style.padding = '12px';
    toolbar.style.display = 'flex';
    toolbar.style.alignItems = 'center';
    toolbar.style.gap = '4px';

    const label = document.createElement('span');
    label.textContent = 'Theme: ';
    label.style.fontSize = '14px';
    label.style.fontWeight = '600';
    label.style.marginRight = '8px';
    toolbar.appendChild(label);

    wrapper.appendChild(toolbar);

    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '400px';
    wrapper.appendChild(container);

    const engine = createGrid<City>({
      columns: [
        { field: 'name', headerName: 'City', width: 180 },
        { field: 'country', headerName: 'Country', width: 150 },
        {
          field: 'population',
          headerName: 'Population',
          width: 160,
          valueFormatter: ({ value }) => Number(value).toLocaleString(),
        },
      ],
      rowData: sampleData,
    });

    const renderer = new DomRenderer({
      container,
      engine,
    });

    // Add theme-switching buttons after renderer is created
    toolbar.appendChild(createThemeButton('Light', 'light', renderer));
    toolbar.appendChild(createThemeButton('Dark', 'dark', renderer));
    toolbar.appendChild(createThemeButton('High Contrast', 'high-contrast', renderer));

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

export const DarkTheme: Story = {
  render: () => {
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';

    const toolbar = document.createElement('div');
    toolbar.style.padding = '12px';
    toolbar.style.display = 'flex';
    toolbar.style.alignItems = 'center';
    toolbar.style.gap = '4px';

    const label = document.createElement('span');
    label.textContent = 'Theme: ';
    label.style.fontSize = '14px';
    label.style.fontWeight = '600';
    label.style.marginRight = '8px';
    toolbar.appendChild(label);

    wrapper.appendChild(toolbar);

    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '400px';
    wrapper.appendChild(container);

    const engine = createGrid<City>({
      columns: [
        { field: 'name', headerName: 'City', width: 180 },
        { field: 'country', headerName: 'Country', width: 150 },
        {
          field: 'population',
          headerName: 'Population',
          width: 160,
          valueFormatter: ({ value }) => Number(value).toLocaleString(),
        },
      ],
      rowData: sampleData,
    });

    const renderer = new DomRenderer({
      container,
      engine,
    });

    toolbar.appendChild(createThemeButton('Light', 'light', renderer));
    toolbar.appendChild(createThemeButton('Dark', 'dark', renderer));
    toolbar.appendChild(createThemeButton('High Contrast', 'high-contrast', renderer));

    requestAnimationFrame(() => {
      renderer.mount();
      // Start with dark theme
      renderer.setTheme('dark');
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

export const HighContrastTheme: Story = {
  render: () => {
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';

    const toolbar = document.createElement('div');
    toolbar.style.padding = '12px';
    toolbar.style.display = 'flex';
    toolbar.style.alignItems = 'center';
    toolbar.style.gap = '4px';

    const label = document.createElement('span');
    label.textContent = 'Theme: ';
    label.style.fontSize = '14px';
    label.style.fontWeight = '600';
    label.style.marginRight = '8px';
    toolbar.appendChild(label);

    wrapper.appendChild(toolbar);

    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '400px';
    wrapper.appendChild(container);

    const engine = createGrid<City>({
      columns: [
        { field: 'name', headerName: 'City', width: 180 },
        { field: 'country', headerName: 'Country', width: 150 },
        {
          field: 'population',
          headerName: 'Population',
          width: 160,
          valueFormatter: ({ value }) => Number(value).toLocaleString(),
        },
      ],
      rowData: sampleData,
    });

    const renderer = new DomRenderer({
      container,
      engine,
    });

    toolbar.appendChild(createThemeButton('Light', 'light', renderer));
    toolbar.appendChild(createThemeButton('Dark', 'dark', renderer));
    toolbar.appendChild(createThemeButton('High Contrast', 'high-contrast', renderer));

    requestAnimationFrame(() => {
      renderer.mount();
      // Start with high-contrast theme
      renderer.setTheme('high-contrast');
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
