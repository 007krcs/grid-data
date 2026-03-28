interface CompRow {
  feature: string;
  gridstorm: string | boolean;
  aggrid: string | boolean;
  handsontable: string | boolean;
}

const rows: CompRow[] = [
  { feature: 'Open source',            gridstorm: true,          aggrid: 'Community only', handsontable: 'Community only' },
  { feature: 'TypeScript-native',      gridstorm: true,          aggrid: true,             handsontable: 'Partial' },
  { feature: 'Bundle size (core)',      gridstorm: '<50 KB',      aggrid: '~300 KB',        handsontable: '~200 KB' },
  { feature: 'Virtual scroll',         gridstorm: true,          aggrid: true,             handsontable: 'Enterprise only' },
  { feature: 'Headless architecture',  gridstorm: true,          aggrid: false,            handsontable: false },
  { feature: 'Plugin system',          gridstorm: '19+ plugins', aggrid: 'Built-in only',  handsontable: 'Built-in only' },
  { feature: 'PDF toolkit built-in',   gridstorm: true,          aggrid: false,            handsontable: false },
  { feature: 'AI / MCP integration',   gridstorm: true,          aggrid: false,            handsontable: false },
  { feature: 'WASM renderer',          gridstorm: true,          aggrid: false,            handsontable: false },
  { feature: 'State time-travel',      gridstorm: true,          aggrid: false,            handsontable: false },
  { feature: 'Framework agnostic',     gridstorm: true,          aggrid: 'Mostly React',   handsontable: 'Mostly React' },
  { feature: 'Row/column virtualise',  gridstorm: true,          aggrid: true,             handsontable: 'Enterprise only' },
];

function Cell({ val }: { val: string | boolean }) {
  if (val === true) return <span className="cmp-yes" aria-label="Yes">✓</span>;
  if (val === false) return <span className="cmp-no"  aria-label="No">✗</span>;
  return <span className="cmp-text">{val}</span>;
}

export function Comparison() {
  return (
    <section className="cmp-section">
      <div className="section-label">Why GridStorm</div>
      <h2 className="section-title">
        How we compare to <span className="section-accent">the alternatives</span>
      </h2>
      <p className="section-sub">
        GridStorm ships with a sub-50 KB headless core, a full PDF toolkit, and
        19+ composable plugins — without the bloat of legacy enterprise grids.
      </p>

      <div className="cmp-table-wrap">
        <table className="cmp-table" role="table">
          <thead>
            <tr>
              <th className="cmp-th-feature">Feature</th>
              <th className="cmp-th cmp-th-highlight">
                <span className="cmp-header-badge">GridStorm</span>
              </th>
              <th className="cmp-th">AG Grid</th>
              <th className="cmp-th">Handsontable</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.feature} className="cmp-row">
                <td className="cmp-td-feature">{row.feature}</td>
                <td className="cmp-td cmp-td-highlight"><Cell val={row.gridstorm} /></td>
                <td className="cmp-td"><Cell val={row.aggrid} /></td>
                <td className="cmp-td"><Cell val={row.handsontable} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cmp-cta">
        <a href="#/docs/guides/migration-ag-grid" className="btn-secondary">
          Migration guide from AG Grid →
        </a>
      </div>
    </section>
  );
}
