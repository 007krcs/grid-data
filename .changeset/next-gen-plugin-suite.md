---
"@gridstorm/plugin-intent-engine": minor
"@gridstorm/plugin-cell-formula": minor
"@gridstorm/plugin-temporal": minor
"@gridstorm/plugin-nl-query": minor
"@gridstorm/plugin-anomaly": minor
"@gridstorm/plugin-collab": minor
"@gridstorm/plugin-semantic": minor
"@gridstorm/plugin-privacy-lens": minor
"@gridstorm/plugin-adaptive-renderer": minor
"@gridstorm/plugin-intelligence-hub": minor
---

feat: introduce Horizon 1–3 next-generation plugin suite

Ten new plugins spanning three product horizons, each with unit tests, README documentation, and interactive demos in the feature-showcase app.

**Horizon 1 — Predictive intelligence**

- `plugin-intent-engine`: Tracks column interactions (sort, filter, hide/show, reorder) and builds a frequency+recency scoring model to auto-rank columns by user intent. Zero external dependencies; fully serializable state.

- `plugin-cell-formula`: Define computed columns with JavaScript functions. Dependency tracking ensures recomputation when upstream columns change. Supports `silent`, `report`, and `throw` error modes.

- `plugin-temporal`: Snapshot-based time travel — take named checkpoints of grid state (sort model, filter model, column visibility) and navigate with `temporal:undo` / `temporal:redo` / `temporal:goto`. Optional auto-snapshot on state changes.

**Horizon 2 — AI & collaboration**

- `plugin-nl-query`: Natural language → grid commands via regex pattern matching — no LLM required. Handles `"sort by salary desc"`, `"filter status equals Active"`, `"group by department"`, and more. Pluggable column aliases.

- `plugin-anomaly`: Real-time z-score anomaly detection per numeric column using a rolling window baseline. Three severity tiers: `watch`, `warning`, `critical`. Configurable per-column thresholds and warmup period.

- `plugin-collab`: Multi-user presence tracking with cell-level focus indicators and pessimistic locking. Pluggable transport (in-memory included; swap for WebSocket/WebRTC). Users auto-release locks on leave.

**Horizon 3 — Enterprise intelligence**

- `plugin-semantic`: Detects column data types from value patterns (email, URL, phone, currency, percentage, date, boolean, UUID, IP address, country code). Confidence scoring + column relationship detection via Pearson correlation.

- `plugin-privacy-lens`: PII detection with configurable masking and reveal policies (`never`, `on-hover`, `on-click`, `always`). GDPR data map export. Full audit log for cell reveal events. Supports 12 PII categories.

- `plugin-adaptive-renderer`: Profiles the current device (mobile/tablet/desktop/large-screen), OS preferences (dark mode, reduced motion, high contrast), and data density to recommend optimal grid layout settings (row height, pagination, virtual scroll threshold, layout mode).

- `plugin-intelligence-hub`: Cross-grid behavioral aggregation with differential privacy (Laplace mechanism). Pluggable transport for in-process or server-relay delivery. Auto-publishes sort/filter patterns when connected.
