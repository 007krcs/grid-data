import React from 'react';
import { Icon } from '../icons/Icon';

const FRAMEWORKS = [
  { name: 'React',   color: '#61dafb' },
  { name: 'Vue',     color: '#42b883' },
  { name: 'Angular', color: '#dd1b16' },
  { name: 'Svelte',  color: '#ff3e00' },
  { name: 'Vanilla', color: '#f7df1e' },
];

export function Hero() {
  return (
    <section className="hero">
      {/* Release badge */}
      <a href="#/docs/getting-started/introduction" className="hero-badge hero-badge-link">
        <span className="dot" />
        <span>v0.2.0 — Now with AI &amp; MCP support</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </a>

      {/* Headline */}
      <h1>
        The Enterprise
        <br />
        <span className="gradient">Document Platform</span>
      </h1>
      <p className="hero-sub">
        Data grids. PDF toolkit. AI-powered document intelligence.
        One platform, one license, one API pattern.
      </p>

      {/* CTAs */}
      <div className="hero-cta">
        <a href="#/docs/getting-started/quick-start" className="btn-primary">
          <Icon name="zap" size={16} />
          Get Started Free
        </a>
        <a href="#/demos" className="btn-outline">
          <Icon name="play" size={16} />
          Explore Demos
        </a>
        <a
          href="https://github.com/007krcs/grid-data"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline"
        >
          <Icon name="github" size={16} />
          Star on GitHub
        </a>
      </div>

      {/* Framework support strip */}
      <div className="hero-frameworks">
        <span className="hero-fw-label">Works with</span>
        {FRAMEWORKS.map((fw) => (
          <span
            key={fw.name}
            className="hero-fw-pill"
            style={{ '--fw-color': fw.color } as React.CSSProperties}
          >
            {fw.name}
          </span>
        ))}
      </div>

      {/* Grid preview mockup */}
      <div className="hero-preview" aria-hidden="true">
        <div className="preview-bar">
          <div className="preview-dot red" />
          <div className="preview-dot yellow" />
          <div className="preview-dot green" />
          <span className="preview-title">GridStorm — Financial Dashboard</span>
        </div>
        <div className="preview-grid">
          <div className="preview-header">
            <div className="preview-th preview-th-sorted">
              Company
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </div>
            <div className="preview-th">Ticker</div>
            <div className="preview-th">Price</div>
            <div className="preview-th">Change&nbsp;%</div>
            <div className="preview-th">Volume</div>
          </div>
          {([
            ['Apple Inc.',    'AAPL',  '$189.42', '+1.24%', '58.3M',  'up'],
            ['Microsoft',     'MSFT',  '$378.20', '+0.87%', '22.1M',  'up'],
            ['Alphabet Inc.', 'GOOGL', '$141.80', '-0.32%', '19.6M',  'down'],
            ['Amazon',        'AMZN',  '$178.15', '+2.11%', '34.8M',  'up'],
            ['NVIDIA Corp.',  'NVDA',  '$496.80', '+3.57%', '41.2M',  'up'],
          ] as string[][]).map(([co, ticker, price, chg, vol, dir]) => (
            <div key={ticker} className="preview-row">
              <div className="preview-td preview-td-name">{co}</div>
              <div className="preview-td preview-td-ticker">{ticker}</div>
              <div className="preview-td">{price}</div>
              <div className={`preview-td preview-td-change ${dir}`}>{chg}</div>
              <div className="preview-td preview-td-muted">{vol}</div>
            </div>
          ))}
        </div>
        <div className="preview-footer">
          <span className="preview-badge green">● Live</span>
          <span className="preview-stat">5 rows · 100K row capacity · 60 fps</span>
          <span className="preview-plugins">SortingPlugin · FilteringPlugin · SelectionPlugin</span>
        </div>
      </div>
    </section>
  );
}
