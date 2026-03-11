// ─── Viewport Calculation ───

import type { PdfPageState } from '@gridstorm/pdf-core';

/** Gap between pages in pixels. */
export const PAGE_GAP = 8;

/** Minimum zoom level. */
export const MIN_ZOOM = 0.1;

/** Maximum zoom level. */
export const MAX_ZOOM = 10;

/** CSS DPI for PDF point conversion (1 PDF pt = 1/72 inch, CSS = 96 DPI). */
export const CSS_UNITS = 96 / 72;

/** Computed viewport for a single page. */
export interface PageViewport {
  pageIndex: number;
  /** Width in CSS pixels at current zoom. */
  width: number;
  /** Height in CSS pixels at current zoom. */
  height: number;
  /** X offset from container left edge. */
  offsetX: number;
  /** Y offset from container top edge. */
  offsetY: number;
  /** Scale factor from PDF points to CSS pixels. */
  scale: number;
  /** Page rotation applied. */
  rotation: number;
}

/** Compute viewport for a single page. */
export function computePageViewport(
  page: PdfPageState,
  zoom: number,
  devicePixelRatio = 1,
): { width: number; height: number; scale: number } {
  const rotation = page.rotation % 360;
  const isRotated = rotation === 90 || rotation === 270;
  const pdfWidth = isRotated ? page.height : page.width;
  const pdfHeight = isRotated ? page.width : page.height;

  const scale = zoom * CSS_UNITS * devicePixelRatio;
  const width = Math.floor(pdfWidth * zoom * CSS_UNITS);
  const height = Math.floor(pdfHeight * zoom * CSS_UNITS);

  return { width, height, scale };
}

/** Layout all pages vertically, centered horizontally in container. */
export function computePageLayouts(
  pages: PdfPageState[],
  zoom: number,
  containerWidth: number,
): PageViewport[] {
  let currentY = PAGE_GAP;
  const layouts: PageViewport[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!;
    const { width, height, scale } = computePageViewport(page, zoom);

    const offsetX = Math.max(0, (containerWidth - width) / 2);

    layouts.push({
      pageIndex: i,
      width,
      height,
      offsetX,
      offsetY: currentY,
      scale,
      rotation: page.rotation,
    });

    currentY += height + PAGE_GAP;
  }

  return layouts;
}

/** Get total scroll height for all pages. */
export function computeTotalHeight(layouts: PageViewport[]): number {
  if (layouts.length === 0) return 0;
  const last = layouts[layouts.length - 1]!;
  return last.offsetY + last.height + PAGE_GAP;
}

/** Find which pages are visible given scroll position and viewport height. */
export function getVisiblePages(
  layouts: PageViewport[],
  scrollTop: number,
  viewportHeight: number,
): PageViewport[] {
  const viewBottom = scrollTop + viewportHeight;
  return layouts.filter(
    (l) => l.offsetY + l.height > scrollTop && l.offsetY < viewBottom,
  );
}

/** Clamp zoom to valid range. */
export function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}
