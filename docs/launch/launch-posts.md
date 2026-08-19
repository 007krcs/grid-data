# GridStorm launch posts

Three drafts, one per venue. Post order matters: dev.to article first (it's the
"long version" the other two can link to), then r/reactjs, then Show HN last —
HN traffic is the biggest spike and everything should be warmed up before it.

Pre-flight checklist before posting ANY of these:
- [ ] `gridstorm@0.5.1` published (visual npm page live)
- [ ] GitHub billing fixed → CI badge green
- [ ] Repo topics + description set
- [ ] Live demo loads fast on a phone (test it — HN will)
- [ ] You can respond to comments for the first 3–4 hours after posting

---

## 1. Show HN (news.ycombinator.com/submit)

**Title (80 char max, no marketing words — HN strips/flags them):**

> Show HN: GridStorm – MIT data grid with grouping, pivoting, CRDT co-editing

**URL:** https://grid-data-analytics-explorer.vercel.app/

**First comment (post this yourself immediately after submitting — it's where
Show HN authors give context):**

> Hi HN — I built GridStorm because the data-grid market splits into two camps:
> free grids without the features (grouping, pivoting, Excel export, tree data)
> and enterprise grids that charge $999+/developer for them.
>
> GridStorm is the whole feature set under MIT. One `npm install gridstorm`
> gets you the headless TypeScript core (<50KB), 45+ plugins, and adapters for
> React/Vue/Svelte/Angular.
>
> A few things I haven't seen in other grids at any price:
>
> - CRDT co-editing (Yjs) — two users edit the same cell, edits converge
>   deterministically. Works cross-tab with zero backend via BroadcastChannel,
>   or cross-device over a ~20-line WebSocket relay.
> - Cell comment threads, also CRDT-backed, with localStorage persistence.
> - Natural-language grid queries ("sort by revenue desc, group by region")
>   through a vendor-neutral adapter — bring your own OpenAI/Anthropic key,
>   or implement the 2-method interface for any other provider.
> - Time-travel undo/redo via state snapshots.
>
> Architecture notes: DOM rendering (not canvas) so accessibility and CSS
> theming actually work; commands are the only sanctioned state mutation path,
> which is what makes time-travel cheap; formula engine is AST-based, no eval.
>
> Honest limitations (also in the README): the React adapter is the most
> complete and Angular/Svelte are thinner; Excel/PDF export builds in memory
> (capped, no streaming yet); the WebSocket transport is a simple JSON relay,
> not the y-websocket protocol. It's one maintainer and ~2,100 tests, not a
> decade of enterprise hardening — if you need that, AG Grid is genuinely
> good and worth its price.
>
> Demos: 40+ interactive, no signup. Would love feedback on the plugin API
> design in particular.

**HN survival notes:**
- Post Tue–Thu, 8–10am ET. Never Friday/weekend.
- Reply to every substantive comment in the first hours, especially critical
  ones. "You're right, that's on the roadmap" outperforms defensiveness.
- Do NOT ask friends to upvote (ring detection kills the post).
- If someone benchmarks you against AG Grid and wins, thank them and file it.

---

## 2. r/reactjs (use "Show /r/reactjs" flair)

**Title:**

> I made an MIT-licensed data grid where grouping, pivoting, Excel export, and
> CRDT co-editing are all free (React adapter with hooks + ErrorBoundary)

**Body:**

> **Live demos (40+):** https://grid-data-analytics-explorer.vercel.app/
> **npm:** https://www.npmjs.com/package/gridstorm
> **GitHub:** https://github.com/007krcs/grid-data
>
> Every React data-grid thread ends the same way: "the free tier doesn't have
> grouping" / "Enterprise is $999 per developer." So I built the whole thing
> MIT.
>
> ```tsx
> import { GridStorm } from 'gridstorm/react';
> import { SortingPlugin, GroupingPlugin, AggregationPlugin } from 'gridstorm';
> import 'gridstorm/theme';
>
> <GridStorm
>   columns={[{ field: 'name' }, { field: 'dept' }, { field: 'salary' }]}
>   rowData={rows}
>   plugins={[SortingPlugin(), GroupingPlugin(), AggregationPlugin()]}
>   height={400}
> />
> ```
>
> React-specific bits: 8 hooks (`useGridApi`, `useGridSelection`,
> `useGridSort`, `useGridFilter`, `useGridPagination`, ...), an ErrorBoundary,
> and portal-based custom cell renderers so your components render inside
> cells with real React context.
>
> The unusual stuff: CRDT co-editing via Yjs (open the demo in two tabs and
> edit the same cell), live cursors, CRDT comment threads, natural-language
> queries with a bring-your-own-LLM adapter, and time-travel undo/redo.
>
> Honest caveats: React is the most complete adapter (Vue close behind,
> Svelte/Angular thinner), export builds in memory with row caps, and it's
> 2,100 tests + one maintainer — not AG Grid's decade of edge cases. The
> README has a "Known limitations" section because I'd rather you find out
> there than in production.
>
> Feedback on the hook APIs very welcome — that's the part I've iterated on
> most.

---

## 3. dev.to article

**Title:** I built the "$999/developer" data-grid features and MIT-licensed all of them

**Tags:** `react`, `typescript`, `opensource`, `webdev`

**Body:**

> *(Cover image: docs/assets/gridstorm-showcase.png from the repo)*
>
> ## The two-camp problem
>
> If you've ever shipped a data-heavy app, you know the drill. You start with
> a free grid. Three sprints later someone asks for row grouping with
> aggregation, or pivot mode, or Excel export — and you discover those live
> behind an enterprise license that costs more per developer than your
> laptop.
>
> The features aren't magic. They're just gated. So I spent the last several
> months building GridStorm: a TypeScript data-grid platform where the entire
> feature set — the community tier AND the enterprise tier AND some things no
> grid offers at any price — is MIT.
>
> ## What "everything" means
>
> One install:
>
> ```bash
> npm install gridstorm
> ```
>
> That single package bundles the headless core engine (<50KB, tree-shakeable),
> 45+ plugins, four framework adapters (`gridstorm/react`, `/vue`, `/svelte`,
> `/angular`), theming, i18n with CLDR pluralization, and a PDF toolkit.
>
> The plugin list covers the usual suspects (sorting, filtering, editing,
> selection, virtual scrolling for 100K+ rows) and the usually-paid suspects:
> row grouping + aggregation, pivoting, master-detail, tree data, Excel/PDF
> export, server-side row model, sparklines, charts, conditional formatting
> with 18 rule types.
>
> ## The parts I'm most excited about
>
> ### CRDT co-editing with zero backend
>
> ```ts
> import { YjsCellsPlugin, BroadcastChannelCrdtTransport } from 'gridstorm';
>
> YjsCellsPlugin({
>   docId: 'my-grid',
>   transport: new BroadcastChannelCrdtTransport({ docId: 'my-grid', persist: true }),
> });
> ```
>
> Open two tabs, edit the same cell in both — Yjs converges them
> deterministically. `persist: true` snapshots to localStorage so state
> survives closing every tab. For cross-device, there's a WebSocket transport
> that works against any ~20-line relay server.
>
> ### Natural-language queries, vendor-neutral
>
> ```ts
> import { AiQueryPlugin, AnthropicAdapter } from 'gridstorm';
>
> AiQueryPlugin({ adapter: new AnthropicAdapter({ apiKey: KEY }) });
> // "sort by revenue descending, group by region" → grid does it
> ```
>
> The adapter interface is two methods. OpenAI and Anthropic adapters ship in
> the box; an offline Echo mock powers the demos so nothing phones home.
>
> ### Time travel
>
> Because all state mutations flow through a command bus, snapshot-based
> undo/redo across sorts, filters, and edits came almost free. It's a plugin
> like everything else.
>
> ## Architecture decisions that shaped it
>
> 1. **DOM rendering, not canvas.** Canvas grids are faster at the extreme
>    high end, but you lose real accessibility (screen readers), CSS theming,
>    and browser-native text handling. GridStorm holds 60fps at 100K rows
>    with virtual scrolling, which covers the real-world range, and keeps a
>    full ARIA contract.
> 2. **Headless core + thin adapters.** The engine knows nothing about React.
>    The React adapter is ~35KB and adds hooks, an ErrorBoundary, and portal
>    rendering so your components work inside cells.
> 3. **Commands as the mutation path.** One sanctioned way to change state
>    makes undo/time-travel/collab tractable. (Honesty: it's a convention
>    with dev-mode warnings, not a hard runtime wall — documented in the
>    README.)
> 4. **AST formula engine.** No `eval`, no `new Function` — verified by tests.
>
> ## What it doesn't do (yet)
>
> The README has a "Known limitations (honest edition)" section, and I'll
> repeat the highlights: Angular and Svelte adapters are thinner than
> React/Vue; exports build in memory with enforced row caps rather than
> streaming; the bundled WebSocket transport speaks a simple JSON relay
> protocol, not y-websocket. If you need ten years of enterprise edge-case
> hardening, AG Grid has earned its price — GridStorm is for everyone who
> needs the features without the budget.
>
> ## Try it
>
> - **Live demos (40+):** https://grid-data-analytics-explorer.vercel.app/
> - **npm:** https://www.npmjs.com/package/gridstorm
> - **GitHub:** https://github.com/007krcs/grid-data — stars help more than
>   you'd think at this stage, and issues/PRs are answered.
>
> What features would you actually need before adopting a grid like this?
> That's the roadmap input I want most.

---

## Post-launch (all venues)

- Watch npm weekly downloads + GitHub traffic (Insights → Traffic) for 7 days.
- Every feature request that recurs twice → GitHub issue, label `community`.
- If HN goes well, follow up in ~1 month with a technical deep-dive post
  ("How CRDT cell editing works in GridStorm") — technical content sustains
  what launch spikes start.
