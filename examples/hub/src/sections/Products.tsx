import { Icon } from '../icons/Icon';

const gridFeatures = [
  '35 composable plugins',
  'Virtual scroll (100K rows @ 60fps)',
  'WCAG 2.1 AA accessibility',
  'Excel-compatible formula engine (42 fns)',
  'True Excel copy/paste + type coercion',
  'Row grouping, aggregation & pivoting',
  'Server-side row model',
  'Time travel (undo/redo snapshots)',
];

const pdfFeatures = [
  'Rust PDF parser (WASM)',
  'Worker pool rendering',
  '13 annotation types',
  'PKCS#7 digital signatures',
  'Incremental save',
  'AES-256 encryption / decryption',
  'Text extraction & full-text search',
  'AI-powered PII detection',
];

const TIERS = [
  { label: 'Core (Free)',         color: '#22c55e', count: 10, desc: 'Sort, filter, select, edit, paginate, pin, resize, reorder, context menu, clipboard' },
  { label: 'Enterprise (Free)',   color: '#3b82f6', count: 11, desc: 'Grouping, aggregation, pivoting, master-detail, tree data, SSRM, Excel/PDF export, charts' },
  { label: 'Next-Gen (Free)',     color: '#a855f7', count: 7,  desc: 'Streaming, AI, status bar, conditional formatting, state persistence, row pinning, autosize' },
  { label: 'Differentiators',     color: '#f97316', count: 4,  desc: 'Formula engine, time travel, cell range selection, data validation' },
  { label: 'Enterprise Tier',     color: '#ec4899', count: 3,  desc: 'WCAG 2.1 AA accessibility, formula engine pro (42 fns), clipboard pro (Excel copy/paste)' },
];

export function Products() {
  return (
    <>
      <div className="section-label">Products</div>
      <h2 className="section-title">
        Everything you need to build{' '}
        <span className="section-accent">document-driven apps</span>
      </h2>
      <p className="section-sub">
        A unified platform — one license covers the data grid, the PDF toolkit,
        and 35 plugins. Shared event and plugin architecture throughout.
      </p>

      {/* Plugin tier breakdown */}
      <div className="tier-strip">
        {TIERS.map((t) => (
          <div key={t.label} className="tier-item" title={t.desc}>
            <span className="tier-dot" style={{ background: t.color }} />
            <span className="tier-count">{t.count}</span>
            <span className="tier-label">{t.label}</span>
          </div>
        ))}
        <div className="tier-total">
          <span className="tier-total-num">35</span>
          <span className="tier-total-label">total plugins</span>
        </div>
      </div>

      <div className="products-grid" style={{ marginBottom: 64 }}>
        {/* Data Grid */}
        <div className="product-card grid-product">
          <div className="product-label grid-label">
            <Icon name="grid" size={14} />
            Data Grid
          </div>
          <h3>Enterprise Data Grid</h3>
          <p>
            Headless, plugin-first architecture. 100K+ rows at 60fps with virtual
            scrolling, WCAG 2.1 AA, Excel formulas, and full keyboard navigation.
          </p>
          <div className="product-features">
            {gridFeatures.map((feat) => (
              <div key={feat} className="product-feature">
                <Icon name="check" size={14} className="check" />
                {feat}
              </div>
            ))}
          </div>
          <div className="product-cta">
            <a href="#/docs/core-concepts/architecture" className="btn-primary product-btn">
              Grid Docs
            </a>
            <a href="/feature-showcase/" className="btn-secondary product-btn">
              Live Demo
            </a>
          </div>
        </div>

        {/* PDF Toolkit */}
        <div className="product-card pdf-product">
          <div className="product-label pdf-label">
            <Icon name="file-text" size={14} />
            PDF Toolkit
          </div>
          <h3>PDF Viewer &amp; Editor</h3>
          <p>
            Rust-powered WASM renderer with worker pool parallelism. Full
            annotation engine, digital signatures, and AI-powered document
            intelligence.
          </p>
          <div className="product-features">
            {pdfFeatures.map((feat) => (
              <div key={feat} className="product-feature">
                <Icon name="check" size={14} className="check" />
                {feat}
              </div>
            ))}
          </div>
          <div className="product-cta">
            <a href="#/docs/guides/pdf-toolkit" className="btn-primary product-btn product-btn-pdf">
              PDF Docs
            </a>
            <a href="/pdf-viewer/" className="btn-secondary product-btn">
              Live Demo
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
