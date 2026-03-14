---
title: DOM Renderer
description: Learn how GridStorm's DOM renderer bridges the engine to the browser with virtual scrolling, row pooling, keyboard navigation, and ARIA accessibility.
---

The DOM renderer is the bridge between GridStorm's headless core engine and the browser. It reads state from the engine's store, creates and manages DOM elements, and handles user interactions like scrolling, clicking, and keyboard navigation. The renderer is a separate package (`@gridstorm/dom-renderer`) so that the core engine can run headlessly in Node.js or Web Workers.

## Installation

```bash title="Install the DOM renderer"
pnpm add @gridstorm/dom-renderer @gridstorm/core
```

## How It Works

When you call `mount()`, the renderer:

1. Creates the grid DOM structure (root, header, scrollable body viewport, row container).
2. Configures the virtual scroller to calculate which rows are visible.
3. Sets up scroll synchronization between the header and body.
4. Attaches a `ResizeObserver` to respond to container size changes.
5. Initializes keyboard navigation.
6. Subscribes to engine state changes and re-renders on the next microtask.
7. Mounts any extensions (floating filters, pagination, sidebar).

## Configuration Options

Pass a `DomRendererConfig` object to the constructor:

| Option | Type | Default | Description |
|---|---|---|---|
| `container` | `HTMLElement` | required | Container element to mount the grid into |
| `engine` | `GridEngine` | required | Grid engine instance |
| `classPrefix` | `string` | `'gs'` | CSS class prefix for all generated elements |
| `enableCellEditing` | `boolean` | auto-detect | Enable inline cell editing overlay |
| `enableGrouping` | `boolean` | auto-detect | Enable row grouping visuals (chevron, indent) |
| `groupIndent` | `number` | `24` | Indentation per group level in pixels |
| `checkboxSelection` | `boolean` | `false` | Show a checkbox selection column |
| `checkboxColumnWidth` | `number` | `48` | Width of the checkbox column in pixels |
| `floatingFilter` | `boolean` | `false` | Show floating filter inputs below the header |
| `floatingFilterDebounce` | `number` | `300` | Debounce delay for floating filter input in ms |
| `enablePagination` | `boolean` | auto-detect | Show pagination controls below the grid |
| `pageSizeOptions` | `number[]` | `[25, 50, 100, 250]` | Available page size options |
| `groupHeaderHeight` | `number` | same as header | Height of column group header rows in pixels |
| `enableColumnSidebar` | `boolean` | `false` | Show a column visibility sidebar toggle |
| `sidebarWidth` | `number` | `220` | Width of the sidebar panel in pixels |
| `extensions` | `RendererExtension[]` | `[]` | Additional custom renderer extensions |

Options marked "auto-detect" check whether the corresponding plugin is installed.

## Mounting and Destroying

```ts title="Basic usage"
import { GridEngine } from '@gridstorm/core';
import { DomRenderer } from '@gridstorm/dom-renderer';

const engine = new GridEngine({
  columns: [{ field: 'name' }, { field: 'age' }],
  rowData: data,
});

const renderer = new DomRenderer({
  container: document.getElementById('grid')!,
  engine,
});

renderer.mount();

// Later: clean up everything
renderer.destroy();
```

Calling `destroy()` removes all DOM elements, disconnects observers, unsubscribes from state changes, tears down extensions, and nulls out internal references to allow garbage collection. The renderer is SSR-safe -- `mount()` is a no-op on the server.

## Virtual Scrolling

The renderer uses a `VirtualScroller` to render only the rows visible in the viewport plus an overscan buffer (default: 5 rows above and below). This keeps DOM node count low even with hundreds of thousands of rows.

### Fixed Row Heights

When `rowHeight` is a number, the scroller uses simple arithmetic (division and multiplication) for constant-time calculations:

```ts title="Fixed row height"
const engine = new GridEngine({
  columns,
  rowData: largeDataset, // 500,000 rows
  rowHeight: 40,
});
```

### Variable Row Heights

When `rowHeight` is a function, the scroller builds a cumulative height cache and uses binary search to find the first visible row:

```ts title="Variable row heights"
const engine = new GridEngine({
  columns,
  rowData: data,
  rowHeight: ({ data }) => data.hasDetails ? 80 : 40,
});
```

### Column Virtualization

For grids with 20 or more unpinned columns, the renderer also virtualizes columns horizontally. Only columns visible in the viewport (plus an overscan of 2 columns) are rendered. Pinned columns are always rendered regardless of scroll position.

## Row Pooling and Recycling

The renderer maintains a pool of reusable row DOM elements. When a row scrolls out of view, its element is returned to the pool. When a new row scrolls into view, the renderer takes an element from the pool instead of creating a new one, then updates its content. This minimizes DOM allocations during scrolling.

Each rendered row tracks a `version` number from its `RowNode`. When the version has not changed, the renderer skips updating that row's content entirely, avoiding unnecessary DOM mutations.

## Render Batching

State changes do not trigger immediate re-renders. Instead, the renderer uses `queueMicrotask` to coalesce multiple state changes into a single render pass. If a render is already queued, subsequent state changes are effectively batched for free:

```ts title="Batched rendering"
// These three state changes result in a single DOM update
engine.store.batch(() => {
  api.setSortModel([{ colId: 'name', sort: 'asc' }]);
  api.setFilterModel({ status: { filterType: 'text', filter: 'active' } });
  api.setQuickFilter('engineering');
});
```

## Extensions System

The renderer supports an extension system for injecting additional UI components. Three built-in extensions are available:

- **FloatingFilterRenderer** -- Adds a row of filter inputs below the header, synchronized with horizontal scroll.
- **PaginationRenderer** -- Adds page navigation controls below the grid body.
- **SidebarRenderer** -- Adds a toggleable column visibility panel.

You can write custom extensions by implementing the `RendererExtension` interface:

```ts title="Custom extension"
import type { RendererExtension, RendererContext } from '@gridstorm/dom-renderer';

const statusBarExtension: RendererExtension = {
  mount(ctx: RendererContext) {
    const bar = ctx.el('div', `${ctx.prefix}-status-bar`);
    bar.textContent = `${ctx.getState().displayedRowIds.length} rows`;
    ctx.wrapper.appendChild(bar);
  },
  destroy() {
    // Clean up DOM elements
  },
};

const renderer = new DomRenderer({
  container,
  engine,
  extensions: [statusBarExtension],
});
```

The `RendererContext` provides access to the engine, state, API, DOM helper methods, and references to key container elements.

## Keyboard Navigation

The `KeyboardManager` handles keyboard interactions within the grid, implementing a roving tabindex pattern for accessibility:

| Key | Action |
|---|---|
| Arrow Up / Down | Move focus one row up or down |
| Arrow Left / Right | Move focus one column left or right |
| Home | Move focus to the first column (or first cell with Ctrl) |
| End | Move focus to the last column (or last cell with Ctrl) |
| Page Up / Page Down | Move focus by one viewport page of rows |
| Tab / Shift+Tab | Move focus to next/previous cell; exits grid at boundaries |
| Enter / F2 | Start editing the focused cell |
| Escape | Cancel the current edit |
| Space | Toggle selection on the focused row |
| Ctrl+A / Cmd+A | Select all rows |

The keyboard manager skips navigation key handling when the focus is inside a form element (input, select, textarea) to avoid interfering with cell editors.

## ARIA Accessibility

The renderer generates a fully accessible DOM structure:

| Element | ARIA Role | Additional Attributes |
|---|---|---|
| Grid root | `grid` | `aria-label`, `aria-multiselectable`, `aria-rowcount`, `aria-colcount` |
| Header container | `rowgroup` | -- |
| Header row | `row` | -- |
| Header cells | `columnheader` | `aria-sort` (when sorted) |
| Body container | `rowgroup` | -- |
| Data rows | `row` | `aria-rowindex`, `aria-selected`, `data-row-id` |
| Data cells | `gridcell` | `id` (for `aria-activedescendant`), `data-col-id` |
| Live region | -- | `aria-live="polite"`, `aria-atomic="true"` |

The live region is used for screen reader announcements. The focused cell receives `tabindex="0"` and a `.gs-cell-focused` CSS class, allowing screen readers to track the active cell with `aria-activedescendant`.

Group rows receive `aria-expanded` to indicate their expand/collapse state, and group cells include an indentation offset and a toggle chevron.

## Framework Integration

In React, you typically use the `@gridstorm/react` adapter which manages the renderer lifecycle for you. For vanilla JavaScript or other frameworks, create and mount the renderer directly:

```ts title="Vanilla JS setup"
import { GridEngine } from '@gridstorm/core';
import { DomRenderer } from '@gridstorm/dom-renderer';
import { sortingPlugin } from '@gridstorm/plugin-sorting';

const engine = new GridEngine({
  columns: [
    { field: 'name', headerName: 'Name', sortable: true },
    { field: 'age', headerName: 'Age', width: 100 },
  ],
  rowData: employees,
  plugins: [sortingPlugin()],
});

const renderer = new DomRenderer({
  container: document.getElementById('grid')!,
  engine,
  floatingFilter: true,
  enablePagination: true,
});

renderer.mount();

// Clean up on page unload
window.addEventListener('unload', () => {
  renderer.destroy();
  engine.destroy();
});
```

## Next Steps

- **[Theming](/core-concepts/theming/)** -- Customize the grid's appearance with CSS custom properties.
- **[Architecture](/core-concepts/architecture/)** -- How the renderer fits into the overall architecture.
- **[Columns](/core-concepts/columns/)** -- Configure column widths, pinning, and custom renderers.
