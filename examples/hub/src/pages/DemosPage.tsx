import React from 'react';

interface DemoEntry {
  title: string;
  href: string;
  description: string;
  tags: string[];
  iconColor: string;
  iconBg: string;
  icon: React.ReactNode;
  isNew?: boolean;
}

const DEMOS: DemoEntry[] = [
  {
    title: 'Feature Showcase',
    href: '/feature-showcase/',
    description:
      'Interactive gallery of all 20 GridStorm features with live code examples. Explore sorting, filtering, grouping, editing, and every plugin in action.',
    tags: ['20 Demos', 'All Features', 'Interactive'],
    iconColor: '#ec4899',
    iconBg: 'rgba(236, 72, 153, 0.12)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    title: 'Playground',
    href: '/playground/',
    description:
      'Monaco-powered code editor with live grid preview. Edit column definitions, plugin configs, and theme tokens in real-time with instant visual feedback.',
    tags: ['Monaco Editor', 'Live Preview', 'Config Editor'],
    iconColor: '#a855f7',
    iconBg: 'rgba(168, 85, 247, 0.12)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    title: 'PDF Viewer',
    href: '/pdf-viewer/',
    description:
      'Interactive PDF viewer with canvas rendering, text extraction, full-text search, and theme switching. Built on the GridStorm PDF toolkit.',
    tags: ['WASM Renderer', 'Text Search', 'AI Redaction'],
    iconColor: '#ef4444',
    iconBg: 'rgba(239, 68, 68, 0.12)',
    isNew: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    title: 'Financial Trading',
    href: '/financial-trading/',
    description:
      'Real-time trading dashboard with live price updates, conditional cell formatting, sparkline indicators, and high-frequency data streaming.',
    tags: ['Real-time', 'Custom Renderers', 'Sparklines'],
    iconColor: '#22c55e',
    iconBg: 'rgba(34, 197, 94, 0.12)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    title: 'Analytics Explorer',
    href: '/analytics-explorer/',
    description:
      'Data analytics dashboard with row grouping, aggregation, advanced filtering, and pagination for exploring large datasets with summary rows.',
    tags: ['Grouping', 'Aggregation', 'Filtering'],
    iconColor: '#06b6d4',
    iconBg: 'rgba(6, 182, 212, 0.12)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    title: 'Spreadsheet',
    href: '/spreadsheet/',
    description:
      'Excel-like spreadsheet with inline cell editing, clipboard copy/paste, column resizing, selection ranges, and undo/redo support.',
    tags: ['Editing', 'Clipboard', 'Selection'],
    iconColor: '#f97316',
    iconBg: 'rgba(249, 115, 22, 0.12)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    title: 'Cookbook',
    href: '/cookbook/',
    description:
      'Collection of 31 self-contained code examples covering every GridStorm feature. Copy-paste recipes for sorting, filtering, editing, grouping, and more.',
    tags: ['31 Examples', 'Copy-Paste Ready', 'All Features'],
    iconColor: '#eab308',
    iconBg: 'rgba(234, 179, 8, 0.12)',
    isNew: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="8" y1="7" x2="16" y2="7" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    ),
  },
  {
    title: 'React Demo',
    href: '/react-demo/',
    description:
      'Standard React integration example demonstrating hooks-based API, custom cell renderers, portal-based overlays, and error boundaries.',
    tags: ['React 18+', 'Hooks', 'Portals'],
    iconColor: '#3b82f6',
    iconBg: 'rgba(59, 130, 246, 0.12)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
];

export const DemosPage: React.FC = () => {
  return (
    <div className="hub-container demos-page">
      <div className="demos-page-header">
        <h1>Live Demos</h1>
        <p>Explore GridStorm capabilities through interactive demos. Each demo showcases different features and integration patterns.</p>
      </div>

      <div className="demos-grid demos-grid-full">
        {DEMOS.map((demo) => (
          <a
            key={demo.title}
            href={demo.href}
            className={`card ${demo.isNew ? 'card-new' : ''}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="card-header">
              <div className="card-icon" style={{ background: demo.iconBg }}>
                {demo.icon}
              </div>
              <h3>{demo.title}</h3>
              {demo.isNew && <span className="card-new-badge">New</span>}
            </div>
            <p>{demo.description}</p>
            <div className="card-tags">
              {demo.tags.map((tag) => (
                <span key={tag} className={`tag ${demo.isNew ? 'tag-new' : ''}`}>
                  {tag}
                </span>
              ))}
            </div>
            <span className="card-link">
              Open Demo <span aria-hidden="true">&rarr;</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
};
