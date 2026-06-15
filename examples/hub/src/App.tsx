import React from 'react';
import { ErrorCatcher } from '../../shared/ErrorCatcher';
import { ThemeProvider } from './theme/ThemeProvider';
import { PlatformProvider } from './platform/PlatformProvider';
import { HomePage } from './pages/HomePage';
import { DocsPage } from './pages/DocsPage';
import { DemosPage } from './pages/DemosPage';
import { PlatformPage } from './pages/PlatformPage';
import { ProductHomePage } from './pages/ProductHomePage';
import { TopNav } from './layout/TopNav';
import { Footer } from './layout/Footer';
import { getActiveProductId } from './platform/registry';
import { useSeo } from './platform/useSeo';
import { getSeoForRoute } from './platform/seoConfig';

function useHashRoute(): string {
  const [hash, setHash] = React.useState(window.location.hash.slice(1) || '/');
  React.useEffect(() => {
    const handler = () => setHash(window.location.hash.slice(1) || '/');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return hash;
}

export function navigate(path: string) {
  window.location.hash = path;
}

export function App() {
  const route = useHashRoute();
  const activeProductId = getActiveProductId(route);

  // Inject dynamic <head> meta, OG tags, Twitter card, and JSON-LD per route
  useSeo(getSeoForRoute(route));

  let page: React.ReactNode;

  if (route === '/products') {
    // ── Platform launcher (product switcher) ──
    page = <PlatformPage />;
  } else if (route.startsWith('/product/')) {
    // ── Individual product home ──
    const productId = route.slice('/product/'.length).split('/')[0];
    page = <ProductHomePage productId={productId ?? ''} />;
  } else if (route.startsWith('/docs')) {
    // ── GridStorm docs ──
    page = <DocsPage route={route} />;
  } else if (route === '/demos') {
    // ── GridStorm demos ──
    page = <DemosPage />;
  } else {
    // ── Default: GridStorm product home ──
    page = <HomePage />;
  }

  return (
    <ThemeProvider>
      <ErrorCatcher>
        <PlatformProvider activeProductId={activeProductId}>
          <div className="bg-pattern" />
          <div className="bg-glow" />
          <div className="hub-container">
            <TopNav route={route} />
            <main id="main-content">{page}</main>
            <Footer />
          </div>
        </PlatformProvider>
      </ErrorCatcher>
    </ThemeProvider>
  );
}
