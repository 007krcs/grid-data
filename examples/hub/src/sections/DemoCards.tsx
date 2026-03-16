import { Icon } from '../icons/Icon';

interface DemoCard {
  href: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  tags: { label: string; isNew?: boolean }[];
  isNew?: boolean;
}

const demos: DemoCard[] = [
  {
    href: '/pdf-viewer/',
    icon: 'file-text',
    iconBg: 'rgba(239, 68, 68, 0.12)',
    iconColor: '#ef4444',
    title: 'PDF Viewer',
    description:
      'Interactive PDF viewer with canvas rendering, text extraction, full-text search, and theme switching.',
    tags: [
      { label: 'WASM Renderer', isNew: true },
      { label: 'Text Search', isNew: true },
      { label: 'AI Redaction', isNew: true },
    ],
    isNew: true,
  },
  {
    href: '/feature-showcase/',
    icon: 'grid',
    iconBg: 'rgba(236, 72, 153, 0.12)',
    iconColor: '#ec4899',
    title: 'Feature Showcase',
    description:
      'Interactive gallery of all 20 GridStorm features with live code. The best place to explore every capability.',
    tags: [
      { label: '20 Demos' },
      { label: 'All Features' },
      { label: 'Interactive' },
    ],
  },
  {
    href: '/playground/',
    icon: 'code',
    iconBg: 'rgba(168, 85, 247, 0.12)',
    iconColor: '#a855f7',
    title: 'Playground',
    description:
      'Monaco-powered code editor with live grid preview. Edit column definitions and plugin configs in real-time.',
    tags: [{ label: 'Monaco Editor' }, { label: 'Live Preview' }],
  },
  {
    href: '/financial-trading/',
    icon: 'trending-up',
    iconBg: 'rgba(34, 197, 94, 0.12)',
    iconColor: '#22c55e',
    title: 'Financial Trading',
    description:
      'Real-time trading dashboard with live price updates, conditional cell formatting, and sparkline indicators.',
    tags: [{ label: 'Real-time' }, { label: 'Custom Renderers' }],
  },
  {
    href: '/analytics-explorer/',
    icon: 'bar-chart',
    iconBg: 'rgba(6, 182, 212, 0.12)',
    iconColor: '#06b6d4',
    title: 'Analytics Explorer',
    description:
      'Data analytics dashboard with row grouping, aggregation, filtering, and pagination for large datasets.',
    tags: [{ label: 'Grouping' }, { label: 'Aggregation' }],
  },
  {
    href: '/spreadsheet/',
    icon: 'file-text',
    iconBg: 'rgba(249, 115, 22, 0.12)',
    iconColor: '#f97316',
    title: 'Spreadsheet',
    description:
      'Excel-like spreadsheet with inline cell editing, clipboard copy/paste, column resizing, and selection ranges.',
    tags: [{ label: 'Editing' }, { label: 'Clipboard' }],
  },
  {
    href: '/cookbook/',
    icon: 'book-open',
    iconBg: 'rgba(234, 179, 8, 0.12)',
    iconColor: '#eab308',
    title: 'Cookbook',
    description:
      '31 self-contained code examples covering every GridStorm feature. Copy-paste ready recipes.',
    tags: [{ label: '31 Examples' }, { label: 'Copy-Paste Ready', isNew: true }],
    isNew: true,
  },
];

export function DemoCards() {
  return (
    <>
      <div className="section-header">
        <h2>Live Demos</h2>
      </div>
      <div className="demos-grid">
        {demos.map((demo) => (
          <a
            key={demo.title}
            href={demo.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`card${demo.isNew ? ' card-new' : ''}`}
          >
            <div className="card-header">
              <div
                className="card-icon"
                style={{ background: demo.iconBg }}
              >
                <Icon name={demo.icon} size={20} color={demo.iconColor} />
              </div>
              <h3>{demo.title}</h3>
              {demo.isNew && <span className="card-new-badge">New</span>}
            </div>
            <p>{demo.description}</p>
            <div className="card-tags">
              {demo.tags.map((tag) => (
                <span
                  key={tag.label}
                  className={`tag${tag.isNew ? ' tag-new' : ''}`}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          </a>
        ))}
      </div>
    </>
  );
}
