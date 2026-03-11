import { Icon } from '../icons/Icon';

const gridFeatures = [
  '15+ composable plugins',
  'Virtual scroll (100K rows)',
  'Light / dark / high-contrast',
  'TypeScript-native',
  'Cell editing & clipboard',
  'Row grouping & aggregation',
  'Column pinning & resize',
  'Drag-and-drop reorder',
];

const pdfFeatures = [
  'Rust PDF parser (WASM)',
  'Worker pool rendering',
  '13 annotation types',
  'PKCS#7 signatures',
  'Incremental save',
  'Encryption / decryption',
  'Text extraction & search',
  'Permanent redaction',
];

export function Products() {
  return (
    <>
      <div className="section-header">
        <h2>Products</h2>
      </div>
      <div className="products-grid">
        {/* Data Grid */}
        <div className="product-card grid-product">
          <div className="product-label grid-label">
            <Icon name="grid" size={14} />
            Data Grid
          </div>
          <h3>Enterprise Data Grid</h3>
          <p>
            Headless, plugin-first architecture. Render 100K+ rows at 60fps with
            virtual scrolling, CSS theming, and full keyboard navigation.
          </p>
          <div className="product-features">
            {gridFeatures.map((feat) => (
              <div key={feat} className="product-feature">
                <Icon name="check" size={14} className="check" />
                {feat}
              </div>
            ))}
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
        </div>
      </div>
    </>
  );
}
