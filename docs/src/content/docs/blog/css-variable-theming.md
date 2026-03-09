---
title: "Runtime Theming with CSS Variables: No Build Step Required"
description: How GridStorm's 50+ CSS custom properties enable instant theme switching, custom brand themes, and density modes without JavaScript or a build pipeline.
---

Most data grids built before 2020 use SASS or LESS for theming. You define variables in a `.scss` file, compile to CSS, and ship the result. Changing a theme means rebuilding, or loading an entirely separate stylesheet at runtime. AG Grid, the market leader, still follows this pattern -- its themes are SASS-based, and runtime switching requires swapping CSS bundles or using a JavaScript theme API.

GridStorm takes a different approach. Every visual property is a CSS custom property prefixed with `--gs-`. You change them with plain CSS. No build step. No JavaScript. No framework dependency.

## The Token System

GridStorm defines 50+ design tokens in `@gridstorm/theme-default`. These cover colors, typography, spacing, sizing, borders, shadows, z-indices, transitions, and scrollbar styling:

```css
.gs-root {
  /* Colors */
  --gs-color-background: #ffffff;
  --gs-color-foreground: #1a1a1a;
  --gs-color-accent: #3b82f6;
  --gs-color-border: #e2e8f0;

  /* Header */
  --gs-color-header-bg: #f8fafc;
  --gs-color-header-fg: #475569;

  /* Rows */
  --gs-color-row-bg: #ffffff;
  --gs-color-row-bg-alt: #f8fafc;
  --gs-color-row-bg-hover: #f1f5f9;
  --gs-color-row-bg-selected: #eff6ff;

  /* Typography */
  --gs-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --gs-font-size: 13px;

  /* Sizing */
  --gs-size-row-height: 40px;
  --gs-size-header-height: 48px;

  /* ... and more */
}
```

Every component in the grid -- headers, rows, cells, popups, overlays, scrollbars -- reads from these tokens. Override one property and every component that uses it updates instantly.

## Built-in Themes

GridStorm ships three themes and three density modes:

**Themes:** Light (default), Dark, and High-Contrast. Apply them by setting a `data-theme` attribute:

```html
<!-- Light (default) -->
<div class="gs-root" data-theme="light">

<!-- Dark -->
<div class="gs-root" data-theme="dark">

<!-- High contrast (WCAG AAA) -->
<div class="gs-root" data-theme="high-contrast">
```

**Density modes:** Compact, Normal, and Comfortable. These adjust row height, cell padding, and font size:

```css
/* Compact: tighter rows for data-dense views */
--gs-size-row-height: 32px;
--gs-spacing-cell-horizontal: 8px;
--gs-font-size: 12px;

/* Comfortable: more breathing room */
--gs-size-row-height: 52px;
--gs-spacing-cell-horizontal: 16px;
--gs-font-size: 14px;
```

## Runtime Theme Switching

Because these are CSS custom properties, switching themes at runtime is trivial:

```ts
// Toggle dark mode with one attribute change
function toggleDarkMode(gridElement: HTMLElement) {
  const current = gridElement.dataset.theme;
  gridElement.dataset.theme = current === 'dark' ? 'light' : 'dark';
}
```

No stylesheet swap. No re-render. No flash of unstyled content. The browser applies the new values immediately to all elements that reference them.

In React, you can drive this from state:

```tsx
import { GridStorm } from '@gridstorm/react';
import '@gridstorm/theme-default/light.css';
import '@gridstorm/theme-default/dark.css';

function App() {
  const [dark, setDark] = useState(false);

  return (
    <>
      <button onClick={() => setDark(!dark)}>Toggle Theme</button>
      <GridStorm
        columns={columns}
        rowData={data}
        theme={dark ? 'dark' : 'light'}
        plugins={[SortingPlugin()]}
        height={400}
      />
    </>
  );
}
```

## Creating a Custom Theme

A custom theme is just a CSS rule that overrides the tokens you want to change. You do not need to copy the entire token set -- only the properties you want to customize:

```css
/* corporate-theme.css */
.gs-root[data-theme='corporate'] {
  --gs-color-accent: #7c3aed;
  --gs-color-accent-hover: #6d28d9;
  --gs-color-header-bg: #faf5ff;
  --gs-color-header-fg: #4c1d95;
  --gs-color-row-bg-selected: #ede9fe;
  --gs-color-row-bg-selected-hover: #ddd6fe;
  --gs-font-family: 'Inter', sans-serif;
  --gs-border-radius: 4px;
}
```

Apply it the same way as built-in themes:

```html
<div class="gs-root" data-theme="corporate">
```

Because CSS custom properties inherit, you can also scope themes to specific parts of the page. Wrap a grid in a container class and override tokens there -- useful for dashboards where different panels have different color schemes.

## Comparison with SASS Theming

| | CSS Variables (GridStorm) | SASS Variables (AG Grid) |
|---|---|---|
| Runtime switching | Instant, no reload | Requires CSS bundle swap or JS API |
| Build step | None | SASS compilation required |
| Custom themes | Override properties in CSS | Override SASS variables and rebuild |
| Scoped themes | Native CSS inheritance | Complex SASS nesting |
| JavaScript access | `getComputedStyle()` | Not accessible without JS bridge |
| Browser support | All modern browsers | All browsers (compiles to static CSS) |
| Debugging | Visible in DevTools | Compiled away in output |

The SASS approach has one advantage: it compiles to static CSS, which means the browser does not need to resolve custom property chains. In practice, the performance difference is negligible -- modern browsers resolve CSS variables efficiently, and grid theming does not involve the kind of deeply nested property chains that could cause measurable overhead.

## Design Tokens in Practice

When you inspect a GridStorm grid in browser DevTools, you see the actual token names on every element. This makes debugging straightforward: find the element, see which `--gs-*` property controls it, and override it in your theme.

This transparency is intentional. Data grids are among the most visually customized components in any application. Making every visual property discoverable and overridable reduces the need for `!important` hacks, shadow DOM piercing, or CSS specificity battles.
