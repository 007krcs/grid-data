---
title: Installation
description: Install GridStorm packages and configure your project for TypeScript and CSS theming.
---

GridStorm is distributed as a set of scoped npm packages. Install only the packages your project needs.

## Package Overview

| Package | Purpose | Required? |
|---|---|---|
| `@gridstorm/core` | Headless engine: types, store, event/command bus, plugin manager, grid engine | Yes |
| `@gridstorm/dom-renderer` | Virtual scrolling, row/cell DOM rendering, scroll sync, keyboard navigation | Yes (unless building a custom renderer) |
| `@gridstorm/react` | React 18+ wrapper with hooks, error boundary, portal-based custom renderers | Yes for React projects |
| `@gridstorm/theme-default` | CSS custom properties, light/dark/high-contrast themes, density modes | Recommended |

## Install Core Packages

Choose your package manager:

```bash title="npm"
npm install @gridstorm/core @gridstorm/dom-renderer @gridstorm/theme-default
```

```bash title="yarn"
yarn add @gridstorm/core @gridstorm/dom-renderer @gridstorm/theme-default
```

```bash title="pnpm"
pnpm add @gridstorm/core @gridstorm/dom-renderer @gridstorm/theme-default
```

For React projects, also install the React adapter:

```bash title="React adapter"
npm install @gridstorm/react
```

## Install Plugins

Each feature is a separate package. Install only the plugins you use:

```bash title="Common plugins"
npm install @gridstorm/plugin-sorting
npm install @gridstorm/plugin-filtering
npm install @gridstorm/plugin-selection
npm install @gridstorm/plugin-editing
npm install @gridstorm/plugin-pagination
```

```bash title="Column interaction plugins"
npm install @gridstorm/plugin-column-pinning
npm install @gridstorm/plugin-column-resize
npm install @gridstorm/plugin-column-reorder
```

```bash title="Advanced plugins"
npm install @gridstorm/plugin-context-menu
npm install @gridstorm/plugin-grouping
npm install @gridstorm/plugin-aggregation
npm install @gridstorm/plugin-clipboard
```

### Plugin Dependencies

Some plugins depend on others and must be installed together:

| Plugin | Depends on |
|---|---|
| `@gridstorm/plugin-aggregation` | `@gridstorm/plugin-grouping` |
| `@gridstorm/plugin-clipboard` | `@gridstorm/plugin-selection` |

GridStorm resolves plugin dependencies using topological sorting. If a required dependency is missing, you will see a clear error message at grid initialization time.

## CSS Setup

Import the theme CSS at your application entry point:

```ts title="Entry point"
import '@gridstorm/theme-default/css';
```

This single import provides all three themes (light, dark, high-contrast) and all density modes. Themes are selected at runtime via the `data-theme` attribute on the grid root element.

:::tip
If your bundler supports CSS imports (Vite, webpack, Parcel, etc.), the import above is all you need. No SASS compilation or CSS module configuration required.
:::

## TypeScript Configuration

GridStorm is written in strict TypeScript and ships declaration files (`.d.ts`) with every package. No additional `@types/*` packages are needed.

For the best experience, ensure your `tsconfig.json` enables strict mode and has `moduleResolution` set to `bundler` or `node16`:

```json title="tsconfig.json"
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "bundler",
    "target": "ES2020",
    "module": "ESNext",
    "jsx": "react-jsx"
  }
}
```

GridStorm supports full generic typing through your row data type:

```ts title="Typed columns"
interface Employee {
  name: string;
  age: number;
  department: string;
}

const columns: ColumnDef<Employee>[] = [
  { field: 'name', headerName: 'Name' },
  { field: 'age', headerName: 'Age' },
  { field: 'department', headerName: 'Department' },
];
```

The `field` property is type-checked against `keyof Employee`, so misspelled field names are caught at compile time.

## Module Formats

Every GridStorm package ships dual-format builds:

- **ESM** (`import`) -- for modern bundlers and native ESM environments
- **CJS** (`require`) -- for Node.js and legacy bundlers

The `package.json` `exports` field routes your bundler to the correct format automatically.

## CDN Usage

:::caution
CDN distribution is planned for a future release. For now, install via npm, yarn, or pnpm.
:::

## Verifying Your Installation

After installing, verify everything works with a minimal script:

```ts title="verify.ts"
import { createGrid } from '@gridstorm/core';

const engine = createGrid({
  columns: [{ field: 'id', headerName: 'ID' }],
  rowData: [{ id: 1 }, { id: 2 }],
});

console.log('Row count:', engine.api.getDisplayedRowCount()); // 2
engine.destroy();
```

If this runs without errors, your installation is correct.

## Next Steps

- **[Quick Start](/getting-started/quick-start/)** -- Render your first grid.
- **[Architecture](/core-concepts/architecture/)** -- Understand the engine, store, and data flow.
- **[Plugin System](/plugins/plugin-system/)** -- Learn how plugins extend the grid.
