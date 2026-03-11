// ─── @gridstorm/pdf-theme ───
//
// CSS custom properties and theme utilities for GridStorm PDF viewer.

/** Available PDF viewer themes. */
export type PdfTheme = 'light' | 'dark' | 'high-contrast';

/** Apply a theme to the PDF viewer container. */
export function applyPdfTheme(container: HTMLElement, theme: PdfTheme): void {
  container.classList.remove('gs-pdf-dark', 'gs-pdf-high-contrast');
  container.removeAttribute('data-theme');

  switch (theme) {
    case 'dark':
      container.classList.add('gs-pdf-dark');
      container.setAttribute('data-theme', 'dark');
      break;
    case 'high-contrast':
      container.classList.add('gs-pdf-high-contrast');
      container.setAttribute('data-theme', 'high-contrast');
      break;
    case 'light':
    default:
      container.setAttribute('data-theme', 'light');
      break;
  }
}

/** Get the current theme from a container element. */
export function getPdfTheme(container: HTMLElement): PdfTheme {
  if (container.classList.contains('gs-pdf-high-contrast')) return 'high-contrast';
  if (container.classList.contains('gs-pdf-dark')) return 'dark';
  return 'light';
}

/** Override specific CSS tokens on a container. */
export function setPdfTokens(
  container: HTMLElement,
  tokens: Record<string, string>,
): void {
  for (const [key, value] of Object.entries(tokens)) {
    const prop = key.startsWith('--') ? key : `--gs-pdf-${key}`;
    container.style.setProperty(prop, value);
  }
}

/** Reset overridden tokens on a container. */
export function resetPdfTokens(
  container: HTMLElement,
  tokenNames: string[],
): void {
  for (const name of tokenNames) {
    const prop = name.startsWith('--') ? name : `--gs-pdf-${name}`;
    container.style.removeProperty(prop);
  }
}

/** All PDF theme token names. */
export const PDF_THEME_TOKENS = [
  'bg',
  'page-bg',
  'page-shadow',
  'page-border',
  'toolbar-bg',
  'toolbar-fg',
  'toolbar-border',
  'toolbar-btn-bg',
  'toolbar-btn-fg',
  'toolbar-btn-hover-bg',
  'toolbar-btn-active-bg',
  'toolbar-btn-disabled-fg',
  'text-selection-bg',
  'text-selection-fg',
  'search-highlight-bg',
  'search-highlight-active-bg',
  'search-highlight-border',
  'annotation-selected-border',
  'annotation-selected-shadow',
  'annotation-handle-fill',
  'annotation-handle-stroke',
  'sidebar-bg',
  'sidebar-border',
  'thumbnail-border',
  'thumbnail-active-border',
  'page-gap',
  'toolbar-height',
  'toolbar-padding',
  'sidebar-width',
  'font-family',
  'font-size',
  'font-size-small',
  'border-radius',
  'border-width',
  'transition-duration',
  'transition-easing',
  'shadow-sm',
  'shadow-md',
  'shadow-page',
] as const;

export type PdfThemeToken = (typeof PDF_THEME_TOKENS)[number];
