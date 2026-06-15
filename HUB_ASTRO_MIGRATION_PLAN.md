# Marketing Hub — React-SPA → Astro Migration Plan

> Drafted 2026-05-28 alongside [SEO_PLAN.md](./SEO_PLAN.md). The hub's
> hash-routed SPA at `examples/hub/` is the single biggest SEO blocker: 24
> sitemap entries pointing at `#/...` URLs all collapse to one page in any
> crawler's view. This plan scopes the migration that fixes it.

## Why this exists

The deep-research findings ([SEO_PLAN.md §TL;DR](./SEO_PLAN.md)) plus the
audit's pre-research findings make it concrete:

1. **Hash routes are invisible to crawlers.** `#/docs/getting-started/intro`
   sends nothing after `#` to the server. Google deprecated AJAX hash
   crawling in 2015 and removed support entirely in 2017. Bing, DuckDuckGo,
   GPTBot, ClaudeBot, PerplexityBot — none follow `#` either.
2. **Social crawlers don't run JS at all.** Twitter, Facebook, LinkedIn,
   and Slack fetch the static HTML once and read the meta tags. The current
   hub uses `useSeo` to update `<head>` after mount — that update never
   reaches a social crawler. (See SEO_PLAN sources [4][1].)
3. **Pre-rendering is the modern Vite SEO fix** for SPAs that don't need
   per-request server-side rendering. [Nuxt SEO][2] and
   [vite-plugin-ssr][3] both recommend it as the default.

Two ways to get static HTML per route:

- **`vite-ssg`** — same React code, generate static HTML at build time. Less
  intrusive change but you keep the React runtime everywhere.
- **Migrate to Astro** — purpose-built for content-heavy marketing sites.
  Default: zero JS, ship Astro components as static HTML; selectively
  hydrate "islands" for interactive widgets. Best Core Web Vitals, smallest
  bundle, best SEO.

You picked **Astro**. The rest of this doc scopes it.

## What's in the current hub (port inventory)

```
examples/hub/
├── index.html                      ← entry; per-page meta lives here
├── public/                         ← static assets (icons, og image, sitemap, llms.txt, robots.txt)
└── src/
    ├── main.tsx                    ← React mount
    ├── App.tsx                     ← Hash router + page selector
    ├── styles.css                  ← Global styles
    ├── pages/                      ← 5 route components
    │   ├── HomePage.tsx
    │   ├── PlatformPage.tsx        ← /products
    │   ├── DocsPage.tsx            ← /docs/* (in-hub SPA-rendered docs)
    │   ├── DemosPage.tsx           ← /demos
    │   └── ProductHomePage.tsx     ← /product/<id>
    ├── sections/                   ← 12 marketing sections (Hero, Features, Comparison, etc.)
    ├── layout/                     ← Header, Footer, Sidebar
    ├── icons/                      ← Icon component
    ├── theme/                      ← Theme switcher
    ├── docs/                       ← MDX/markdown content rendered by DocsPage
    └── platform/
        ├── seoConfig.ts            ← Per-route meta
        ├── useSeo.ts               ← <head> updater hook
        ├── manifest-gridstorm.ts   ← Product manifest data
        ├── manifest-pdf-toolkit.ts
        ├── manifest-analytics-studio.ts
        └── registry.ts             ← Product lookup
```

**Routes the hub currently serves (hash-routed):**
- `/` → HomePage (Hero, Stats, Features, Comparison, Products, AiSection, Ecosystem, Footer)
- `/products` → PlatformPage
- `/product/gridstorm` → ProductHomePage (gridstorm manifest)
- `/product/pdf-toolkit` → ProductHomePage (pdf-toolkit manifest)
- `/product/analytics-studio` → ProductHomePage (analytics-studio manifest)
- `/demos` → DemosPage
- `/docs/...` → DocsPage (renders MDX from `src/docs/`)
- `/docs/blog/...` → DocsPage with blog content

The Astro Starlight site at `docs/` is **already** a separate, more capable
docs system that will replace the hub's in-SPA docs (`src/docs/` and
`DocsPage.tsx`). That part of the migration was already started — Phase 1 of
SEO_PLAN added `site`/`base`/`@astrojs/sitemap` to the Starlight config and
mounts it under `/docs/`.

## Target shape

```
examples/hub/                       ← rename to examples/hub-astro/ during migration
├── astro.config.mjs
├── public/                         ← same static assets, plus the new
│                                     sitemap-index.xml that already lives here
└── src/
    ├── pages/                      ← file-based routing
    │   ├── index.astro             ← /
    │   ├── products.astro          ← /products
    │   ├── demos.astro             ← /demos
    │   └── product/
    │       └── [id].astro          ← /product/gridstorm, /product/pdf-toolkit, ...
    ├── layouts/
    │   ├── BaseLayout.astro        ← <html>, <head>, JSON-LD, OG meta, Header, Footer
    │   └── ProductLayout.astro     ← extends BaseLayout with product-specific schema
    ├── components/                 ← .astro files for marketing sections
    │   ├── Hero.astro
    │   ├── Features.astro
    │   ├── Comparison.astro
    │   ├── Products.astro
    │   ├── AiSection.astro
    │   ├── Ecosystem.astro
    │   ├── Footer.astro
    │   ├── Header.astro
    │   └── interactive/            ← React islands for things that need state
    │       ├── ThemeSwitcher.tsx   ← <ThemeSwitcher client:idle />
    │       └── GridPreview.tsx     ← <GridPreview client:visible />
    ├── content/                    ← (optional) marketing content as MDX collections
    └── styles/
        └── global.css              ← migrated from styles.css
```

**Routing (no more hash):**
- `/` → static HTML for the landing
- `/products` → static HTML
- `/product/gridstorm`, `/product/pdf-toolkit`, `/product/analytics-studio` → static HTML per product (Astro's dynamic routes generate one HTML file per manifest entry at build time)
- `/demos` → static HTML
- `/docs/...` → already served by the Astro Starlight at `docs/`, mounted via vercel.json rule

Crawlers see N real URLs, each with its own initial-HTML `<head>` containing
canonical, OG, Twitter, and per-page JSON-LD. Social previews work without
JS. Sitemap entries are real paths.

## Component porting strategy

Three tiers, ranked by interactivity needed:

### Tier 0 — Pure markup (port to `.astro`)

These are the bulk of the marketing site. Astro components are HTML + scoped
CSS + a frontmatter script that runs at build time. They produce zero JS.

Direct ports:
- `Hero` → `Hero.astro` (static text + button links; no state)
- `Features` → `Features.astro`
- `Comparison` → `Comparison.astro` (the comparison table is static data)
- `Products` → `Products.astro`
- `Stats` → `Stats.astro` (read from `manifest-*.ts` at build time)
- `Benchmarks` → `Benchmarks.astro`
- `Ecosystem` → `Ecosystem.astro`
- `SocialProof` → `SocialProof.astro`
- `TechStack` → `TechStack.astro`
- `QuickStart` → `QuickStart.astro` (static code samples — wrap with Astro's
  `<Code>` component for syntax highlighting at build time)
- `Footer` → `Footer.astro`
- `Header` → `Header.astro` (only the mobile nav toggle needs JS — small
  inline `<script>` in the component)

### Tier 1 — Stateful UI (React island, hydrate on idle/visible)

These need React state but don't need to hydrate immediately.

- `ThemeSwitcher` → React component, `<ThemeSwitcher client:idle />`. Idle
  hydration means the page is interactive before this loads.
- `AiSection` → if it has an interactive query box, that's a React island.
  If it's purely demonstrative, port to `.astro`.

### Tier 2 — Heavy interactive (React island, hydrate on visible)

- `DemoCards` → React component, `<DemoCards client:visible />`. Hydrates
  only when scrolled into view.
- Live grid preview on the homepage → `<GridPreview client:visible />`.
  Imports `@gridstorm/core` + `@gridstorm/react` directly; same code as
  today but only loads when needed.

The win: the homepage's initial HTML payload becomes ~5–10 KB of HTML +
CSS, with React loading lazily only for the live grid. Lighthouse
Performance score jumps from the current 60–70 range (Vite SPA hydration
cost) to 95+ (Astro static + islands).

## Per-page meta and JSON-LD

Astro handles `<head>` natively in components. The current `useSeo` hook
becomes a build-time concern:

- `BaseLayout.astro` accepts `title`, `description`, `canonical`, `ogImage`,
  `breadcrumb`, `schema` as props.
- Each route's `pages/*.astro` passes the right props.
- For product pages, `pages/product/[id].astro` reads from the manifest
  (the same `manifest-gridstorm.ts`/`manifest-pdf-toolkit.ts`/
  `manifest-analytics-studio.ts` files port over essentially unchanged) and
  composes the SoftwareApplication schema + BreadcrumbList.

The `buildBreadcrumb` helper from `useSeo.ts` ports as a plain TS function
imported in Astro components.

## Content migration

The hub's `src/docs/` directory contains in-hub doc content rendered by
`DocsPage.tsx`. **This content moves to the Astro Starlight site at `docs/`**
— it shouldn't exist in two places.

Steps:

1. Inventory `src/docs/` files; check which ones are present in `docs/src/content/docs/` too.
2. Migrate any unique content from `src/docs/` to `docs/src/content/docs/`.
3. Delete `src/docs/`, `DocsPage.tsx`, and the `/docs` route from the hub.
4. Update internal hub links from `#/docs/...` to `/docs/...`.

After this step the hub serves marketing pages only; `/docs/*` is the Astro
Starlight site exclusively.

## Sitemap regeneration

The hub's `public/sitemap.xml` becomes generated at build time. Astro has
[`@astrojs/sitemap`](https://docs.astro.build/en/guides/integrations-guide/sitemap/)
— same integration the docs site uses. Add it to the Astro hub config and
delete the hand-maintained sitemap.

The root `sitemap-index.xml` at `public/sitemap-index.xml` continues to
point at both: the hub's now-generated `/sitemap.xml` and the docs site's
`/docs/sitemap-index.xml`.

## Deployment

`examples/build-all.cjs` currently builds the hub with `vite build`. After
migration, replace the hub build step with `npx astro build`. The output
directory layout is the same: a flat `dist/` with `index.html` plus
per-route `<route>/index.html`. The Vercel `routes` array in `vercel.json`
needs **no changes** because the `handle: filesystem` rule already serves
per-directory `index.html` files.

The catch-all `/(.*)` → `/index.html` route can be removed — with real
routes, the 404 should be Astro's static 404 page instead of the SPA
landing.

## Sequencing (3–5 day estimate)

### Day 1 — Foundation

1. `cp -r examples/hub examples/hub-astro`. Work in `hub-astro/` while the
   live hub keeps deploying.
2. Add Astro + integrations:
   ```sh
   cd examples/hub-astro
   npm init astro@latest -- --template minimal --typescript strict
   pnpm add -D @astrojs/react @astrojs/sitemap astro
   pnpm add react react-dom
   ```
3. Configure `astro.config.mjs` — `site: 'https://gridstorm.tekivex.com'`,
   integrations `[react(), sitemap({ changefreq: 'weekly', priority: 0.7 })]`,
   `output: 'static'`.
4. Create `BaseLayout.astro` with the full `<head>` (every meta tag and the
   Organization + WebSite + SoftwareApplication JSON-LD blocks from the
   current `index.html`).
5. Port one section (`Hero`) and one page (`index.astro`) end-to-end as a
   spike. Verify Lighthouse + view-source.

### Day 2 — Marketing pages

Port Tier 0 sections (Hero, Features, Comparison, Products, Stats,
Benchmarks, Ecosystem, SocialProof, TechStack, QuickStart, Footer, Header).
Port `pages/index.astro` (composes Hero + Features + Comparison + Products +
AiSection + Ecosystem + Footer per `HomePage.tsx`).

### Day 3 — Product pages + dynamic routing

1. `pages/products.astro` → static port of `PlatformPage.tsx`.
2. `pages/product/[id].astro` → dynamic route reading from `manifest-*.ts`.
   Use Astro's `getStaticPaths` to enumerate `gridstorm`, `pdf-toolkit`,
   `analytics-studio` at build time.
3. `pages/demos.astro` → static port of `DemosPage.tsx`.
4. React islands: `ThemeSwitcher`, `DemoCards`, `GridPreview` ported as
   `.tsx` + `client:idle` / `client:visible` directives.

### Day 4 — Content + deployment

1. Migrate `src/docs/` → `docs/src/content/docs/`. Update internal links.
2. Delete `DocsPage.tsx` and the `/docs` route.
3. Update `examples/build-all.cjs` to `npx astro build` for the hub.
4. Delete the `/(.*) → /index.html` catch-all from `vercel.json`.
5. Verify the sitemap generated by `@astrojs/sitemap` has real URLs.

### Day 5 — Validation + cutover

1. Run Lighthouse on every route. Target: Performance ≥ 90, SEO = 100,
   Accessibility ≥ 95.
2. Validate JSON-LD with Google's Rich Results Test on each page.
3. View-source check: every meta tag (canonical, OG, Twitter, JSON-LD)
   present in initial HTML.
4. Rename `examples/hub-astro/` → `examples/hub/` (delete the old). Update
   `examples/build-all.cjs` paths if needed.
5. Submit the updated `sitemap-index.xml` to Google Search Console and
   Bing Webmaster Tools.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| **Style regressions** — `styles.css` is large and hand-written; Astro's scoped CSS works differently than React inline class usage. | Port `styles.css` as a single global stylesheet (Astro supports global CSS imports). Defer scoping to Astro components on a case-by-case basis. Visually diff each route. |
| **Live grid preview hydration weight** — `@gridstorm/core` + `@gridstorm/react` is ~50 KB. Island hydration cost is real. | Use `client:visible` (lazy hydration on scroll). Lighthouse score should still improve net-positive vs. the current Vite SPA. |
| **Manifest data shape** — `manifest-*.ts` files have non-serializable values (functions, components). | Audit before the port. If any manifest field is a JSX component, refactor to plain data + a render helper that lives in the Astro component using the manifest. |
| **Existing inbound links use `#/...` URLs** — search engines and bookmarks may point at hash routes for months. | Add small `<script>` in `BaseLayout.astro` that maps known hash routes to real paths and redirects on load: `if (location.hash.startsWith('#/products')) location.replace('/products' + location.hash.slice(9))`. Six redirects total. |
| **AdSense + GA continuity** — both scripts live in current `index.html`. | Port verbatim to `BaseLayout.astro`. Astro doesn't run them at build; they execute in the browser the same way. |
| **The 5-day estimate slips.** | The hub-astro/ shadow directory lets the existing deploy keep working through the migration. Cutover is a single PR; no big-bang risk. |

## What this plan does NOT do

- **It doesn't migrate the docs site.** `docs/` is already Astro Starlight.
  This plan migrates only `examples/hub/`.
- **It doesn't introduce SSR.** Astro static output is sufficient for a
  marketing site. SSR would be needed if pages needed per-request data
  (auth, personalization). They don't.
- **It doesn't change the React adapter or any other `@gridstorm/*` package.**
  Only the hub presentation layer migrates.
- **It doesn't migrate `examples/feature-showcase/`, `playground/`, or
  the other example apps.** Those are interactive demos where SPA shape is
  appropriate; meta tags in their `index.html` already serve crawlers.

## Sources cited

[1]: https://nuxtseo.com/learn-seo/vue/spa "Nuxt SEO — SPA SEO guide"
[2]: https://nuxtseo.com/learn-seo/vue/spa/prerendering "Nuxt SEO — prerendering"
[3]: https://vite-plugin-ssr.com/SPA-vs-SSR "vite-plugin-ssr — SPA vs SSR"

See [SEO_PLAN.md sources](./SEO_PLAN.md#sources) for the full research bibliography.
