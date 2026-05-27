# Plugin Consolidation Plan

> Status: **plan only** — no code changes have landed against this document.
> Drafted 2026-05-28 from a read-only audit of `packages/plugin-formula*` and
> `packages/plugin-ai`, `plugin-anomaly`, `plugin-nl-query`, `plugin-semantic`,
> `plugin-intent-engine`, `plugin-intelligence-hub`.

## Why this exists

The three-pass architectural review flagged two plugin "clusters" with
overlapping concerns. On audit the situation is more nuanced than the review
suggested:

- **The formula cluster is not three-of-a-kind.** `plugin-formula` and
  `plugin-cell-formula` are doing **different features** but share the
  `formula:` command namespace, including a colliding `formula:remove` with
  incompatible payloads. `plugin-formula-engine` really is an extension of
  `plugin-formula` and could plausibly merge in.
- **The intelligence cluster is six independent plugins.** Five are doing
  genuinely different things; only `plugin-ai` overlaps with the others, and
  the overlap is "general-purpose worse implementations" vs "specialized
  better implementations."

So this is mostly a **naming and deprecation** problem, not a "fold N into 1"
problem. The plan below is sized accordingly.

---

## Cluster 1: Formula plugins (3 → 2 net, but mostly rename)

### What's actually in each plugin

| Plugin | LOC | What it does |
|---|---|---|
| `plugin-formula` | 2,849 | Excel-like cell formulas (`=A1+B1`). Tokenizer, parser, evaluator, dependency graph, ~50 built-in functions. The real spreadsheet engine. |
| `plugin-formula-engine` | 1,822 | Adds 50+ more functions (SUMIF, XLOOKUP, DATE…), named ranges, array formulas. **Depends on `plugin-formula` at runtime** via the `formula:registerFunctions` command — pure additive extension. |
| `plugin-cell-formula` | 586 | **Different feature entirely.** Computed columns via JavaScript functions: `column.formula: (row) => row.firstName + ' ' + row.lastName`. Recomputes on row change. |

### The bug

Both `plugin-formula` and `plugin-cell-formula` register a command named
`formula:remove`, with incompatible payloads:

- `plugin-formula`'s `formula:remove` expects `{ rowId, colId }` — removes a
  cell's `=...` formula.
- `plugin-cell-formula`'s `formula:remove` expects `{ columnId }` — removes a
  computed column's definition.

Because the CommandBus broadcasts every dispatched command to every registered
handler, dispatching `formula:remove` with either payload calls **both**
handlers, and the one whose payload is malformed will silently misbehave or
error in its private state. If both plugins are installed, this is a real
correctness bug.

Similar (milder) collision on event names: `formula:errors` (plural, from
`plugin-formula`) vs `formula:error` (singular, from `plugin-cell-formula`).

### Proposed shape

**Two packages, with clear names and disjoint namespaces:**

| Package | Old name(s) | Command prefix | Notes |
|---|---|---|---|
| `@gridstorm/plugin-formula` | `plugin-formula` + `plugin-formula-engine` (merged) | `formula:*` | Spreadsheet formulas. Folds engine extras inline; advanced features remain individually importable for tree-shaking. |
| `@gridstorm/plugin-computed-columns` | renamed from `plugin-cell-formula` | `computedColumn:*` | JS-function computed columns. Different feature, different namespace, no more collisions. |

### Migration sequence

1. **Land the namespace rename first, in `plugin-cell-formula`.**
   - Rename commands `formula:define` → `computedColumn:define`, `formula:remove` →
     `computedColumn:remove`, `formula:recalculate` → `computedColumn:recalculate`.
   - Rename events `formula:error` → `computedColumn:error`,
     `formula:computed` → `computedColumn:computed`.
   - Keep the old names as deprecated aliases for one release (emit a
     `console.warn` on first use, then route to the new name).
   - The collision is the most urgent fix and can ship independently of any
     package-rename. **Do this before everything else.**

2. **Rename `plugin-cell-formula` → `plugin-computed-columns`.**
   - Create the new package directory copying source from `plugin-cell-formula`.
   - Update package.json `name` to `@gridstorm/plugin-computed-columns`.
   - Add a codemod entry in `packages/codemod` that rewrites imports from the
     old package name to the new one.
   - Keep `plugin-cell-formula` as a re-export shim for two minor releases:
     ```ts
     // packages/plugin-cell-formula/src/index.ts
     console.warn(
       '[GridStorm] @gridstorm/plugin-cell-formula is renamed to ' +
       '@gridstorm/plugin-computed-columns. Run the codemod or update imports.',
     );
     export * from '@gridstorm/plugin-computed-columns';
     ```
   - Mark `plugin-cell-formula` as deprecated in npm (`npm deprecate ...`)
     when the second minor release goes out.

3. **Merge `plugin-formula-engine` into `plugin-formula` as an optional
   sub-import.**
   - Move `formula-engine`'s sources into `plugin-formula/src/extras/` (or
     `/advanced/`).
   - Export the extras from a subpath: `import { ... } from
     '@gridstorm/plugin-formula/extras'` so users who don't need 50 extra
     functions don't pay for them at bundle time (preserves the original
     tree-shaking intent).
   - Keep `plugin-formula-engine` as a thin re-export shim with deprecation
     warning, same two-release deprecation policy as step 2.
   - The `formula:registerFunctions` dance disappears — extras register
     directly into the formula plugin's function table at install time.

### Risks and gotchas

- **Customer-visible breakage.** Any customer dispatching `formula:remove`
  expecting the cell-formula behavior will need to update to
  `computedColumn:remove`. Codemod handles imports but not command-bus calls.
  Mitigation: the deprecated-alias period lets calls keep working with a warn.
- **Test breakage.** Existing tests in both plugins dispatch the old command
  names. They'll need to be updated alongside the rename.
- **Re-export shims have a cost.** Two minor releases of dead packages on
  npm. Worth it for one cycle; mark them deprecated before the second cycle.

---

## Cluster 2: Intelligence plugins (6 → 5 by deprecation, no merges)

### What's actually in each plugin

| Plugin | LOC | What it does | Overlaps with |
|---|---|---|---|
| `plugin-ai` | 1,511 | Catch-all: regex NL parser + Z-score anomaly detection + smart-suggestion stub | `plugin-anomaly`, `plugin-nl-query` |
| `plugin-anomaly` | 700 | Rolling-window statistical anomaly detection with severity tiers (watch/warning/critical) | `plugin-ai` (worse implementation) |
| `plugin-nl-query` | 786 | NL → grid-operation parser (sort/filter/group/quick-filter) with history & autocomplete | `plugin-ai` (worse implementation) |
| `plugin-semantic` | 595 | Semantic column-type detection (email, phone, URL, currency) + relationship inference | — |
| `plugin-intent-engine` | 542 | Tracks user actions, ranks columns by interaction affinity | — |
| `plugin-intelligence-hub` | 729 | Cross-grid telemetry/insight publishing with optional differential-privacy noise | — |

### The pattern

`plugin-ai` is a **catch-all from an earlier era of the project**. Its
"anomaly detection" feature is a worse version of what `plugin-anomaly` does.
Its "natural language query" feature is a worse version of what
`plugin-nl-query` does. Its "smart suggestions" feature has no dedicated
replacement but is a thin stub.

The other five plugins (`anomaly`, `nl-query`, `semantic`, `intent-engine`,
`intelligence-hub`) are doing **genuinely different things**. There's no
sensible merge between "user behavior tracking" and "semantic type detection"
and "cross-grid telemetry hub." Forcing them into a single mega-plugin would
inflate bundles for users who only want one capability.

### Proposed shape

| Action | Plugin |
|---|---|
| **Deprecate** | `plugin-ai` |
| **Keep as-is** | `plugin-anomaly`, `plugin-nl-query`, `plugin-semantic`, `plugin-intent-engine`, `plugin-intelligence-hub` |
| **Migrate suggestions feature** | Move the `plugin-ai` "smart suggestions" code into `plugin-intent-engine` (which already understands user behavior) or into a tiny new `plugin-suggestions` if it grows |

Final count: **6 → 5** if suggestions move into intent-engine, **6 → 6** if a
dedicated suggestions plugin is preferred. Either is defensible; intent-engine
is the natural home because suggestions are derived from intent signals.

### Migration sequence

1. **Add deprecation notice to `plugin-ai`'s `install()`.**
   ```ts
   console.warn(
     '[GridStorm] @gridstorm/plugin-ai is deprecated and will be removed in ' +
     '0.3.0. Migrate to: anomaly detection → @gridstorm/plugin-anomaly; ' +
     'NL queries → @gridstorm/plugin-nl-query; ' +
     'suggestions → @gridstorm/plugin-intent-engine.',
   );
   ```
2. **Codemod for `import` rewrites.** The codemod can mechanically rewrite
   `AIPlugin` imports to the new triad, but **cannot** rewrite usage — call
   sites use `ai:query`, `ai:detectAnomalies`, `ai:getSuggestions` and the
   migration is semantic (different payloads, different events). The codemod
   should annotate call sites it can't safely rewrite, not silently rewrite
   them.
3. **Port `generateSuggestions` to `plugin-intent-engine`.** The function is
   small (~100 LOC); merging it adds a `intent:suggestions` command and event.
4. **Two-minor-version deprecation window**, then drop `plugin-ai`.
5. **Update marketing.** Memory and ARCHITECTURE.md both list `plugin-ai` as
   the headline "next-gen" plugin. After deprecation, lead with the three
   specialized plugins instead.

### What stays

- **`plugin-anomaly`** — production-grade statistical detection. Keep.
- **`plugin-nl-query`** — specialized NL parser with history. Keep.
- **`plugin-semantic`** — semantic typing of columns. Keep. (Could grow into
  a "data understanding" sub-family if more like it appear.)
- **`plugin-intent-engine`** — user-behavior tracking. Keep, and grow it by
  absorbing `plugin-ai`'s suggestions feature.
- **`plugin-intelligence-hub`** — telemetry / cross-grid insight bus. Keep.
  This is a real architectural component (transport, privacy budget), not a
  feature plugin.

### Risks and gotchas

- **`plugin-ai` is the headline plugin in marketing copy.** Deprecating it
  requires a story for the brand: lead with the specialized plugins as the
  "GridStorm intelligence suite." Coordinate the deprecation with whoever
  owns the website.
- **The migration is semantic, not syntactic.** A codemod can move imports
  but the call sites need human review. Plan accordingly in release notes.

---

## Sequenced rollout (across releases)

This is conservative — each release ships something useful and can be reverted
independently. Targets are **minor versions**, not weeks/months.

### Release N (urgent — patch-eligible)

- Land the `computedColumn:*` rename in `plugin-cell-formula` with deprecated
  aliases for the old `formula:*` commands.
- This is the **only step that fixes a real bug** (the `formula:remove`
  payload collision). Everything else is renames and deprecations.

### Release N+1

- Publish `@gridstorm/plugin-computed-columns` package; ship
  `plugin-cell-formula` as a re-export shim with deprecation warning.
- Add `plugin-ai` deprecation warning.
- Update MEMORY.md and ARCHITECTURE.md addendum to reflect the renames.

### Release N+2

- Merge `plugin-formula-engine` into `plugin-formula/extras`; keep shim.
- Port `plugin-ai`'s suggestions into `plugin-intent-engine`.
- Write codemod for both rename paths.

### Release N+3 (major or next-minor with breaking opt-in)

- Drop the deprecated `plugin-cell-formula`, `plugin-formula-engine`, and
  `plugin-ai` packages. Customers who haven't migrated get a clear error.

---

## What this plan deliberately does NOT do

1. **Rewrite anything by feel.** Each plugin still ships with its current
   internals; consolidation is rename + re-export + deprecation, not redesign.
2. **Merge `plugin-intelligence-hub`, `plugin-semantic`, `plugin-intent-engine`.**
   They're independent concerns. Forcing them into one mega-plugin would
   inflate everyone's bundle.
3. **Add server-side dependencies.** Stays client-side; the only change is
   package boundaries, not capabilities.
4. **Take a position on the "intelligence" branding.** That's a marketing
   decision. The technical plan stands regardless of what GridStorm calls the
   suite.

---

## Open questions (need product input before executing)

1. **Suggestion home.** Move `generateSuggestions` into `plugin-intent-engine`
   or stand up a new `plugin-suggestions`? Recommendation: into intent-engine.
2. **Deprecation length.** Two minor releases is conservative. One release is
   faster but risks breaking customers who don't read release notes. Pick
   based on actual adoption metrics for the affected packages.
3. **Codemod scope.** The mechanical part (import rewrites) is easy. Should
   the codemod also annotate semantic-migration sites in `plugin-ai`, or just
   surface them as TODO comments? Recommendation: TODO comments — silent
   rewrites of semantically different APIs are a footgun.

---

## Concrete next step

If anyone picks this up, **the patch to fix the `formula:remove` collision
in `plugin-cell-formula` is the smallest valuable change and can ship today**.
It's the only step that fixes a real bug rather than reshuffling boundaries.
Everything else is rename-and-deprecate work that can wait for an explicit
"plugin consolidation" sprint.
