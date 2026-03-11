import { Icon } from '../icons/Icon';

export function Footer() {
  return (
    <footer className="hub-footer">
      <div className="hub-footer-links">
        <a
          href="https://github.com/007krcs/grid-data"
          target="_blank"
          rel="noopener noreferrer"
          className="hub-footer-link"
        >
          <Icon name="github" size={16} />
          <span>GitHub</span>
        </a>
        <a href="#/docs" className="hub-footer-link">
          <Icon name="book-open" size={16} />
          <span>Documentation</span>
        </a>
        <a
          href="/playground/"
          className="hub-footer-link"
        >
          <Icon name="play" size={16} />
          <span>Playground</span>
        </a>
        <a
          href="/pdf-viewer/"
          className="hub-footer-link"
        >
          <Icon name="file-pdf" size={16} />
          <span>PDF Viewer</span>
        </a>
      </div>
      <div className="hub-footer-copy">
        &copy; {new Date().getFullYear()} GridStorm. All rights reserved.
      </div>
    </footer>
  );
}
