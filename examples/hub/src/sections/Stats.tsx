const stats = [
  { value: '57', label: 'Packages', sub: 'mono­repo' },
  { value: '1,899+', label: 'Tests', sub: '90 suites' },
  { value: '35', label: 'Plugins', sub: 'composable' },
  { value: '100K+', label: 'Rows @ 60fps', sub: 'virtual scroll' },
  { value: '<50KB', label: 'Core Bundle', sub: 'tree-shaken' },
  { value: '0', label: 'AG Grid licences', sub: 'needed' },
];

export function Stats() {
  return (
    <div className="stats">
      {stats.map((s) => (
        <div key={s.label} className="stat">
          <div className="stat-value">{s.value}</div>
          <div className="stat-label">{s.label}</div>
          {s.sub && <div className="stat-sub">{s.sub}</div>}
        </div>
      ))}
    </div>
  );
}
