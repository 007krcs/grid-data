# gridstorm

> **One package. Everything included.** The complete enterprise data grid — core engine, 45+ plugins, framework adapters, theming, i18n, license layer, AI adapter, and the PDF toolkit — all in a single npm install.

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
import { createGrid, SortingPlugin, FilteringPlugin, SelectionPlugin } from 'gridstorm';
import 'gridstorm/theme';

const grid = createGrid({
  container: document.getElementById('grid')!,
  columnDefs: [
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
```

## React

```tsx
import { GridStorm } from 'gridstorm/react';
import { SortingPlugin, FilteringPlugin } from 'gridstorm';
import 'gridstorm/theme';

export function MyGrid() {
  return (
    <GridStorm
      columnDefs={[{ field: 'name' }, { field: 'age' }, { field: 'email' }]}
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
    :columnDefs="[{ field: 'name' }, { field: 'age' }]"
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
- **License layer** — Ed25519-signed enterprise keys, strict-mode enforcement, clock-skew detection, re-attaching watermarks

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

const grid = createGrid({
  container,
  columnDefs,
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
```

For real cross-device sync, swap the BroadcastChannel transport for a server-backed one (e.g. y-websocket, Liveblocks).

---

## LLM-backed natural language

```ts
import { createGrid, AiQueryPlugin, OpenAIAdapter } from 'gridstorm';

const grid = createGrid({
  container,
  columnDefs,
  rowData,
  plugins: [
    AiQueryPlugin({
      adapter: new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4o-mini' }),
    }),
  ],
});

grid.api.dispatchCommand('ai-query:ask', { query: 'sort by revenue descending, group by region' });
```

---

## Licensing

Tier 1 plugins are open-source under MIT. Tier 2 + Tier 3 plugins emit a development-mode `console.warn` until you set a license key:

```ts
import { setGridStormLicense, setLicenseStrictMode } from 'gridstorm';

setGridStormLicense('GS2-...your-signed-key...');
if (import.meta.env.PROD) setLicenseStrictMode(true); // throws on missing license at install
```

Premium plugins still install without a key — only the warning fires (or, in strict mode, a `LicenseRequiredError` is thrown). License keys are Ed25519-signed; legacy `GS-` keys are rejected.

Buy or evaluate at <https://gridstorm.tekivex.com>.

---

## Links

- **Live demos** — <https://grid-data-analytics-explorer.vercel.app/>
- **Documentation hub** — <https://gridstorm.tekivex.com>
- **GitHub** — <https://github.com/007krcs/grid-data>
- **Issues** — <https://github.com/007krcs/grid-data/issues>

## License

MIT for the open-source core. Premium plugins require an enterprise license — see [LICENSE.md](./LICENSE.md).
