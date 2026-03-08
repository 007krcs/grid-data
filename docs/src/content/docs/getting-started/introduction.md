---
title: Introduction
description: What is GridStorm, why it exists, and how it compares to other data grid solutions.
---

GridStorm is a next-generation, high-performance data grid platform built for the modern web. It is designed from the ground up with a headless core architecture, a DOM-based rendering layer, and a plugin system that keeps your bundle lean by only shipping the features you actually use.

## Why GridStorm?

Building data-intensive web applications demands a grid component that can handle large datasets, remain accessible, support deep customization, and integrate cleanly with your framework of choice. GridStorm was created to meet all of these requirements without compromise.

**Core design principles:**

- **Performance first.** Virtual scrolling renders only the rows visible in the viewport, enabling smooth interaction with 100,000+ row datasets.
- **Framework-agnostic core.** The headless engine is pure TypeScript with zero framework dependencies. Official adapters for React (and more coming) provide idiomatic integrations.
- **Plugin architecture.** Sorting, filtering, selection, editing, grouping, and every other feature is a discrete plugin. Install only what you need. Tree-shake the rest.
- **Accessibility built in.** DOM-based rendering means proper ARIA attributes, keyboard navigation, screen reader support, and high-contrast themes work out of the box.
- **CSS-driven theming.** All visual properties are controlled through CSS custom properties (`--gs-*`). Switch between light, dark, and high-contrast themes at runtime without JavaScript.
- **Type-safe.** Written in strict TypeScript end to end. Full generic support for your row data types flows through columns, events, hooks, and the API.

## Key Features

- Virtual scrolling with configurable row heights (fixed or dynamic)
- 13 official plugins: sorting, filtering, selection, editing, pagination, column pinning, column resize, column reorder, context menu, grouping, aggregation, pivoting, and clipboard
- Multi-column sorting with customizable sort cycles
- Text, number, date, and set filter types with custom filter predicates
- Single and multiple row selection with keyboard (Shift/Ctrl) and checkbox support
- Inline cell editing with built-in text, number, and select editors
- Row grouping with nested expand/collapse and aggregation functions (sum, avg, count, min, max)
- Copy, cut, and paste with TSV/CSV clipboard integration
- Column pinning (left/right), drag-to-resize, and drag-to-reorder
- Right-click context menus with custom items and keyboard shortcuts
- Client-side pagination with configurable page sizes
- Three built-in themes (light, dark, high-contrast) and three density modes (compact, normal, comfortable)
- React 18+ adapter with hooks, portals for custom renderers, error boundary, and controlled/uncontrolled state modes

## Architecture Overview

GridStorm follows a layered architecture that separates concerns cleanly:

```
+-----------------------------------------------------------+
|                    Framework Adapter                       |
|               (@gridstorm/react, etc.)                     |
+-----------------------------------------------------------+
|                    DOM Renderer                            |
|           (@gridstorm/dom-renderer)                        |
|   Virtual scroll, row/cell rendering, keyboard nav         |
+-----------------------------------------------------------+
|                    Core Engine                             |
|               (@gridstorm/core)                            |
|   GridEngine, Store, EventBus, CommandBus, PluginManager   |
+-----------------------------------------------------------+
|                     Plugins                                |
|   sorting, filtering, selection, editing, pagination, ...  |
+-----------------------------------------------------------+
|                    Theme Layer                             |
|            (@gridstorm/theme-default)                      |
|   CSS custom properties, light/dark/high-contrast          |
+-----------------------------------------------------------+
```

**Data flows in one direction:**

1. You provide a `GridConfig` with columns, row data, and plugins.
2. The `GridEngine` initializes a reactive `Store`, an `EventBus`, and a `CommandBus`.
3. Plugins install themselves, registering command handlers and event listeners.
4. User interactions dispatch commands through the `CommandBus`.
5. Commands mutate state in the `Store`.
6. The `Store` notifies the `DomRenderer` (and any subscribers) of changes.
7. The renderer updates only the DOM nodes that changed.

This unidirectional data flow makes the system predictable, testable, and easy to debug.

## How GridStorm Compares

| Feature | GridStorm | AG Grid | TanStack Table |
|---|---|---|---|
| Architecture | Headless core + DOM renderer + framework adapters | Monolithic, framework-specific builds | Headless only (no built-in rendering) |
| Rendering | DOM-based virtual scroll | DOM / Canvas hybrid | BYO rendering |
| Bundle size | Tree-shakeable plugins; ship only what you use | Large all-in-one bundle | Tiny core, but you build everything yourself |
| Theming | CSS custom properties, runtime-switchable | SASS themes, compile-time | N/A (you style your own markup) |
| Accessibility | Built-in ARIA, keyboard nav, high-contrast theme | Good ARIA support | You implement your own |
| Plugin system | First-class: topological dependency resolution, lifecycle hooks | Feature modules (enterprise gated) | No plugin concept |
| TypeScript | Strict mode, full generics end to end | TypeScript with some `any` gaps | Excellent TypeScript |
| License | Open core + premium plugins | Community (MIT) / Enterprise (commercial) | MIT |

GridStorm occupies the middle ground: it provides the rendering, theming, and accessibility that TanStack Table leaves to you, while keeping the modularity and bundle efficiency that AG Grid's monolithic architecture cannot offer. And because the core is framework-agnostic, adding support for Vue, Svelte, or Solid is a matter of writing a thin adapter -- not rewriting the grid.

## Next Steps

- **[Quick Start](/getting-started/quick-start/)** -- Get a grid on screen in under a minute.
- **[Installation](/getting-started/installation/)** -- Detailed package installation and setup.
- **[Architecture](/core-concepts/architecture/)** -- Deep dive into the engine, store, and plugin system.
