---
title: Theming
description: Configure themes, density modes, CSS custom properties, and build custom themes.
---

GridStorm's visual appearance is controlled entirely through CSS custom properties (CSS variables). This means you can switch themes at runtime, create custom themes without a build step, and override individual design tokens without touching the grid's source CSS.

## Built-in Themes

GridStorm ships three themes:

| Theme | Attribute | Description |
|---|---|---|
| **Light** | `data-theme="light"` (default) | Clean white background with subtle gray borders |
| **Dark** | `data-theme="dark"` | Dark slate background with muted blue accents |
| **High Contrast** | `data-theme="high-contrast"` | Black background, white borders, yellow accent for WCAG AAA compliance |

### Applying a Theme

Set the `data-theme` attribute on the grid's root element:

```html title="HTML"
<div class="gs-root" data-theme="dark">
  <!-- grid content -->
</div>
```

In React, pass the `theme` prop:

```tsx title="React"
<GridStorm columns={columns} rowData={data} theme="dark" />
```

### Switching at Runtime

Toggle themes with JavaScript -- no page reload or rebuild needed:

```ts title="Runtime theme switch"
const root = document.querySelector('.gs-root');
root?.setAttribute('data-theme', 'dark');
```

Or in React with state:

```tsx title="React theme toggle"
const [theme, setTheme] = useState<'light' | 'dark'>('light');

<GridStorm columns={columns} rowData={data} theme={theme} />
<button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
  Toggle Theme
</button>
```

## Density Modes

Density modes control the vertical spacing of rows and headers. GridStorm includes three density presets via CSS classes:

| Density | CSS File | Row Height | Header Height |
|---|---|---|---|
| **Compact** | `density/compact.css` | 32px | 36px |
| **Normal** | (default tokens) | 40px | 48px |
| **Comfortable** | `density/comfortable.css` | 48px | 56px |
| **Spacious** | `density/spacious.css` | 56px | 64px |

Apply a density mode by adding the corresponding CSS class to the grid container:

```html
<div class="gs-root gs-density-compact" data-theme="light">
```

## CSS Custom Properties Reference

All visual tokens use the `--gs-` prefix. Override any of these on the `.gs-root` element or a parent container.

### Colors

| Token | Default (Light) | Description |
|---|---|---|
| `--gs-color-background` | `#ffffff` | Grid background |
| `--gs-color-foreground` | `#1a1a1a` | Primary text color |
| `--gs-color-border` | `#e2e8f0` | Border color |
| `--gs-color-accent` | `#3b82f6` | Accent/link color |
| `--gs-color-accent-hover` | `#2563eb` | Accent hover state |
| `--gs-color-error` | `#ef4444` | Error indicators |
| `--gs-color-warning` | `#f59e0b` | Warning indicators |
| `--gs-color-success` | `#22c55e` | Success indicators |
| `--gs-color-muted` | `#94a3b8` | Muted/secondary text |

### Header Colors

| Token | Default (Light) | Description |
|---|---|---|
| `--gs-color-header-bg` | `#f8fafc` | Header background |
| `--gs-color-header-fg` | `#475569` | Header text color |
| `--gs-color-header-border` | `#e2e8f0` | Header border |
| `--gs-color-header-hover` | `#f1f5f9` | Header hover background |

### Row Colors

| Token | Default (Light) | Description |
|---|---|---|
| `--gs-color-row-bg` | `#ffffff` | Row background |
| `--gs-color-row-bg-alt` | `#f8fafc` | Alternating row background |
| `--gs-color-row-bg-hover` | `#f1f5f9` | Row hover background |
| `--gs-color-row-bg-selected` | `#eff6ff` | Selected row background |
| `--gs-color-row-bg-selected-hover` | `#dbeafe` | Selected row hover background |
| `--gs-color-row-fg` | `#1e293b` | Row text color |

### Cell Colors

| Token | Default (Light) | Description |
|---|---|---|
| `--gs-color-cell-focus-ring` | `rgba(59, 130, 246, 0.4)` | Cell focus ring color |
| `--gs-color-cell-editing-bg` | `#ffffff` | Cell background during editing |
| `--gs-color-cell-editing-border` | `#3b82f6` | Cell border during editing |

### Typography

| Token | Default | Description |
|---|---|---|
| `--gs-font-family` | System font stack | Font family |
| `--gs-font-size` | `13px` | Cell font size |
| `--gs-font-size-header` | `13px` | Header font size |
| `--gs-font-size-small` | `11px` | Small text (badges, etc.) |
| `--gs-font-weight-normal` | `400` | Normal text weight |
| `--gs-font-weight-header` | `600` | Header text weight |
| `--gs-font-weight-bold` | `700` | Bold text weight |
| `--gs-line-height` | `1.5` | Line height |

### Spacing and Sizing

| Token | Default | Description |
|---|---|---|
| `--gs-spacing-cell-horizontal` | `12px` | Horizontal cell padding |
| `--gs-spacing-cell-vertical` | `0px` | Vertical cell padding |
| `--gs-spacing-header-horizontal` | `12px` | Horizontal header padding |
| `--gs-size-row-height` | `40px` | Default row height |
| `--gs-size-header-height` | `48px` | Default header height |
| `--gs-size-scrollbar-width` | `8px` | Scrollbar track width |
| `--gs-size-icon` | `16px` | Icon size |
| `--gs-size-checkbox` | `16px` | Checkbox size |

### Borders, Shadows, and Transitions

| Token | Default | Description |
|---|---|---|
| `--gs-border-width` | `1px` | Border width |
| `--gs-border-radius` | `0px` | Cell border radius |
| `--gs-border-radius-popup` | `8px` | Popup/menu border radius |
| `--gs-shadow-focus-ring` | `0 0 0 2px ...` | Focus ring shadow |
| `--gs-shadow-popup` | `0 4px 16px ...` | Popup/menu shadow |
| `--gs-transition-duration` | `150ms` | Animation duration |
| `--gs-transition-easing` | `cubic-bezier(0.4, 0, 0.2, 1)` | Animation easing |

### Z-Index

| Token | Default | Description |
|---|---|---|
| `--gs-z-header` | `2` | Header z-index |
| `--gs-z-pinned` | `3` | Pinned column z-index |
| `--gs-z-floating-filter` | `4` | Floating filter z-index |
| `--gs-z-overlay` | `10` | Loading/no-rows overlay |
| `--gs-z-popup` | `20` | Popup/context menu |
| `--gs-z-modal` | `30` | Modal overlays |

## Creating a Custom Theme

Create a custom theme by overriding tokens with a CSS class or attribute selector:

```css title="custom-theme.css"
.gs-root[data-theme='corporate'],
.gs-theme-corporate .gs-root {
  --gs-color-background: #fafaf9;
  --gs-color-foreground: #292524;
  --gs-color-border: #d6d3d1;
  --gs-color-accent: #0284c7;
  --gs-color-accent-hover: #0369a1;

  --gs-color-header-bg: #f5f5f4;
  --gs-color-header-fg: #44403c;
  --gs-color-header-border: #d6d3d1;

  --gs-color-row-bg: #fafaf9;
  --gs-color-row-bg-alt: #f5f5f4;
  --gs-color-row-bg-hover: #e7e5e4;
  --gs-color-row-bg-selected: #e0f2fe;
  --gs-color-row-fg: #292524;

  --gs-font-family: 'Inter', sans-serif;
  --gs-border-radius: 4px;
}
```

Apply your custom theme:

```html
<div class="gs-root" data-theme="corporate">
```

:::tip
You only need to override the tokens you want to change. Unset tokens fall back to the light theme defaults defined in `tokens.css`.
:::

## Scoped Overrides

Override tokens on any ancestor element to create per-section themes:

```html title="Mixed themes on one page"
<div style="--gs-color-accent: #8b5cf6;">
  <!-- This grid uses a purple accent -->
  <div class="gs-root" data-theme="light">...</div>
</div>

<div>
  <!-- This grid uses the default blue accent -->
  <div class="gs-root" data-theme="light">...</div>
</div>
```

## Next Steps

- **[Columns](/core-concepts/columns/)** -- Per-column cell styling and CSS classes.
- **[Plugin System](/plugins/plugin-system/)** -- How plugins use themes.
- **[React Guide](/frameworks/react/)** -- Theme prop and controlled mode.
