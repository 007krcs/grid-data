// ─── Scroll Manager ───
// Manages scroll synchronization between pinned and center sections.
// Uses passive scroll listeners and rAF for optimal performance.

import { rafThrottle } from '@gridstorm/core';

export interface ScrollManagerConfig {
  /** The main scrollable viewport element. */
  viewport: HTMLElement;
  /** Callback when scroll position changes. */
  onScroll: (scrollTop: number, scrollLeft: number) => void;
  /** Elements that should sync vertical scroll. */
  verticalSyncTargets?: HTMLElement[];
  /** Elements that should sync horizontal scroll (e.g., header). */
  horizontalSyncTargets?: HTMLElement[];
}

export class ScrollManager {
  private viewport: HTMLElement | null = null;
  private onScrollCallback: ((top: number, left: number) => void) | null = null;
  private verticalTargets: HTMLElement[] = [];
  private horizontalTargets: HTMLElement[] = [];
  private cleanup: (() => void) | null = null;

  configure(config: ScrollManagerConfig): void {
    this.destroy();

    this.viewport = config.viewport;
    this.onScrollCallback = config.onScroll;
    this.verticalTargets = config.verticalSyncTargets ?? [];
    this.horizontalTargets = config.horizontalSyncTargets ?? [];

    const handleScroll = rafThrottle(() => {
      if (!this.viewport) return;

      const { scrollTop, scrollLeft } = this.viewport;

      // Sync vertical targets
      for (const target of this.verticalTargets) {
        if (target.scrollTop !== scrollTop) {
          target.scrollTop = scrollTop;
        }
      }

      // Sync horizontal targets
      for (const target of this.horizontalTargets) {
        if (target.scrollLeft !== scrollLeft) {
          target.scrollLeft = scrollLeft;
        }
      }

      this.onScrollCallback?.(scrollTop, scrollLeft);
    });

    this.viewport.addEventListener('scroll', handleScroll, { passive: true });

    this.cleanup = () => {
      this.viewport?.removeEventListener('scroll', handleScroll);
      handleScroll.cancel();
    };
  }

  scrollTo(top?: number, left?: number): void {
    if (!this.viewport) return;
    if (top !== undefined) this.viewport.scrollTop = top;
    if (left !== undefined) this.viewport.scrollLeft = left;
  }

  getScrollPosition(): { top: number; left: number } {
    if (!this.viewport) return { top: 0, left: 0 };
    return {
      top: this.viewport.scrollTop,
      left: this.viewport.scrollLeft,
    };
  }

  destroy(): void {
    this.cleanup?.();
    this.cleanup = null;
    this.viewport = null;
    this.verticalTargets = [];
    this.horizontalTargets = [];
  }
}
