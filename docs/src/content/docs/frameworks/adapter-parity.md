---
title: Adapter Parity Matrix
description: Exactly what each framework adapter provides today, so you can pick a framework knowing what you get and what you wire yourself.
---

The four adapters are **not** at feature parity, and we would rather say so than let you find out mid-project. Every adapter mounts the same engine and renderer and exposes the same `GridApi`, so every grid feature works in every framework. What differs is the amount of framework-idiomatic sugar on top. Anything marked "via `GridApi`" works today with a few lines of your own code.

## The matrix

| Capability | React (`@gridstorm/react`) | Vue 3 (`@gridstorm/vue`) | Svelte (`@gridstorm/svelte`) | Angular (`@gridstorm/angular`) |
|---|---|---|---|---|
| Grid component | `<GridStorm>` | `<GridStorm>` | `use:gridstormAction` | `<gridstorm>` |
| Typed props / inputs | ✅ | ✅ | ✅ (`GridStormProps`) | ✅ (`@Input()`) |
| Event outputs | callbacks | emits | `GridStormEventHandlers` | `@Output()` emitters (11) |
| Error boundary | `GridErrorBoundary` | `GridErrorBoundary` | ❌ (wrap the action in your own try/catch) | `(gridError)` output |
| API access | `useGridApi` | `useGridApi` | `getGridApi` / `onGridApiChange` | `GridStormService.getApi(id)` |
| Engine access | `useGridContext` | `useGridEngine` | via `GridStormContext` | via `GridApi` |
| State selector | `useGridState` | `useGridState` | `getGridState` | via `GridApi.getState()` |
| Sort | `useGridSort` | `useGridSort` | `getSortModel` / `setSortModel` | via `GridApi` |
| Filter | `useGridFilter` | `useGridFilter` | `getFilterModel` / `setFilterModel` / `setQuickFilter` | via `GridApi` |
| Selection | `useGridSelection` | `useGridSelection` | `getSelectedRows` / `selectAll` / `deselectAll` | via `GridApi` |
| Pagination | `useGridPagination` | `useGridPagination` | `getPaginationState` / `goToPage` | via `GridApi` |
| Column state + actions | `useGridColumn` | `useGridColumn` | via `GridApi` | via `GridApi` |
| Event subscription | `useGridEvent` | `useGridEvent` | `subscribeToGridEvent` | `GridApi.addEventListener` |
| Framework cell renderers | `reactCellRenderer`, `reactHeaderRenderer` (portals) | ❌ (HTML string / DOM renderers) | ❌ (HTML string / DOM renderers) | ❌ (HTML string / DOM renderers) |
| Multi-grid registry | — | — | — | `GridStormService` |
| Unit tests in repo | ✅ render + hooks + error boundary | ❌ none yet | ✅ action + helpers | ✅ component + service |

## What this means in practice

- **React and Vue** are first-class in API surface: everything the engine exposes has a hook or composable, and both ship an error boundary. Vue has no adapter-level unit tests yet; React does.
- **Svelte** is close: the action-based API plus store helpers cover the same ground without a wrapper component, but cell renderers are DOM-based, not Svelte components.
- **Angular** is the thinnest: a solid component with full inputs/outputs and a multi-grid service, with everything else reached through `GridApi`. That is a complete and supported way to use GridStorm, but you will write the reactive glue (signals/observables) yourself.

If you need framework-native cell renderers in Vue, Svelte or Angular, or a signals-based Angular API, those are the two gaps we would close next. Vote with an issue.

## How this page stays honest

This table is derived from the adapters' public `index.ts` exports. When an adapter gains or loses an export, update this page in the same pull request. The repository's [README](https://github.com/007krcs/grid-data#readme) links here instead of describing the adapters as equivalent.
