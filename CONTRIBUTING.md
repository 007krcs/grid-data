# Contributing to GridStorm

Thank you for your interest in contributing to GridStorm. This guide covers everything you need to get started.

## Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **pnpm** 9+ (`corepack enable && corepack prepare pnpm@latest --activate`)
- **Git** 2.30+

## Getting Started

```bash
# Clone the repository
git clone https://github.com/007krcs/grid-data.git
cd grid-data

# Install dependencies
pnpm install

# Run all tests
pnpm test

# Build all packages
pnpm build
```

## Project Structure

```
grid-data/
  packages/
    core/                    # Headless engine: types, store, event/command bus, plugin manager
    dom-renderer/            # DOM-based virtual scroll renderer
    react-adapter/           # React 18+ wrapper with hooks and error boundary
    vue-adapter/             # Vue 3 composables adapter
    svelte-adapter/          # Svelte 5 runes & actions adapter
    angular-adapter/         # Angular 16+ standalone component + service
    theme-default/           # CSS custom properties theme system (light, dark, high-contrast)
    license/                 # Enterprise license key validation
    i18n/                    # Internationalization (20 locales) and RTL support
    codemod/                 # AG Grid to GridStorm migration CLI
    mcp-server/              # MCP tool definitions for AI/LLM integration
    plugin-sorting/          # Single and multi-column sorting
    plugin-filtering/        # Column filters, quick filter, compound conditions
    plugin-selection/        # Row, cell, and range selection
    plugin-editing/          # Cell and full-row inline editing
    plugin-pagination/       # Client-side pagination
    plugin-grouping/         # Row grouping with expand/collapse
    plugin-aggregation/      # Aggregation functions (enterprise)
    plugin-pivoting/         # Pivot table support (enterprise)
    plugin-charts/           # SVG chart rendering (bar, line, pie, scatter)
    plugin-formula/          # Excel-like formula engine (50+ functions)
    plugin-ai/               # NL queries, anomaly detection, smart suggestions
    plugin-time-travel/      # Undo/redo with branching & snapshots
    plugin-validation/       # Cell/row validation with 10+ validators
    plugin-streaming/        # Real-time data updates
    ...                      # 30+ more plugins
  examples/                  # 7 demo applications
  benchmarks/                # Performance benchmarks
  docs/                      # Documentation site (Astro/Starlight)
  e2e/                       # End-to-end tests (Playwright)
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

   # Run all tests
   pnpm test

   # Run tests for a specific package
   pnpm test -- --filter packages/core
   ```

4. Build to verify everything compiles:
   ```bash
   pnpm build
   ```

5. Create a changeset for your change:
   ```bash
   pnpm changeset
   ```

6. Commit your changes following the [commit conventions](#commit-messages).

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
perf(core): optimize row-model batch processing
```

## Architecture Overview

GridStorm uses a layered, plugin-based architecture:

```
Framework Adapters (React, Vue, Svelte, Angular)
         │
    DOM Renderer (virtual scrolling, column virtualization)
         │
    Feature Plugins (sorting, filtering, editing, ...)
         │
    Core Engine (Store, EventBus, CommandBus, PluginManager)
```

### Key Design Principles

1. **Unidirectional Data Flow**: Commands are the ONLY way to mutate state.
   ```
   User Action → Command → Handler → Store Update → Event → Re-render
   ```

2. **Plugin Isolation**: Each plugin registers its own state slice, commands, and event listeners. Plugins communicate only via the command/event bus.

3. **Headless Core**: The core engine has zero DOM dependencies. Framework adapters are thin wrappers (~4-5KB each).

4. **Type Safety**: Plugins extend TypeScript interfaces via declaration merging. No `any` in public APIs.

### Error Handling

GridStorm includes a structured error handling framework:

```typescript
import { ErrorHandler } from '@gridstorm/core';

const errorHandler = new ErrorHandler();

// Integrate with your error tracking service
errorHandler.onError(({ error, context }) => {
  Sentry.captureException(error, {
    tags: {
      source: context.source,      // 'command' | 'event' | 'plugin' | 'validation'
      commandType: context.commandType,
      severity: context.severity,  // 'warning' | 'error' | 'fatal'
    },
  });
});

// Attach to grid buses
engine.commandBus.setErrorHandler(errorHandler);
engine.eventBus.setErrorHandler(errorHandler);
```

### Command Validation

Register validators to catch malformed payloads before they reach handlers:

```typescript
engine.commandBus.registerValidator('sort:set', (payload) => {
  if (!payload.sortModel || !Array.isArray(payload.sortModel)) {
    return 'sortModel must be an array';
  }
  return null; // valid
});
```

## How to Add a New Plugin

1. Create a new directory under `packages/`:
   ```
   packages/plugin-my-feature/
     src/
       index.ts               # Public exports
       my-feature-plugin.ts   # Plugin implementation
       __tests__/
         my-feature-plugin.test.ts
     package.json
     tsconfig.json
     tsup.config.ts
   ```

2. Your plugin must implement the `GridPlugin` interface from `@gridstorm/core`:

   ```typescript
   import type { GridPlugin, PluginContext } from '@gridstorm/core';

   export interface MyFeatureConfig {
     enabled?: boolean;
   }

   export function MyFeaturePlugin(config: MyFeatureConfig = {}): GridPlugin {
     return {
       name: 'my-feature',
       version: '0.1.0',
       dependencies: [],  // List other plugin IDs if required

       install(ctx: PluginContext) {
         // Register state slice
         ctx.registerState('myFeature', { enabled: config.enabled ?? true });

         // Register command handlers
         ctx.commandBus.registerHandler('myFeature:doSomething', (payload) => {
           ctx.setState('myFeature', (prev) => ({ ...prev, ...payload }));
         });

         // Listen to events
         const unsub = ctx.eventBus.on('data:changed', () => {
           // React to data changes
         });

         // Return cleanup function
         return () => {
           unsub();
         };
       },
     };
   }
   ```

3. Extend the `CommandMap` for type-safe commands:
   ```typescript
   declare module '@gridstorm/core' {
     interface CommandMap {
       'myFeature:doSomething': { value: string };
     }
   }
   ```

4. Add `@gridstorm/core` as a workspace dependency in package.json:
   ```json
   {
     "dependencies": {
       "@gridstorm/core": "workspace:*"
     }
   }
   ```

5. Write tests:
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { createGrid } from '@gridstorm/core';
   import { MyFeaturePlugin } from '../my-feature-plugin';

   describe('MyFeaturePlugin', () => {
     it('should initialize with default config', () => {
       const engine = createGrid({
         columns: [{ field: 'name' }],
         rowData: [{ name: 'Test' }],
         plugins: [MyFeaturePlugin()],
       });
       expect(engine.api).toBeDefined();
       engine.destroy();
     });
   });
   ```

## Testing Conventions

- **Framework**: [Vitest](https://vitest.dev/) with `jsdom` environment
- **File naming**: `*.test.ts` in a `__tests__/` directory within each package
- **Shared state**: Use factory functions (e.g., `makeRowData()`) to avoid mutation between tests
- **Cross-package imports**: Vitest aliases resolve `@gridstorm/*` to source automatically
- **Polyfills**: `ResizeObserver` and `CSS.escape` are polyfilled in `vitest.setup.ts`
- **Cleanup**: Always call `engine.destroy()` at the end of each test

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests once (CI mode)
pnpm test:run

# Run tests for a specific file
pnpm test -- packages/core/src/__tests__/command-bus.test.ts

# Run tests with coverage
pnpm test:run -- --coverage
```

## Code Style

- **TypeScript strict mode** with `noUnusedLocals` and `noUnusedParameters` enabled
- Prefix unused parameters with an underscore: `(_event, _index) => {}`
- No `any` in public API types; use `unknown` with type guards instead
- Prefer `interface` over `type` for object shapes
- Use `const` assertions and discriminated unions where possible
- Commands are the **only** way to mutate grid state (unidirectional data flow)
- Format with Prettier: `pnpm prettier --write .`
- Lint with ESLint: `pnpm lint`

## CI/CD Pipeline

Every pull request runs automated checks:

| Check | Command | Purpose |
|-------|---------|---------|
| Lint | `pnpm lint` | Code style enforcement |
| Typecheck | `pnpm typecheck` | Type safety verification |
| Tests | `pnpm test:run` | Unit + integration tests (Node 18/20/22) |
| Build | `pnpm build` | Compilation of all 65 packages |
| Bundle Size | Automated | Fail if core exceeds 50KB |
| Verify Publish | `pnpm verify:publish` | Packs every package and asserts no `workspace:*` refs survive into the tarball |
| Security | CodeQL + Dependabot | Vulnerability scanning |

Benchmarks run automatically on pushes to `main` with results stored as artifacts.

## Release Process

GridStorm uses [Changesets](https://github.com/changesets/changesets) for version management:

1. Create a changeset describing your change:
   ```bash
   pnpm changeset
   ```

2. Follow the prompts to select affected packages and bump type (patch/minor/major).

3. Commit the changeset file with your PR.

4. When the PR merges to `main`, the release workflow automatically:
   - Creates a "Version Packages" PR with updated changelogs
   - Publishes to npm when the version PR is merged

### Publishing constraint: always use `pnpm publish`, never raw `npm publish`

Internal dependencies in this repo are declared with the `workspace:*` protocol
(e.g. `"@gridstorm/core": "workspace:*"`). pnpm rewrites these to concrete
versions at pack time; **`npm pack` does not**. Publishing a package via raw
`npm publish` from its directory would ship a tarball whose dependency specs
look like `"workspace:*"` to consumers — `npm install` then fails for everyone
downstream.

This means:
- The release workflow (`changeset publish` → pnpm) is safe.
- `scripts/publish-all.cjs` uses `pnpm publish` for the same reason.
- Do **not** run `npm publish` or `npm pack` against packages in this repo.
  The `pnpm verify:publish` CI job will catch most accidents, but the
  invariant is "always pack with pnpm" — treat that as a hard rule.

If you need to inspect a tarball locally, use `pnpm pack`. If you need to
double-check the strict guard, run `pnpm verify:publish:both` — that simulates
both pnpm and npm pack paths and shows you exactly which packages would break
if anyone ever bypassed pnpm.

## Pull Request Guidelines

1. Fill out the [PR template](./.github/PULL_REQUEST_TEMPLATE.md) completely.
2. Ensure all CI checks pass (tests, typecheck, build, lint).
3. Add or update tests for any changed behavior.
4. Create a changeset for user-facing changes.
5. Keep PRs focused -- one feature or fix per PR.
6. Link related issues using `Closes #123` in the PR description.
7. Request review from at least one maintainer.

## Reporting Issues

Use the [GitHub issue templates](https://github.com/007krcs/grid-data/issues/new/choose) for bug reports and feature requests. Please search existing issues before creating a new one.

## Community

- **Issues**: [GitHub Issues](https://github.com/007krcs/grid-data/issues)
- **Discussions**: [GitHub Discussions](https://github.com/007krcs/grid-data/discussions)

## Code of Conduct

Be respectful and constructive. We are committed to providing a welcoming and inclusive experience for everyone. Harassment, discrimination, or disruptive behavior will not be tolerated.

## License

By contributing to GridStorm, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
