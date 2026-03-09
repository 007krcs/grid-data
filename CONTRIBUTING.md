# Contributing to GridStorm

Thank you for your interest in contributing to GridStorm. This guide covers everything you need to get started.

## Prerequisites

- **Node.js** 20+ ([download](https://nodejs.org/))
- **pnpm** 9+ (`corepack enable && corepack prepare pnpm@latest --activate`)
- **Git** 2.30+

## Getting Started

```bash
# Clone the repository
git clone https://github.com/gridstorm/gridstorm.git
cd gridstorm

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test
```

## Project Structure

```
gridstorm/
  packages/
    core/               # Headless engine: types, store, event/command bus, plugin manager
    dom-renderer/       # DOM-based virtual scroll renderer
    react-adapter/      # React 18+ wrapper with hooks and error boundary
    theme-default/      # CSS custom properties theme system
    license/            # Enterprise license key validation
    i18n/               # Internationalization and RTL support
    codemod/            # AG Grid to GridStorm migration CLI
    plugin-sorting/     # Single and multi-column sorting
    plugin-filtering/   # Column filters, quick filter, compound conditions
    plugin-selection/   # Row, cell, and range selection
    plugin-editing/     # Cell and full-row inline editing
    plugin-pagination/  # Client-side pagination
    plugin-column-pinning/   # Pin columns left/right
    plugin-column-resize/    # Drag-to-resize columns
    plugin-column-reorder/   # Drag-and-drop column reorder
    plugin-context-menu/     # Right-click context menus
    plugin-grouping/         # Row grouping with expand/collapse
    plugin-aggregation/      # Aggregation functions (enterprise)
    plugin-pivoting/         # Pivot table support (enterprise)
    plugin-clipboard/        # Clipboard operations (enterprise)
    plugin-tree-data/        # Hierarchical tree data (enterprise)
    plugin-ssrm/             # Server-side row model (enterprise)
```

## Development Workflow

### Branch Naming

Use descriptive branch names with a prefix:

- `feat/column-virtualization` -- new feature
- `fix/sorting-null-values` -- bug fix
- `docs/plugin-api-guide` -- documentation
- `refactor/store-batch-updates` -- code refactoring
- `test/selection-edge-cases` -- test additions

### Making Changes

1. Create a branch from `main`:
   ```bash
   git checkout -b feat/my-feature main
   ```

2. Make your changes in the relevant package(s).

3. Run type checking and tests:
   ```bash
   # Type check all packages
   pnpm typecheck

   # Run tests
   pnpm test

   # Run tests for a specific package
   pnpm --filter @gridstorm/core test
   ```

4. Build to verify everything compiles:
   ```bash
   pnpm build
   ```

5. Commit your changes following the [commit conventions](#commit-messages).

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`

Scope is the package name without the `@gridstorm/` prefix:

```
feat(plugin-sorting): add natural sort comparator
fix(dom-renderer): prevent scroll jump on row update
docs(core): add plugin lifecycle diagram
test(plugin-filtering): cover compound OR conditions
```

## How to Add a New Plugin

1. Create a new directory under `packages/`:
   ```
   packages/plugin-my-feature/
     src/
       index.ts          # Public exports
       my-feature.ts     # Plugin implementation
     package.json
     tsconfig.json
     tsup.config.ts
   ```

2. Your plugin must implement the `GridPlugin` interface from `@gridstorm/core`:

   ```typescript
   import type { GridPlugin } from '@gridstorm/core';

   export function MyFeaturePlugin(): GridPlugin {
     return {
       name: 'my-feature',
       version: '0.1.0',
       dependencies: [],  // List other plugin names if required
       init(ctx) {
         // Register commands, subscribe to events, add state slices
       },
       destroy() {
         // Cleanup: unsubscribe events, remove DOM elements
       },
     };
   }
   ```

3. Add the package to `pnpm-workspace.yaml` if not using a glob pattern.

4. Add `@gridstorm/core` as a workspace dependency:
   ```json
   {
     "dependencies": {
       "@gridstorm/core": "workspace:*"
     }
   }
   ```

5. For enterprise plugins, also add `@gridstorm/license` as a dependency.

## Testing Conventions

- **Framework**: [Vitest](https://vitest.dev/) with `jsdom` environment
- **File naming**: `*.test.ts` co-located next to the source file, or in a `__tests__/` directory
- **Shared state**: Use factory functions (e.g., `makeRowData()`) to avoid shared mutable state across tests
- **Cross-package imports**: Use relative paths from the test file to the source (e.g., `../../../plugin-name/src/file`)
- **ResizeObserver**: Polyfilled automatically in `vitest.setup.ts`

Example test:

```typescript
import { describe, it, expect } from 'vitest';
import { createGridEngine } from '@gridstorm/core';
import { SortingPlugin } from '../src/sorting';

describe('SortingPlugin', () => {
  it('sorts rows by a single column ascending', () => {
    const engine = createGridEngine({
      columnDefs: [{ field: 'name' }],
      rowData: [{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }],
      plugins: [SortingPlugin()],
    });

    engine.dispatchCommand('sort:set', { field: 'name', direction: 'asc' });

    const rows = engine.getDisplayedRows();
    expect(rows.map(r => r.data.name)).toEqual(['Alice', 'Bob', 'Charlie']);
  });
});
```

## Code Style

- **TypeScript strict mode** with `noUnusedLocals` and `noUnusedParameters` enabled
- Prefix unused parameters with an underscore: `(_event, _index) => {}`
- No `any` in public API types; use `unknown` with type guards instead
- Prefer `interface` over `type` for object shapes
- Use `const` assertions and discriminated unions where possible
- Commands are the **only** way to mutate grid state (unidirectional data flow)

## Pull Request Guidelines

1. Fill out the [PR template](./.github/PULL_REQUEST_TEMPLATE.md) completely.
2. Ensure all tests pass (`pnpm test`).
3. Ensure the build succeeds (`pnpm build`).
4. Ensure type checking passes (`pnpm typecheck`).
5. Add or update tests for any changed behavior.
6. Keep PRs focused -- one feature or fix per PR.
7. Link related issues using `Closes #123` in the PR description.
8. Request review from at least one maintainer.

## Reporting Issues

Use the [GitHub issue templates](https://github.com/gridstorm/gridstorm/issues/new/choose) for bug reports and feature requests. Please search existing issues before creating a new one.

## Code of Conduct

Be respectful and constructive. We are committed to providing a welcoming and inclusive experience for everyone.

## License

By contributing to GridStorm, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
