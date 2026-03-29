import { Icon } from '../icons/Icon';

const FOOTER_COLS = [
  {
    heading: 'Platform',
    links: [
      { label: 'All Products',      href: '#/products' },
      { label: 'GridStorm',         href: '#/product/gridstorm' },
      { label: 'PDF Toolkit',       href: '#/product/pdf-toolkit' },
      { label: 'NexaRecruit',       href: '#/product/nexa-recruit' },
      { label: 'NexaCare',          href: '#/product/nexa-care' },
      { label: 'Changelog',         href: '#/docs/getting-started/introduction' },
    ],
  },
  {
    heading: 'GridStorm',
    links: [
      { label: 'Data Grid',         href: '#/docs/core-concepts/architecture' },
      { label: 'Plugin System',     href: '#/docs/plugins/plugin-system' },
      { label: 'PDF Toolkit',       href: '#/docs/guides/pdf-toolkit' },
      { label: 'AI & MCP',          href: '#/docs/core-concepts/architecture' },
      { label: 'Migration Guide',   href: '#/docs/guides/migration-from-ag-grid' },
    ],
  },
  {
    heading: 'Documentation',
    links: [
      { label: 'Quick Start',       href: '#/docs/getting-started/quick-start' },
      { label: 'API Reference',     href: '#/docs/api/grid-api' },
      { label: 'Column Defs',       href: '#/docs/api/column-definitions' },
      { label: 'Accessibility',     href: '#/docs/plugins/a11y' },
      { label: 'Contributing',      href: 'https://github.com/007krcs/grid-data/blob/main/CONTRIBUTING.md' },
    ],
  },
  {
    heading: 'Frameworks',
    links: [
      { label: 'React',   href: '#/docs/frameworks/react' },
      { label: 'Vue',     href: '#/docs/frameworks/vue' },
      { label: 'Angular', href: '#/docs/frameworks/angular' },
      { label: 'Svelte',  href: '#/docs/frameworks/svelte' },
      { label: 'Vanilla', href: '#/docs/frameworks/vanilla' },
    ],
  },
  {
    heading: 'Demos',
    links: [
      { label: 'Feature Showcase',   href: '/feature-showcase/' },
      { label: 'Playground',         href: '/playground/' },
      { label: 'Financial Trading',  href: '/financial-trading/' },
      { label: 'Analytics Explorer', href: '/analytics-explorer/' },
      { label: 'PDF Viewer',         href: '/pdf-viewer/' },
    ],
  },
  {
    heading: 'Community',
    links: [
      { label: 'GitHub',           href: 'https://github.com/007krcs/grid-data' },
      { label: 'Issues',           href: 'https://github.com/007krcs/grid-data/issues' },
      { label: 'Discussions',      href: 'https://github.com/007krcs/grid-data/discussions' },
      { label: 'Security Policy',  href: 'https://github.com/007krcs/grid-data/blob/main/SECURITY.md' },
      { label: 'Code of Conduct',  href: 'https://github.com/007krcs/grid-data/blob/main/CODE_OF_CONDUCT.md' },
    ],
  },
];

export function Footer() {
  const isExternal = (href: string) => href.startsWith('http') || href.startsWith('/');

  return (
    <footer className="hub-footer-enterprise">
      {/* Top: brand + badges */}
      <div className="hub-footer-top">
        <div className="hub-footer-brand">
          <div className="hub-footer-logo">NF</div>
          <div>
            <div className="hub-footer-brand-name">NexaForge</div>
            <div className="hub-footer-brand-tagline">Enterprise software, engineered to scale</div>
          </div>
        </div>
        <div className="hub-footer-badges">
          <span className="hub-footer-badge">6 products</span>
          <span className="hub-footer-badge">57 packages</span>
          <span className="hub-footer-badge">TypeScript-native</span>
          <span className="hub-footer-badge">MIT License</span>
        </div>
      </div>

      {/* Main link columns */}
      <div className="hub-footer-cols">
        {FOOTER_COLS.map((col) => (
          <div key={col.heading} className="hub-footer-col">
            <h4 className="hub-footer-col-heading">{col.heading}</h4>
            <ul className="hub-footer-col-list">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="hub-footer-col-link"
                    {...(isExternal(link.href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="hub-footer-bottom">
        <div className="hub-footer-copy">
          &copy; {new Date().getFullYear()} NexaForge. All rights reserved.
        </div>
        <div className="hub-footer-bottom-links">
          <a href="#/products" className="hub-footer-bottom-link">Products</a>
          <a href="#/docs/getting-started/introduction" className="hub-footer-bottom-link">Docs</a>
          <a href="https://github.com/007krcs/grid-data/blob/main/SECURITY.md" className="hub-footer-bottom-link" target="_blank" rel="noopener noreferrer">Security</a>
        </div>
        <div className="hub-footer-social">
          <a
            href="https://github.com/007krcs/grid-data"
            target="_blank"
            rel="noopener noreferrer"
            className="hub-footer-social-link"
            aria-label="GitHub"
          >
            <Icon name="github" size={18} />
          </a>
        </div>
      </div>
    </footer>
  );
}
