import { useState, useRef, useEffect } from 'react';
import { Icon } from '../icons/Icon';
import { ThemeToggle } from '../theme/ThemeToggle';
import { navigate } from '../App';
import { usePlatform } from '../platform/PlatformProvider';

interface TopNavProps {
  route: string;
}

const GRIDSTORM_LINKS = [
  { path: '/product/gridstorm', label: 'Overview' },
  { path: '/docs',              label: 'Docs' },
  { path: '/demos',             label: 'Demos' },
];

function isActive(route: string, path: string): boolean {
  if (path === '/product/gridstorm') return route === '/' || route === '/product/gridstorm';
  return route.startsWith(path);
}

// ── Product Switcher Dropdown ──────────────────────────────────────

function ProductSwitcher({ currentRoute }: { currentRoute: string }) {
  const { products, activeProductId } = usePlatform();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const launched = products.filter(p => p.status !== 'coming-soon');
  const comingSoon = products.filter(p => p.status === 'coming-soon');
  const activeProduct = products.find(p => p.id === activeProductId);

  // Close on outside click
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const isOnPlatformHome = currentRoute === '/products';

  return (
    <div className="ps-wrap" ref={ref}>
      <button
        className={`ps-trigger${open ? ' ps-trigger-open' : ''}${isOnPlatformHome ? ' ps-trigger-active' : ''}`}
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {activeProduct ? (
          <>
            <span className="ps-dot" style={{ background: activeProduct.color }} />
            <span className="ps-label">{activeProduct.name}</span>
          </>
        ) : (
          <>
            <Icon name="layers" size={14} />
            <span className="ps-label">Products</span>
          </>
        )}
        <Icon name="chevron-down" size={13} className="ps-chevron" />
      </button>

      {open && (
        <div className="ps-dropdown" role="listbox">
          <div className="ps-section-label">Live</div>
          {launched.map(p => (
            <button
              key={p.id}
              className={`ps-item${activeProductId === p.id ? ' ps-item-active' : ''}`}
              style={{ '--ps-color': p.color } as React.CSSProperties}
              onClick={() => { navigate(p.homePath); setOpen(false); }}
              role="option"
              aria-selected={activeProductId === p.id}
            >
              <span className="ps-item-dot" style={{ background: p.color }} />
              <span className="ps-item-text">
                <span className="ps-item-name">{p.name}</span>
                <span className="ps-item-tag">{p.tagline.split('—')[0]?.trim()}</span>
              </span>
              {activeProductId === p.id && <Icon name="check" size={13} />}
            </button>
          ))}

          {comingSoon.length > 0 && (
            <>
              <div className="ps-divider" />
              <div className="ps-section-label">Roadmap</div>
              {comingSoon.map(p => (
                <div key={p.id} className="ps-item ps-item-soon">
                  <span className="ps-item-dot" style={{ background: '#94a3b8' }} />
                  <span className="ps-item-text">
                    <span className="ps-item-name">{p.name}</span>
                    <span className="ps-item-tag">{p.stats[0]?.value}</span>
                  </span>
                  <span className="ps-soon-badge">Soon</span>
                </div>
              ))}
            </>
          )}

          <div className="ps-divider" />
          <button
            className="ps-all-products"
            onClick={() => { navigate('/products'); setOpen(false); }}
          >
            <Icon name="layers" size={14} />
            View all products
          </button>
        </div>
      )}
    </div>
  );
}

// ── TopNav ────────────────────────────────────────────────────────

export function TopNav({ route }: TopNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { config } = usePlatform();

  // Which per-product nav links to show
  const isOnDocsOrDemos = route.startsWith('/docs') || route === '/demos';
  const isGridStormArea = route === '/' || route.startsWith('/product/gridstorm') || isOnDocsOrDemos;

  return (
    <nav className="top-nav">
      <div className="top-nav-left">
        {/* Platform brand */}
        <a
          href="#/products"
          className="top-nav-brand"
          onClick={(e) => { e.preventDefault(); navigate('/products'); }}
          title={config.name}
        >
          <div className="top-nav-logo">DS</div>
          <span className="top-nav-name">{config.name}</span>
        </a>

        {/* Product switcher */}
        <ProductSwitcher currentRoute={route} />

        {/* Mobile toggle */}
        <button
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          <Icon name={mobileMenuOpen ? 'x' : 'menu'} size={24} />
        </button>

        {/* Contextual nav links */}
        <div className={`top-nav-links${mobileMenuOpen ? ' open' : ''}`}>
          {/* Platform home link always visible */}
          <a
            href="#/products"
            className={`top-nav-link ${route === '/products' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); navigate('/products'); setMobileMenuOpen(false); }}
          >
            Platform
          </a>

          {/* GridStorm-specific links when in GridStorm context */}
          {isGridStormArea && GRIDSTORM_LINKS.map(link => (
            <a
              key={link.path}
              href={`#${link.path}`}
              className={`top-nav-link ${isActive(route, link.path) ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); navigate(link.path); setMobileMenuOpen(false); }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      <div className="top-nav-right">
        <ThemeToggle />
        <a
          href={config.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-github"
        >
          <Icon name="github" size={18} />
          <span>GitHub</span>
        </a>
      </div>
    </nav>
  );
}
