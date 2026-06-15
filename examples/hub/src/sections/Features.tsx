import { Icon } from '../icons/Icon';

interface Feature {
  icon: string;
  title: string;
  description: string;
  docsSlug: string | null;
  demoLink: string | null;
}

const features: Feature[] = [
  {
    icon: 'zap',
    title: 'Virtual Scrolling',
    description: '100K+ rows at 60fps. Only visible rows exist in the DOM.',
    docsSlug: 'core-concepts/architecture',
    demoLink: '/feature-showcase/#virtual-scroll',
  },
  {
    icon: 'puzzle',
    title: '35 Composable Plugins',
    description: 'Five tiers from Core to Enterprise Differentiators. Use only what you need.',
    docsSlug: 'plugins/plugin-system',
    demoLink: null,
  },
  {
    icon: 'shield',
    title: 'WCAG 2.1 AA Accessibility',
    description: 'Full keyboard nav, ARIA roles, live regions, skip-nav, high-contrast. Legal procurement gate — free.',
    docsSlug: 'plugins/a11y',
    demoLink: '/feature-showcase/#a11y',
  },
  {
    icon: 'calculator',
    title: 'Excel Formula Engine',
    description: '42 Excel-compatible functions: SUMIF, VLOOKUP, XLOOKUP, IFS, named ranges, array formulas.',
    docsSlug: 'plugins/formula-engine',
    demoLink: '/feature-showcase/#formula-engine-pro',
  },
  {
    icon: 'clipboard',
    title: 'Excel Copy/Paste',
    description: 'Range-aware copy, type coercion, paste validation, formula-aware paste, undo integration.',
    docsSlug: 'plugins/clipboard-pro',
    demoLink: '/feature-showcase/#clipboard-pro',
  },
  {
    icon: 'palette',
    title: 'CSS Theming',
    description: 'Light, dark, high-contrast. Runtime-switchable via CSS variables.',
    docsSlug: 'core-concepts/theming',
    demoLink: '/feature-showcase/#theming',
  },
  {
    icon: 'code',
    title: 'TypeScript Native',
    description: 'Built in TypeScript with strict mode. Full type inference throughout.',
    docsSlug: 'getting-started/introduction',
    demoLink: null,
  },
  {
    icon: 'search',
    title: 'Sort & Filter',
    description: 'Multi-column sort, quick filter, per-column floating filters.',
    docsSlug: 'plugins/sorting',
    demoLink: '/feature-showcase/#sorting',
  },
  {
    icon: 'edit',
    title: 'Cell Editing',
    description: 'Text, number, select editors. Tab navigation. Undo support.',
    docsSlug: 'plugins/editing',
    demoLink: '/feature-showcase/#editing',
  },
  {
    icon: 'bar-chart',
    title: 'Row Grouping & Pivoting',
    description: 'Multi-level grouping, aggregation, pivoting, master-detail, tree data.',
    docsSlug: 'plugins/grouping',
    demoLink: '/feature-showcase/#grouping',
  },
  {
    icon: 'clock',
    title: 'Time Travel (Undo/Redo)',
    description: 'Snapshot-based undo/redo. Branching history. Integrates with paste and editing.',
    docsSlug: 'plugins/time-travel',
    demoLink: '/feature-showcase/#temporal',
  },
  {
    icon: 'file-pdf',
    title: 'WASM PDF Toolkit',
    description: 'Rust-powered renderer, 13 annotation types, digital signatures, AES-256 encryption.',
    docsSlug: 'guides/pdf-toolkit',
    demoLink: '/pdf-viewer/',
  },
];

export function Features() {
  return (
    <div className="features-section">
      <div className="section-label">Capabilities</div>
      <h2 className="section-title">
        Everything AG Grid Enterprise charges{' '}
        <span className="section-accent">$999/dev/yr for</span>
      </h2>
      <p className="section-sub">
        40+ composable plugins covering virtual scroll, WCAG 2.1 AA, Excel formulas,
        Excel copy/paste, row grouping, time travel, and more — all open-source.
      </p>
      <div className="features-grid">
        {features.map((feat) => (
          <div key={feat.title} className="feature-cell">
            <div className="feature-icon">
              <Icon name={feat.icon} size={20} />
            </div>
            <h3>{feat.title}</h3>
            <p>{feat.description}</p>
            {(feat.docsSlug || feat.demoLink) && (
              <div className="feature-links">
                {feat.docsSlug && (
                  <a href={`#/docs/${feat.docsSlug}`}>Docs &rarr;</a>
                )}
                {feat.demoLink && (
                  <a href={feat.demoLink}>Demo &rarr;</a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
