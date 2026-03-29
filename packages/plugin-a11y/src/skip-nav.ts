import type { PluginContext } from '@gridstorm/core';

export interface SkipNav {
  destroy(): void;
}

const SKIP_NAV_STYLES = `
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

const SKIP_NAV_FOCUS_STYLES = `
  position: fixed;
  top: 4px;
  left: 4px;
  width: auto;
  height: auto;
  padding: 8px 16px;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
  background: #1a1a2e;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  border: 2px solid #4a90d9;
  border-radius: 4px;
  z-index: 100000;
  text-decoration: none;
  outline: none;
`;

export function createSkipNav(_ctx: PluginContext, rootEl: HTMLElement): SkipNav {
  const container = document.createElement('div');
  container.className = 'gs-skip-nav';
  container.setAttribute('data-a11y-skip-nav', 'true');

  // Inject styles
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .gs-skip-nav a { ${SKIP_NAV_STYLES} }
    .gs-skip-nav a:focus { ${SKIP_NAV_FOCUS_STYLES} }
  `;
  container.appendChild(styleEl);

  // Skip to grid content link
  const skipToGrid = document.createElement('a');
  skipToGrid.href = '#';
  skipToGrid.textContent = 'Skip to grid content';
  skipToGrid.addEventListener('click', (e) => {
    e.preventDefault();
    const firstCell = rootEl.querySelector('[role="gridcell"]') as HTMLElement;
    if (firstCell) {
      firstCell.focus();
    }
  });
  container.appendChild(skipToGrid);

  // Skip past grid link
  const skipPast = document.createElement('a');
  skipPast.href = '#';
  skipPast.textContent = 'Skip past grid';
  skipPast.addEventListener('click', (e) => {
    e.preventDefault();
    // Focus next focusable element after the grid
    const allFocusable = document.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const gridRoot = rootEl.closest('[role="grid"]') ?? rootEl;
    let found = false;
    for (const el of allFocusable) {
      if (found && !gridRoot.contains(el)) {
        (el as HTMLElement).focus();
        return;
      }
      if (gridRoot.contains(el)) found = true;
    }
  });
  container.appendChild(skipPast);

  // Insert before the grid root
  rootEl.parentElement?.insertBefore(container, rootEl);

  return {
    destroy() {
      container.remove();
    },
  };
}
