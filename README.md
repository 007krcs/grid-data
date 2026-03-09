# GridStorm — Next-Generation Data Grid Platform

## Deep Architecture & Design Document (Sections 1–14)

---

# SECTION 1 — Reality Check

### Can this become better than AG Grid?

**Honest answer: Yes, in specific dimensions. No, in total feature parity — not for years.**

AG Grid has 10+ years of engineering, hundreds of contributors, and thousands of enterprise customers. Replicating their full feature set is a multi-year, multi-million-dollar effort.

**Where "better" is realistic:**

| Dimension | Why we can win | Effort to get there |
|---|---|---|
| **Modularity** | AG Grid's architecture is monolithic internally. A plugin-first design lets consumers pay only for what they use. | Medium — requires discipline to keep boundaries clean |
| **Bundle size** | AG Grid Community is ~300KB min+gz. A tree-shakeable, plugin-based core can be <40KB for basic grids. | Low — natural consequence of plugin architecture |
| **Framework independence** | AG Grid's React wrapper is a translation layer over their internal rendering. A headless core with native adapters provides better DX. | Medium — each adapter is a separate project |
| **Theming** | AG Grid's theming system uses CSS classes with SCSS variables. CSS custom properties with a token architecture is more flexible and runtime-switchable. | Low — CSS-first approach, no compile step |
| **Developer experience** | TypeScript-first with inference-heavy APIs, better docs, and schema-driven config. | High — DX is an ongoing investment, not a one-time feature |
| **Extensibility** | AG Grid's extension model is limited to cell renderers/editors and a few hooks. A proper plugin system with lifecycle hooks, dependency injection, command middleware, and state slices is fundamentally more powerful. | Medium — plugin system is built, needs battle-testing |

**Where we will lag for a long time:**

- Charting integration maturity (AG Charts has years of development)
- Excel export fidelity (OOXML spec is enormous)
- Edge-case handling across browsers (thousands of bug fixes accumulated)
- Enterprise feature depth (pivoting with server-side aggregation, SSRM edge cases)
- QA coverage across thousands of scenarios
- Internationalization / RTL completeness

### Risk Matrix

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Scope creep — each feature is its own sub-project | High | Critical | Strict phase gates. Ship each plugin independently. |
| Performance regression as features accumulate | Medium | High | Benchmark suite from day 1. Budget per feature. |
| API design mistakes that require breaking changes | Medium | High | Alpha/beta periods. Deprecation policy. Never release 1.0 too early. |
| Framework adapter maintenance burden | Medium | Medium | Headless core means adapters are thin (<5KB). Test matrix. |
| Single-developer bus factor | High | Critical | Document everything. Architecture-first development. |
| Community adoption chicken-and-egg | High | High | Ship with excellent docs and a killer demo. Target AG Grid pain points. |

### Engineering Effort Estimates

| Phase | Solo developer | 3-person team |
|---|---|---|
| Phase 0: Architecture spike (DONE) | 2 weeks | 1 week |
| Phase 1: MVP (sort, filter, select, edit, resize) | 8–12 weeks | 4–6 weeks |
| Phase 2: Advanced (grouping, tree, SSRM, master/detail) | 16–24 weeks | 8–12 weeks |
| Phase 3: Enterprise (pivot, charts, Excel export) | 24–36 weeks | 12–18 weeks |
| Phase 4: Polish (perf, a11y audit, i18n, docs) | Ongoing | Ongoing |

**What "better" actually means for users:**

1. `npm install @gridstorm/core @gridstorm/react` — 40KB, working grid in 5 minutes
2. Add `@gridstorm/plugin-sorting` — 2KB more, full sorting
3. Add `@gridstorm/plugin-filtering` — 4KB more, full filtering
4. CSS variable theming — change a theme at runtime with one line
5. TypeScript inference — no `as any`, full autocomplete on column defs and event handlers

---

# SECTION 2 — Product Strategy & Open-Core Model

### Three-Layer Product Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    ENTERPRISE LICENSE ($)                      │
│  @gridstorm/plugin-pivot      @gridstorm/plugin-excel-export   │
│  @gridstorm/plugin-charts     @gridstorm/plugin-ssrm           │
│  @gridstorm/plugin-clipboard  @gridstorm/plugin-master-detail  │
│  Priority support, SLA, custom development                     │
├────────────────────────────────────────────────────────────────┤
│                    COMMUNITY (MIT)                             │
│  @gridstorm/plugin-sorting    @gridstorm/plugin-filtering      │
│  @gridstorm/plugin-selection  @gridstorm/plugin-editing        │
│  @gridstorm/plugin-column-resize  @gridstorm/plugin-pagination │
│  @gridstorm/plugin-row-grouping                                │
├────────────────────────────────────────────────────────────────┤
│                    CORE (MIT, always free)                     │
│  @gridstorm/core              @gridstorm/dom-renderer          │
│  @gridstorm/react             @gridstorm/vue                   │
│  @gridstorm/angular           @gridstorm/theme-default         │
└────────────────────────────────────────────────────────────────┘
```

### Free vs Premium Split — Decision Framework

A feature goes premium if it meets **two or more** of these criteria:

1. Only needed by enterprise/data-heavy applications
2. Requires >2 weeks of development effort
3. AG Grid charges for it
4. Requires ongoing maintenance (spec changes, browser compat)
5. Has no widely-available open-source alternative

### Package Naming Convention

```
@gridstorm/core                 # Engine, types, state, events
@gridstorm/dom-renderer         # DOM rendering, virtual scroll
@gridstorm/react                # React 18+ adapter
@gridstorm/vue                  # Vue 3 adapter (future)
@gridstorm/angular              # Angular 16+ adapter (future)
@gridstorm/svelte               # Svelte 5 adapter (future)
@gridstorm/theme-default        # Default theme (light/dark/high-contrast)
@gridstorm/theme-material       # Material Design theme (future)
@gridstorm/plugin-sorting       # Column sorting
@gridstorm/plugin-filtering     # Column filtering + quick filter
@gridstorm/plugin-selection     # Row/cell/range selection
@gridstorm/plugin-editing       # Cell & full-row editing
@gridstorm/plugin-column-resize # Column resize with drag handles
@gridstorm/plugin-pagination    # Client-side pagination
@gridstorm/plugin-row-grouping  # Row grouping with aggregation
@gridstorm/plugin-tree-data     # Hierarchical tree data
@gridstorm/plugin-ssrm          # Server-side row model (premium)
@gridstorm/plugin-pivot         # Pivot mode (premium)
@gridstorm/plugin-excel-export  # Excel .xlsx export (premium)
@gridstorm/plugin-charts        # Integrated charting (premium)
@gridstorm/plugin-clipboard     # Advanced clipboard (premium)
@gridstorm/plugin-master-detail # Master/detail rows (premium)
```

---

# SECTION 3 — High-Level Architecture

### Layered Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                     FRAMEWORK ADAPTERS                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  React   │  │   Vue    │  │ Angular  │  │  Svelte  │        │
│  │  4.5KB   │  │  ~4KB    │  │  ~5KB    │  │  ~3KB    │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │              │              │              │           │
├───────┴──────────────┴──────────────┴──────────────┴───────────┤
│                       DOM RENDERER (21KB)                      │
│  ┌────────────────┐  ┌────────────────┐   ┌───────────────────┐│
│  │ Virtual Scroll │  │ Scroll Mgr     │   │DOM Renderer       ││
│  │ - fixed height │  │ - RAF throttle │   │ - row pooling     ││
│  │ - variable     │  │ - sync targets │   │ - ARIA roles      ││
│  │ - binary search│  │ - momentum     │   │ - cell pipeline   ││
│  └────────────────┘  └────────────────┘   └───────────────────┘│
├────────────────────────────────────────────────────────────────┤
│                     FEATURE PLUGINS (2-8KB each)               │
│  ┌────────┐ ┌──────────┐ ┌───────────┐ ┌────────┐ ┌─────────┐  │
│  │Sorting │ │Filtering │ │Selection  │ │Editing │ │Grouping │  │
│  │2.4KB   │ │          │ │           │ │        │ │         │  │
│  └────────┘ └──────────┘ └───────────┘ └────────┘ └─────────┘  │
├────────────────────────────────────────────────────────────────┤
│                       CORE ENGINE (35KB)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │  Store   │ │ EventBus │ │ Command  │ │ Plugin Manager   │   │
│  │  (state) │ │ (events) │ │ Bus      │ │ - topological    │   │
│  │  - batch │ │ - typed  │ │ - middle │ │   sort           │   │
│  │  - select│ │ - safe   │ │   ware   │ │ - lifecycle      │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
│  ┌──────────────────────┐ ┌──────────────────────────────────┐ │
│  │ Column Model         │ │ Row Model                        │ │
│  │ - resolve defs       │ │ - create nodes                   │ │
│  │ - flex sizing        │ │ - sort (TimSort-style)           │ │
│  │ - partition pinned   │ │ - filter (compiled predicates)   │ │
│  │ - update/find        │ │ - position assignment            │ │
│  └──────────────────────┘ └──────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────┤
│                       THEME SYSTEM (CSS only)                  │
│  70+ CSS custom properties, 3 themes, 3 density modes          │
│  Runtime-switchable via data-theme attribute, zero JS          │
└────────────────────────────────────────────────────────────────┘
```

### Unidirectional Data Flow

```
  User Action (click, type, API call)
       │
       ▼
  ┌─────────────┐     ┌──────────────────┐
  │ Command Bus │────▶│ Middleware Chain  │──── cancel?
  │ dispatch()  │     │ (logging, undo,  │     │
  └─────────────┘     │  validation)     │     ▼ (dropped)
                      └───────┬──────────┘
                              │
                              ▼
                      ┌──────────────────┐
                      │ Command Handler  │
                      │ (plugin or core) │
                      └───────┬──────────┘
                              │
                              ▼
                      ┌──────────────────┐
                      │ Store.setState() │
                      │ (immutable update)│
                      └───────┬──────────┘
                              │
                  ┌───────────┴───────────┐
                  │                       │
                  ▼                       ▼
          ┌──────────────┐      ┌──────────────────┐
          │ EventBus     │      │ Store listeners  │
          │ emit(event)  │      │ (subscriptions)  │
          └──────┬───────┘      └────────┬─────────┘
                 │                       │
                 ▼                       ▼
          ┌──────────────┐      ┌──────────────────┐
          │ Plugin event │      │ DOM Renderer     │
          │ handlers     │      │ re-render()      │
          └──────────────┘      └──────────────────┘
```

### Package Dependency Graph

```
  @gridstorm/react ──────────┐
  @gridstorm/vue ────────────┤
  @gridstorm/angular ────────┤
                             ▼
                   @gridstorm/dom-renderer
                             │
                             ▼
                      @gridstorm/core ◀──── @gridstorm/plugin-*
                             │
                             ▼
                   @gridstorm/theme-default (CSS only, no TS dep)
```

**Key rule:** `@gridstorm/core` has **zero** runtime dependencies. Everything is built from scratch. The DOM renderer depends only on core. Framework adapters depend on core + dom-renderer.

---

# SECTION 4 — Monorepo Structure & Package Design

### Directory Layout

```
gridstorm/
├── .github/                     # CI/CD, issue templates, PR templates
├── packages/
│   ├── core/                    # Tier 0 — Zero dependencies
│   │   ├── src/
│   │   │   ├── types/           # All TypeScript interfaces
│   │   │   │   ├── column.ts    # ColumnDef (29 members), ColumnState (22 members)
│   │   │   │   ├── row.ts       # RowNode (21 members), DataSource
│   │   │   │   ├── grid.ts      # GridConfig (24 members), GridState (12 slices), GridApi (41+ methods)
│   │   │   │   ├── plugin.ts    # GridPlugin, PluginContext (9 capabilities)
│   │   │   │   ├── events.ts    # GridEventMap (24 event types)
│   │   │   │   ├── filter.ts    # FilterModel, FilterOperator (12 operators)
│   │   │   │   ├── selection.ts # SelectionState, CellPosition, CellRange
│   │   │   │   ├── editing.ts   # EditingState, CellEditorDef, ValidationRule
│   │   │   │   └── index.ts     # Barrel re-exports
│   │   │   ├── state/
│   │   │   │   ├── store.ts     # Store<T> class, createSelector
│   │   │   │   └── selectors.ts # 15+ built-in selectors
│   │   │   ├── events/
│   │   │   │   ├── event-bus.ts # EventBus<TEventMap> — typed pub/sub
│   │   │   │   └── command-bus.ts # CommandBus — middleware, handlers
│   │   │   ├── plugins/
│   │   │   │   └── plugin-manager.ts # PluginManager — topological sort, lifecycle
│   │   │   ├── engine/
│   │   │   │   ├── grid-engine.ts    # createGrid() factory, GridApi impl
│   │   │   │   ├── column-model.ts   # resolveColumns, flex sizing, partition
│   │   │   │   └── row-model.ts      # createRowNodes, sort, filter, compile predicates
│   │   │   ├── utils/
│   │   │   │   ├── id.ts             # resolveRowId, generateId
│   │   │   │   ├── memoize.ts        # Memoization utilities
│   │   │   │   └── batch.ts          # rafThrottle, microtask batching
│   │   │   └── index.ts              # Public API barrel
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   ├── dom-renderer/            # Tier 1 — Depends on core
│   │   ├── src/
│   │   │   ├── virtual-scroll.ts    # VirtualScroller — fixed + variable heights
│   │   │   ├── scroll-manager.ts    # ScrollManager — RAF throttled, sync
│   │   │   ├── renderer.ts          # DomRenderer — row pooling, ARIA, cell pipeline
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   ├── react-adapter/           # Tier 2 — Depends on core + dom-renderer
│   │   ├── src/
│   │   │   ├── context.ts           # GridContext (React.createContext)
│   │   │   ├── hooks.ts             # useGridEngine, useGridApi, useGridState, useGridEvent
│   │   │   ├── GridStorm.tsx        # Main component
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   ├── theme-default/           # Tier 0 — CSS only, no TS
│   │   └── src/
│   │       ├── tokens.css           # 70+ custom properties
│   │       ├── base.css             # Structural styles
│   │       ├── light.css            # Light theme overrides
│   │       ├── dark.css             # Dark theme overrides
│   │       ├── high-contrast.css    # WCAG AAA
│   │       ├── density/
│   │       │   ├── compact.css      # 28px rows
│   │       │   ├── comfortable.css  # 40px rows
│   │       │   └── spacious.css     # 56px rows
│   │       └── index.css            # Imports all
│   └── plugin-sorting/         # Tier 1 — Depends on core
│       ├── src/
│       │   ├── sorting-plugin.ts    # SortingPlugin factory, toggle logic
│       │   └── index.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── tsup.config.ts
├── examples/                    # Demo apps (future)
├── benchmarks/                  # Performance benchmarks (future)
├── docs/                        # Documentation site (future)
├── ARCHITECTURE.md              # This document
├── package.json                 # Workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json           # Shared TS config (strict mode)
├── vitest.config.ts             # Shared test config
└── .prettierrc
```

### Tier System

| Tier | Package | Dependencies | Can import from |
|------|---------|-------------|-----------------|
| 0 | `core`, `theme-default` | None | Nothing (leaf nodes) |
| 1 | `dom-renderer`, `plugin-*` | `core` | `core` only |
| 2 | `react`, `vue`, `angular` | `core` + `dom-renderer` | Tiers 0–1 |
| 3 | `examples`, `benchmarks` | Everything | All tiers |

**Rule:** A package may only import from packages in a lower tier. This prevents circular dependencies.

### Build Pipeline

```
pnpm build
  └─ turbo run build --filter=./packages/*
       ├─ @gridstorm/core          → tsup → dist/{index.mjs, index.cjs, index.d.ts}
       ├─ @gridstorm/theme-default → postcss → dist/index.css
       ├─ @gridstorm/dom-renderer  → tsup → dist/{index.mjs, index.cjs, index.d.ts}
       ├─ @gridstorm/react         → tsup → dist/{index.mjs, index.cjs, index.d.ts}
       └─ @gridstorm/plugin-*     → tsup → dist/{index.mjs, index.cjs, index.d.ts}
```

Each package ships **ESM + CJS + DTS**. The `tsup.config.ts` is consistent:

```ts
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  external: [/^@gridstorm\//],  // Never bundle internal deps
});
```

### Versioning Strategy

- All packages share a **synchronized major version** (like Angular)
- Minor/patch versions can differ between packages
- `@changesets/cli` manages versioning and changelogs
- Internal deps use `workspace:*` protocol during development

---

# SECTION 5 — Core TypeScript Domain Model

### Interface Catalog

The type system is the contract between core, plugins, renderer, and framework adapters. Every interface is designed for:

1. **TypeScript inference** — Generic `TData` flows through all APIs
2. **Extensibility** — Declaration merging on `GridEventMap`, index signatures on `GridApi`
3. **Immutability at boundaries** — State slices are replaced, not mutated (except RowNode internals)

#### ColumnDef<TData, TValue> — 29 members

The column definition is the primary user-facing configuration type. It describes a single column's behavior across all features.

**Design philosophy:** Every feature that applies per-column (sorting, filtering, editing, rendering) gets its config on `ColumnDef`. This mirrors AG Grid's API shape for familiarity but uses stricter types.

```
ColumnDef<TData, TValue>
├── Identity:     colId?, field?, headerName?
├── Sizing:       width?, minWidth?, maxWidth?, flex?, resizable?
├── Pinning:      pinned?, lockPinned?, lockPosition?
├── Visibility:   hide?, suppressColumnsToolPanel?
├── Sorting:      sortable?, sort?, sortIndex?, comparator?
├── Filtering:    filterable?, filter?, filterParams?, floatingFilter?
├── Editing:      editable?, cellEditor?, cellEditorParams?
├── Rendering:    cellRenderer?, cellClass?, cellStyle?, headerRenderer?, headerClass?
├── Value pipe:   valueGetter?, valueSetter?, valueFormatter?, valueParser?
├── Aggregation:  aggFunc?, allowedAggFuncs?
├── Row grouping: rowGroup?, rowGroupIndex?, showRowGroup?
├── Pivot:        pivot?, pivotIndex?
├── Column groups: children?, groupId?, marryChildren?, openByDefault?
├── Tooltips:     tooltipField?, tooltipValueGetter?
└── Spanning:     colSpan?, rowSpan?
```

**Value pipeline per cell:**

```
  data[field]
      │
      ▼
  valueGetter(params)     ← custom value extraction
      │
      ▼
  raw value (TValue)
      │
      ├──▶ comparator()   ← sorting uses raw value
      ├──▶ filter()        ← filtering uses raw value
      │
      ▼
  valueFormatter(params)  ← display formatting
      │
      ▼
  formatted string
      │
      ▼
  cellRenderer(params)    ← custom DOM/HTML
      │
      ▼
  DOM cell content
```

#### ColumnState — 22 members

The resolved runtime state of a column, derived from `ColumnDef` + defaults + user interactions. This is what the store holds and what renderers read.

```
ColumnState
├── colId, field, headerName           ← identity
├── width, minWidth, maxWidth, flex    ← sizing (resolved numbers)
├── hide, pinned                       ← layout
├── sort, sortIndex, sortable          ← sort state
├── filterable, resizable              ← feature flags
├── editable                           ← edit state (bool or function)
├── rowGroup, rowGroupIndex            ← grouping
├── pivot, pivotIndex                  ← pivoting
├── aggFunc                            ← aggregation
└── originalDef                        ← reference back to user's ColumnDef
```

#### RowNode<TData> — 21 members

The internal representation of a single row. RowNodes are **mutable** — this is an intentional departure from pure immutability.

**Why mutable RowNodes?** With 100K+ rows, creating new RowNode objects on every state change is prohibitively expensive. Instead, RowNodes are mutated in-place and carry a `version` counter. The renderer checks `version` to know if a row needs re-rendering.

```
RowNode<TData>
├── Identity:    id, data, sourceIndex, displayIndex
├── Geometry:    rowHeight, rowTop, level
├── Hierarchy:   parent, children, expanded, group
├── Grouping:    groupField, groupValue, leafChildrenCount
├── Aggregation: aggData
├── Selection:   selected, selectable
├── Detail:      detail (master/detail expansion)
├── Pinning:     rowPinned ('top' | 'bottom' | null)
└── Versioning:  version (incremented on mutation)
```

#### GridConfig<TData> — 24 members

User-provided grid configuration. Passed to `createGrid()` or `<GridStorm>` component.

```
GridConfig<TData>
├── Data:        columns, rowData?, dataSource?, rowModelType?, getRowId?
├── Plugins:     plugins?
├── Defaults:    defaultColDef?
├── Sizing:      rowHeight?, headerHeight?
├── Layout:      domLayout?
├── Pinned rows: pinnedTopRowData?, pinnedBottomRowData?
├── Scrolling:   suppressScrollX?, suppressScrollY?
├── Selection:   rowSelection?
├── Editing:     editType?, undoRedoCellEditing?
├── Pagination:  pagination?, paginationPageSize?
├── Animation:   animateRows?
├── A11y:        ariaLabel?
├── i18n:        locale?
├── Theme:       theme?
└── Callbacks:   onGridReady?, onRowDataChanged?, onSelectionChanged?,
                 onSortChanged?, onFilterChanged?, onCellValueChanged?
```

#### GridState<TData> — 12 slices

The complete state tree managed by the Store. Every piece of grid state lives here.

```
GridState<TData>
├── columns:        ColumnState[]          ← resolved column definitions
├── rowNodes:       Map<string, RowNode>   ← all rows by ID
├── displayedRowIds: string[]              ← filtered/sorted row order
├── sortModel:      SortModelItem[]        ← active sort columns
├── filterModel:    Record<string, FilterModel>  ← per-column filters
├── selection:      { selectedRowIds: Set, rangeSelections: CellRange[] }
├── editing:        EditingState | null     ← currently editing cell
├── scroll:         { top, left }           ← scroll position
├── focusedCell:    CellPosition | null     ← keyboard focus
├── pagination:     { currentPage, pageSize, totalRows }
├── quickFilterText: string                 ← global search text
└── pluginState:    Record<string, unknown> ← plugin-managed slices
```

#### GridApi<TData> — 41+ methods across 11 categories

The public API surface. Plugins can extend this at runtime via the index signature.

```
GridApi<TData>
├── Data (5):      setRowData, getRowNode, forEachNode, getDisplayedRowCount, getDisplayedRowAtIndex
├── Columns (11):  setColumnDefs, getColumn, getAllColumns, getVisibleColumns,
│                  setColumnVisible, setColumnPinned, setColumnWidth, moveColumn,
│                  autoSizeColumn, autoSizeAllColumns, getColumnState, applyColumnState
├── Sorting (2):   setSortModel, getSortModel
├── Filtering (4): setFilterModel, getFilterModel, setQuickFilter, isAnyFilterPresent
├── Selection (4): selectAll, deselectAll, getSelectedRows, getSelectedNodes
├── Editing (2):   startEditingCell, stopEditing
├── Scrolling (2): ensureIndexVisible, ensureColumnVisible
├── Groups (3):    expandAll, collapseAll, setRowNodeExpanded
├── Rendering (2): refreshCells, redrawRows
├── Pagination (3): paginationGoToPage, paginationGetCurrentPage, paginationGetTotalPages
├── Config (2):    setGridOption, getGridOption
├── Lifecycle (1): destroy
├── Events (2):    addEventListener, removeEventListener
├── Plugins (1):   getPluginApi
├── State (1):     getState
└── [key: string]: any  ← plugin extensions
```

#### GridPlugin<TData> — Plugin Contract

```
GridPlugin<TData>
├── id:           string              ← unique identifier
├── name:         string              ← human-readable
├── version:      string              ← semver
├── dependencies?: string[]           ← other plugin IDs
└── install(ctx): void | Disposer     ← lifecycle entry point
```

#### PluginContext<TData> — 9 capabilities

What a plugin receives during `install()`. This is the plugin's window into the grid.

```
PluginContext<TData>
├── api:               GridApi              ← public API (read + mutate)
├── store:             PluginStoreAccess    ← getState, setState, subscribe, batch
├── eventBus:          PluginEventBus       ← emit, on (typed events)
├── commandBus:        PluginCommandBus     ← dispatch, registerHandler
├── config:            GridConfig           ← original user config (read-only)
├── getPlugin(id):     GridPlugin | undefined
├── registerCommand:   (type, handler) → void
├── registerState:     (key, initialState) → void  ← plugin-owned state slice
├── getState/setState: (key) → S  /  (key, updater) → void
├── registerCellRenderer: (name, fn) → void
└── registerCellEditor:   (name, def) → void
```

#### GridEventMap<TData> — 24 typed events

```
GridEventMap<TData>
├── Lifecycle (2):   grid:ready, grid:destroyed
├── Data (2):        rowData:changed, rowNode:updated
├── Columns (6):     column:moved, column:resized, column:visible,
│                    column:pinned, column:sort:changed, columns:changed
├── Selection (2):   selection:changed, range:selection:changed
├── Editing (3):     cell:editingStarted, cell:editingStopped, cell:valueChanged
├── Filtering (2):   filter:changed, quickFilter:changed
├── Scroll (2):      scroll:changed, viewport:changed
├── Groups (1):      row:groupOpened
├── Focus (1):       cell:focused
├── Pagination (1):  pagination:changed
└── Interaction (4): row:clicked, row:doubleClicked, cell:clicked, cell:doubleClicked
```

**Extensibility:** Plugins can add custom events via TypeScript declaration merging:

```ts
declare module '@gridstorm/core' {
  interface GridEventMap<TData> {
    'clipboard:paste': { data: string[][]; target: CellPosition };
  }
}
```

#### FilterModel — Recursive, Composable

```
FilterModel
├── filterType:  'text' | 'number' | 'date' | 'set' | 'custom'
├── type?:       FilterOperator (12 operators: equals, contains, lessThan, inRange, blank, ...)
├── filter?:     string | number | null        ← primary value
├── filterTo?:   string | number | null        ← range end
├── dateFrom/To?: string | null                ← date range
├── values?:     any[]                         ← set filter values
├── operator?:   'AND' | 'OR'                  ← compound logic
├── conditions?: FilterModel[]                 ← recursive sub-filters
└── [key]:       unknown                       ← custom filter data
```

---

# SECTION 6 — Plugin System Design

### Plugin Lifecycle

```
  register(plugin)           ← called by user or config.plugins[]
       │
       ▼
  PluginManager.installAll()
       │
       ▼
  topologicalSort()          ← resolve dependency order, detect cycles
       │
       ▼
  ┌────────────────────────────────────────┐
  │ For each plugin (in dependency order): │
  │                                        │
  │   1. createContext(plugin)             │
  │      └─ builds isolated PluginContext  │
  │                                        │
  │   2. plugin.install(context)           │
  │      ├─ registerCommand(...)           │
  │      ├─ registerState(...)             │
  │      ├─ registerCellRenderer(...)      │
  │      ├─ eventBus.on(...)               │
  │      └─ return disposer?               │
  │                                        │
  │   3. Store disposer if returned        │
  └────────────────────────────────────────┘
       │
       ▼
  grid:ready event emitted
       │
       ... (grid operates) ...
       │
       ▼
  api.destroy()
       │
       ▼
  destroyAll()
       ├─ call disposers in REVERSE order
       ├─ clear all registrations
       └─ emit grid:destroyed
```

### Dependency Resolution — Topological Sort

The plugin manager performs a topological sort with cycle detection before installing any plugins:

```
Input: [PluginA(deps: []), PluginB(deps: ['sorting']), SortingPlugin(deps: [])]

Step 1: Visit PluginA → no deps → add to result
Step 2: Visit PluginB → needs 'sorting' → visit SortingPlugin first
Step 3: Visit SortingPlugin → no deps → add to result
Step 4: Back to PluginB → dep satisfied → add to result

Result: [PluginA, SortingPlugin, PluginB]

Cycle detection: A "visiting" Set tracks the current DFS path.
If we encounter a node already in "visiting", it's a cycle.
Error: "Circular plugin dependency detected: A → B → C → A"
```

### Four Communication Patterns

Plugins communicate with the grid and each other through four distinct patterns:

#### 1. Commands (write path)

```ts
// Plugin registers a command handler
ctx.registerCommand('sort:toggle', (payload) => {
  const newModel = computeNewSort(payload);
  ctx.api.setSortModel(newModel);
});

// Anyone can dispatch
ctx.commandBus.dispatch('sort:toggle', { colId: 'age', multiSort: true });
```

Commands are the **only** sanctioned way to trigger state mutations. This enables:
- Middleware for logging, undo/redo, validation
- Command cancellation via middleware `context.cancel()`
- Multiple handlers per command (extensibility)

#### 2. Events (read path)

```ts
// Plugin listens for events
ctx.eventBus.on('column:sort:changed', ({ sortModel }) => {
  // React to sort changes
});

// Events are emitted AFTER state changes
ctx.eventBus.emit('custom:event', { data: 'hello' });
```

Events are fire-and-forget notifications. They cannot prevent or modify state changes. Error handling wraps each listener so one failure doesn't break others.

#### 3. State Slices (plugin-owned state)

```ts
// Register during install
ctx.registerState('myPlugin', { count: 0, expanded: new Set() });

// Read anywhere
const state = ctx.getState<MyPluginState>('myPlugin');

// Update
ctx.setState('myPlugin', (prev) => ({ ...prev, count: prev.count + 1 }));
```

Plugin state lives in `GridState.pluginState[key]`. It participates in the same subscription system as core state.

#### 4. Direct API (cross-plugin)

```ts
// Plugin B reads Plugin A
const sortingPlugin = ctx.getPlugin<SortingPlugin>('sorting');
if (sortingPlugin) {
  // Use sorting plugin's capabilities
}

// Plugin exposes an API
ctx.api.myPluginMethod = () => { /* ... */ };
```

### Built-in Command Registry

| Command | Payload | Handler |
|---------|---------|---------|
| `rows:reprocess` | `void` | Runs filter → sort → position pipeline |
| `sort:set` | `{ sortModel: SortModelItem[] }` | Sets sort model and reprocesses |
| `filter:set` | `{ filterModel: Record<string, FilterModel> }` | Sets filter model and reprocesses |
| `sort:toggle` | `{ colId, multiSort? }` | Registered by SortingPlugin |
| `sort:clear` | `void` | Registered by SortingPlugin |

### Plugin Example — SortingPlugin

The sorting plugin demonstrates the full pattern:

```
SortingPlugin(options?)
├── Options:
│   ├── multiSort (default: true)
│   ├── maxSortColumns (default: Infinity)
│   ├── sortCycle (default: ['asc', 'desc', null])
│   └── autoApply (default: true)
├── install(ctx):
│   ├── Registers 'sort:toggle' command handler
│   │   └── Reads current sortModel → computes next state → calls api.setSortModel()
│   ├── Registers 'sort:clear' command handler
│   │   └── Calls api.setSortModel([])
│   └── Returns disposer that unregisters both handlers
└── Sort cycle per column:
    click 1: null → 'asc'
    click 2: 'asc' → 'desc'
    click 3: 'desc' → null (removed from model)
```

### Enterprise Guard Pattern (Future)

For premium plugins, we'll use a license check pattern:

```ts
function PivotPlugin(licenseKey: string): GridPlugin {
  return {
    id: 'pivot',
    install(ctx) {
      if (!validateLicense(licenseKey, 'pivot')) {
        console.warn('[GridStorm] Pivot requires an enterprise license.');
        return;
      }
      // ... full implementation
    }
  };
}
```

---

# SECTION 7 — Rendering Engine Design

### DOM Structure

The renderer creates a fixed DOM structure optimized for virtual scrolling:

```html
<div class="gs-root" role="grid" aria-label="Data Grid"
     aria-rowcount="10000" aria-colcount="8">
  <div class="gs-wrapper" style="display:flex;flex-direction:column;height:100%">

    <!-- Sticky header -->
    <div class="gs-header" role="rowgroup"
         style="position:sticky;top:0;z-index:2;overflow:hidden">
      <div class="gs-header-row" role="row" style="display:flex;height:48px">
        <div class="gs-header-cell" role="columnheader"
             data-col-id="name" aria-sort="ascending"
             style="width:200px">
          <span>Name</span>
          <span class="gs-sort-icon">▲</span>
        </div>
        <!-- ... more header cells ... -->
      </div>
    </div>

    <!-- Scrollable body viewport -->
    <div class="gs-body-viewport"
         style="overflow:auto;position:relative;flex:1;contain:strict">

      <!-- Height spacer (sets total scrollable height) -->
      <div class="gs-height-spacer"
           style="position:absolute;width:1px;height:400000px;pointer-events:none">
      </div>

      <!-- Body container (holds only visible rows) -->
      <div class="gs-body" role="rowgroup"
           style="position:relative;will-change:transform">

        <!-- Only ~30 row elements exist at any time (viewport + overscan) -->
        <div class="gs-row" role="row" data-row-id="row-42"
             aria-rowindex="43"
             style="position:absolute;top:1680px;height:40px">
          <div class="gs-cell" role="gridcell" aria-colindex="1"
               data-col-id="name" style="width:200px">
            John Smith
          </div>
          <!-- ... more cells ... -->
        </div>
        <!-- ... more visible rows ... -->
      </div>
    </div>
  </div>
</div>
```

### Virtual Scrolling — How It Works

#### Fixed Row Height (O(1) per scroll)

When all rows have the same height (default: 40px), calculations are trivial:

```
Given: scrollTop = 5000, rowHeight = 40, viewportHeight = 600, overscan = 5

firstVisible  = floor(5000 / 40)           = 125
visibleCount  = ceil(600 / 40)              = 15
startIndex    = max(0, 125 - 5)             = 120
endIndex      = min(rowCount, 125 + 15 + 5) = 145
offsetTop     = 120 * 40                    = 4800
totalHeight   = rowCount * 40               = (e.g., 400000)
```

Only rows 120–145 exist in the DOM. That's 25 elements regardless of whether you have 1,000 or 1,000,000 rows.

#### Variable Row Height (O(log n) per scroll)

When rows have different heights, we maintain a cumulative height array and use binary search:

```
Heights:    [40, 60, 40, 80, 40, 60, ...]
Cumulative: [40, 100, 140, 220, 260, 320, ...]

To find which row is at scrollTop = 150:
  Binary search cumulative array for 150
  → index 3 (cumulative[2] = 140 < 150, cumulative[3] = 220 >= 150)
  → first visible row = 3
```

The height cache is rebuilt only when `rowCount` changes or heights are reconfigured.

### DOM Recycling (Row Pooling)

Instead of creating/destroying DOM elements on every scroll, we recycle them:

```
Scroll down (rows 10-30 visible → rows 15-35 visible):

1. Rows 10-14 leave viewport:
   - Remove from bodyContainer
   - Strip content, attributes, classes
   - Push to rowPool[]

2. Rows 31-35 enter viewport:
   - Pop from rowPool[] (or createElement if pool empty)
   - Set new position, content, ARIA attributes
   - Append to bodyContainer

Result: No GC pressure from DOM nodes
```

### Cell Rendering Pipeline

For each cell in a visible row:

```
Step 1: Get raw value
  ├── valueGetter exists? → call valueGetter(params)
  └── no valueGetter? → getValueFromData(node.data, col.field)
       └── supports dot.notation.paths

Step 2: Format for display
  ├── valueFormatter exists? → call valueFormatter(params) → string
  └── no formatter? → String(value) or ''

Step 3: Render to DOM
  ├── cellRenderer exists? → call cellRenderer(params)
  │   ├── returns string → cell.innerHTML = result
  │   └── returns HTMLElement → cell.appendChild(result)
  └── no renderer? → cell.textContent = displayValue

Step 4: Apply styling
  ├── cellClass? → add CSS classes (string | string[] | function)
  └── cellStyle? → Object.assign(cell.style, styles)
```

### Scroll Synchronization

The header scrolls horizontally in sync with the body, but stays pinned vertically:

```
Body viewport (scrollable)
  │
  ├── onScroll event (RAF-throttled)
  │     ├── Read scrollTop, scrollLeft
  │     ├── Set headerContainer.scrollLeft = scrollLeft  ← horizontal sync
  │     ├── Update store scroll state
  │     └── Call renderVisibleRows()
  │
  └── ResizeObserver on bodyViewport
        └── Update scroller.viewportHeight → re-render
```

### Performance Optimizations in Renderer

1. **`contain: strict`** on body viewport — tells browser this subtree is independent, enabling paint/layout isolation
2. **`will-change: transform`** on body container — promotes to compositor layer
3. **`position: absolute`** rows — removes from document flow, no reflow cascade
4. **Version-based skip** — if `node.version` hasn't changed, skip row content update
5. **Range-based skip** — if `startIndex/endIndex` haven't changed, skip entire render pass
6. **RAF-throttled scroll** — scroll handler runs at most once per animation frame
7. **Row pooling** — reuse DOM elements instead of create/destroy
8. **textContent clear** — faster than innerHTML = '' for removing children
9. **Minimal style writes** — check before setting (`if (el.style.top !== ...)`)
10. **No framework overhead** — direct DOM manipulation, no virtual DOM diffing

---

# SECTION 8 — State Management Design

### Why a Custom Store?

| Approach | Bundle | Grid-specific features | Integration |
|----------|--------|----------------------|-------------|
| Redux | +8KB | None built-in | Requires middleware |
| Zustand | +1KB | None built-in | Close fit, but external dep |
| MobX | +16KB | None built-in | Proxy-based, complex |
| **Custom Store** | **0KB** (part of core) | **Batching, selectors, version tracking** | **Built for the grid** |

Our Store is <100 lines of code. Adding a dependency for this would be over-engineering.

### Store<T> Architecture

```ts
class Store<TState> {
  private state: TState;
  private listeners: Set<StoreListener>;
  private batchDepth: number;
  private pendingNotify: boolean;
  private version: number;

  getState(): TState;               // Synchronous snapshot
  setState(updater): void;          // Immutable update, notifies listeners
  batch(fn): void;                  // Group multiple updates into one notification
  subscribe(listener): Unsubscribe; // React-compatible subscription
  select<R>(selector): R;           // Run a selector against current state
  getVersion(): number;             // Monotonic counter for change detection
}
```

### Batching — Why It Matters

Without batching, `setRowData()` would trigger two renders:

```ts
// Without batching:
store.setState(prev => ({ ...prev, rowNodes: newMap }));       // notify → render 1
store.setState(prev => ({ ...prev, displayedRowIds: [...] })); // notify → render 2

// With batching:
store.batch(() => {
  store.setState(prev => ({ ...prev, rowNodes: newMap }));        // queued
  store.setState(prev => ({ ...prev, displayedRowIds: [...] })); // queued
});
// Single notify → render 1
```

Batching is recursive-safe. Nested batches increment a depth counter; notification fires only when the outermost batch completes.

### Hybrid Mutable/Immutable Strategy

**Immutable state slices** (replaced via `setState`):
- `columns: ColumnState[]`
- `sortModel: SortModelItem[]`
- `filterModel: Record<string, FilterModel>`
- `selection: { selectedRowIds, rangeSelections }`
- `editing: EditingState | null`
- `scroll: { top, left }`
- `pagination: { currentPage, pageSize, totalRows }`
- `pluginState: Record<string, unknown>`

**Mutable objects** (mutated in-place with version counter):
- `RowNode<TData>` — `displayIndex`, `rowTop`, `selected`, `expanded`, `version` are mutated directly

**Why hybrid?** Consider sorting 100K rows:
- Pure immutable: create 100K new RowNode objects = ~50MB allocation, major GC pause
- Hybrid: mutate `displayIndex` and `rowTop` on each node, increment `version` = zero allocation

The `version` counter on each RowNode lets the renderer do a cheap `===` check to know if a row changed.

### Memoized Selectors

```ts
function createSelector<TState, TDeps[], TResult>(
  dependencies: Selector[],
  combiner: (...deps) => TResult,
): Selector<TState, TResult>
```

Selectors cache their result and only recompute when their dependency values change (reference equality check).

Built-in selectors:

```
selectAllColumns         ← state.columns
selectVisibleColumns     ← columns.filter(c => !c.hide)
selectPinnedLeft         ← columns.filter(c => c.pinned === 'left')
selectPinnedRight        ← columns.filter(c => c.pinned === 'right')
selectPinnedCenter       ← columns.filter(c => c.pinned === null && !c.hide)
selectTotalColumnWidth   ← sum of visible column widths
selectDisplayedRowIds    ← state.displayedRowIds
selectDisplayedRowCount  ← displayedRowIds.length
selectDisplayedRows      ← map IDs to RowNodes
selectSortModel          ← state.sortModel
selectFilterModel        ← state.filterModel
selectSelectedRowIds     ← state.selection.selectedRowIds
selectSelectedNodes      ← map selected IDs to RowNodes
selectScrollState        ← state.scroll
selectFocusedCell        ← state.focusedCell
selectPagination         ← state.pagination
```

### React Integration — useSyncExternalStore

The React adapter uses `useSyncExternalStore` for tear-free reads:

```ts
function useGridState<T>(selector: (state: GridState) => T): T {
  const engine = useContext(GridContext);
  return useSyncExternalStore(
    engine.store.subscribe,                      // subscribe function
    () => selector(engine.store.getState()),      // getSnapshot
  );
}
```

This guarantees:
- No tearing during concurrent rendering
- Automatic re-render when selected state changes
- Selector memoization prevents unnecessary renders

---

# SECTION 9 — Public API Design

### Two API Modes

#### 1. Declarative (Framework Components)

```tsx
// React
<GridStorm
  columns={columnDefs}
  rowData={data}
  plugins={[SortingPlugin({ multiSort: true })]}
  rowSelection="multiple"
  onSelectionChanged={(e) => console.log(e.selectedNodes)}
  onGridReady={(api) => apiRef.current = api}
/>
```

The component manages the engine lifecycle. Props map to `GridConfig` members. Changes to `rowData` and `columns` props are synced to the engine automatically.

#### 2. Imperative (Plain TypeScript)

```ts
import { createGrid } from '@gridstorm/core';
import { DomRenderer } from '@gridstorm/dom-renderer';
import { SortingPlugin } from '@gridstorm/plugin-sorting';

const engine = createGrid({
  columns: [
    { field: 'name', sortable: true },
    { field: 'age', sortable: true, width: 100 },
  ],
  rowData: data,
  plugins: [SortingPlugin()],
});

const renderer = new DomRenderer({
  container: document.getElementById('grid')!,
  engine,
});
renderer.mount();

// API usage
engine.api.setSortModel([{ colId: 'name', sort: 'asc' }]);
engine.api.setRowData(newData);

// Cleanup
renderer.destroy();
engine.destroy();
```

### Controlled vs Uncontrolled

| Pattern | How it works | When to use |
|---------|-------------|-------------|
| **Uncontrolled** | Grid owns state. User reads via API/events. | Most cases. Simpler. |
| **Controlled** | User provides state via props/config. Grid reflects it. | When state lives in external store (Redux, URL params). |

### Framework Adapter Contracts

Each adapter must implement:

1. **Mount** — create engine + renderer when component mounts
2. **Sync props** — update engine when reactive props change (rowData, columns)
3. **Provide context** — expose engine/api to child components via framework context
4. **Hooks/composables** — `useGridApi()`, `useGridState(selector)`, `useGridEvent(event, handler)`
5. **Destroy** — clean up engine + renderer on unmount

Adapter sizes should be <5KB because they're thin wrappers over core + dom-renderer.

### React Adapter — Implementation

```
GridStorm.tsx
├── useGridEngine(config) hook
│   ├── Creates engine with useRef (once)
│   ├── Syncs rowData changes via api.setRowData()
│   ├── Syncs columns changes via api.setColumnDefs()
│   └── Destroys engine on unmount
├── useEffect → creates DomRenderer, mounts, destroys
├── Provides GridContext with engine value
└── Renders <div ref={containerRef} /> mount point

hooks.ts
├── useGridApi() → GridContext consumer, returns api
├── useGridState(selector) → useSyncExternalStore bridge
└── useGridEvent(event, handler) → stable event subscription with useRef
```

---

# SECTION 10 — Theme System Design

### Design Token Architecture

The theme system uses CSS custom properties organized in a hierarchical naming convention:

```
--gs-{category}-{element}-{property}-{variant}

Categories:     color, spacing, font, border, radius, shadow, z, transition
Elements:       cell, header, row, toolbar, menu, scrollbar
Properties:     bg, fg, border, size, weight, family, width
Variants:       hover, selected, focused, disabled, active
```

Examples:
```css
--gs-color-bg:                  #ffffff;
--gs-color-row-bg-hover:        #f5f5f5;
--gs-color-row-bg-selected:     #e3f2fd;
--gs-color-cell-bg-editing:     #fff8e1;
--gs-color-header-bg:           #fafafa;
--gs-color-border:              #e0e0e0;
--gs-spacing-cell-horizontal:   12px;
--gs-font-size-cell:            13px;
--gs-font-weight-header:        600;
--gs-border-width:              1px;
--gs-radius-cell:               0px;
--gs-shadow-header:             0 1px 3px rgba(0,0,0,0.1);
--gs-z-header:                  2;
--gs-transition-duration:       150ms;
```

### Three Theme Application Strategies

#### 1. Data Attribute (Recommended)

```html
<div class="gs-root" data-theme="dark">
```

```css
[data-theme="dark"] {
  --gs-color-bg: #1e1e1e;
  --gs-color-fg: #e0e0e0;
}
```

**Advantage:** Multiple grids on the same page can have different themes.

#### 2. CSS Class

```css
.gs-theme-dark { --gs-color-bg: #1e1e1e; }
```

#### 3. JavaScript Runtime Switch

```ts
api.setGridOption('theme', 'dark');
// Internally: rootElement.setAttribute('data-theme', 'dark')
```

### Built-in Themes

| Theme | File | Key characteristics |
|-------|------|---------------------|
| Light (default) | `light.css` | White background, subtle borders, blue accents |
| Dark | `dark.css` | Dark gray background, lighter borders, blue accents |
| High Contrast | `high-contrast.css` | WCAG AAA, 2px borders, bold text, high-contrast colors |

### Density Modes

| Mode | Row height | Spacing | Use case |
|------|-----------|---------|----------|
| Compact | 28px | 4px padding | Data-dense dashboards |
| Comfortable (default) | 40px | 12px padding | Standard usage |
| Spacious | 56px | 20px padding | Touch devices, accessibility |

Applied via data attribute: `<div class="gs-root" data-density="compact">`

### Custom Theme Creation

Users create themes by overriding CSS custom properties:

```css
[data-theme="corporate"] {
  --gs-color-bg: #f8f9fa;
  --gs-color-header-bg: #003366;
  --gs-color-header-fg: #ffffff;
  --gs-color-accent: #ff6600;
  --gs-color-row-bg-selected: rgba(255, 102, 0, 0.1);
  --gs-font-family: 'Inter', sans-serif;
  --gs-radius-cell: 4px;
}
```

No build step required. No JavaScript. Works with any CSS tooling.

---

# SECTION 11 — Accessibility Model

### ARIA Grid Pattern

The grid implements the WAI-ARIA Grid Pattern:

```
role="grid"           → root element
  role="rowgroup"     → header container
    role="row"        → header row
      role="columnheader" → each header cell
  role="rowgroup"     → body container
    role="row"        → each data row
      role="gridcell" → each data cell
```

Required ARIA attributes (already implemented):
- `aria-rowcount` — total row count (including those not in DOM)
- `aria-colcount` — total visible column count
- `aria-rowindex` — 1-based row position (adjusted for virtualization)
- `aria-colindex` — 1-based column position
- `aria-sort` — "ascending" | "descending" | "none" on sortable headers
- `aria-selected` — "true" on selected rows
- `aria-label` — grid label from config

### Keyboard Navigation Matrix

| Key | Action | Context |
|-----|--------|---------|
| `Arrow Up` | Move focus one row up | Grid body |
| `Arrow Down` | Move focus one row down | Grid body |
| `Arrow Left` | Move focus one cell left | Grid body |
| `Arrow Right` | Move focus one cell right | Grid body |
| `Home` | Move to first cell in row | Grid body |
| `End` | Move to last cell in row | Grid body |
| `Ctrl+Home` | Move to first cell in grid | Grid body |
| `Ctrl+End` | Move to last cell in grid | Grid body |
| `Page Up` | Scroll up one viewport height | Grid body |
| `Page Down` | Scroll down one viewport height | Grid body |
| `Enter` | Start editing / confirm edit | Cell focus / editing |
| `Escape` | Cancel editing | Editing |
| `Tab` | Move to next cell (or exit grid) | Grid body |
| `Shift+Tab` | Move to previous cell | Grid body |
| `Space` | Toggle row selection | Row focus |
| `Ctrl+A` | Select all rows | Grid body |
| `Ctrl+C` | Copy selected cells | Selection |
| `F2` | Start editing current cell | Cell focus |
| `Delete` | Clear cell value | Cell focus |
| `Ctrl+Z` | Undo | If undo enabled |

### Roving Tabindex

The grid uses roving tabindex for focus management:

```
Before focus enters grid:
  All cells: tabindex="-1"
  One cell:  tabindex="0" (the focus anchor)

User tabs into grid:
  Focus lands on the cell with tabindex="0"

User arrows to another cell:
  Old cell: tabindex="-1"
  New cell: tabindex="0", focus()

User tabs out of grid:
  Focus moves to next focusable element outside grid
  Last focused cell retains tabindex="0" for re-entry
```

### Screen Reader Announcements (Future)

Live regions for dynamic content:

```html
<div aria-live="polite" aria-atomic="true" class="gs-sr-only">
  <!-- Dynamically updated -->
  "Sorted by Name, ascending"
  "Filter applied: Age greater than 25. 1,234 rows displayed."
  "Row 42 selected"
  "Page 3 of 10"
</div>
```

---

# SECTION 12 — Performance Strategy

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial render (1K rows) | <50ms | `performance.mark()` around `createGrid()` + `mount()` |
| Initial render (100K rows) | <200ms | Same |
| Scroll FPS (100K rows) | 60fps | `requestAnimationFrame` timing |
| Sort (100K rows) | <100ms | `performance.mark()` around `setSortModel()` |
| Filter (100K rows) | <150ms | `performance.mark()` around `setFilterModel()` |
| Memory (100K rows, 10 cols) | <80MB | Chrome DevTools heap snapshot |
| Bundle size (core only) | <40KB gz | `bundlephobia` |
| Bundle size (core + sort + filter) | <50KB gz | `bundlephobia` |
| Time to Interactive | <100ms | `createGrid()` to `grid:ready` event |

### Bottleneck Analysis & Mitigations

#### 1. Sorting (CPU-bound)

**Problem:** Array.prototype.sort with a comparator is O(n log n) with function call overhead per comparison.

**Mitigations:**
- Pre-extract values before sort to avoid repeated field lookups
- Use typed comparators (number vs string) to avoid type checks per comparison
- For multi-column sort, bail early when first column comparison is non-zero
- Consider WebWorker offloading for >500K rows (future)

#### 2. Filtering (CPU-bound)

**Problem:** Each filter check runs per-row. With multiple filters, this compounds.

**Mitigations:**
- **Compile filter predicates** once from `FilterModel` to `Function`. The current implementation does this via `compileFilter()`.
- **Short-circuit** on first failing filter (AND logic)
- **Set filters** use `Set.has()` for O(1) membership check
- **Quick filter** breaks on first column match

#### 3. DOM Operations (Render-bound)

**Problem:** Creating/destroying DOM nodes triggers GC. Layout thrashing from reading then writing styles.

**Mitigations:**
- **Row pooling** — recycle DOM elements
- **Version check** — skip row update if `node.version` unchanged
- **Range check** — skip render if `startIndex/endIndex` unchanged
- **Batch DOM writes** — build all cells for a row, then append once
- **`contain: strict`** — CSS containment on viewport
- **Absolute positioning** — rows don't affect each other's layout

#### 4. Memory (Heap-bound)

**Problem:** 100K RowNode objects with 21 fields = significant heap usage.

**Mitigations:**
- RowNode uses direct properties (not Map/WeakMap)
- Mutable RowNodes avoid allocation on state changes
- `displayedRowIds` stores strings (IDs), not full objects
- Row DOM pool caps at ~2x viewport size

#### 5. Scroll Jank (Frame-bound)

**Problem:** Scroll events fire at high frequency. Heavy work in scroll handler causes jank.

**Mitigations:**
- **RAF throttle** — scroll handler runs at most once per frame
- **O(1) row calculation** — fixed height mode needs no search
- **O(log n) binary search** — variable height mode
- **Overscan buffer** — pre-render rows above/below viewport to hide render latency

#### 6. Initial Load (Startup-bound)

**Problem:** Processing 100K rows on page load blocks the main thread.

**Mitigations:**
- `createRowNodes()` is a single pass, no intermediate allocations
- Column resolution is O(columns), not O(rows)
- `reprocessRows()` (filter + sort + position) runs once after initialization
- Consider chunked initialization for >500K rows (future)

### Profiling Checklist

Before each release, verify:

- [ ] 100K rows render in <200ms (Chrome DevTools Performance tab)
- [ ] Scroll maintains 60fps (Chrome DevTools Frames tab)
- [ ] Sort 100K rows in <100ms (console.time around setSortModel)
- [ ] No memory leaks after 1000 sort/filter cycles (heap snapshot comparison)
- [ ] Bundle size hasn't regressed (check dist/ sizes)
- [ ] No layout thrashing (Chrome DevTools Performance → Recalculate Style)

---

# SECTION 13 — Feature Delivery Roadmap

### Phase 0: Architecture Spike — COMPLETE

**Status:** All packages build successfully.

**Deliverables:**
- [x] `@gridstorm/core` (35KB ESM) — types, store, event bus, command bus, plugin manager, grid engine
- [x] `@gridstorm/dom-renderer` (21KB ESM) — virtual scroll, row/cell rendering, scroll sync
- [x] `@gridstorm/react` (4.5KB ESM) — React 18+ wrapper with hooks
- [x] `@gridstorm/theme-default` — CSS custom properties, light/dark/high-contrast, density modes
- [x] `@gridstorm/plugin-sorting` (2.4KB ESM) — first feature plugin

**Acceptance criteria:**
- [x] All TypeScript strict mode builds pass
- [x] Plugin system correctly resolves dependencies and installs
- [x] Store batching works
- [x] Virtual scroller calculates correct ranges
- [x] DOM renderer creates ARIA-compliant structure
- [x] Sorting plugin toggles sort model via command bus

### Phase 1: MVP Grid — NOT STARTED

**Goal:** A fully functional grid that handles the 80% use case: display, sort, filter, select, edit, resize.

**Deliverables:**

| Package | Description | Est. size | Priority |
|---------|-------------|-----------|----------|
| `@gridstorm/plugin-filtering` | Column filters (text, number, date, set) + quick filter UI | ~6KB | P0 |
| `@gridstorm/plugin-selection` | Row selection (single/multi), checkbox column, range selection | ~4KB | P0 |
| `@gridstorm/plugin-editing` | Cell editing (text, number, date, select, boolean editors) | ~5KB | P0 |
| `@gridstorm/plugin-column-resize` | Drag-to-resize columns with visual indicators | ~3KB | P0 |
| `@gridstorm/plugin-pagination` | Client-side pagination with page controls | ~3KB | P1 |
| Column drag-and-drop reorder | Header drag to reorder columns | ~3KB | P1 |
| Context menu | Right-click context menu (copy, paste, export row) | ~3KB | P2 |

**Phase 1 Acceptance Criteria:**
- [ ] Can render 100K rows at 60fps scroll
- [ ] All filter types work with compound AND/OR
- [ ] Cell editing with Enter/Escape/Tab navigation
- [ ] Multi-row selection with Shift+Click and Ctrl+Click
- [ ] Column resize with min/max width constraints
- [ ] Unit tests for all plugins (>80% coverage)
- [ ] Working demo app with all features
- [ ] Documentation for all public APIs

**Risks:**
- Filter UI complexity (floating filters, filter panels, custom filter components)
- Editing edge cases (Tab navigation across columns, validation, cancellation)
- Selection interaction with virtualization (selecting rows not in DOM)

### Phase 2: Advanced Features — NOT STARTED

**Goal:** Features for complex data scenarios: hierarchical data, grouping, server-side data.

**Deliverables:**

| Package | Description | Est. size |
|---------|-------------|-----------|
| `@gridstorm/plugin-row-grouping` | Row grouping with aggregation, expandable groups | ~8KB |
| `@gridstorm/plugin-tree-data` | Hierarchical tree data with expand/collapse | ~5KB |
| `@gridstorm/plugin-ssrm` | Server-side row model (infinite scroll, lazy loading) | ~8KB |
| `@gridstorm/plugin-master-detail` | Expandable detail rows | ~4KB |
| `@gridstorm/plugin-column-groups` | Column group headers with expand/collapse | ~3KB |
| `@gridstorm/plugin-status-bar` | Status bar with aggregations (sum, avg, count) | ~2KB |
| `@gridstorm/plugin-clipboard` | Copy/paste with clipboard API | ~4KB |

**Acceptance Criteria:**
- [ ] Row grouping with multi-level aggregation (sum, avg, count, min, max)
- [ ] Tree data with 10K nodes renders smoothly
- [ ] SSRM handles network failures gracefully
- [ ] Master/detail with custom detail components
- [ ] Vue 3 and Angular adapters working

**Risks:**
- Grouping + sorting + filtering interaction complexity
- SSRM caching strategy (when to invalidate, how to handle stale data)
- Tree data expand/collapse with virtualization

### Phase 3: Enterprise Features — NOT STARTED

**Goal:** Premium features that justify enterprise licensing.

**Deliverables:**

| Package | Description | Est. size |
|---------|-------------|-----------|
| `@gridstorm/plugin-pivot` | Pivot mode (row groups x column groups x values) | ~12KB |
| `@gridstorm/plugin-charts` | Integrated chart rendering from grid data | ~15KB |
| `@gridstorm/plugin-excel-export` | Full-fidelity .xlsx export (formatting, formulas) | ~20KB |
| `@gridstorm/plugin-pdf-export` | PDF export with print layout | ~10KB |
| `@gridstorm/plugin-sparklines` | Inline sparkline cell renderers | ~4KB |
| `@gridstorm/vue` | Vue 3 adapter | ~4KB |
| `@gridstorm/angular` | Angular 16+ adapter | ~5KB |
| `@gridstorm/svelte` | Svelte 5 adapter | ~3KB |

**Risks:**
- Pivot mode is the most complex feature in any data grid
- Excel export requires understanding OOXML spec
- Charting requires a charting library dependency or custom implementation

### Phase 4: Polish & Scale — ONGOING

- Performance audit and optimization pass
- Full accessibility audit (WCAG 2.1 AA to AAA)
- Internationalization (RTL, locale-specific formatting)
- Documentation website
- Interactive playground / REPL
- Migration guides from AG Grid, MUI DataGrid, TanStack Table
- Community templates and examples

---

# SECTION 14 — Code Generation Plan

### Step-by-Step Build Order

Each step should be implementable and testable independently before moving to the next.

| Step | What to build | Key files | Acceptance criteria |
|------|--------------|-----------|-------------------|
| 1 | **Plugin: Filtering** | `plugin-filtering/src/filtering-plugin.ts`, `filter-ui.ts`, `filter-editors/` | Text, number, set filters work. Quick filter works. Compound AND/OR works. |
| 2 | **Plugin: Selection** | `plugin-selection/src/selection-plugin.ts`, `checkbox-column.ts` | Single/multi row selection. Shift+Click range. Ctrl+Click toggle. Checkbox column. |
| 3 | **Plugin: Editing** | `plugin-editing/src/editing-plugin.ts`, `editors/{text,number,date,select,boolean}.ts` | Enter to edit, Escape to cancel, Tab to move. Validation support. |
| 4 | **Plugin: Column Resize** | `plugin-column-resize/src/resize-plugin.ts`, `resize-handle.ts` | Drag handle on header borders. Min/max width constraints. Double-click auto-size. |
| 5 | **Plugin: Pagination** | `plugin-pagination/src/pagination-plugin.ts`, `pagination-bar.ts` | Page navigation. Page size selector. Row count display. |
| 6 | **Test suite** | `packages/*/src/__tests__/` | >80% coverage on core, >70% on plugins. |
| 7 | **Demo application** | `examples/react-demo/` | Working app showing all Phase 1 features together. |
| 8 | **Plugin: Row Grouping** | `plugin-row-grouping/src/grouping-plugin.ts`, `group-row-renderer.ts` | Single/multi-level grouping. Expand/collapse. Aggregation functions. |
| 9 | **Plugin: Tree Data** | `plugin-tree-data/src/tree-plugin.ts` | Hierarchical display. Indent levels. Expand/collapse. |
| 10 | **Plugin: SSRM** | `plugin-ssrm/src/ssrm-plugin.ts`, `cache.ts`, `data-source.ts` | Infinite scroll. Server-side sort/filter/group. Cache management. |
| 11 | **Vue 3 Adapter** | `vue-adapter/src/` | `<GridStorm>` component, composables, Pinia integration. |
| 12 | **Angular Adapter** | `angular-adapter/src/` | Directive, service, NgModule. |
| 13 | **Plugin: Pivot** | `plugin-pivot/src/pivot-plugin.ts`, `pivot-model.ts` | Row groups x column groups x value aggregation. |
| 14 | **Plugin: Excel Export** | `plugin-excel-export/src/excel-plugin.ts` | .xlsx with formatting, multiple sheets, formulas. |
| 15 | **Documentation site** | `docs/` | API reference, guides, interactive examples. |

### Per-Step Done Criteria

For every step above, "done" means:

1. TypeScript compiles with `strict: true`, `noUnusedLocals`, `noUnusedParameters`
2. All existing tests pass
3. New tests cover the feature (>80% branch coverage)
4. Bundle size verified (no unexpected growth)
5. ARIA attributes correct for new DOM elements
6. Keyboard navigation works for new interactive elements
7. Performance benchmarks pass on target datasets
8. No regressions in existing features

---

*This document reflects the architecture as of the Phase 0 completion. It will be updated as each phase progresses.*
