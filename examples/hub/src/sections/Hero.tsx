export function Hero() {
  return (
    <section className="hero">
      <div className="hero-badge">
        <span className="dot" />
        <span>v0.2.0 &mdash; 39 packages &middot; 1,084+ tests</span>
      </div>
      <h1>
        The Enterprise
        <br />
        <span className="gradient">Document Platform</span>
      </h1>
      <p className="hero-sub">
        Data grids. PDF toolkit. AI-powered document intelligence. One platform,
        one license, one API pattern.
      </p>
      <div className="hero-cta">
        <a href="#/docs/getting-started/quick-start" className="btn-primary">
          Get Started
        </a>
        <a href="#/docs" className="btn-outline">
          View Docs
        </a>
      </div>
    </section>
  );
}
