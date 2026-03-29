import React from 'react';
import { usePlatform } from '../platform/PlatformProvider';
import { Icon } from '../icons/Icon';
import { navigate } from '../App';
import { HomePage } from './HomePage';
import type { ProductManifest, ProductStatus } from '../platform/types';

const STATUS_CONFIG: Record<ProductStatus, { label: string; color: string; bg: string }> = {
  ga:           { label: 'Generally Available', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.08)' },
  beta:         { label: 'Beta',                color: '#d97706', bg: 'rgba(217, 119, 6, 0.08)' },
  preview:      { label: 'Preview',             color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.08)' },
  'coming-soon':{ label: 'Coming Soon',         color: '#64748b', bg: 'rgba(100, 116, 139, 0.08)' },
};

// ── Generic product home (for non-gridstorm products) ─────────────

function GenericProductHome({ product }: { product: ProductManifest }) {
  const status = STATUS_CONFIG[product.status];

  return (
    <div className="prod-home">
      {/* Breadcrumb */}
      <div className="prod-breadcrumb">
        <button className="prod-bc-link" onClick={() => navigate('/products')}>
          ← All Products
        </button>
        <span className="prod-bc-sep">/</span>
        <span className="prod-bc-current">{product.name}</span>
      </div>

      {/* Hero */}
      <div className="prod-hero" style={{ '--product-color': product.color, '--product-accent': product.accentColor } as React.CSSProperties}>
        <div className="prod-hero-icon" style={{ background: product.accentColor, color: product.color }}>
          <Icon name={product.iconName} size={36} />
        </div>
        <div className="prod-hero-text">
          <div className="prod-hero-badges">
            <span className="plat-badge" style={{ color: status.color, background: status.bg }}>{status.label}</span>
            <span className="prod-version">v{product.version}</span>
          </div>
          <h1 className="prod-hero-name">{product.name}</h1>
          <p className="prod-hero-tagline">{product.tagline}</p>
          <p className="prod-hero-desc">{product.description}</p>

          {/* CTAs */}
          <div className="prod-hero-ctas">
            {product.primaryDemoPath && (
              <a href={product.primaryDemoPath} className="plat-btn-primary" style={{ background: product.color }} target="_blank" rel="noopener noreferrer">
                Open Demo →
              </a>
            )}
            {product.docsRoot && (
              <button className="plat-btn-secondary" onClick={() => navigate(product.docsRoot!)}>
                Documentation
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="prod-stats-row">
        {product.stats.map(s => (
          <div key={s.label} className="prod-stat-block">
            <div className="prod-stat-value" style={{ color: product.color }}>{s.value}</div>
            <div className="prod-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Features + Quick Links */}
      <div className="prod-body-grid">
        <div className="prod-features-card">
          <h3 className="prod-card-title">Key Capabilities</h3>
          <ul className="plat-feature-list">
            {product.keyFeatures.map(f => (
              <li key={f} className="plat-feature-item">
                <span className="plat-feature-dot" style={{ background: product.color }} />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {product.quickLinks.length > 0 && (
          <div className="prod-links-card">
            <h3 className="prod-card-title">Quick Links</h3>
            <div className="prod-links-list">
              {product.quickLinks.map(link => (
                link.external ? (
                  <a key={link.label} href={link.path} className="prod-link-row" target="_blank" rel="noopener noreferrer">
                    <Icon name="external-link" size={14} />
                    <span>{link.label}</span>
                    {link.isNew && <span className="plat-new-pill">New</span>}
                  </a>
                ) : (
                  <button key={link.label} className="prod-link-row" onClick={() => navigate(link.path)}>
                    <Icon name="chevron-right" size={14} />
                    <span>{link.label}</span>
                    {link.isNew && <span className="plat-new-pill">New</span>}
                  </button>
                )
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="plat-tags" style={{ marginTop: 32 }}>
        {product.tags.map(t => <span key={t} className="plat-tag">{t}</span>)}
      </div>
    </div>
  );
}

// ── ProductHomePage router ─────────────────────────────────────────

export function ProductHomePage({ productId }: { productId: string }) {
  const { getProduct } = usePlatform();
  const product = getProduct(productId);

  if (!product) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 24, marginBottom: 12 }}>Product not found</h2>
        <p style={{ color: '#64748b', marginBottom: 24 }}>No product registered with id "{productId}".</p>
        <button
          style={{ padding: '10px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
          onClick={() => navigate('/products')}
        >
          ← Back to Platform
        </button>
      </div>
    );
  }

  // GridStorm's product home is the existing detailed landing page
  if (productId === 'gridstorm') {
    return (
      <>
        <div className="prod-breadcrumb" style={{ padding: '12px 24px 0' }}>
          <button className="prod-bc-link" onClick={() => navigate('/products')}>
            ← All Products
          </button>
          <span className="prod-bc-sep">/</span>
          <span className="prod-bc-current">GridStorm</span>
        </div>
        <HomePage />
      </>
    );
  }

  return <GenericProductHome product={product} />;
}
