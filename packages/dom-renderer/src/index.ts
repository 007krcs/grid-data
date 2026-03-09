// ─── @gridstorm/dom-renderer — Public API ───

export { DomRenderer } from './renderer';
export type { DomRendererConfig } from './renderer';

export { VirtualScroller } from './virtual-scroll';
export type { VirtualScrollConfig, VirtualScrollResult } from './virtual-scroll';

export { ColumnVirtualizer } from './column-virtualizer';
export type { ColumnVirtualConfig, ColumnVirtualResult } from './column-virtualizer';

export { ScrollManager } from './scroll-manager';
export type { ScrollManagerConfig } from './scroll-manager';

export { KeyboardManager } from './keyboard-manager';
export type { KeyboardManagerConfig } from './keyboard-manager';

// SSR utilities
export {
  isServer,
  isBrowser,
  safeRequestAnimationFrame,
  safeCancelAnimationFrame,
  safeResizeObserver,
  NoopRenderer,
} from './ssr';
