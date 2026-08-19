<h1 align="center">
  <br>
  <strong>⚡ GridStorm</strong>
  <br>
  <sub>The open-source data grid with the enterprise features — free.</sub>
</h1>

<p align="center">
  Grouping · Pivoting · Master-Detail · Excel Export · CRDT Collab · AI Query · Formulas · Time Travel<br>
  <strong>All MIT. No license keys. No watermarks. One npm install.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/gridstorm"><img src="https://img.shields.io/npm/v/gridstorm?color=cb3837&label=npm" alt="npm version" /></a>
  <a href="https://github.com/007krcs/grid-data/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/007krcs/grid-data/ci.yml?branch=main&label=CI" alt="CI" /></a>
  <img src="https://img.shields.io/badge/tests-2%2C100%2B-green" alt="2,100+ tests" />
  <img src="https://img.shields.io/badge/core-%3C50KB-orange" alt="<50KB core" />
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-purple" alt="MIT license" /></a>
  <img src="https://img.shields.io/badge/TypeScript-5.9-blue" alt="TypeScript 5.9" />
</p>

<p align="center">
  <a href="https://grid-data-analytics-explorer.vercel.app/"><strong>▶ Try the live demos</strong></a> — 40+ interactive plugin demos, no signup, no build step.
</p>

---

## Why GridStorm

The features other data grids charge $999+/developer for are free and MIT-licensed here:

| Feature | GridStorm | AG Grid Community | AG Grid Enterprise |
|---|:---:|:---:|:---:|
| Sorting / filtering / editing / selection | ✅ Free | ✅ Free | ✅ |
| Virtual scrolling (100K+ rows @ 60fps) | ✅ Free | ✅ Free | ✅ |
| **Row grouping + aggregation** | ✅ Free | ❌ | 💰 $999+/dev |
| **Pivoting** | ✅ Free | ❌ | 💰 |
| **Master-detail** | ✅ Free | ❌ | 💰 |
| **Tree data** | ✅ Free | ❌ | 💰 |
| **Excel export** | ✅ Free | ❌ | 💰 |
| **Server-side row model** | ✅ Free | ❌ | 💰 |
| **Clipboard pro (type coercion, fill)** | ✅ Free | ❌ | 💰 |
| **Sparklines + charts** | ✅ Free | ❌ | 💰 |
| **CRDT co-editing (Yjs)** | ✅ Free | ❌ | ❌ not offered |
| **Live cursors / presence** | ✅ Free | ❌ | ❌ not offered |
| **Cell comments (CRDT threads)** | ✅ Free | ❌ | ❌ not offered |
| **LLM-backed natural-language query** | ✅ Free (BYO key) | ❌ | ❌ not offered |
| **Formula engine (AST, no eval)** | ✅ Free | ❌ | ❌ not offered |
| **Time-travel undo/redo snapshots** | ✅ Free | ❌ | ❌ not offered |

*AG Grid is an excellent, mature product — if you need its decade of edge-case hardening, buy it. GridStorm is for everyone who needs enterprise grid features without an enterprise budget.*

## Quick Start

Everything ships in **one package**:

```bash
npm install gridstorm
```

```tsx
// React
import { GridStorm } from 'gridstorm/react';
import { SortingPlugin, FilteringPlugin, GroupingPlugin } from 'gridstorm';
import 'gridstorm/theme';

function App() {
  return (
    <GridStorm
      columns={[
        { field: 'name', headerName: 'Name', sortable: true },
        { field: 'dept', headerName: 'Department' },
        { field: 'salary', headerName: 'Salary', width: 120 },
      ]}
      rowData={rows}
      plugins={[SortingPlugin(), FilteringPlugin(), GroupingPlugin()]}
      height={400}
    />
  );
}
```

```ts
// Vanilla TS — headless engine + DOM renderer
import { createGrid, DomRenderer, SortingPlugin } from 'gridstorm';
import 'gridstorm/theme';

const engine = createGrid({ columns, rowData, plugins: [SortingPlugin()] });
new DomRenderer({ engine, container: document.getElementById('grid')! }).mount();
```

Vue 3 (`gridstorm/vue`), Svelte (`gridstorm/svelte`), and Angular (`gridstorm/angular`) adapters included. Prefer granular installs? Every plugin is also published as `@gridstorm/plugin-*`.

## Realtime collaboration, zero backend

```ts
import { YjsCellsPlugin, BroadcastChannelCrdtTransport,
         PresencePlugin, BroadcastChannelPresenceAdapter } from 'gridstorm';

// Two tabs of the same browser converge instantly — no server.
// persist: true keeps state in localStorage across reloads.
YjsCellsPlugin({
  docId: 'my-grid',
  transport: new BroadcastChannelCrdtTransport({ docId: 'my-grid', persist: true }),
});
```

Cross-device? Swap in the bundled `WebSocketCrdtTransport` / `WebSocketPresenceAdapter` against any ~20-line relay server (reference implementation in the source docs).

## AI-native, vendor-neutral

```ts
import { AiQueryPlugin, AnthropicAdapter } from 'gridstorm';

AiQueryPlugin({
  adapter: new AnthropicAdapter({ apiKey: process.env.ANTHROPIC_API_KEY! }),
});
// engine.api.dispatchCommand('aiQuery:ask', { text: 'sort by revenue desc, group by region' })
```

`OpenAIAdapter` and `AnthropicAdapter` ship in the box; the `AIAdapter` interface is ~2 methods if you want another provider. An offline `EchoAdapter` mock powers demos and tests. There's also an [MCP server](./packages/mcp-server) exposing grid operations as tools for LLM agents.

## What's in the box

- **Headless core** (<50KB, tree-shakeable) — store, event bus, command bus, plugin manager
- **DOM renderer** — virtual scrolling, keyboard nav, full ARIA contract (screen-reader tested)
- **45+ plugins** across sorting/filtering/editing → grouping/pivoting/exports → CRDT collab/AI/formulas
- **4 framework adapters** — React (most complete: 8 hooks + ErrorBoundary + portals), Vue 3, Svelte, Angular
- **Theming** — CSS custom properties; light/dark/high-contrast; density modes; RTL
- **i18n** — 20 locales, CLDR pluralization via `Intl.PluralRules`, `{placeholder}` interpolation
- **PDF toolkit** — viewer, text extraction, form fill, PII detection (`gridstorm/pdf`)

## Architecture

```
                    ┌───────────────────────────┐
                    │     Framework Adapters    │
                    │ React · Vue · Svelte · Ng │
                    └────────────┬──────────────┘
                                 │
                    ┌────────────▼──────────────┐
                    │       DOM Renderer        │
                    │   Virtual scroll · ARIA   │
                    └────────────┬──────────────┘
                                 │
┌────────────────┐  ┌────────────▼──────────────┐  ┌────────────────┐
│  45+ Plugins   │◄─│        Core Engine        │─►│  PDF Toolkit   │
│ Sort · Group · │  │  Store · EventBus ·       │  │ Render · Text  │
│ Pivot · CRDT · │  │  CommandBus · Plugins     │  │ Forms · PII    │
│ AI · Formulas  │  └───────────────────────────┘  └────────────────┘
└────────────────┘
```

- DOM-based rendering (not Canvas) → real accessibility and CSS theming
- Headless core, thin adapters → works in any framework or none
- Command-driven mutations → undo/redo and time-travel come naturally
- Plugins with topological dependency resolution

Deep dive: [ARCHITECTURE.md](./ARCHITECTURE.md) · Honest limitations: [package README](./packages/gridstorm/README.md#known-limitations-honest-edition)

## Development

```bash
git clone https://github.com/007krcs/grid-data.git
cd grid-data && pnpm install
pnpm build          # build all packages
pnpm test:run       # 2,100+ tests
cd examples/feature-showcase && npm run dev   # 40+ interactive demos
```

## Contributing

PRs welcome — the plugin pattern makes features easy to add in isolation. Read [ARCHITECTURE.md](./ARCHITECTURE.md) first, follow the existing plugin structure, add tests, and run `pnpm test:run` + `pnpm typecheck` before submitting.

Good first contributions: a new locale in `packages/i18n`, a plugin demo in `examples/feature-showcase`, or closing an item from the [limitations list](./packages/gridstorm/README.md#known-limitations-honest-edition).

## License

[MIT](./packages/gridstorm/LICENSE.md) — every package, every plugin, every adapter. No license keys, no watermarks, no enterprise tier.

---

<p align="center">
  <a href="https://grid-data-analytics-explorer.vercel.app/">Live demos</a> ·
  <a href="https://gridstorm.tekivex.com/">Docs</a> ·
  <a href="https://www.npmjs.com/package/gridstorm">npm</a> ·
  <a href="https://github.com/007krcs/grid-data/issues">Issues</a>
</p>
