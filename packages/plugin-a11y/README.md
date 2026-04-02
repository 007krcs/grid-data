# @gridstorm/plugin-a11y

WCAG 2.1 AA accessibility plugin for [GridStorm](https://gridstorm.tekivex.com) — screen reader announcements, skip navigation, high-contrast mode, and full keyboard navigation.

## Install

```bash
npm install @gridstorm/plugin-a11y
```

## Quick Start

```ts
import { createGrid } from '@gridstorm/core';
import { a11yPlugin } from '@gridstorm/plugin-a11y';

const grid = createGrid({
  plugins: [a11yPlugin()],
  columns: [...],
  data: [...],
});
```

## Features

- **WCAG 2.1 AA compliance** — aria-rowcount, aria-colindex, aria-sort, aria-selected on all elements
- **Live region announcements** — debounced screen reader messages for sort, filter, selection, pagination, and edit events
- **Skip navigation links** — "Skip to grid" / "Skip past grid" for keyboard users
- **High-contrast mode** — auto-detects `prefers-contrast: more` and `forced-colors: active`
- **Header keyboard enhancements** — Enter to sort, Space to select column

## Options

```ts
a11yPlugin({
  announcements: true,      // enable live region (default: true)
  skipNav: true,            // inject skip links (default: true)
  highContrast: 'auto',     // 'auto' | 'on' | 'off'
})
```

## Commands

| Command | Payload | Description |
|---|---|---|
| `a11y:announce` | `{ message: string }` | Announce custom message |
| `a11y:setMode` | `{ mode: 'polite' \| 'assertive' }` | Set live region mode |
| `a11y:toggleHighContrast` | `{ enabled: boolean }` | Toggle high-contrast CSS |

## Documentation

Full docs at [gridstorm.tekivex.com/docs/plugins/a11y](https://gridstorm.tekivex.com/#/docs/plugins/a11y)

## License

MIT © [GridStorm](https://gridstorm.tekivex.com)
