---
title: Theming
description: Configure themes, density modes, RTL, print styles, and build custom themes using CSS custom properties.
---

GridStorm's visual appearance is controlled entirely through CSS custom properties (CSS variables). You can switch themes at runtime, create custom themes without a build step, and override individual design tokens without touching the grid's source CSS.

## Installation

```bash title="Terminal"
npm install @gridstorm/theme-default
```

Import the theme in your entry point. This single import includes light, dark, high-contrast, density, RTL, and print styles:

```ts title="main.ts"
import '@gridstorm/theme-default';
```

## CSS Custom Properties Approach

Every visual property in GridStorm -- colors, spacing, typography, borders, shadows -- is defined as a CSS custom property with the `--gs-` prefix. These tokens are set on `:root` and `.gs-root`, so they cascade naturally through the DOM. To customize the grid, you override the tokens you want to change on the `.gs-root` element or any ancestor.

## Built-in Themes

GridStorm ships three themes out of the box:

| Theme | Activation | Description |
|-------|-----------|-------------|
| Light | Default (no attribute needed) | Clean white background with subtle gray borders. |
| Dark | `data-theme="dark"` | Dark slate background with muted blue accents. |
| High Contrast | `data-theme="high-contrast"` | WCAG AAA compliant -- black background, white borders, yellow accent (7:1 contrast ratio). |

### Applying a Theme

Set the `data-theme` attribute on the grid container or any ancestor element:

```html title="HTML"
<div data-theme="dark">
  <div id="my-grid"></div>
</div>
```

In React, pass the `theme` prop:

```tsx title="React"
<GridStorm columns={columns} rowData={data} theme="dark" />
```

### Automatic Dark Mode

The default theme includes a `prefers-color-scheme: dark` media query. If no `data-theme` attribute is set, the grid automatically uses the dark palette when the user's operating system preference is dark mode.

```css title="How automatic dark mode works"
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]),
  .gs-root:not([data-theme] .gs-root) {
    --gs-color-background: #1e1e2e;
    /* ... all dark tokens applied ... */
  }
}
```

To opt out of automatic dark mode, explicitly set `data-theme="light"` on your container.

## Complete Token Reference

### Colors: Base

| Token | Light | Dark | High Contrast | Description |
|-------|-------|------|---------------|-------------|
| `--gs-color-background` | `#ffffff` | `#1e1e2e` | `#000000` | Grid background |
| `--gs-color-foreground` | `#1a1a1a` | `#cdd6f4` | `#ffffff` | Primary text color |
| `--gs-color-border` | `#e2e8f0` | `#45475a` | `#ffffff` | Border color |
| `--gs-color-accent` | `#3b82f6` | `#89b4fa` | `#ffff00` | Accent/link color |
| `--gs-color-accent-hover` | `#2563eb` | `#74c7ec` | `#ffdd00` | Accent hover state |
| `--gs-color-error` | `#ef4444` | `#f38ba8` | `#ff6666` | Error indicators |
| `--gs-color-warning` | `#f59e0b` | `#fab387` | `#ffcc00` | Warning indicators |
| `--gs-color-success` | `#22c55e` | `#a6e3a1` | `#66ff66` | Success indicators |
| `--gs-color-muted` | `#94a3b8` | `#6c7086` | `#b0b0b0` | Muted/secondary text |

### Colors: Header

| Token | Light | Dark | Description |
|-------|-------|------|-------------|
| `--gs-color-header-bg` | `#f8fafc` | `#181825` | Header background |
| `--gs-color-header-fg` | `#475569` | `#bac2de` | Header text color |
| `--gs-color-header-border` | `#e2e8f0` | `#45475a` | Header bottom border |
| `--gs-color-header-hover` | `#f1f5f9` | `#313244` | Header cell hover background |

### Colors: Row

| Token | Light | Dark | Description |
|-------|-------|------|-------------|
| `--gs-color-row-bg` | `#ffffff` | `#1e1e2e` | Default row background |
| `--gs-color-row-bg-alt` | `#f8fafc` | `#181825` | Alternating row background |
| `--gs-color-row-bg-hover` | `#f1f5f9` | `#313244` | Row hover background |
| `--gs-color-row-bg-selected` | `#eff6ff` | `#1e3a5f` | Selected row background |
| `--gs-color-row-bg-selected-hover` | `#dbeafe` | `#264a70` | Selected row hover background |
| `--gs-color-row-fg` | `#1e293b` | `#cdd6f4` | Row text color |

### Colors: Cell

| Token | Light | Dark | Description |
|-------|-------|------|-------------|
| `--gs-color-cell-focus-ring` | `rgba(59, 130, 246, 0.4)` | `rgba(137, 180, 250, 0.4)` | Cell focus ring color |
| `--gs-color-cell-editing-bg` | `#ffffff` | `#1e1e2e` | Background during editing |
| `--gs-color-cell-editing-border` | `#3b82f6` | `#89b4fa` | Border during editing |

### Colors: Overlay

| Token | Light | Dark | Description |
|-------|-------|------|-------------|
| `--gs-color-overlay-bg` | `rgba(255, 255, 255, 0.85)` | `rgba(30, 30, 46, 0.85)` | Loading/no-rows overlay background |
| `--gs-color-overlay-fg` | `#64748b` | `#a6adc8` | Overlay text color |

### Colors: Popup / Menu

| Token | Light | Dark | Description |
|-------|-------|------|-------------|
| `--gs-color-popup-bg` | `#ffffff` | `#181825` | Popup background |
| `--gs-color-popup-border` | `#e2e8f0` | `#45475a` | Popup border |
| `--gs-color-popup-shadow` | `rgba(0, 0, 0, 0.1)` | `rgba(0, 0, 0, 0.3)` | Popup shadow color |
| `--gs-color-menu-item-hover` | `#f1f5f9` | `#313244` | Menu item hover background |
| `--gs-color-menu-item-disabled` | `#94a3b8` | `#585b70` | Disabled menu item text |

### Colors: Grouping

| Token | Light | Dark | Description |
|-------|-------|------|-------------|
| `--gs-color-group-bg` | `#f1f5f9` | `#313244` | Group row background |
| `--gs-color-group-bg-hover` | `#e2e8f0` | `#45475a` | Group row hover background |
| `--gs-color-group-chevron` | `#64748b` | `#a6adc8` | Group expand/collapse chevron color |

### Colors: Floating Filter

| Token | Light | Dark | Description |
|-------|-------|------|-------------|
| `--gs-color-filter-bg` | `#f8fafc` | `#181825` | Filter row background |
| `--gs-color-filter-input-border` | `#e2e8f0` | `#45475a` | Filter input border |
| `--gs-color-filter-input-focus` | `#3b82f6` | `#89b4fa` | Filter input focus border |

### Colors: Pagination

| Token | Light | Dark | Description |
|-------|-------|------|-------------|
| `--gs-color-pagination-bg` | `#f8fafc` | `#181825` | Pagination bar background |
| `--gs-color-pagination-btn-hover` | `#f1f5f9` | `#313244` | Pagination button hover |

### Colors: Column Groups

| Token | Light | Dark | Description |
|-------|-------|------|-------------|
| `--gs-color-group-header-bg` | `#f1f5f9` | `#313244` | Column group header background |
| `--gs-color-group-header-border` | `#e2e8f0` | `#45475a` | Column group header border |

### Colors: Column Sidebar

| Token | Light | Dark | Description |
|-------|-------|------|-------------|
| `--gs-color-sidebar-bg` | `#ffffff` | `#1e1e2e` | Sidebar background |
| `--gs-color-sidebar-border` | `#e2e8f0` | `#45475a` | Sidebar border |
| `--gs-color-sidebar-toggle-bg` | `#f8fafc` | `#181825` | Sidebar toggle button background |

### Colors: Scrollbar

| Token | Light | Dark | Description |
|-------|-------|------|-------------|
| `--gs-scrollbar-track` | `transparent` | `transparent` | Scrollbar track color |
| `--gs-scrollbar-thumb` | `#cbd5e1` | `#45475a` | Scrollbar thumb color |
| `--gs-scrollbar-thumb-hover` | `#94a3b8` | `#585b70` | Scrollbar thumb hover color |

### Typography

| Token | Default | Description |
|-------|---------|-------------|
| `--gs-font-family` | System font stack | Font family |
| `--gs-font-size` | `13px` | Cell font size |
| `--gs-font-size-header` | `13px` | Header font size |
| `--gs-font-size-small` | `11px` | Small text (pagination, floating filter) |
| `--gs-font-weight-normal` | `400` | Normal text weight |
| `--gs-font-weight-header` | `600` | Header text weight |
| `--gs-font-weight-bold` | `700` | Bold text weight |
| `--gs-line-height` | `1.5` | Line height |

### Spacing

| Token | Default | Description |
|-------|---------|-------------|
| `--gs-spacing-cell-horizontal` | `12px` | Horizontal cell padding |
| `--gs-spacing-cell-vertical` | `0px` | Vertical cell padding |
| `--gs-spacing-header-horizontal` | `12px` | Horizontal header padding |

### Sizing

| Token | Default | Description |
|-------|---------|-------------|
| `--gs-size-row-height` | `40px` | Default row height |
| `--gs-size-header-height` | `48px` | Default header height |
| `--gs-size-scrollbar-width` | `8px` | Scrollbar width |
| `--gs-size-icon` | `16px` | Icon size |
| `--gs-size-checkbox` | `16px` | Checkbox size |
| `--gs-size-floating-filter-height` | `36px` | Floating filter row height |
| `--gs-size-pagination-height` | `40px` | Pagination bar height |
| `--gs-size-group-indent` | `24px` | Group indentation per level |
| `--gs-size-checkbox-column` | `48px` | Checkbox column width |
| `--gs-size-sidebar-width` | `220px` | Column sidebar width |

### Borders

| Token | Default | Description |
|-------|---------|-------------|
| `--gs-border-width` | `1px` | Border width |
| `--gs-border-radius` | `0px` | Cell/grid border radius |
| `--gs-border-radius-popup` | `8px` | Popup/menu border radius |

### Shadows

| Token | Default | Description |
|-------|---------|-------------|
| `--gs-shadow-focus-ring` | `0 0 0 2px var(--gs-color-cell-focus-ring)` | Cell focus ring shadow |
| `--gs-shadow-popup` | `0 4px 16px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)` | Popup shadow |

### Z-Index

| Token | Default | Description |
|-------|---------|-------------|
| `--gs-z-header` | `2` | Header z-index |
| `--gs-z-pinned` | `3` | Pinned column z-index |
| `--gs-z-floating-filter` | `4` | Floating filter z-index |
| `--gs-z-overlay` | `10` | Loading/no-rows overlay |
| `--gs-z-popup` | `20` | Popup/context menu |
| `--gs-z-modal` | `30` | Modal overlays |

### Transitions

| Token | Default | Description |
|-------|---------|-------------|
| `--gs-transition-duration` | `150ms` | Animation/transition duration |
| `--gs-transition-easing` | `cubic-bezier(0.4, 0, 0.2, 1)` | Animation easing curve |

## Density Modes

Density modes control vertical spacing, row heights, and font sizes. Apply them with the `data-density` attribute or a CSS class.

| Density | Row Height | Header Height | Font Size | Activation |
|---------|-----------|--------------|-----------|------------|
| Compact | 28px | 32px | 12px | `data-density="compact"` or `.gs-density-compact` |
| Comfortable | 40px | 48px | 13px | `data-density="comfortable"` or `.gs-density-comfortable` (default) |
| Spacious | 56px | 64px | 14px | `data-density="spacious"` or `.gs-density-spacious` |

```html title="Compact density"
<div data-theme="light" data-density="compact">
  <div id="my-grid"></div>
</div>
```

## RTL Support

GridStorm includes built-in right-to-left support. Set `dir="rtl"` on the grid container or the `<html>` element:

```html title="RTL layout"
<div dir="rtl">
  <div id="my-grid"></div>
</div>
```

The RTL stylesheet automatically mirrors:

- Header and cell text alignment (right-aligned)
- Sort icon margins
- Group cell indentation and chevron direction
- Pinned column positioning (left/right swap)
- Checkbox cell padding
- Resize handle positioning
- Sidebar positioning
- Pagination layout direction

## Print Styles

GridStorm includes a `@media print` stylesheet that optimizes the grid for printed output:

- The virtual scroll container switches to `overflow: visible` and `height: auto` so all rows are printed.
- Rows use `position: static` and `page-break-inside: avoid`.
- Colors are forced to light values for readability on paper.
- Non-printable elements are hidden: floating filters, pagination, sidebar, scrollbars, resize handles, context menus, and drag indicators.
- Sticky header positioning is removed.
- Pinned column positioning is removed.

No configuration is needed -- the print styles activate automatically when the user prints the page.

## Reduced Motion

When the user has `prefers-reduced-motion: reduce` set in their operating system, all transitions and animations are disabled:

```css title="How reduced motion works"
@media (prefers-reduced-motion: reduce) {
  .gs-root,
  .gs-root * {
    transition-duration: 0ms !important;
    animation-duration: 0ms !important;
  }
}
```

## Custom Theme Creation

Create a custom theme by defining a CSS rule that overrides the tokens you want to change. You only need to override the tokens that differ from the light theme defaults.

```css title="corporate-theme.css"
.gs-root[data-theme='corporate'],
.gs-theme-corporate .gs-root {
  /* Colors */
  --gs-color-background: #fafaf9;
  --gs-color-foreground: #292524;
  --gs-color-border: #d6d3d1;
  --gs-color-accent: #0284c7;
  --gs-color-accent-hover: #0369a1;

  /* Header */
  --gs-color-header-bg: #f5f5f4;
  --gs-color-header-fg: #44403c;
  --gs-color-header-border: #d6d3d1;

  /* Rows */
  --gs-color-row-bg: #fafaf9;
  --gs-color-row-bg-alt: #f5f5f4;
  --gs-color-row-bg-hover: #e7e5e4;
  --gs-color-row-bg-selected: #e0f2fe;
  --gs-color-row-fg: #292524;

  /* Typography */
  --gs-font-family: 'Inter', sans-serif;
  --gs-border-radius: 4px;
}
```

Apply it:

```html title="Using the custom theme"
<div data-theme="corporate">
  <div id="my-grid"></div>
</div>
```

## Runtime Theme Switching

You can switch themes dynamically without a page reload. Here is a complete example with a theme picker:

```tsx title="ThemeSwitcher.tsx"
import { useState } from 'react';
import { GridStorm } from '@gridstorm/react';

type Theme = 'light' | 'dark' | 'high-contrast';
type Density = 'compact' | 'comfortable' | 'spacious';

function App() {
  const [theme, setTheme] = useState<Theme>('light');
  const [density, setDensity] = useState<Density>('comfortable');

  return (
    <div data-theme={theme} data-density={density}>
      <div>
        <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="high-contrast">High Contrast</option>
        </select>
        <select value={density} onChange={(e) => setDensity(e.target.value as Density)}>
          <option value="compact">Compact</option>
          <option value="comfortable">Comfortable</option>
          <option value="spacious">Spacious</option>
        </select>
      </div>
      <GridStorm columns={columns} rowData={data} height={500} />
    </div>
  );
}
```

For vanilla JavaScript:

```ts title="runtime-switch.ts"
const container = document.getElementById('grid-wrapper')!;

// Switch theme
container.setAttribute('data-theme', 'dark');

// Switch density
container.setAttribute('data-density', 'compact');

// Enable RTL
container.setAttribute('dir', 'rtl');
```

## Scoped Overrides

Override tokens on any ancestor element to create per-section themes without a new theme class:

```html title="Scoped override"
<div style="--gs-color-accent: #8b5cf6; --gs-color-accent-hover: #7c3aed;">
  <!-- This grid uses a purple accent -->
  <div id="grid-purple"></div>
</div>

<div>
  <!-- This grid uses the default blue accent -->
  <div id="grid-default"></div>
</div>
```

## Next Steps

- [React Adapter](/frameworks/react/) -- theme prop and runtime switching in React
- [Columns](/core-concepts/columns/) -- per-column CSS classes and cell styling
- [Architecture](/core-concepts/architecture/) -- how the theme system fits into the overall design
