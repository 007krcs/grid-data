import React from 'react';
import { ErrorCatcher } from '../../shared/ErrorCatcher';
import { ThemeProvider } from './theme/ThemeProvider';
import { HomePage } from './pages/HomePage';
import { DocsPage } from './pages/DocsPage';
import { DemosPage } from './pages/DemosPage';
import { TopNav } from './layout/TopNav';
import { Footer } from './layout/Footer';

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

  let page: React.ReactNode;
  if (route.startsWith('/docs')) {
    page = <DocsPage route={route} />;
  } else if (route === '/demos') {
    page = <DemosPage />;
  } else {
    page = <HomePage />;
  }

  return (
    <ThemeProvider>
      <ErrorCatcher>
        <div className="bg-pattern" />
        <div className="bg-glow" />
        <div className="hub-container">
          <TopNav route={route} />
          {page}
          <Footer />
        </div>
      </ErrorCatcher>
    </ThemeProvider>
  );
}
