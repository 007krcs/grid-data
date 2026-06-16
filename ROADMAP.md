# GridStorm Roadmap — what to build next

> Drafted 2026-05-28 as a tech-architect view of where the platform should go
> over the next 12–24 months. Builds on the architectural reality captured in
> `ARCHITECTURE.md §15`, the consolidation plan in
> `PLUGIN_CONSOLIDATION_PLAN.md`, and the SEO/discovery work in `SEO_PLAN.md`.
> The framing question this document answers: *"What's the most useful
> problem GridStorm could solve next, and how should we architect for it?"*

## TL;DR

**The single highest-value problem to solve next is: collaborative,
AI-assisted data editing on the web.** No data grid library does this well
today. AG Grid, TanStack Table, MUI DataGrid, Handsontable are all
single-user, single-context tools with bolt-on AI. The grid that wins the
next decade is the one that's collaborative-first and AI-native, with mobile
support and enterprise security as table stakes.

GridStorm is unusually well-positioned for this bet because:

1. The plugin architecture means we can add collaboration as a layer without
   rewriting the engine.
2. The MCP server already exists (we shipped fail-closed permissions for it
   this week) — we have the right scaffolding for AI integration.
3. The DOM renderer is already accessible and theme-flexible (WCAG 2.1 AA),
   which lowers the cost of mobile + voice work.
4. Plugin-grouping's coupling-into-core problems and the formula cluster's
   collision risks are documented and on a fix path — the foundation can
   actually carry new pillars.

Four pillars below, each with concrete phases. Pillar 1 (Collaboration) is
the lead investment. Pillars 2–4 reinforce it; they're not independent
tracks.

## The four pillars

### Pillar 1 — Collaboration as first-class infrastructure

**Problem.** Spreadsheets, BI tools, and "data apps" are increasingly
multi-user, multi-context products. Sales teams co-edit pipelines. Finance
teams co-review forecasts. Operations co-triage incidents. Today they leave
the grid to do this in Google Sheets, Notion, Airtable, or a
purpose-built SaaS, then export back. **The grid is the wrong tool because
it doesn't know other humans exist.**

**Why GridStorm should solve this.** The plugin system, command bus, and
event bus are already the right shape — collaboration is "events from
remote users routed through the same command pipeline as local events." We
don't need to redesign; we need to add a transport layer and a conflict
strategy.

**What ships, in order.**

- **1.1 Presence** — show which users are viewing the same grid, with
  cursor positions and current selection. Read-only signal; no merging
  required. CRDT-free. ~1 week. Foundation for everything else.
- **1.2 Selection + scroll broadcast** — users see each other's
  selections highlighted, with a name badge. Optional follow-mode (watch
  another user's viewport). Same transport as 1.1.
- **1.3 CRDT cell editing** — two users editing the same cell converge to
  a deterministic value with no lock. Use Yjs (mature, battle-tested) as
  the underlying CRDT; abstract behind a `CollabAdapter` so we can swap
  in Automerge or a custom impl later. The plugin manages the Y.Doc, the
  command bus stays unchanged. ~2–3 weeks of focused work, plus property
  tests for convergence.
- **1.4 Comment threads on cells** — anchored to row+col IDs. Threads
  persist independently of cell value. Markdown bodies, @-mentions. ~1
  week.
- **1.5 RBAC at cell/row/column granularity** — declarative
  `permissions: (user, cell) => Permission` hooks evaluated server-side
  for the canonical truth and client-side for UX. The grid renders
  permission errors as cell badges, not modal popups. ~2 weeks.
- **1.6 Audit log** — every command + remote update lands in an append-
  only log keyed by user + timestamp + before/after. Server adapter sinks
  to PostgreSQL/CloudWatch/Datadog. ~1 week to make the API surface,
  reference adapter, and one tested integration.

**Architecture additions required.**

- A `transport` plugin layer that bridges the command/event bus to a
  WebSocket or WebTransport channel. Hand-coded today; the streaming
  plugin already proves the bus can carry remote events.
- A `CollabAdapter` interface with three reference impls: in-memory
  (testing), Yjs+y-websocket (default), and a no-op (single-user fallback).
- A `PermissionResolver` interface invoked by the renderer before every
  cell edit. Resolution must be sync at the client (latency); the server
  re-validates async.

**Non-goals for this pillar.**

- We do not write our own CRDT library. Yjs and Automerge are mature; we
  pick one and adapt.
- We do not build the auth server. We expose hooks (`getCurrentUser`,
  `getPermissionForCell`) and let consumers wire to their existing IDP.
- We do not become a SaaS. We're still a library; the
  WebSocket server is an adapter, not a service.

### Pillar 2 — Native AI throughout the grid

**Problem.** Excel Copilot raised the bar. Every data tool now needs to
answer questions like "summarize the rows where status=failed", "fill in
this column based on the others", "what does this anomaly mean?". Today
`plugin-ai` does regex-pattern matching, `plugin-nl-query` is similar,
`plugin-anomaly` is z-score + IQR. **None of them are actually AI.**

**Why now.** OpenAI/Anthropic/Google models are commodity-priced for
batch inference. The MCP server we shipped this week is exactly the
plumbing we need for LLM-driven workflows. We don't need to host
inference; we need to make the grid speak the LLM's language fluently.

**What ships, in order.**

- **2.1 `@gridstorm/ai-adapter`** — vendor-neutral interface for
  inference. Reference impls: OpenAI, Anthropic, Vercel AI SDK
  (passthrough), local-only (no network). Every other AI feature accepts
  an `aiAdapter` config; users pick their vendor. **This must ship before
  any of 2.2–2.6 because they all depend on it.**
- **2.2 NL query, LLM-backed** — replace the regex parser in
  `plugin-nl-query` with adapter-routed inference. Old regex stays as
  fallback for offline / no-key. Tooling: structured output (function
  calling) for sort/filter/group operations. ~1 week.
- **2.3 Cell autocomplete (a.k.a. "Copilot for cells")** — user starts
  typing in a cell, the adapter suggests completions based on row context
  + column header semantics + adjacent values. Accept with Tab, dismiss
  with Esc. ~2 weeks because the UX is fiddly.
- **2.4 Formula suggestion** — "show me revenue by quarter" → engine
  emits the actual formula or grouping operation. Integrates with
  `plugin-formula`. ~1 week building on 2.2's structured-output groundwork.
- **2.5 Explain mode** — click an anomaly, get an LLM-generated
  explanation that cites the rows it considered. Combines `plugin-anomaly`
  output with the adapter. ~1 week.
- **2.6 Summarization** — for any group or selection, generate a 2-line
  summary in the status bar. ~3 days.

**Architecture additions required.**

- `aiAdapter` interface in `@gridstorm/ai-adapter`. Single config shape;
  every dependent plugin reads it from `ctx.config`.
- A telemetry hook for AI calls (latency, tokens, cost). Wires to the
  same observability surface as `ErrorHandler`.
- A privacy-respecting redaction layer for cell content before it leaves
  the browser, configurable per-column (PII-marked columns get sent as
  hashes or placeholders). Reuses signal from `plugin-privacy-lens`.

**Non-goals.**

- We do not host inference. No GridStorm-branded API key.
- We do not pre-train a "data grid LLM." Generic models are sufficient.
- We do not retrain user data. The adapter exposes "do not log" options;
  honoring them is the consumer's responsibility (we document it).

### Pillar 3 — Mobile and accessibility as platform features

**Problem.** Every major data grid is desktop-first. Mobile is bolted on
via responsive CSS that breaks at edge cases. Voice control doesn't exist.
**Field workers, sales reps, healthcare professionals are increasingly
mobile-first; the grids they use are not.**

**Why now.** Mobile data workflows are growing 30%+ YoY across enterprise
(per Gartner 2025 mobile UX surveys). Accessibility is also moving from
ethical-imperative to regulatory-requirement in EU (EAA, effective June
2025) and US (Section 508 modernization).

**What ships, in order.**

- **3.1 Touch gesture layer** — abstract pointer events into "tap,
  long-press, two-finger pinch, edge swipe". Existing plugins read from
  the abstraction; no per-plugin touch code. ~1 week.
- **3.2 Adaptive layout** — narrow viewport (< 600px) renders rows as
  cards with the most important columns elevated; medium (600–1024) is
  the current grid with reduced columns; wide (> 1024) is unchanged.
  Driven by a `responsiveColumnSet` config per column. ~2 weeks.
- **3.3 Voice navigation** — Web Speech API integration. Commands like
  "sort by salary descending," "show rows where status equals failed,"
  "go to row 50." Builds on 2.2's NL query. ~1 week of glue once 2.2 is
  in. Falls back gracefully where Web Speech is unsupported.
- **3.4 Enhanced screen reader announcements** — beyond the current
  static announcements, narrate dynamic events: "Row added at position
  42," "Filter applied — showing 23 of 1,200 rows," "Cell value changed
  from 100 to 150." Live region with throttling for high-frequency
  streams. ~1 week.
- **3.5 EAA / WCAG 2.2 compliance audit** — externally audited by an
  accessibility consultancy. Fix anything flagged, publish the
  conformance report. ~2 weeks + external lead time.

**Architecture additions required.**

- A `viewport` plugin that emits `viewport:layout-changed` events with
  the current breakpoint. Other plugins (filtering UI, status bar,
  context menu) react.
- A `commands` abstraction in `useVoice` so voice and NL query share a
  command vocabulary. No duplicated work.

**Non-goals.**

- We do not build native iOS/Android apps. We're a web library.
- We do not redesign the visual theme for mobile. Same tokens, same
  components, narrower viewport.

### Pillar 4 — Enterprise security & data lineage

**Problem.** The Pillar 1 + Pillar 2 work makes GridStorm enterprise-
appealing, which immediately surfaces enterprise procurement requirements:
field-level encryption, end-to-end audit, GDPR right-to-be-forgotten,
HIPAA-suitable cell content. **AG Grid charges for these. We can do
better.**

**Why now.** The pieces from the other pillars (audit log from 1.6,
permission resolver from 1.5, telemetry hook from 2.x) are exactly what
enterprise security needs, just with stronger guarantees. We're not
inventing infrastructure; we're hardening what we'll already have built.

**What ships, in order.**

- **4.1 Tamper-evident audit log** — append-only with hash chains. Each
  log entry contains the hash of the previous entry; reconstructing the
  chain proves no entry was modified. ~1 week on top of 1.6.
- **4.2 Field-level encryption** — designate columns as encrypted.
  Browser-side encryption via WebCrypto (AES-GCM) with keys provided by
  the consumer (typically from their KMS via a fetch hook). The
  cell value is decrypted only when the cell is in the viewport. ~2
  weeks.
- **4.3 SAML / OIDC RBAC reference adapter** — bridges 1.5's permission
  hooks to common corporate IDPs (Okta, Auth0, Microsoft Entra). ~1
  week per IDP for ergonomic adapters.
- **4.4 GDPR / HIPAA helpers** — "forget this user" cascades through
  all referenced data; PHI-marked columns excluded from clipboard / export
  / AI calls; data residency tagging. ~2 weeks for the API surface,
  longer for adoption.

**Architecture additions required.**

- Hash-chain primitive in `@gridstorm/audit` (sub-package of license, or
  its own — TBD).
- Encryption hook in the DOM renderer: cell text is replaced with
  `[ENCRYPTED]` placeholder until decrypt completes, never during.
- A documented "compliance posture" page that lists what the platform
  does, what consumers must do, and what's out of scope.

**Non-goals.**

- We do not become a key management service. Consumers bring their KMS.
- We do not certify SOC 2, ISO 27001, etc. — those are organizational
  certifications, not library properties. We provide evidence and docs
  that help consumers achieve their own.

## Sequencing across pillars

A reasonable 12-month plan, assuming a small focused team:

**Months 1–3.** Pillar 1.1 → 1.3 (presence, selection broadcast, CRDT
editing). End state: two users in the same grid can co-edit without
conflicts. This is the moment GridStorm becomes differentiated.

**Months 4–5.** Pillar 2.1 → 2.3 (AI adapter, NL query, cell
autocomplete). End state: the grid feels intelligent. Combined with
collab, this is "AI-assisted multiplayer Excel for the web."

**Months 6–7.** Pillar 1.4 → 1.6 (comments, RBAC, audit log) and Pillar
2.4 → 2.6 (formula suggestion, explain mode, summarization). End state:
the collaboration story is feature-complete; the AI story is depth-first.

**Months 8–9.** Pillar 3 in full. End state: same grid works equally on
phone, tablet, desktop. WCAG 2.2 AAA on the core.

**Months 10–12.** Pillar 4. End state: enterprise sales-ready with
documented compliance posture.

**Sequencing depends on these assumptions** — challenge them if they're
wrong:

1. We have at least one design partner from each market segment
   (SaaS-scale, regulated enterprise, mobile-first ISV).
2. The team can absorb Yjs and WebCrypto without external help.
3. We're willing to delete or deprecate consolidation candidates
   (the formula and intelligence clusters from `PLUGIN_CONSOLIDATION_PLAN.md`)
   in the same window — this isn't free engineering.

## What we explicitly will NOT do

This is as important as what we will. Saying no to these is what lets the
yes work.

- **No proprietary LLM.** We're a library, not an AI company.
- **No charting library beyond what exists.** `plugin-charts` is fine;
  don't expand it into a competing offering.
- **No no-code grid builder.** That's a SaaS product, not a library
  feature.
- **No mobile-native apps.** Web only.
- **No database / storage layer.** We render data; the consumer brings
  it.
- **No proprietary protocol.** Yjs, WebSocket, OAuth2/OIDC, SAML — all
  open standards.
- **No vendor-locked AI features.** The adapter pattern is the law.
- **No closed-source enterprise tier.** Pricing-tier features are
  source-available with license enforcement (the signed-JWT work from
  this session). MIT core stays MIT.

## The most useful problem to solve, one more time

If forced to pick one sentence to define the next two years: **GridStorm
becomes the open-source, plugin-first, collaborative AI-grid that enterprise
teams use because it works on every device, respects every user's data,
and integrates with every model they trust.**

Everything in the pillars above ladders up to that statement. Things that
don't ladder up to it are noise; reject them.

## Decisions needed to commit

These have to come from you, not me. Each one blocks substantial work.

1. **Pillar order.** Is collab (Pillar 1) really first, or should AI
   (Pillar 2) lead? I'd argue collab — AI-only is increasingly
   commoditized; collab + AI is rare. But you may have customer signal I
   don't.
2. **Build vs. partner for collab transport.** Self-host Yjs +
   y-websocket, or partner with Liveblocks / Yjs Provider / a managed
   service? Self-host gives ownership; partner ships in weeks not months.
3. **AI provider stance.** Vendor-neutral adapter (slower, broader), or
   start with one vendor (faster, narrower)? Vendor-neutral matches the
   plugin philosophy but adds 30% to early-stage work.
4. **Mobile audience.** Field-worker SaaS or sales-ops? They want very
   different things. "Both" means slower than "first one then the other."
5. **Compliance scope.** SOC 2 / HIPAA / GDPR is a posture spectrum.
   How far does GridStorm go on its own vs. document the consumer's
   responsibility?
6. **Investment shape.** Solo maintainer, small team, or scale-out?
   The phase estimates above assume a small focused team (2–3 engineers).
   Solo doubles them.

Pick a direction on those six and the work plans itself.
