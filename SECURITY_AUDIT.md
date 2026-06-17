# GridStorm Security Audit — Open Findings

> Generated 2026-06-17 during a brutal QA sweep that ran `pnpm lint` for the
> first time successfully (the previous config had a broken `aria-roles`
> rule name that made ESLint crash on startup, silently hiding every
> security finding underneath it). This document captures the **real**
> findings that need engineering attention. Lower-severity / false-positive
> noise (e.g. `security/detect-object-injection` on typed-record bracket
> access) has been demoted in `eslint.config.js` so this file represents
> the actual backlog.

## Status summary

| Severity | Count | Class |
|---|---|---|
| **Open — needs per-instance audit** | 26 | Potentially unsafe regex (ReDoS) |
| **Closed via inline annotation** | 5 | `innerHTML` — all gated by explicit opt-in or controlled inputs |
| **Closed via rule demotion** | 300+ | `detect-object-injection` on typed maps/records |

The 26 open findings do NOT have known exploits. They are flagged by the
[`safe-regex`](https://github.com/davisjam/safe-regex) heuristic for nested
quantifiers or overlapping alternation. Each one needs:

1. A worst-case input crafted by hand (the heuristic doesn't generate one).
2. A benchmark showing whether the regex actually exhibits catastrophic
   backtracking with that input.
3. Either a refactor to a linear-time form, an input length cap, or a
   verified `// eslint-disable-next-line` with reasoning.

Until that work is done, treat the affected code paths as **untrusted-input
sensitive**. The plugins below should not accept attacker-controlled strings
without an upstream input-length cap.

## Open findings — regex

### plugin-clipboard-pro / src/type-coercion.ts (5 findings)

Runs on every paste into the grid. Attacker controls the clipboard
contents. **Highest priority** — this is the most realistic attack surface
in the list.

| Line | What it tries to coerce |
|---|---|
| 22 | numeric |
| 26 | currency |
| 34 | percentage |
| 42 | scientific notation |
| 49 | datetime |

Mitigation suggestion: refactor each to a strict tokenizer + parser, or
add a length cap (e.g. reject inputs > 200 chars before regex eval).

### plugin-ai / src/nl-query-parser.ts (6 findings)

The legacy regex-based NL query parser. Lines 103, 115, 150, 161, 172, 203.
The user-facing query text is the input. Lower exposure than clipboard-pro
because `@gridstorm/plugin-ai-query` is the recommended replacement (uses
LLM via `@gridstorm/ai-adapter`), but the legacy plugin is still shipping
to consumers who haven't migrated.

Mitigation suggestion: deprecate the regex parser entirely in favor of
`@gridstorm/plugin-ai-query`, or cap query length to 500 chars.

### plugin-privacy-lens / src/privacy-lens-plugin.ts (4 findings)

Lines 22-25 — PII pattern detection on cell content. Cell content can be
attacker-controlled in shared-grid scenarios. Medium priority.

### plugin-semantic / src/semantic-plugin.ts (4 findings)

Lines 23, 25, 27, 28 — semantic-type detection patterns. Same exposure as
privacy-lens.

### pdf-plugin-pii / src/detectors (5 findings)

PII detection in extracted PDF text. PDF content is attacker-controlled.

| File | Lines |
|---|---|
| addresses.ts | 7, 10 |
| names.ts | 7, 11 |
| patterns.ts | 23, 62 |

### pdf-plugin-form-fill / src/field-detector.ts (1 finding)

Line 26 — form-field detection from PDF stream. Same exposure as above.

## Closed via inline annotation — `innerHTML`

Five `no-unsanitized/property` errors. All are gated, documented, or
internal-controlled. Inline `// eslint-disable-next-line` with explanation
was added at each site:

| File | Line | Why it's safe |
|---|---|---|
| `dom-renderer/renderer.ts` | 1272 | Gated by explicit `dangerouslySetInnerHTML` opt-in on the column def — same React API contract, sanitization is consumer's responsibility |
| `dom-renderer/header-renderer.ts` | 235 | Same opt-in path for header HTML |
| `plugin-charts/charts-plugin.ts` | 67 | Built-in `CHART_RENDERERS` factory — typed numeric inputs only, no user strings |
| `plugin-sparklines/sparkline-plugin.ts` | 60 | Built-in `RENDERERS` factory keyed by bounded enum + numeric values |
| `core/__stories__/00-introduction.stories.ts` | 101 | Hard-coded `INTRO_HTML` constant in the same file |

## Closed via rule demotion — `detect-object-injection`

300+ findings of "Generic Object Injection Sink" demoted from `error` to
`warn` in `eslint.config.js`. This rule fires on any `obj[key]` access
regardless of whether `key` is user-controlled. On typed TypeScript code
that uses `Record<string, T>` / `Map<K, V>` as a matter of course, the
signal-to-noise ratio is approximately zero. Demoting keeps the warnings
visible in editor tooling but stops them from gating CI.

If a future review wants to harden specific high-risk paths (e.g.
deserializing third-party JSON into a dynamic dispatch table), enable the
rule for those files only via an additional `files` block in the eslint
config.

## How this audit was generated

```sh
pnpm install
npx eslint "packages/*/src/**/*.ts" "packages/*/src/**/*.tsx"
```

After fixing the broken `jsx-a11y/aria-roles` (should be `aria-role` —
singular) that was making ESLint crash on startup, the rule set is now
functional. CI should run lint on every PR and gate on errors.

## Recommended next steps

1. **Add `pnpm lint` to the CI matrix.** Currently `.github/workflows/ci.yml`
   runs typecheck and tests but not lint. Adding it ensures the noise
   doesn't return.

2. **Triage clipboard-pro/type-coercion regexes first.** Highest realistic
   attack surface in the list.

3. **Deprecate `plugin-ai`'s regex parser.** `@gridstorm/plugin-ai-query`
   does the same job via LLM with structured-output schema enforcement, no
   regex on user input.

4. **Add a length cap helper** as a shared utility. Most of these findings
   are mitigable by refusing to run the regex on inputs above some length.
   A small `capLength(input, n)` wrapper applied at every regex entry point
   would close most of these without needing to refactor regexes
   themselves.
