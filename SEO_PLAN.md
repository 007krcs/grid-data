# GridStorm SEO + AI Visibility Plan

> Drafted 2026-05-28 from a repo audit plus deep research (15 verified claims
> across 22 sources). The headline finding is uncomfortable: **most of what's
> commonly recommended for "AI SEO" has weak or refuted evidence**, while the
> things that demonstrably move the needle (presence on third-party platforms,
> citation-dense content, real URLs instead of hash routes) are also the
> things most projects skip.

## TL;DR — the uncomfortable findings from research

1. **`llms.txt` does not measurably improve AI citations.** SERanking's
   November 2025 study across 300,000 domains found that an XGBoost model's
   ability to predict AI citations *improved* when the `llms.txt` feature
   was removed. ([source][1]) The existing 147-line `llms.txt` is good
   hygiene but won't lift GridStorm into ChatGPT/Claude/Perplexity citations.
2. **Off-site presence dominates on-site optimization for LLM citations.**
   The top 10 sources LLMs cite in 2026 are Reddit, LinkedIn, YouTube,
   Wikipedia, Forbes & editorial, G2/Capterra/Trustpilot, Quora, .gov/NIH,
   Medium, Substack. ([source][2]) Your `gridstorm.tekivex.com` will not
   appear in ChatGPT answers until GridStorm appears on those platforms
   *first* and ChatGPT learns the brand from them.
3. **Citation-dense content gets 30–40% higher AI visibility** (Princeton
   GEO research). ([source][3]) Concrete: version numbers, benchmark
   measurements, RFC references, schema.org links inside your content.
4. **Hash routing breaks crawlers.** Your sitemap's 24 `#/docs/...` URLs are
   indistinguishable from one URL to every search engine and AI crawler.
   This is the single biggest fix.
5. **Meta tags must be in initial HTML.** Twitter, Facebook, LinkedIn, Slack
   don't execute JS. ([source][4]) Your Vite SPA needs prerendering — the
   modern tool is `vite-ssg`. ([source][5])

## Audit findings — what's already there

### Marketing hub (`examples/hub/`) — strong on-page, broken structure

| Element | State |
|---|---|
| `index.html` meta (title, description, keywords) | Set |
| Open Graph + Twitter Cards | Complete with image |
| JSON-LD blocks | Organization + WebSite + SoftwareApplication present |
| Canonical | Set to `gridstorm.tekivex.com` |
| `robots.txt` | Present; **blocks all major AI crawlers** |
| `sitemap.xml` | Present; **24 URLs all use `#/` hash routes — broken** |
| `llms.txt` | Present, comprehensive 147 lines |
| Per-route meta via React `useSeo` hook | Working |
| GA tracking | Active |

### Docs site (`docs/`, Astro/Starlight) — bare minimum

| Element | State |
|---|---|
| Page frontmatter (title, description) | Set per page |
| Per-page OG/Twitter via Starlight | Generated automatically |
| `sitemap.xml` | **Missing** — Astro doesn't auto-generate without plugin |
| `robots.txt` | **Missing** |
| JSON-LD blocks | **None** |
| GitHub link in config | **Wrong** (`gridstorm/gridstorm`, not `007krcs/grid-data`) |

### Feature showcase (`examples/feature-showcase/`)
SoftwareApplication JSON-LD present; **title claims "33 Interactive Plugin
Demos"** which contradicts the hub's "28 plugins" and `llms.txt`'s "28+"
and the actual repo's ~40+ plugins.

### Root

No root `robots.txt`, no root `llms.txt`, no `humans.txt`. `package.json`
`homepage` field says `gridstorm.dev`; the deployed canonical says
`gridstorm.tekivex.com`. **Crawlers will see conflicting canonical signals.**

---

## Decisions you have to make before anything else (no code yet)

### Decision 1 — Domain

Pick one and stick with it. The current mismatch (`gridstorm.dev` in
`package.json`, `gridstorm.tekivex.com` everywhere on-site) means:
- Search engines may see two domains as duplicates and de-rank both.
- The `homepage` field in `package.json` is what npm displays on package
  pages and what some AI crawlers index.
- Open Graph image URLs become broken if the canonical changes.

**My recommendation:** Pick `gridstorm.dev` if you own it (cleaner brand,
shorter, easier to cite). Pick `gridstorm.tekivex.com` if `.dev` is
unavailable or not registered to you.

### Decision 2 — AI crawler stance

Three coherent stances. Current is option C; research suggests A or B match
your stated goal better.

| Option | Block training crawlers | Allow search/RAG crawlers | What it gets you |
|---|---|---|---|
| **A. Maximum visibility** | No | Yes | Highest chance of appearing in AI citations; your content also trains next-gen models |
| **B. Citations without training** | Yes | Yes | LLMs can cite you in real-time queries but cannot train on your content. Most common stance for commercial SaaS. |
| **C. Current (block all)** | Yes | Yes | Zero AI visibility. Compatible with maximum legal protection. |

Your message says *"indexable and discoverable by any LLM/AI."* That's
**incompatible with option C**, which is what `robots.txt` ships today.

Concrete bot taxonomy for the decision:

| Bot UA | Type | Operated by |
|---|---|---|
| `GPTBot` | Training | OpenAI |
| `Google-Extended` | Training | Google (for Gemini) |
| `anthropic-ai`, `ClaudeBot` | Training | Anthropic |
| `CCBot` | Training | Common Crawl |
| `Bytespider` | Training | ByteDance/TikTok |
| `Applebot-Extended` | Training | Apple Intelligence |
| `OAI-SearchBot` | Real-time RAG | OpenAI (ChatGPT search) |
| `ChatGPT-User` | Real-time browsing | OpenAI (user-triggered) |
| `PerplexityBot` | Indexing for citations | Perplexity |
| `Perplexity-User` | Real-time queries | Perplexity |
| `Claude-SearchBot` | Real-time RAG | Anthropic |
| `Meta-ExternalAgent` | Real-time agent | Meta |

Note GPTBot is the *most-blocked* AI crawler — 5.89% of websites block it,
per Ahrefs ([source][3]). It's a defensible block.

### Decision 3 — Routing strategy

Hash routing (`#/docs/...`) must go, in some form. Three paths:

| Approach | Cost | Compatibility |
|---|---|---|
| **A. Prerender at build time with `vite-ssg`** | ~1 day | Static host (Vercel/Render/Netlify) — current deploy works. Best Core Web Vitals. |
| **B. Switch to React Router with history routing + server fallback to `/index.html`** | ~half day | Vercel/Render handle the SPA fallback config. Crawlers see real URLs but pages are JS-rendered. Google can handle it; LLM crawlers less reliable. |
| **C. Migrate the hub to Astro** | ~2 days | Best SEO, but rewriting the hub is real work. |

**My recommendation:** **A (vite-ssg).** Same deploy, same React code,
crawlers see static HTML.

### Decision 4 — Canonical plugin count

The number drifts across files: `llms.txt` says 28, feature-showcase says 33,
the repo has ~40+ counted plugins, MEMORY.md says 65 packages. **Pick one
number and propagate.** The honest number for marketing is probably
"40+ plugins across three tiers" until consolidation lands (see
[PLUGIN_CONSOLIDATION_PLAN.md](./PLUGIN_CONSOLIDATION_PLAN.md)).

---

## The plan, in phases

Each phase is independently deployable. Earlier phases unblock later phases.

### Phase 1 — Unblock the structural issues (1–2 days)

These are prerequisites — without them, Phases 2–4 are decorative.

1. **Apply Decision 1** — update every canonical URL, OG URL, JSON-LD URL,
   sitemap URL, llms.txt link, `package.json` homepage to the chosen domain.
   Search-and-replace job, one PR.
2. **Apply Decision 2** — rewrite `examples/hub/public/robots.txt` and
   `docs/public/robots.txt` to match the chosen stance, with the full
   2026 bot list.
3. **Apply Decision 3 (vite-ssg)** — install `vite-ssg`, configure the route
   manifest, prerender every page in the SPA, replace `#/...` URLs in the
   sitemap with real paths.
4. **Apply Decision 4** — fix the count in `llms.txt`, hub `index.html`
   schema, feature-showcase title.
5. **Fix the docs GitHub link** in `astro.config.mjs:10` (currently
   `gridstorm/gridstorm`, should be `007krcs/grid-data`).

### Phase 2 — Sitemap and crawler hygiene (half day)

1. **Hub sitemap rewrite** — replace hash URLs with real prerendered paths
   from vite-ssg's manifest. `<lastmod>` should be tied to git commit
   timestamps per route.
2. **Docs sitemap** — add `@astrojs/sitemap` integration to
   `docs/astro.config.mjs`. Astro auto-generates it at build time.
3. **Sitemap index** — add `sitemap-index.xml` at root pointing to both
   `hub-sitemap.xml` and `docs-sitemap.xml` so crawlers find both.
4. **Robots.txt at root** — single root `robots.txt` that references the
   sitemap index. (Currently only `examples/hub/public/robots.txt` exists.)

### Phase 3 — Structured data (1 day)

Use Schema.org JSON-LD blocks. The audit confirms hub has 3 blocks already;
expanding to per-page coverage.

1. **`SoftwareApplication` per plugin page** — operatingSystem (`"any"`),
   softwareVersion (from the npm package), downloadUrl
   (`https://www.npmjs.com/package/@gridstorm/plugin-X`),
   softwareRequirements (`"@gridstorm/core ^0.2.0"`), offers (MIT or Pro).
   Schema.org confirms these fields are what LLMs and Google use to
   summarize tools. ([source][6])
2. **`BreadcrumbList` on every nested page** — docs hierarchy, plugin pages.
3. **`FAQPage` on a new top-level FAQ** — answers to the 10 questions LLMs
   are most asked about data grids (see Phase 4).
4. **`TechArticle` on blog posts** — the existing blog series qualifies.
5. **`HowTo` on each guide** under `docs/guides/`.
6. **`Organization` already exists on hub** — keep, add `sameAs` array with
   GitHub, npm org, LinkedIn, X.

### Phase 4 — Citation-dense content (multi-week, ongoing)

The 30–40% AI-visibility lift from Princeton GEO research comes from content
that contains statistics, citations, and quotes. ([source][3]) Three high-ROI
pieces:

1. **Comparison pages** with explicit Q&A format:
   - `GridStorm vs AG Grid` — feature matrix, bundle-size numbers, license
     differences. LLMs love comparison content because it answers "X vs Y"
     queries directly.
   - `GridStorm vs TanStack Table`
   - `GridStorm vs MUI DataGrid`
2. **FAQ page** with the 10 questions LLMs are most asked about data grids:
   - "What is the smallest data grid for React?"
   - "Which JavaScript data grid supports virtual scrolling for 1M rows?"
   - "Best open-source alternative to AG Grid?"
   - "How do I add inline editing to a React table?"
   - Each answer: 1-2 sentences, with a version number and a doc link.
3. **Glossary / definitions page** — terms like "headless grid", "row
   virtualization", "command bus", "plugin system" — with one-paragraph
   definitions. LLMs cite definitional pages disproportionately.

### Phase 5 — Off-site authority signals (multi-month, ongoing)

This is the actual lever for LLM citations per the research, and it's
the work projects most often skip because it's not code.

1. **Reddit** — answer questions in `r/javascript`, `r/reactjs`,
   `r/typescript`, `r/webdev` where data grids come up. Don't spam links —
   answer the question, mention GridStorm once when relevant. Reddit is the
   #1 source LLMs cite. ([source][2])
2. **LinkedIn company page** with regular technical posts. #2 cited source.
3. **YouTube** — even one demo video gets indexed broadly. #3 cited source.
4. **G2 / Capterra / Trustpilot listings** — review platforms are #6 cited.
   These are free to list on.
5. **Stack Overflow** — create the `gridstorm` tag if it doesn't exist,
   answer questions where the framework helps.
6. **Wikipedia** — only when notable enough (independent press coverage).
   Premature.

### Phase 6 — Core Web Vitals + technical polish (1 day)

After vite-ssg lands, run Lighthouse on the prerendered output. Likely
findings:

1. Image optimization — serve WebP/AVIF, set `<picture>` with `srcset`.
2. Critical CSS extraction — `vite-plugin-html`'s injection points.
3. Font loading — `font-display: swap`, preload critical fonts.
4. JS bundle code splitting — keep landing page lean.

---

## What I'd specifically NOT do

Worth flagging because they're commonly recommended but the research is
weak or refuted:

- **Don't invest more in `llms.txt`.** The existing one is fine. Keep it
  fresh as a side-effect of other work, but the SERanking analysis
  ([source][1]) is clear: no measurable citation lift.
- **Don't chase "content freshness" via mass re-dating.** The "pages
  refreshed within 60 days are 1.9× more likely to appear in AI answers"
  claim was refuted in verification (0-3).
- **Don't pay for "GEO services."** The Arxiv GEO paper's 40% lift claim
  was refuted in verification (1-2); the methodology is contested.
- **Don't build a Wikipedia page yet.** It requires independent press
  coverage to survive deletion; premature without it.

---

## Sequencing question for you

Phases 1–3 are pure engineering and worth doing now. Phases 4–6 are
ongoing.

A reasonable single-PR scope for execution today: **Phase 1 + Phase 2 +
Phase 3** — the technical foundation that makes all later work effective.
That's ~3 days of work compressed because most of it is mechanical once
the four decisions are made.

The decisions are the blocker. Until you pick:

1. Domain (gridstorm.dev vs gridstorm.tekivex.com)
2. AI crawler stance (A / B / current C)
3. Routing approach (A vite-ssg / B history-router / C migrate to Astro)
4. Canonical plugin count

…I'd be guessing at the values that go into every JSON-LD block, sitemap
URL, robots.txt rule, and `package.json` field. Tell me your call on each
and I'll execute Phases 1–3 in one focused work session.

---

## Sources

[1]: https://codersera.com/blog/llms-txt-complete-guide-2026/ "Codersera, llms.txt Complete Guide 2026 — SERanking study"
[2]: https://contently.com/2026/04/29/top-sources-llms-cite/ "Contently, Top Sources LLMs Cite (April 2026)"
[3]: https://www.superlines.io/articles/ai-search-statistics/ "Superlines, AI Search Statistics — citing Ahrefs and Princeton"
[4]: https://nuxtseo.com/learn-seo/vue/spa "Nuxt SEO, SPA SEO Guide"
[5]: https://nuxtseo.com/learn-seo/vue/spa/prerendering "Nuxt SEO, Prerendering Guide"
[6]: https://schema.org/SoftwareApplication "Schema.org SoftwareApplication spec"

1. [llms.txt does not measurably improve AI citations][1] — SERanking, 300K domains, XGBoost model
2. [Top 10 sources LLMs cite in 2026][2] — Contently aggregating 5 studies
3. [Citation-dense content +30-40% AI visibility][3] — Princeton GEO research
4. [Meta tags must be in initial HTML for social crawlers][4] — Nuxt SEO
5. [vite-ssg is the modern Vite prerendering tool][5] — Nuxt SEO
6. [SoftwareApplication schema spec][6] — Schema.org
