import type { PluginContext } from '@gridstorm/core';

export interface FocusManager {
  enhanceHeaders(): void;
  setFocusMode(mode: 'navigate' | 'edit'): void;
  destroy(): void;
}

export function createFocusManager(ctx: PluginContext, rootEl: HTMLElement): FocusManager {
  const headerHandlers = new Map<HTMLElement, (e: KeyboardEvent) => void>();
  let _focusMode: 'navigate' | 'edit' = 'navigate';

  function enhanceHeaders(): void {
    // Clean up old handlers
    for (const [el, handler] of headerHandlers) {
      el.removeEventListener('keydown', handler);
    }
    headerHandlers.clear();

    const headerCells = rootEl.querySelectorAll('[role="columnheader"]');
    headerCells.forEach((cell, _index) => {
      const el = cell as HTMLElement;
      if (!el.hasAttribute('tabindex')) {
        el.setAttribute('tabindex', '-1');
      }

      const handler = (e: KeyboardEvent) => {
        if (_focusMode === 'edit') return; // Skip header actions during editing
        const colId = el.getAttribute('data-col-id');
        if (!colId) return;

        if (e.key === 'Enter') {
          e.preventDefault();
          const state = ctx.store.getState();
          const col = state.columns.find((c) => c.colId === colId);
          if (col && col.originalDef.sortable !== false) {
            const currentSort = col.sort;
            const nextSort = currentSort === 'asc' ? 'desc' : currentSort === 'desc' ? null : 'asc';
            ctx.commandBus.dispatch('sort:set' as any, {
              sortModel: nextSort ? [{ colId, sort: nextSort }] : [],
            });
          }
        }
      };

      el.addEventListener('keydown', handler);
      headerHandlers.set(el, handler);
    });
  }

  return {
    enhanceHeaders,
    setFocusMode(mode: 'navigate' | 'edit') {
      _focusMode = mode;
    },
    destroy() {
      for (const [el, handler] of headerHandlers) {
        el.removeEventListener('keydown', handler);
      }
      headerHandlers.clear();
    },
  };
}
