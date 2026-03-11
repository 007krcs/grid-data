import { Icon } from '../icons/Icon';
import { ThemeToggle } from '../theme/ThemeToggle';
import { navigate } from '../App';

interface TopNavProps {
  route: string;
}

const navLinks = [
  { path: '/', label: 'Home' },
  { path: '/docs', label: 'Docs' },
  { path: '/demos', label: 'Demos' },
];

function isActive(route: string, path: string): boolean {
  if (path === '/') return route === '/';
  return route.startsWith(path);
}

export function TopNav({ route }: TopNavProps) {
  return (
    <nav className="top-nav">
      <div className="top-nav-left">
        <a
          href="#/"
          className="top-nav-brand"
          onClick={(e) => { e.preventDefault(); navigate('/'); }}
        >
          <div className="top-nav-logo">GS</div>
          <span className="top-nav-name">GridStorm</span>
        </a>
        <div className="top-nav-links">
          {navLinks.map(link => (
            <a
              key={link.path}
              href={`#${link.path}`}
              className={`top-nav-link ${isActive(route, link.path) ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); navigate(link.path); }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
      <div className="top-nav-right">
        <ThemeToggle />
        <a
          href="https://github.com/007krcs/grid-data"
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
