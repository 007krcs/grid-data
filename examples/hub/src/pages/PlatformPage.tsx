import React from 'react';
import { usePlatform } from '../platform/PlatformProvider';
import { Icon } from '../icons/Icon';
import type { ProductManifest, ProductTier, ProductStatus } from '../platform/types';

// ── Status badge ──────────────────────────────────────────────────

const STATUS_CONFIG: Record<ProductStatus, { label: string; color: string; bg: string }> = {
  ga:           { label: 'GA',          color: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)' },
  beta:         { label: 'Beta',        color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)' },
  preview:      { label: 'Preview',     color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.1)' },
  'coming-soon':{ label: 'Coming Soon', color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' },
};

const TIER_CONFIG: Record<ProductTier, { label: string; color: string }> = {
  'open-source': { label: 'MIT / Open Source', color: '#16a34a' },
  'enterprise':  { label: 'Enterprise',         color: '#7c3aed' },
  'platform':    { label: 'Platform',           color: '#0891b2' },
};

// ── Product Card ──────────────────────────────────────────────────

function ProductCard({ product }: { product: ProductManifest }) {
  const { navigate } = usePlatform();
  const status = STATUS_CONFIG[product.status];
  const tier   = TIER_CONFIG[product.tier];
  const isLive = product.status !== 'coming-soon';

  return (
    <div
      className={`plat-card${isLive ? ' plat-card-live' : ' plat-card-soon'}`}
      style={{ '--product-color': product.color, '--product-accent': product.accentColor } as React.CSSProperties}
    >
      {/* Card header */}
      <div className="plat-card-head">
        <div className="plat-card-icon" style={{ background: product.accentColor, color: product.color }}>
          <Icon name={product.iconName} size={24} />
        </div>
        <div className="plat-card-meta">
          <div className="plat-card-badges">
            <span className="plat-badge" style={{ color: status.color, background: status.bg }}>
              {status.label}
            </span>
            <span className="plat-badge plat-badge-tier" style={{ color: tier.color }}>
              {tier.label}
            </span>
          </div>
          <h3 className="plat-card-name">{product.name}</h3>
          <p className="plat-card-tagline">{product.tagline}</p>
        </div>
        <div className="plat-card-version">v{product.version}</div>
      </div>

      {/* Description */}
      <p className="plat-card-desc">{product.description}</p>

      {/* Key features */}
      <ul className="plat-feature-list">
        {product.keyFeatures.slice(0, 5).map(f => (
          <li key={f} className="plat-feature-item">
            <span className="plat-feature-dot" style={{ background: product.color }} />
            {f}
          </li>
        ))}
      </ul>

      {/* Stats row */}
      {product.stats.length > 0 && (
        <div className="plat-stats">
          {product.stats.map(s => (
            <div key={s.label} className="plat-stat">
              <span className="plat-stat-value" style={{ color: product.color }}>{s.value}</span>
              <span className="plat-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tags */}
      <div className="plat-tags">
        {product.tags.slice(0, 5).map(t => (
          <span key={t} className="plat-tag">{t}</span>
        ))}
      </div>

      {/* CTAs */}
      {isLive ? (
        <div className="plat-card-ctas">
          <button
            className="plat-btn-primary"
            style={{ background: product.color }}
            onClick={() => navigate(product.homePath)}
          >
            Open {product.name} →
          </button>
          {product.primaryDemoPath && (
            <a
              href={product.primaryDemoPath}
              className="plat-btn-secondary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Live Demo
            </a>
          )}
          {product.docsRoot && (
            <button
              className="plat-btn-ghost"
              onClick={() => navigate(product.docsRoot!)}
            >
              Docs
            </button>
          )}
        </div>
      ) : (
        <div className="plat-card-ctas">
          <button className="plat-btn-soon" disabled>
            Coming {product.stats[0]?.value ?? 'Soon'}
          </button>
          <span className="plat-eta">{product.stats[0]?.value}</span>
        </div>
      )}

      {/* Quick links */}
      {product.quickLinks.length > 0 && (
        <div className="plat-quicklinks">
          {product.quickLinks.map(link => (
            link.external ? (
              <a
                key={link.label}
                href={link.path}
                className="plat-quicklink"
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label} {link.isNew && <span className="plat-new-pill">New</span>}
              </a>
            ) : (
              <button
                key={link.label}
                className="plat-quicklink"
                onClick={() => navigate(link.path)}
              >
                {link.label} {link.isNew && <span className="plat-new-pill">New</span>}
              </button>
            )
          ))}
        </div>
      )}
    </div>
  );
}

// ── Platform Launcher ─────────────────────────────────────────────

export function PlatformPage() {
  const { config, products } = usePlatform();
  const { navigate } = usePlatform();

  const launched   = products.filter(p => p.status !== 'coming-soon');
  const comingSoon = products.filter(p => p.status === 'coming-soon');

  return (
    <div className="plat-page">

      {/* ── Hero ── */}
      <section className="plat-hero">
        <div className="plat-hero-eyebrow">
          <span className="plat-hero-badge">
            <Icon name="layers" size={13} />
            {launched.length} products live · {comingSoon.length} on roadmap
          </span>
        </div>
        <h1 className="plat-hero-title">
          {config.name}
        </h1>
        <p className="plat-hero-sub">{config.tagline}</p>
        <div className="plat-hero-pills">
          {launched.map(p => (
            <button
              key={p.id}
              className="plat-hero-pill"
              style={{ '--pill-color': p.color } as React.CSSProperties}
              onClick={() => navigate(p.homePath)}
            >
              <Icon name={p.iconName} size={13} />
              {p.name}
            </button>
          ))}
          {comingSoon.map(p => (
            <span key={p.id} className="plat-hero-pill plat-hero-pill-soon">
              <Icon name={p.iconName} size={13} />
              {p.name} <em>soon</em>
            </span>
          ))}
        </div>
      </section>

      {/* ── Live Products Grid ── */}
      <section className="plat-products-section">
        <div className="section-label">Products</div>
        <h2 className="section-title">
          Available <span className="section-accent">now</span>
        </h2>
        <div className="plat-products-grid">
          {launched.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* ── Roadmap ── */}
      {comingSoon.length > 0 && (
        <section className="plat-roadmap-section">
          <div className="section-label">Roadmap</div>
          <h2 className="section-title">
            What's <span className="section-accent">coming next</span>
          </h2>
          <p className="section-sub">
            NexaForge grows as new products integrate using the{' '}
            <code>ProductManifest</code> contract — a single file registration.
          </p>
          <div className="plat-roadmap-grid">
            {comingSoon.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ── Integration CTA ── */}
      <section className="plat-integration-cta">
        <div className="plat-cta-card">
          <div className="plat-cta-icon">
            <Icon name="puzzle" size={28} />
          </div>
          <div>
            <h3 className="plat-cta-title">Integrate a new product</h3>
            <p className="plat-cta-body">
              Any product can join the platform in minutes. Implement a{' '}
              <code>ProductManifest</code>, call <code>productRegistry.register()</code>,
              and your product appears in the launcher, nav, and routing automatically.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <button className="plat-btn-primary" style={{ background: '#3b82f6' }} onClick={() => navigate('/docs/getting-started/introduction')}>
                View Integration Guide →
              </button>
              <a href={config.githubUrl} className="plat-btn-secondary" target="_blank" rel="noopener noreferrer">
                <Icon name="github" size={14} /> GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
