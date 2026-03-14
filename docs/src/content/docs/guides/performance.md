---
title: Performance
description: Optimization strategies for GridStorm including virtual scrolling, row pooling, render batching, memoized selectors, and large dataset handling.
---

GridStorm is designed to handle large datasets efficiently through virtual scrolling, DOM recycling, batched state updates, and column virtualization. This guide covers the built-in optimizations and patterns you should follow to keep your grid responsive with 100K+ rows.

## Virtual Scrolling

GridStorm virtualizes rows by default. The `VirtualScroller` calculates which rows are visible in the viewport and renders only those rows plus an overscan buffer. As the user scrolls, rows outside the viewport are removed from the DOM and new rows are added.

```
┌─────────────────────────┐
│  overscan (5 rows)      │  ← rendered but not visible
├─────────────────────────┤
│                         │
│  visible viewport       │  ← what the user sees
│  (fits ~20 rows)        │
│                         │
├─────────────────────────┤
│  overscan (5 rows)      │  ← rendered but not visible
└─────────────────────────┘
│                         │
│  remaining rows         │  ← NOT in the DOM
│  (virtual space only)   │
```

### Fixed vs. Variable Row Heights

Fixed row heights enable O(1) scroll position calculations using simple arithmetic. Variable heights require a cumulative height cache and binary search, which is O(log n).

```typescript title="Fixed height (fastest)"
<GridStorm
  columns={columns}
  rowData={data}
  rowHeight={40}
/>
```

```typescript title="Variable height"
<GridStorm
  columns={columns}
  rowData={data}
  rowHeight={(index) => data[index].expanded ? 80 : 40}
/>
```

Prefer fixed row heights when possible. If you must use variable heights, the scroller rebuilds its height cache when `rowCount` changes.

### Overscan

The overscan controls how many extra rows are rendered above and below the viewport. The default is 5. Increasing overscan reduces white flashes during fast scrolling but adds more DOM nodes.

```typescript title="Custom overscan"
const renderer = new DomRenderer({
  container: document.getElementById('grid')!,
  engine,
  // overscan is controlled by the VirtualScroller configuration
});
```

## Row Pooling and Recycling

The DOM renderer reuses row and cell elements instead of creating new ones. When a row scrolls out of view, its DOM node is detached, its content is updated with new data, and it is repositioned for a newly visible row. This avoids the cost of `document.createElement` and garbage collection for rapidly scrolling grids.

Key benefits:
- No DOM allocation during scroll
- Consistent memory footprint regardless of dataset size
- Reduced garbage collection pressure

## Column Virtualization

When the grid has many columns (50+), column virtualization kicks in. Only columns within the horizontal viewport are rendered. Pinned columns (left and right) are always rendered regardless of scroll position.

The column virtualizer calculates visible columns based on scroll position and column widths, similar to row virtualization:

```
┌──────┬─────────────────────────┬──────┐
│pinned│  visible columns        │pinned│
│ left │  (virtualized)          │right │
└──────┴─────────────────────────┴──────┘
```

## Render Batching

Multiple state updates within a single tick are batched into a single DOM re-render. Use the store's `batch` method when performing multiple related updates from a plugin:

```typescript title="Batched updates"
ctx.store.batch(() => {
  ctx.store.setState((s) => ({ ...s, sortModel: newSort }));
  ctx.store.setState((s) => ({ ...s, filterModel: newFilter }));
});
// Only one re-render occurs
```

The command bus also batches handler execution -- if a single command triggers multiple state changes through its handler, those are collected into one render cycle.

## Memoized Selectors

Use `store.select` to subscribe to specific state slices. The listener only fires when the selected value changes by reference equality, avoiding unnecessary work:

```typescript title="Efficient state subscription"
// Only fires when sortModel reference changes
const unsub = ctx.store.select(
  (state) => state.sortModel,
  (nextSort, prevSort) => {
    rebuildSortIndicators(nextSort);
  },
);
```

This is significantly more efficient than `store.subscribe`, which fires on every state change.

## React Hook Optimization

The `<GridStorm>` React component uses several optimization patterns:

1. **Memoized config** -- The `GridConfig` object is recreated only when structural properties change (columns, plugins, rowModelType), not on every render.
2. **Ref-based callbacks** -- Event callbacks are stored in refs to avoid re-subscribing on every render.
3. **Skipped initial sync** -- When the engine is first created, `rowData` and `columns` are passed to `createGrid` directly. The `useEffect` hooks that sync these props skip their first run to avoid duplicate processing.
4. **Stable context** -- The `GridContext` value is memoized to prevent unnecessary re-renders of consumer components.

### Avoiding Common React Pitfalls

```typescript title="Avoid inline objects"
// BAD: Creates a new array reference every render, causing engine recreation
<GridStorm
  columns={[
    { field: 'name' },
    { field: 'price' },
  ]}
  rowData={data}
/>

// GOOD: Stable column reference
const columns = useMemo(() => [
  { field: 'name' },
  { field: 'price' },
], []);

<GridStorm columns={columns} rowData={data} />
```

```typescript title="Memoize plugins array"
// BAD: New plugin instances every render
<GridStorm
  plugins={[createSortingPlugin(), createFilteringPlugin()]}
  ...
/>

// GOOD: Stable plugins reference
const plugins = useMemo(() => [
  createSortingPlugin(),
  createFilteringPlugin(),
], []);

<GridStorm plugins={plugins} ... />
```

## Large Dataset Strategies (100K+ Rows)

### Client-Side (up to ~100K rows)

For datasets up to approximately 100K rows, client-side mode with virtual scrolling works well:

1. **Use fixed row heights** for O(1) scroll calculations.
2. **Enable sorting and filtering** through plugins -- they operate on the in-memory data model.
3. **Provide `getRowId`** so the engine can identify rows by a stable key instead of array index.
4. **Avoid re-creating `rowData`** arrays unnecessarily. Use `api.setRowData()` or `api.applyTransaction()` for updates.

```typescript title="Optimized large dataset"
const engine = createGrid({
  columns,
  rowData: hundredThousandRows,
  rowHeight: 36,
  getRowId: (row) => row.id,
  plugins: [createSortingPlugin(), createFilteringPlugin()],
});
```

### Server-Side Row Model (100K+ rows)

For datasets that are too large to load into the browser, use the server-side row model (SSRM). The grid requests data in blocks as the user scrolls, sorts, or filters.

```typescript title="SSRM configuration"
<GridStorm
  columns={columns}
  rowModelType="serverSide"
  dataSource={{
    getRows: async (params) => {
      const res = await fetch('/api/data?' + new URLSearchParams({
        startRow: String(params.startRow),
        endRow: String(params.endRow),
        sortModel: JSON.stringify(params.sortModel),
        filterModel: JSON.stringify(params.filterModel),
      }));
      return res.json(); // { rows, totalCount }
    },
  }}
/>
```

SSRM benefits:
- Constant memory footprint regardless of total dataset size
- Server handles sorting, filtering, and grouping
- Only visible data is transferred over the network

## Avoiding Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| Inline column arrays | Engine recreated every render | `useMemo` for columns |
| Inline plugin arrays | Plugins reinstalled every render | `useMemo` for plugins |
| Variable row heights without need | Slower scroll calculations | Use fixed `rowHeight` |
| Subscribing to full state | Fires on every state change | Use `store.select` with a selector |
| Mutating row data in place | State change not detected | Always return new objects from updaters |
| Not providing `getRowId` | Falls back to index-based IDs | Provide a stable row identity function |
| Unmemoized cell renderers | Cells re-render unnecessarily | Cache renderer functions outside components |

## Profiling

To identify performance bottlenecks:

1. Enable `__GRIDSTORM_DEV__` for development warnings about undeclared plugin dependencies and unnecessary re-renders.
2. Use Chrome DevTools Performance panel to profile scroll and render times.
3. Check the DOM node count -- it should stay roughly constant as you scroll (proof that virtualization is working).
4. Monitor `pluginState` changes to ensure plugins are not triggering excessive updates.

## Next Steps

- [Virtual Scrolling Architecture](/api/virtual-scroll) -- Deep dive into the VirtualScroller internals
- [Custom Plugins](/guides/custom-plugins) -- Build plugins with optimized state management
- [Integration Guide](/guides/integration-guide) -- SSR and bundle size considerations
