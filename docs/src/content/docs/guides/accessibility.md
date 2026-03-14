---
title: Accessibility
description: GridStorm accessibility features including ARIA roles, keyboard navigation, focus management, high contrast themes, screen reader support, and RTL layout.
---

GridStorm follows WAI-ARIA grid and table patterns to provide a fully accessible data grid experience. The DOM renderer applies ARIA roles and attributes automatically, and the keyboard manager handles navigation without additional configuration. This guide covers what GridStorm provides out of the box and how to customize accessibility behavior.

## ARIA Roles and Attributes

The DOM renderer assigns ARIA roles to every structural element in the grid:

| Element | Role | Description |
|---------|------|-------------|
| Grid root | `grid` | The top-level grid container |
| Header row group | `rowgroup` | Groups the header rows |
| Body row group | `rowgroup` | Groups the data rows |
| Header row | `row` | A single header row |
| Data row | `row` | A single data row |
| Column header | `columnheader` | A column header cell |
| Data cell | `gridcell` | A data cell |
| Group row | `row` | An expandable group header row |

Additional ARIA attributes applied automatically:

| Attribute | Applied To | Purpose |
|-----------|-----------|---------|
| `aria-label` | Grid root | Describes the grid (configurable via `ariaLabel` prop) |
| `aria-rowcount` | Grid root | Total number of rows including header |
| `aria-colcount` | Grid root | Total number of columns |
| `aria-rowindex` | Each row | 1-based row position in the full dataset |
| `aria-colindex` | Each cell | 1-based column position |
| `aria-sort` | Column header | `ascending`, `descending`, or `none` |
| `aria-selected` | Data row | Whether the row is selected |
| `aria-expanded` | Group row | Whether the group is expanded |
| `aria-level` | Group row | Nesting depth of the group |
| `aria-activedescendant` | Grid root | ID of the currently focused cell |
| `tabindex` | Grid root, focused cell | Manages focus entry and roving tabindex |

### Cell IDs

Every cell receives a unique `id` attribute in the format `gs-cell-{rowIndex}-{colIndex}`. The grid root's `aria-activedescendant` points to the currently focused cell, enabling screen readers to announce the active cell without moving DOM focus.

```html title="Generated ARIA structure"
<div role="grid" aria-label="Sales Data" aria-rowcount="1001" aria-colcount="5"
     aria-activedescendant="gs-cell-3-2" tabindex="0">
  <div role="rowgroup">
    <div role="row" aria-rowindex="1">
      <div role="columnheader" aria-colindex="1" aria-sort="ascending">Name</div>
      <div role="columnheader" aria-colindex="2" aria-sort="none">Revenue</div>
    </div>
  </div>
  <div role="rowgroup">
    <div role="row" aria-rowindex="2" aria-selected="false">
      <div role="gridcell" aria-colindex="1" id="gs-cell-1-1">Alice</div>
      <div role="gridcell" aria-colindex="2" id="gs-cell-1-2">50000</div>
    </div>
  </div>
</div>
```

## Keyboard Navigation

The `KeyboardManager` in the DOM renderer handles all keyboard interactions following the WAI-ARIA grid pattern.

### Navigation Keys

| Key | Action |
|-----|--------|
| Arrow Up | Move focus one row up |
| Arrow Down | Move focus one row down |
| Arrow Left | Move focus one cell left |
| Arrow Right | Move focus one cell right |
| Home | Move focus to the first cell in the current row |
| End | Move focus to the last cell in the current row |
| Ctrl+Home | Move focus to the first cell in the first row |
| Ctrl+End | Move focus to the last cell in the last row |
| Page Up | Scroll up by one viewport height |
| Page Down | Scroll down by one viewport height |
| Tab | Move focus to the next interactive element (exits the grid) |
| Shift+Tab | Move focus to the previous interactive element (exits the grid) |

### Interaction Keys

| Key | Action |
|-----|--------|
| Enter | Begin editing the focused cell (if editable) / expand or collapse a group row |
| Escape | Cancel editing and restore the previous value / exit cell edit mode |
| Space | Toggle row selection (if selection is enabled) / toggle checkbox |
| F2 | Begin editing the focused cell |
| Delete | Clear the focused cell value (if editable) |

### Selection Keys

| Key | Action |
|-----|--------|
| Space | Toggle selection of the focused row |
| Shift+Arrow Up/Down | Extend selection to include adjacent rows |
| Ctrl+A | Select all rows (when `rowSelection` is enabled) |
| Shift+Space | Select range from anchor to focused row |

## Focus Management

GridStorm uses the roving tabindex pattern:

1. The grid root has `tabindex="0"` so it can receive focus via Tab.
2. When the grid is focused, the first data cell becomes the active descendant.
3. Arrow keys move the active cell. The grid root retains DOM focus while `aria-activedescendant` updates to point to the new cell.
4. When the user presses Tab, focus leaves the grid entirely (it does not trap focus).

This approach ensures that the grid behaves as a single tab stop in the page's tab order, which is the expected behavior for ARIA grids.

### Focus on Mount

When the grid mounts, it does not steal focus from the page. Focus only enters the grid when the user explicitly clicks on it or tabs to it.

### Focus During Virtual Scroll

When the focused cell scrolls out of the virtual viewport, the focus state is preserved in memory. When the row scrolls back into view, the focus indicator is restored. The grid ensures keyboard navigation works correctly even when rows are virtualized.

## High Contrast Theme

GridStorm ships with a high contrast theme that meets WCAG AAA requirements (7:1 contrast ratio for normal text).

```typescript title="Enable high contrast theme"
import '@gridstorm/theme-default/styles.css';

// Apply via CSS class
<GridStorm theme="high-contrast" ... />

// Or via data attribute
<div data-gs-theme="high-contrast">
  <GridStorm ... />
</div>
```

The high contrast theme provides:

| Element | Contrast Ratio | WCAG Level |
|---------|---------------|------------|
| Body text on background | 12.6:1 | AAA |
| Header text on header background | 11.2:1 | AAA |
| Focus indicator border | 7.1:1 | AAA |
| Selected row highlight | 8.4:1 | AAA |
| Link/action text | 7.3:1 | AAA |

All theme tokens are CSS custom properties, so you can override individual values to match your design system while maintaining contrast ratios.

## Screen Reader Announcements

GridStorm uses ARIA live regions to announce dynamic changes to screen reader users:

- **Sort changes**: When a column sort changes, a live region announces the new sort state (e.g., "Name column sorted ascending").
- **Filter results**: After filtering, the live region announces the number of visible rows (e.g., "Showing 42 of 1000 rows").
- **Cell editing**: When a cell enters edit mode, the live region announces "Editing [column name]".
- **Selection changes**: Row selection changes are communicated through `aria-selected` updates.
- **Page changes**: Pagination navigation announces the current page and total pages.

These announcements use `aria-live="polite"` so they do not interrupt the user's current screen reader output.

## Reduced Motion Support

GridStorm respects the user's motion preferences via the `prefers-reduced-motion` media query. When reduced motion is preferred:

- Row animations (add, remove, reorder) are disabled.
- Scroll animations use instant positioning instead of smooth scrolling.
- Hover transitions are removed.

```css title="Built-in reduced motion support"
@media (prefers-reduced-motion: reduce) {
  .gs-row {
    transition: none !important;
  }
  .gs-viewport {
    scroll-behavior: auto !important;
  }
}
```

You do not need to configure this -- it works automatically when the user has reduced motion enabled in their operating system settings.

## RTL Support

GridStorm supports right-to-left (RTL) layouts for Arabic, Hebrew, and other RTL languages. Set the `dir` attribute on the grid container or a parent element:

```html title="RTL layout"
<div dir="rtl">
  <GridStorm columns={columns} rowData={data} />
</div>
```

RTL mode affects:
- Column order (first column appears on the right)
- Scroll direction (horizontal scrollbar operates in reverse)
- Pinned columns (left-pinned becomes right-pinned and vice versa)
- Text alignment defaults
- Keyboard navigation (Arrow Left/Right are reversed)

## Print Accessibility

When printing GridStorm, the grid renders all rows (not just virtualized ones) and applies print-optimized styles:

- Removes scroll containers and fixed positioning
- Renders all rows in the natural document flow
- Maintains ARIA roles for PDF/document export accessibility
- Uses high-contrast borders for clarity on paper

```css title="Print styles"
@media print {
  .gs-viewport {
    overflow: visible !important;
    height: auto !important;
  }
  .gs-row {
    position: static !important;
  }
}
```

## Accessibility Checklist

Use this checklist to verify your GridStorm integration is accessible:

- [ ] Provide a descriptive `ariaLabel` prop (e.g., "Quarterly sales report")
- [ ] Ensure column headers have meaningful `headerName` values
- [ ] Use the high-contrast theme or verify your custom theme meets WCAG AA (4.5:1) minimum
- [ ] Test keyboard navigation (arrow keys, Home/End, Enter, Escape)
- [ ] Verify screen reader announces sort and filter changes
- [ ] Ensure the grid does not trap keyboard focus
- [ ] Test with a screen reader (NVDA, JAWS, VoiceOver)
- [ ] Verify RTL layout if your application supports RTL languages
- [ ] Test with reduced motion enabled
- [ ] Confirm print output is readable without scrolling

## Next Steps

- [Performance](/guides/performance) -- Virtual scrolling and large dataset handling
- [Integration Guide](/guides/integration-guide) -- Add GridStorm to your project
- [Custom Plugins](/guides/custom-plugins) -- Build accessible custom cell renderers
