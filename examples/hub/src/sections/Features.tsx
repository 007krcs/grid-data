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
    demoLink: '/feature-showcase/',
  },
  {
    icon: 'puzzle',
    title: 'Plugin Architecture',
    description: '19+ composable plugins. Use only what you need.',
    docsSlug: 'plugins/plugin-system',
    demoLink: null,
  },
  {
    icon: 'palette',
    title: 'CSS Theming',
    description:
      'Light, dark, high-contrast. Runtime-switchable via CSS variables.',
    docsSlug: 'core-concepts/theming',
    demoLink: '/feature-showcase/',
  },
  {
    icon: 'code',
    title: 'TypeScript Native',
    description: 'Built in TypeScript with strict mode. Full type inference.',
    docsSlug: 'getting-started/introduction',
    demoLink: null,
  },
  {
    icon: 'file-pdf',
    title: 'WASM PDF Renderer',
    description:
      'Rust-compiled parser with GPU-accelerated canvas rendering.',
    docsSlug: null,
    demoLink: '/pdf-viewer/',
  },
  {
    icon: 'settings',
    title: 'Worker Pool',
    description: 'Parallel page rendering across Web Worker threads.',
    docsSlug: null,
    demoLink: null,
  },
  {
    icon: 'lock',
    title: 'Encryption',
    description: 'AES-256 encryption/decryption. Password-protected PDFs.',
    docsSlug: null,
    demoLink: null,
  },
  {
    icon: 'save',
    title: 'Incremental Save',
    description:
      'Append-only saves. No full re-serialization of the document.',
    docsSlug: null,
    demoLink: null,
  },
  {
    icon: 'search',
    title: 'Sort & Filter',
    description:
      'Multi-column sort, quick filter, per-column floating filters.',
    docsSlug: 'plugins/sorting',
    demoLink: '/feature-showcase/',
  },
  {
    icon: 'edit',
    title: 'Cell Editing',
    description: 'Text, number, select editors. Tab navigation. Undo support.',
    docsSlug: 'plugins/editing',
    demoLink: '/feature-showcase/',
  },
  {
    icon: 'bar-chart',
    title: 'Row Grouping',
    description:
      'Multi-level grouping with expand/collapse and aggregation.',
    docsSlug: 'plugins/grouping',
    demoLink: '/feature-showcase/',
  },
  {
    icon: 'move',
    title: 'Drag & Drop',
    description: 'Reorder columns and rows with visual drag indicators.',
    docsSlug: 'plugins/column-reorder',
    demoLink: '/feature-showcase/',
  },
];

export function Features() {
  return (
    <div className="features-section">
      <div className="section-header" style={{ marginBottom: 16 }}>
        <h2>Core Capabilities</h2>
      </div>
      <div className="features-grid">
        {features.map((feat) => (
          <div key={feat.title} className="feature-cell">
            <div className="feature-icon">
              <Icon name={feat.icon} size={20} />
            </div>
            <h4>{feat.title}</h4>
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
