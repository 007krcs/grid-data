<p align="center">
  <h1 align="center">GridStorm</h1>
  <p align="center"><strong>The modern, plugin-first data grid platform for the web</strong></p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@gridstorm/core"><img src="https://img.shields.io/npm/v/@gridstorm/core?color=blue&label=npm" alt="npm version" /></a>
  <a href="https://github.com/gridstorm/gridstorm/actions"><img src="https://img.shields.io/badge/tests-614%20passing-brightgreen" alt="tests passing" /></a>
  <a href="https://github.com/gridstorm/gridstorm/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" /></a>
  <a href="https://bundlephobia.com/package/@gridstorm/core"><img src="https://img.shields.io/badge/bundle-~35KB%20gzip-orange" alt="bundle size" /></a>
</p>

---

GridStorm is a headless, framework-agnostic data grid engine built from the ground up with a plugin-first architecture. Pay only for the features you use. Ship smaller bundles. Build enterprise-grade grids with full TypeScript support, virtual scrolling, ARIA accessibility, and runtime-switchable themes.

## Quick Start

```bash
npm install @gridstorm/core @gridstorm/dom-renderer @gridstorm/react @gridstorm/theme-default
```

```tsx
import { GridStorm } from '@gridstorm/react';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import '@gridstorm/theme-default';

const columns = [
  { field: 'name', headerName: 'Name' },
  { field: 'age', headerName: 'Age', type: 'number' },
  { field: 'email', headerName: 'Email' },
];

const rows = [
  { id: 1, name: 'Alice', age: 32, email: 'alice@example.com' },
  { id: 2, name: 'Bob', age: 28, email: 'bob@example.com' },
  { id: 3, name: 'Charlie', age: 45, email: 'charlie@example.com' },
];

export default function App() {
  return (
    <GridStorm
      rowData={rows}
      columnDefs={columns}
      plugins={[SortingPlugin(), FilteringPlugin()]}
      height={400}
    />
  );
}
```

## Features

- **Headless Core** -- Framework-agnostic engine with pure TypeScript state management, event bus, and command system
- **Plugin Architecture** -- Install only what you need; plugins declare dependencies and are resolved topologically
- **Virtual Scrolling** -- Renders only visible rows for smooth performance with 100K+ rows
- **ARIA Accessible** -- Full keyboard navigation, screen reader support, and WAI-ARIA grid roles out of the box
- **Runtime Themes** -- CSS custom properties for light, dark, and high-contrast modes with three density levels
- **React Adapter** -- First-class React 18+ support with hooks, error boundaries, and portal-based overlays
- **TypeScript First** -- Strict mode, full type inference, and zero `any` in the public API
- **Tiny Bundle** -- Core + DOM renderer under 35KB gzipped; add plugins incrementally
- **Enterprise Ready** -- Grouping, aggregation, pivoting, tree data, server-side row model, and clipboard

## Packages

### Core

| Package | Description | Status |
|---------|-------------|--------|
| [`@gridstorm/core`](./packages/core) | Headless engine: types, store, event/command bus, plugin manager, grid engine | Stable |
| [`@gridstorm/dom-renderer`](./packages/dom-renderer) | DOM renderer with virtual scrolling, row/cell rendering, scroll sync | Stable |
| [`@gridstorm/react`](./packages/react-adapter) | React 18+ adapter with hooks, error boundary, portals | Stable |
| [`@gridstorm/theme-default`](./packages/theme-default) | CSS custom properties theme: light, dark, high-contrast, 3 densities | Stable |

### Community Plugins (MIT)

| Package | Description | Status |
|---------|-------------|--------|
| [`@gridstorm/plugin-sorting`](./packages/plugin-sorting) | Single and multi-column sorting | Stable |
| [`@gridstorm/plugin-filtering`](./packages/plugin-filtering) | Column filters, quick filter, compound conditions | Stable |
| [`@gridstorm/plugin-selection`](./packages/plugin-selection) | Row, cell, and range selection | Stable |
| [`@gridstorm/plugin-editing`](./packages/plugin-editing) | Cell and full-row editing with built-in editors | Stable |
| [`@gridstorm/plugin-pagination`](./packages/plugin-pagination) | Client-side page navigation | Stable |
| [`@gridstorm/plugin-column-pinning`](./packages/plugin-column-pinning) | Pin columns to left or right | Stable |
| [`@gridstorm/plugin-column-resize`](./packages/plugin-column-resize) | Drag-to-resize with visual indicators | Stable |
| [`@gridstorm/plugin-column-reorder`](./packages/plugin-column-reorder) | Drag-and-drop column reordering | Stable |
| [`@gridstorm/plugin-context-menu`](./packages/plugin-context-menu) | Right-click menus for cells, rows, and headers | Stable |
| [`@gridstorm/plugin-grouping`](./packages/plugin-grouping) | Row grouping with expand/collapse | Stable |

### Enterprise Plugins (License Required)

| Package | Description | Status |
|---------|-------------|--------|
| [`@gridstorm/plugin-aggregation`](./packages/plugin-aggregation) | Aggregate values (sum, avg, min, max, count) for grouped rows | Stable |
| [`@gridstorm/plugin-pivoting`](./packages/plugin-pivoting) | Pivot row data into dynamic columns | Stable |
| [`@gridstorm/plugin-clipboard`](./packages/plugin-clipboard) | Copy, cut, paste with keyboard shortcuts | Stable |
| [`@gridstorm/plugin-tree-data`](./packages/plugin-tree-data) | Hierarchical parent-child row display | Stable |
| [`@gridstorm/plugin-ssrm`](./packages/plugin-ssrm) | Server-side row model with lazy loading and block caching | Stable |

### Tooling

| Package | Description | Status |
|---------|-------------|--------|
| [`@gridstorm/license`](./packages/license) | License key validation for enterprise plugins | Stable |
| [`@gridstorm/i18n`](./packages/i18n) | Internationalization and RTL support | Stable |
| [`@gridstorm/codemod`](./packages/codemod) | Codemod CLI to migrate from AG Grid to GridStorm | Stable |

## Documentation

- [Architecture Deep Dive](./ARCHITECTURE.md)
- [Full Documentation](https://gridstorm.dev/docs)
- [Live Demos](https://gridstorm.dev/demos)
- [Interactive Playground](https://gridstorm.dev/playground)
- [API Reference](https://gridstorm.dev/api)

## Enterprise

GridStorm follows an open-core model. The core engine, DOM renderer, framework adapters, and community plugins are free and MIT-licensed. Enterprise plugins (aggregation, pivoting, clipboard, tree data, server-side row model) require a commercial license.

- [View Enterprise Plans](https://gridstorm.dev/pricing)
- [Request a Trial Key](https://gridstorm.dev/trial)
- [Enterprise Documentation](https://gridstorm.dev/docs/enterprise)

## Contributing

We welcome contributions from the community. Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting a pull request.

## License

MIT -- see [LICENSE](./LICENSE) for details.

Copyright 2026 GridStorm Contributors.
