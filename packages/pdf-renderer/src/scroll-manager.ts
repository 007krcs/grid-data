// ─── Scroll Manager ───

import type { PageViewport } from './viewport';

/** Configuration for the scroll manager. */
export interface ScrollManagerConfig {
  /** The scrollable container element. */
  viewport: HTMLElement;
  /** Callback when scroll position changes. */
  onScroll: (scrollTop: number, scrollLeft: number) => void;
  /** Callback when the most visible page changes. */
  onPageChange?: (pageIndex: number) => void;
}

/** Manages scroll events and page tracking for the PDF viewer. */
export class ScrollManager {
  private viewport: HTMLElement;
  private onScroll: (scrollTop: number, scrollLeft: number) => void;
  private onPageChange?: (pageIndex: number) => void;
  private layouts: PageViewport[] = [];
  private currentPageIndex = 0;
  private rafId: number | null = null;
  private handleScrollBound: () => void;

  constructor(config: ScrollManagerConfig) {
    this.viewport = config.viewport;
    this.onScroll = config.onScroll;
    this.onPageChange = config.onPageChange;
    this.handleScrollBound = this.handleScroll.bind(this);
    this.viewport.addEventListener('scroll', this.handleScrollBound, {
      passive: true,
    });
  }

  /** Update page layouts for visibility calculations. */
  setLayouts(layouts: PageViewport[]): void {
    this.layouts = layouts;
  }

  /** Scroll to a specific page. */
  scrollToPage(pageIndex: number): void {
    if (pageIndex < 0 || pageIndex >= this.layouts.length) return;
    const layout = this.layouts[pageIndex]!;
    this.viewport.scrollTop = layout.offsetY;
  }

  /** Scroll to specific coordinates. */
  scrollTo(x: number, y: number): void {
    this.viewport.scrollLeft = x;
    this.viewport.scrollTop = y;
  }

  /** Get current scroll position. */
  getScrollPosition(): { x: number; y: number } {
    return {
      x: this.viewport.scrollLeft,
      y: this.viewport.scrollTop,
    };
  }

  /** Determine which page is most visible. */
  getMostVisiblePage(): number {
    const scrollTop = this.viewport.scrollTop;
    const viewportHeight = this.viewport.clientHeight;
    const viewCenter = scrollTop + viewportHeight / 2;

    let closestIndex = 0;
    let closestDistance = Infinity;

    for (const layout of this.layouts) {
      const pageCenter = layout.offsetY + layout.height / 2;
      const distance = Math.abs(pageCenter - viewCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = layout.pageIndex;
      }
    }

    return closestIndex;
  }

  private handleScroll(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      const { scrollTop, scrollLeft } = this.viewport;
      this.onScroll(scrollTop, scrollLeft);

      const newPage = this.getMostVisiblePage();
      if (newPage !== this.currentPageIndex) {
        this.currentPageIndex = newPage;
        this.onPageChange?.(newPage);
      }
    });
  }

  destroy(): void {
    this.viewport.removeEventListener('scroll', this.handleScrollBound);
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
