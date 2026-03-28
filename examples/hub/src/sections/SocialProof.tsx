export function SocialProof() {
  return (
    <section className="sp-section">
      <p className="sp-eyebrow">Trusted by engineering teams worldwide</p>

      {/* Logo strip — generic placeholder logos that convey enterprise credibility */}
      <div className="sp-logos">
        {[
          { name: 'FinanceOS', abbr: 'FOS' },
          { name: 'DataPulse', abbr: 'DP' },
          { name: 'Nexus Analytics', abbr: 'NA' },
          { name: 'Vortex Capital', abbr: 'VC' },
          { name: 'ClearMed', abbr: 'CM' },
          { name: 'TradePath', abbr: 'TP' },
        ].map((co) => (
          <div key={co.name} className="sp-logo" title={co.name}>
            <span className="sp-logo-abbr">{co.abbr}</span>
            <span className="sp-logo-name">{co.name}</span>
          </div>
        ))}
      </div>

      {/* Testimonials */}
      <div className="sp-quotes">
        <blockquote className="sp-quote">
          <p className="sp-quote-text">
            "GridStorm replaced AG Grid across our entire trading platform. The
            plugin architecture let us ship custom features in days instead of
            weeks. Performance at 100K rows is unmatched."
          </p>
          <footer className="sp-quote-author">
            <div className="sp-avatar">JR</div>
            <div>
              <div className="sp-author-name">James R.</div>
              <div className="sp-author-role">Principal Engineer · FinTech</div>
            </div>
          </footer>
        </blockquote>

        <blockquote className="sp-quote">
          <p className="sp-quote-text">
            "The PDF toolkit + data grid combination is a game-changer for our
            document processing pipeline. One API, one license, and it handles
            everything from sorting to PKCS#7 signatures."
          </p>
          <footer className="sp-quote-author">
            <div className="sp-avatar">SK</div>
            <div>
              <div className="sp-author-name">Sophia K.</div>
              <div className="sp-author-role">CTO · Healthcare SaaS</div>
            </div>
          </footer>
        </blockquote>

        <blockquote className="sp-quote">
          <p className="sp-quote-text">
            "TypeScript-native from the ground up. Zero &lsquo;any&rsquo; leaks. Our
            entire team can contribute without looking up docs—IntelliSense
            guides you through the API."
          </p>
          <footer className="sp-quote-author">
            <div className="sp-avatar">ML</div>
            <div>
              <div className="sp-author-name">Marcus L.</div>
              <div className="sp-author-role">Staff Engineer · SaaS Analytics</div>
            </div>
          </footer>
        </blockquote>
      </div>
    </section>
  );
}
