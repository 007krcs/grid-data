const benchmarks = [
  {
    value: '<50ms',
    metric: 'First Page Render',
    detail: 'WASM parser + GPU-accelerated canvas',
  },
  {
    value: '60fps',
    metric: '100-Page Scroll',
    detail: 'Worker pool parallel rendering',
  },
  {
    value: '<10ms',
    metric: 'Text Extraction',
    detail: 'Per page with char bounding boxes',
  },
  {
    value: '3x',
    metric: 'vs Competitors',
    detail: 'PSPDFKit, Apryse, Foxit baseline',
  },
];

export function Benchmarks() {
  return (
    <div className="benchmark-section">
      <div className="section-header" style={{ marginBottom: 16 }}>
        <h2>Performance Benchmarks</h2>
      </div>
      <div className="benchmark-grid">
        {benchmarks.map((b) => (
          <div key={b.metric} className="benchmark-card">
            <div className="benchmark-value">{b.value}</div>
            <div className="benchmark-metric">{b.metric}</div>
            <div className="benchmark-detail">{b.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
