---
title: PDF Toolkit Overview
description: An introduction to the GridStorm PDF toolkit — a headless PDF engine with renderer, text plugin, and theming.
---

The GridStorm PDF Toolkit is a modular, headless PDF viewing and annotation platform that follows the same architecture as the data grid: a core engine, a DOM renderer, and a plugin system.

## Packages

| Package | Purpose |
|---|---|
| `@gridstorm/pdf-core` | Headless engine: store, event bus, command bus, annotation model |
| `@gridstorm/pdf-renderer` | Canvas + DOM renderer with toolbar, text layer, and annotation layer |
| `@gridstorm/pdf-plugin-text` | Text search, selection, and extraction |
| `@gridstorm/pdf-theme` | Light, dark, and high-contrast themes via CSS custom properties |

## Quick Start

```ts title="Initialize the PDF engine"
import { createPdfEngine } from '@gridstorm/pdf-core';
import { PdfRenderer } from '@gridstorm/pdf-renderer';
import { createTextPlugin } from '@gridstorm/pdf-plugin-text';
import { applyPdfTheme } from '@gridstorm/pdf-theme';

const engine = createPdfEngine({
  initialZoom: 1.0,
  plugins: [createTextPlugin()],
});

const renderer = new PdfRenderer({
  api: engine.api,
  container: document.getElementById('viewer')!,
  enableToolbar: true,
  enableTextLayer: true,
  enableAnnotationLayer: true,
});

renderer.mount();
applyPdfTheme(document.getElementById('viewer')!, 'light');
```

## Core API

The engine exposes a familiar API surface:

- `api.goToPage(index)` -- Navigate to a page
- `api.setZoom(level)` -- Set zoom level
- `api.setToolMode(mode)` -- Switch between select, hand, and text-select
- `api.undo()` / `api.redo()` -- Undo/redo annotation changes
- `api.addEventListener(event, handler)` -- Subscribe to engine events

## Annotations

Create annotations via the command bus:

```ts
engine.commandBus.dispatch('annotation:create', {
  annotation: {
    type: 'highlight',
    pageIndex: 0,
    rect: [72, 620, 540, 640],
    color: rgba(255, 235, 59, 0.4),
    // ...
  },
});
```

Supported annotation types: `highlight`, `text`, `rectangle`, `underline`, `strikeout`.

## Theming

The PDF toolkit uses CSS custom properties, matching the grid theming approach:

```ts
applyPdfTheme(container, 'dark'); // 'light' | 'dark' | 'high-contrast'
```

## Next Steps

- **[Plugin System](/plugins/plugin-system/)** -- Understand the shared plugin architecture.
- **[Sorting](/plugins/sorting/)** -- Learn how the same pattern applies to grid plugins.
