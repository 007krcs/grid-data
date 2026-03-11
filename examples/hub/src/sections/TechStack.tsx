interface TechPill {
  label: string;
  highlight?: boolean;
}

const techPills: TechPill[] = [
  { label: 'TypeScript 5.9' },
  { label: 'React 18+' },
  { label: 'Vue 3' },
  { label: 'Svelte 5' },
  { label: 'Rust / WASM', highlight: true },
  { label: 'Vitest' },
  { label: 'pnpm Monorepo' },
  { label: 'tsup' },
  { label: 'Vite' },
  { label: 'pdf.js', highlight: true },
  { label: 'MCP', highlight: true },
  { label: 'CSS Custom Properties' },
];

export function TechStack() {
  return (
    <div className="tech-section">
      <div className="section-header" style={{ display: 'inline-block', marginBottom: 12 }}>
        <h2>Built With</h2>
      </div>
      <div className="tech-pills">
        {techPills.map((pill) => (
          <span
            key={pill.label}
            className={`tech-pill${pill.highlight ? ' highlight' : ''}`}
          >
            {pill.label}
          </span>
        ))}
      </div>
    </div>
  );
}
