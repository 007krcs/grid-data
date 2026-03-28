<h1 align="center">
  <br>
  <strong>GridStorm</strong>
  <br>
  <sub>The Enterprise Document Platform</sub>
</h1>

<p align="center">
  Data grids &bull; PDF toolkit &bull; AI-powered document intelligence<br>
  One platform, one license, one API pattern.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/packages-39-blue" alt="39 packages" />
  <img src="https://img.shields.io/badge/tests-1,084+-green" alt="1084+ tests" />
  <img src="https://img.shields.io/badge/bundle-<50KB-orange" alt="<50KB core" />
  <img src="https://img.shields.io/badge/license-MIT-purple" alt="MIT license" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-blue" alt="TypeScript 5.9" />
</p>

---

## Overview

GridStorm is a modular, TypeScript-native platform for building enterprise data applications. It combines a high-performance data grid, a full-featured PDF toolkit, and AI-powered document intelligence into a single coherent ecosystem with shared architecture patterns.

## Key Features

- **Virtual Scrolling** — Render 100K+ rows at 60fps. Only visible rows exist in the DOM.
- **Plugin Architecture** — 19+ composable plugins. Import only what you need.
- **CSS Theming** — Light, dark, and high-contrast themes. Runtime-switchable via CSS variables.
- **TypeScript Native** — Built with strict mode. Full type inference on column defs and event handlers.
- **PDF Toolkit** — Viewer, renderer, text extraction, annotations, redaction, and search.
- **AI & Intelligence** — PII detection, smart form fill, document classification, and MCP server integration.
- **Multi-Framework** — First-class adapters for React 18+, Vue 3, and Svelte 5. Headless core works anywhere.
- **< 50KB Core** — Tree-shakeable. Add sorting for 2KB, filtering for 4KB.

## Quick Start

```bash
npm install @gridstorm/core @gridstorm/dom-renderer @gridstorm/react @gridstorm/plugin-sorting @gridstorm/theme-default
```

```tsx
import { GridStorm } from '@gridstorm/react';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import '@gridstorm/theme-default/styles.css';

function App() {
  return (
    <GridStorm
      columns={[
        { field: 'name', headerName: 'Name', sortable: true },
        { field: 'age', headerName: 'Age', width: 100 },
        { field: 'email', headerName: 'Email', flex: 1 },
      ]}
      rowData={[
        { name: 'Alice', age: 32, email: 'alice@example.com' },
        { name: 'Bob', age: 28, email: 'bob@example.com' },
      ]}
      plugins={[SortingPlugin()]}
      height={400}
    />
  );
}
```

## Packages (39)

### Core

| Package | Description |
|---------|-------------|
| `@gridstorm/core` | Pure TypeScript engine: types, store, event bus, command bus, plugin manager |
| `@gridstorm/dom-renderer` | Virtual scroll, row/cell rendering, scroll sync, keyboard navigation |
| `@gridstorm/theme-default` | CSS custom properties, light/dark/high-contrast themes, density modes |
| `@gridstorm/license` | License validation and watermark utilities |

### Framework Adapters

| Package | Description |
|---------|-------------|
| `@gridstorm/react` | React 18+ wrapper with hooks, error boundary, portals |
| `@gridstorm/vue` | Vue 3 adapter with composables |
| `@gridstorm/svelte` | Svelte 5 adapter with runes and actions |
| `@gridstorm/angular` | Angular adapter (planned) |

### Grid Plugins

| Package | Description |
|---------|-------------|
| `@gridstorm/plugin-sorting` | Multi-column sort with custom comparators |
| `@gridstorm/plugin-filtering` | Per-column filters, quick filter, 13 operators |
| `@gridstorm/plugin-selection` | Single, multi, checkbox selection modes |
| `@gridstorm/plugin-editing` | Text, number, select editors with undo |
| `@gridstorm/plugin-pagination` | Configurable page sizes with navigation |
| `@gridstorm/plugin-column-resize` | Drag-to-resize with min/max constraints |
| `@gridstorm/plugin-column-pinning` | Pin columns left or right |
| `@gridstorm/plugin-column-reorder` | Drag-and-drop column reorder |
| `@gridstorm/plugin-row-reorder` | Drag-and-drop row reorder |
| `@gridstorm/plugin-grouping` | Multi-level row grouping with expand/collapse |
| `@gridstorm/plugin-aggregation` | Sum, avg, min, max, count aggregation |
| `@gridstorm/plugin-context-menu` | Right-click context menus |
| `@gridstorm/plugin-clipboard` | Copy/paste with keyboard shortcuts |
| `@gridstorm/plugin-pivoting` | Pivot table transformation |
| `@gridstorm/plugin-excel-export` | CSV and Excel XML export |
| `@gridstorm/plugin-pdf-export` | PDF generation from grid data |
| `@gridstorm/plugin-sparklines` | SVG sparkline cell renderers (line, bar, area, win-loss) |
| `@gridstorm/plugin-charts` | SVG chart engine (bar, line, pie, scatter) |
| `@gridstorm/plugin-ssrm` | Server-side row model |
| `@gridstorm/plugin-master-detail` | Master-detail row expansion |
| `@gridstorm/plugin-tree-data` | Hierarchical tree data display |

### PDF Toolkit

| Package | Description |
|---------|-------------|
| `@gridstorm/pdf-core` | PDF engine, document model, page management |
| `@gridstorm/pdf-renderer` | Canvas/DOM renderer, viewport, toolbar |
| `@gridstorm/pdf-plugin-text` | Text extraction, search, and selection |
| `@gridstorm/pdf-theme` | PDF viewer theming with CSS variables |

### AI & Intelligence

| Package | Description |
|---------|-------------|
| `@gridstorm/pdf-plugin-pii` | PII detection and auto-redaction |
| `@gridstorm/pdf-plugin-form-fill` | Smart form field detection and completion |
| `@gridstorm/pdf-plugin-intelligence` | Document classification, extraction, summarization |
| `@gridstorm/mcp-server` | MCP tool definitions for Claude/LLM integration |

### Utilities

| Package | Description |
|---------|-------------|
| `@gridstorm/codemod` | Automated migration tools |
| `@gridstorm/i18n` | Internationalization support |

## Demo Applications

| Demo | Description |
|------|-------------|
| **Feature Showcase** | Interactive gallery of all 20 GridStorm features |
| **Playground** | Monaco editor with live grid preview |
| **PDF Viewer** | Full PDF viewer with annotations and search |
| **Financial Trading** | Real-time stock ticker with live updates |
| **Analytics Explorer** | Large-dataset analytics with grouping and aggregation |
| **Spreadsheet** | Excel-like spreadsheet with editing and clipboard |
| **React Demo** | Standard React integration example |

## Architecture

```
                          ┌──────────────────────┐
                          │   Framework Adapters │
                          │  React · Vue · Svelte│
                          └──────────┬───────────┘
                                     │
                          ┌──────────▼────────────┐
                          │    DOM Renderer       │
                          │  Virtual scroll, ARIA │
                          └──────────┬────────────┘
                                     │
┌────────────────┐       ┌───────────▼────────────┐       ┌────────────────┐
│   19+ Plugins  │◄──────│    Core Engine         │──────►│  PDF Toolkit   │
│  Sort, Filter, │       │  Store · EventBus ·    │       │  Core · Render │
│  Edit, Group,  │       │  CommandBus · Plugins  │       │  Text · Theme  │
│  Pivot, Export │       └────────────────────────┘       │  AI Plugins    │
└────────────────┘                                        └────────────────┘
```

**Key decisions:**
- DOM-based rendering (not Canvas) for accessibility and CSS theming
- Headless core with thin framework adapters
- Commands are the only way to mutate state (unidirectional data flow)
- Plugin system with topological dependency resolution

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full deep-dive design document.

## Development

```bash
# Clone and install
git clone https://github.com/007krcs/grid-data.git
cd grid-data
pnpm install

# Build all packages
pnpm build

# Run tests (1,084 tests across 52 files)
npx vitest run

# Start a demo app
cd examples/feature-showcase
npm run dev
```

### Project Structure

```
grid-data/
  packages/           # 39 packages (core, plugins, adapters, PDF, AI)
  examples/           # 7 demo apps + hub page
  docs/               # 30+ documentation pages (Astro/Starlight)
  ARCHITECTURE.md     # Full architecture design document
```

## Stats

- **39** packages in pnpm monorepo
- **1,084** tests across 52 test files
- **< 50KB** core bundle (tree-shakeable)
- **100K+** rows at 60fps with virtual scrolling
- **TypeScript 5.9** with strict mode
- **Zero** external UI dependencies in core

## License

MIT

## Contributing

Contributions are welcome! Please read the architecture guide in [ARCHITECTURE.md](./ARCHITECTURE.md) before submitting PRs. Key guidelines:

- Follow the existing plugin pattern for new plugins
- Add tests for all new functionality
- Use TypeScript strict mode (prefix unused params with underscore)
- Run `npx vitest run` before submitting

---

<p align="center">
  Built with TypeScript, React, Vite, and pnpm<br>
  <sub>&copy; 2026 GridStorm</sub>
</p>
