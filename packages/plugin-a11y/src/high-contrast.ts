// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
export interface HighContrastSupport {
  isActive(): boolean;
  destroy(): void;
}

const HIGH_CONTRAST_CSS = `
  @media (prefers-contrast: more) {
    [role="grid"] {
      --gs-border-color: #000000;
      --gs-focus-ring: 3px solid #000000;
      --gs-header-bg: #ffffff;
      --gs-header-color: #000000;
      --gs-row-hover-bg: #e0e0e0;
      --gs-selected-bg: #b3d4fc;
      --gs-selected-color: #000000;
    }
    [role="grid"] [role="gridcell"]:focus,
    [role="grid"] [role="columnheader"]:focus {
      outline: 3px solid #000000 !important;
      outline-offset: -3px;
      box-shadow: none !important;
    }
    [role="grid"] [role="row"]:hover {
      outline: 1px solid #000000;
    }
  }

  @media (forced-colors: active) {
    [role="grid"] {
      border: 1px solid ButtonText;
    }
    [role="grid"] [role="gridcell"],
    [role="grid"] [role="columnheader"] {
      border: 1px solid ButtonText;
    }
    [role="grid"] [role="gridcell"]:focus,
    [role="grid"] [role="columnheader"]:focus {
      outline: 3px solid Highlight !important;
      outline-offset: -3px;
      box-shadow: none !important;
    }
    [role="grid"] [aria-selected="true"] {
      background-color: Highlight;
      color: HighlightText;
      forced-color-adjust: none;
    }
  }
`;

export function createHighContrastSupport(rootEl: HTMLElement): HighContrastSupport {
  let active = false;
  const styleEl = document.createElement('style');
  styleEl.setAttribute('data-a11y-high-contrast', 'true');
  styleEl.textContent = HIGH_CONTRAST_CSS;
  rootEl.appendChild(styleEl);

  // Detect high contrast mode
  const mq = typeof window !== 'undefined'
    ? window.matchMedia?.('(prefers-contrast: more)')
    : null;

  const forcedMq = typeof window !== 'undefined'
    ? window.matchMedia?.('(forced-colors: active)')
    : null;

  function update(): void {
    active = !!(mq?.matches || forcedMq?.matches);
  }

  update();
  mq?.addEventListener?.('change', update);
  forcedMq?.addEventListener?.('change', update);

  return {
    isActive: () => active,
    destroy() {
      styleEl.remove();
      mq?.removeEventListener?.('change', update);
      forcedMq?.removeEventListener?.('change', update);
    },
  };
}
