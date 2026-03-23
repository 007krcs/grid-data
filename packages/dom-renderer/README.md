# @gridstorm/dom-renderer

DOM-based renderer for GridStorm with virtual scrolling, row/cell rendering, and scroll sync.

## Install

```bash
npm install @gridstorm/dom-renderer @gridstorm/core
```

## Usage

```typescript
import { createGridEngine } from '@gridstorm/core';
import { DomRenderer } from '@gridstorm/dom-renderer';

const engine = createGridEngine({
  columnDefs: [{ field: 'name' }, { field: 'email' }],
  rowData: myData,
  plugins: [],
});

const renderer = new DomRenderer(engine, document.getElementById('grid')!);
renderer.mount();
```

## Features

- Virtual scrolling for 100K+ rows
- Row and cell DOM recycling
- Scroll synchronization between header and body
- Keyboard navigation support
- ARIA grid roles for accessibility

## Documentation

[Full API Reference](https://grid-data-analytics-explorer.vercel.app//api/dom-renderer) | [Virtual Scrolling Guide](https://grid-data-analytics-explorer.vercel.app//docs/virtual-scroll)

## License

MIT
