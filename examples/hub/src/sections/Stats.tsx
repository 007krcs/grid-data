const stats = [
  { value: '39', label: 'Packages' },
  { value: '1,084+', label: 'Tests' },
  { value: '<50KB', label: 'Core Bundle' },
  { value: '100K+', label: 'Rows @ 60fps' },
  { value: '3x', label: 'Faster' },
];

export function Stats() {
  return (
    <div className="stats">
      {stats.map((s) => (
        <div key={s.label} className="stat">
          <div className="stat-value">{s.value}</div>
          <div className="stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
