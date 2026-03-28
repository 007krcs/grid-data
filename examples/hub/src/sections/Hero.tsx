import React from 'react';
import { Icon } from '../icons/Icon';

const FRAMEWORKS = [
  { name: 'React',   color: '#61dafb' },
  { name: 'Vue',     color: '#42b883' },
  { name: 'Angular', color: '#dd1b16' },
  { name: 'Svelte',  color: '#ff3e00' },
  { name: 'Vanilla', color: '#f7df1e' },
];

const TRUST_BADGES = [
  { icon: 'shield', label: 'WCAG 2.1 AA' },
  { icon: 'zap',    label: '100K rows @ 60fps' },
  { icon: 'lock',   label: 'MIT License' },
  { icon: 'code',   label: 'TypeScript-native' },
];

export function Hero() {
  return (
    <section className="hero">
      {/* Release badge */}
      <a href="#/docs/getting-started/introduction" className="hero-badge hero-badge-link">
        <span className="dot" />
        <span>v0.1.2 — WCAG 2.1 AA · 42 Excel functions · Excel copy/paste</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </a>

      {/* Headline */}
      <h1>
        The Open-Source
        <br />
        <span className="gradient">Enterprise Data Grid</span>
      </h1>
      <p className="hero-sub">
        35 composable plugins. WCAG 2.1 AA. Excel-compatible formulas and copy/paste.
        <br />
        Everything AG Grid Enterprise charges $999/dev/yr for — free and open-source.
      </p>

      {/* Trust badges */}
      <div className="hero-trust">
        {TRUST_BADGES.map((b) => (
          <span key={b.label} className="hero-trust-badge">
            <Icon name={b.icon} size={13} />
            {b.label}
          </span>
        ))}
      </div>

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
          <span className="preview-bar-right">
            <span className="preview-pill">A11y</span>
            <span className="preview-pill">Formulas</span>
            <span className="preview-pill">Live</span>
          </span>
        </div>
        <div className="preview-toolbar">
          <span className="preview-toolbar-btn">&#9660; Filter</span>
          <span className="preview-toolbar-btn">&#8645; Group</span>
          <span className="preview-toolbar-btn">&#8660; Columns</span>
          <span className="preview-toolbar-sep" />
          <span className="preview-toolbar-btn preview-toolbar-btn-active">&#9654; Export</span>
        </div>
        <div className="preview-grid">
          <div className="preview-header">
            <div className="preview-th preview-th-check">
              <span className="preview-checkbox" />
            </div>
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
            <div className="preview-th">Sparkline</div>
          </div>
          {([
            ['Apple Inc.',    'AAPL',  '$189.42', '+1.24%', '58.3M', 'up',   [40,45,42,50,48,55,52]],
            ['Microsoft',     'MSFT',  '$378.20', '+0.87%', '22.1M', 'up',   [60,62,58,65,63,68,70]],
            ['Alphabet Inc.', 'GOOGL', '$141.80', '-0.32%', '19.6M', 'down', [55,52,50,48,51,47,45]],
            ['Amazon',        'AMZN',  '$178.15', '+2.11%', '34.8M', 'up',   [30,35,38,42,40,46,50]],
            ['NVIDIA Corp.',  'NVDA',  '$496.80', '+3.57%', '41.2M', 'up',   [20,30,45,40,55,60,75]],
          ] as [string, string, string, string, string, string, number[]][]).map(([co, ticker, price, chg, vol, dir, spark]) => (
            <div key={ticker} className="preview-row">
              <div className="preview-td preview-td-check">
                <span className={`preview-checkbox${dir === 'up' ? ' preview-checkbox-checked' : ''}`} />
              </div>
              <div className="preview-td preview-td-name">{co}</div>
              <div className="preview-td preview-td-ticker">{ticker}</div>
              <div className="preview-td">{price}</div>
              <div className={`preview-td preview-td-change ${dir}`}>{chg}</div>
              <div className="preview-td preview-td-muted">{vol}</div>
              <div className="preview-td preview-td-spark">
                <svg width="56" height="20" viewBox="0 0 56 20">
                  <polyline
                    points={spark.map((v, i) => `${i * 8},${20 - v / 4}`).join(' ')}
                    fill="none"
                    stroke={dir === 'up' ? '#22c55e' : '#ef4444'}
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
        <div className="preview-footer">
          <span className="preview-badge green">● Live</span>
          <span className="preview-stat">5 rows · 100K row capacity · 60 fps</span>
          <span className="preview-plugins">35 plugins · WCAG 2.1 AA · Excel copy/paste</span>
        </div>
      </div>
    </section>
  );
}
