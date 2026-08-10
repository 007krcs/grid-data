# gridstorm

> **One package. Everything included. 100% free.** The complete data grid platform — core engine, 45+ plugins, framework adapters, theming, i18n, AI adapter, and the PDF toolkit — all in a single npm install, all MIT-licensed.

[![npm](https://img.shields.io/npm/v/gridstorm)](https://www.npmjs.com/package/gridstorm)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

If you're starting a new project, **install only this package**. You do not need any of the individual `@gridstorm/*` workspace packages — they are all bundled here and re-exported through subpath entries.

---

## Install

```bash
npm install gridstorm
# or
pnpm add gridstorm
# or
yarn add gridstorm
```

Framework runtimes (`react`, `react-dom`, `vue`, `svelte`, `@angular/core`) are **optional peer dependencies** — install only the one you use.

---

## Vanilla TS / JS

```ts
import { createGrid, DomRenderer, SortingPlugin, FilteringPlugin, SelectionPlugin } from 'gridstorm';
import 'gridstorm/theme';

// 1. Create the headless engine (note: the key is `columns`, not `columnDefs`)
const engine = createGrid({
  columns: [
    { field: 'name',   headerName: 'Name'   },
    { field: 'age',    headerName: 'Age'    },
    { field: 'email',  headerName: 'Email'  },
  ],
  rowData: [
    { name: 'Alice', age: 30, email: 'alice@example.com' },
    { name: 'Bob',   age: 25, email: 'bob@example.com'   },
  ],
  plugins: [
    SortingPlugin(),
    FilteringPlugin(),
    SelectionPlugin({ mode: 'multiple' }),
  ],
});

// 2. Attach the DOM renderer to your container element
const renderer = new DomRenderer({
  engine,
  container: document.getElementById('grid')!,
});
renderer.mount();

// engine.api gives you the full grid API (sort, filter, selection, export, ...)
// Cleanup: renderer.destroy(); engine.destroy();
```

## React

```tsx
import { GridStorm } from 'gridstorm/react';
import { SortingPlugin, FilteringPlugin } from 'gridstorm';
import 'gridstorm/theme';

export function MyGrid() {
  return (
    <GridStorm
      columns={[{ field: 'name' }, { field: 'age' }, { field: 'email' }]}
      rowData={rows}
      plugins={[SortingPlugin(), FilteringPlugin()]}
    />
  );
}
```

## Vue 3

```vue
<script setup lang="ts">
import { GridStorm } from 'gridstorm/vue';
import { SortingPlugin, FilteringPlugin } from 'gridstorm';
import 'gridstorm/theme';
</script>

<template>
  <GridStorm
    :columns="[{ field: 'name' }, { field: 'age' }]"
    :rowData="rows"
    :plugins="[SortingPlugin(), FilteringPlugin()]"
  />
</template>
```

## Svelte / Angular

```ts
// Svelte 4+
import { GridStorm } from 'gridstorm/svelte';

// Angular 17+
import { GridStormComponent } from 'gridstorm/angular';
```

---

## Subpath entries

| Import path | What it gives you |
|---|---|
| `gridstorm`            | Core engine + DOM renderer + every plugin + i18n + license + AI adapter |
| `gridstorm/react`      | React adapter (`<GridStorm/>`, hooks, `GridErrorBoundary`, portals) |
| `gridstorm/vue`        | Vue 3 adapter (component, composables, `GridErrorBoundary`) |
| `gridstorm/svelte`     | Svelte adapter |
| `gridstorm/angular`    | Angular adapter |
| `gridstorm/plugins`    | Every plugin, **without** the core engine — for code-splitting setups |
| `gridstorm/pdf`        | PDF toolkit (renderer + form-fill + text extraction + PII detection) |
| `gridstorm/theme`      | CSS tokens (light / dark / high-contrast / density modes) |

---

## Everything bundled

### Core platform
- **Headless engine** — store, event bus, command bus, plugin manager, row model pipeline
- **DOM renderer** — virtual scrolling, keyboard navigation, full ARIA contract, focus management
- **Theme** — CSS custom properties; runtime light / dark / high-contrast / compact switching
- **i18n** — 20 built-in locales, `{placeholder}` interpolation via `tWith()`, RTL auto-apply on the React adapter

### Plugins (45+)

**Core (open source).** `SortingPlugin`, `FilteringPlugin`, `SelectionPlugin`, `EditingPlugin`, `PaginationPlugin`, `ColumnPinningPlugin`, `ColumnResizePlugin`, `ColumnReorderPlugin`, `ContextMenuPlugin`, `ClipboardPlugin`, `A11yPlugin`.

**Enterprise.** `GroupingPlugin`, `AggregationPlugin`, `PivotPlugin`, `MasterDetailPlugin`, `TreeDataPlugin`, `RowReorderPlugin`, `ExcelExportPlugin`, `PdfExportPlugin`, `SparklinePlugin`, `ChartsPlugin`, `SSRMPlugin`, `ClipboardProPlugin`, `CellRangePlugin`, `ColumnAutoSizePlugin`, `RowPinningPlugin`.

**Next-gen.** `StatusBarPlugin`, `StatePersistencePlugin`, `ConditionalFormattingPlugin`, `StreamingPlugin`, `AdaptiveRendererPlugin`, `TemporalPlugin`, `TimeTravelPlugin`, `CollabPlugin`.

**Formula cluster.** `FormulaPlugin`, `FormulaEnginePlugin`, `CellFormulaPlugin`.

**Intelligence cluster.** `AIPlugin` *(deprecated — prefer `AiQueryPlugin`)*, `AnomalyPlugin`, `NlQueryPlugin`, `IntelligenceHubPlugin`, `IntentEnginePlugin`, `SemanticPlugin`.

**Privacy.** `PrivacyLensPlugin`.

**Validation.** `ValidationPlugin`.

**Realtime collab (Pillar 1).** `PresencePlugin` + `BroadcastChannelPresenceAdapter`, `YjsCellsPlugin` + `BroadcastChannelCrdtTransport`, `CommentsPlugin`.

**LLM-backed (Pillar 2).** `AiQueryPlugin`, `CellAutocompletePlugin`.

### AI adapter (vendor-neutral, BYO LLM)
`EchoAdapter` (offline mock), `OpenAIAdapter`, structured-output via `synthesizeFromSchema`, helpers `isAIError`, `supportsEmbedding`, `supportsStreaming`. Use any provider by implementing the `AIAdapter` interface.

### PDF toolkit (`gridstorm/pdf`)
Headless PDF rendering, form filling, text extraction, PII detection.

---

## Realtime example (zero backend, two-tab sync)

`BroadcastChannel`-based transports ship for `PresencePlugin`, `YjsCellsPlugin`, and `CommentsPlugin`. Open the same page in two browser tabs and they converge — no server required.

```ts
import {
  createGrid,
  SortingPlugin,
  YjsCellsPlugin,
  BroadcastChannelCrdtTransport,
  PresencePlugin,
  BroadcastChannelPresenceAdapter,
} from 'gridstorm';

const engine = createGrid({
  columns,
  rowData,
  plugins: [
    SortingPlugin(),
    YjsCellsPlugin({
      docId: 'my-grid',
      transport: new BroadcastChannelCrdtTransport({ docId: 'my-grid' }),
    }),
    PresencePlugin({
      author: { userId: 'u1', displayName: 'You', color: '#06b6d4' },
      adapter: new BroadcastChannelPresenceAdapter({ channelName: 'my-grid' }),
    }),
  ],
});
// Attach a DomRenderer as in Quick Start, or pass the plugins to the
// React/Vue <GridStorm> component instead.
```

`BroadcastChannel` reaches tabs of the **same browser on the same machine only**. Two things extend it:

- **Persistence:** pass `persist: true` to `BroadcastChannelCrdtTransport` and the doc is saved to localStorage — comments and co-edits survive closing every tab (~5MB origin cap applies).
- **Cross-device sync:** use the bundled `WebSocketCrdtTransport` / `WebSocketPresenceAdapter` against a trivial relay server (any WebSocket server that forwards each frame to the other clients in the same room — a ~20-line reference relay is in the transport's source docs):

```ts
import { WebSocketCrdtTransport, WebSocketPresenceAdapter } from 'gridstorm';

YjsCellsPlugin({
  docId: 'my-grid',
  transport: new WebSocketCrdtTransport({ url: 'wss://collab.example.com', docId: 'my-grid' }),
});
PresencePlugin({
  author,
  adapter: new WebSocketPresenceAdapter({ url: 'wss://collab.example.com', channelName: 'my-grid' }),
});
```

For production-grade collaboration (auth, persistence, scale), a y-websocket server or Liveblocks Yjs Provider remains the recommended path.

---

## LLM-backed natural language

Bring your own provider — `OpenAIAdapter`, `AnthropicAdapter`, or any object implementing the `AIAdapter` interface. (`EchoAdapter` is an offline mock for demos and tests — it is not an LLM.)

```ts
import { createGrid, AiQueryPlugin, OpenAIAdapter, AnthropicAdapter } from 'gridstorm';

const engine = createGrid({
  columns,
  rowData,
  plugins: [
    AiQueryPlugin({
      adapter: new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4o-mini' }),
    }),
  ],
});

engine.api.dispatchCommand('ai-query:ask', { query: 'sort by revenue descending, group by region' });
```

---

## Licensing — fully free

**Every plugin is free, MIT-licensed, no key required.** There are no enterprise tiers, no premium plugins, no watermarks, no `console.warn` for unlicensed plugins, no domain restrictions. Use any plugin in production without contacting anyone or paying anything.

The legacy `setGridStormLicense()`, `validateLicense()`, and `enforceLicense()` exports are kept as permissive no-ops so older code keeps compiling — you can safely delete every call to them.

---

## Known limitations (honest edition)

- **Framework adapters are not at parity.** React is the most complete (component + 8 hooks + ErrorBoundary + portals). Vue has the component, composables, and an ErrorBoundary. Svelte and Angular are functional but thinner. If adapter depth matters, React or Vue are the safe picks today.
- **Excel/PDF export builds the whole document in memory.** Enforced caps: 100k rows / 5M cells (Excel), 25k rows / 1M cells (PDF). No streaming export yet — very large exports should be chunked by the caller.
- **`Store.setState()` is advisory, not locked down.** The "commands are the only way to mutate state" invariant emits a dev-mode warning when bypassed, but is not enforced at runtime. Direct mutation fights with undo/time-travel.
- **BroadcastChannel collab is same-browser scope** (see the realtime section above for the WebSocket path). The bundled WebSocket transports use a simple JSON relay protocol — they are not the y-websocket protocol.
- **localStorage persistence caps at ~5MB per origin.** Fine for comments and cell edits; use a server-backed provider for large documents.

## Links

- **Live demos** — <https://grid-data-analytics-explorer.vercel.app/>
- **Documentation hub** — <https://gridstorm.tekivex.com>
- **GitHub** — <https://github.com/007krcs/grid-data>
- **Issues** — <https://github.com/007krcs/grid-data/issues>

## License

[MIT](./LICENSE.md). Everything — every plugin, every adapter, the AI bridge, the PDF toolkit — is MIT.
