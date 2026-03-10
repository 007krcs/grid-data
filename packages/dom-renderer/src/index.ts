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

// Renderer extensions
export type { RendererExtension, RendererContext } from './extensions/types';
export { FloatingFilterRenderer } from './extensions/floating-filter-renderer';
export type { FloatingFilterConfig } from './extensions/floating-filter-renderer';
export { PaginationRenderer } from './extensions/pagination-renderer';
export type { PaginationConfig } from './extensions/pagination-renderer';
export { SidebarRenderer } from './extensions/sidebar-renderer';
export type { SidebarConfig } from './extensions/sidebar-renderer';
