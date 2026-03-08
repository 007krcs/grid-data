// ─── Context Menu Plugin ───
// Provides right-click context menus for grid cells and headers.
// Supports custom menu items, built-in defaults, and runtime registration.

import type { GridPlugin, PluginContext, ColumnState } from '@gridstorm/core';
import { getValueFromData } from '@gridstorm/core';
import type { ContextMenuPluginOptions, ContextMenuItem, MenuItemParams } from './types';
import { getDefaultItems } from './default-items';

export function ContextMenuPlugin(options: ContextMenuPluginOptions = {}): GridPlugin {
  const {
    menuItems: userItems,
    hideDefaultItems = false,
    suppressContextMenu = false,
  } = options;

  return {
    id: 'context-menu',
    name: 'Context Menu',
    version: '0.1.0',

    install(ctx: PluginContext) {
      if (suppressContextMenu) return;

      // Runtime-registered items from other plugins
      const registeredItems: ContextMenuItem[] = [];
      let menuElement: HTMLElement | null = null;

      // ── Register contextMenu:registerItem command ──
      const unregRegister = ctx.commandBus.registerHandler(
        'contextMenu:registerItem',
        (payload: { item: ContextMenuItem; _position?: number }) => {
          registeredItems.push(payload.item);
        },
      );

      // ── Show menu command ──
      const unregShow = ctx.commandBus.registerHandler(
        'contextMenu:show',
        (payload: { x: number; y: number; node: any; colId: string | null; value: any }) => {
          hideMenu();

          const state = ctx.store.getState();
          const column = payload.colId
            ? state.columns.find((c: ColumnState) => c.colId === payload.colId) ?? null
            : null;

          const params: MenuItemParams = {
            node: payload.node,
            colId: payload.colId,
            value: payload.value,
            api: ctx.api,
            column,
          };

          // Build item list
          let items: ContextMenuItem[] = [];
          if (!hideDefaultItems) {
            items.push(...getDefaultItems());
          }
          if (userItems) {
            const custom = typeof userItems === 'function' ? userItems(params) : userItems;
            items.push(...custom);
          }
          items.push(...registeredItems);

          // Filter visible items
          items = items.filter((item) => {
            if (item.visible === false) return false;
            if (typeof item.visible === 'function') return item.visible(params);
            return true;
          });

          if (items.length === 0) return;

          // Create DOM menu
          menuElement = document.createElement('div');
          menuElement.className = 'gs-context-menu';
          menuElement.style.cssText = `
            position:fixed;left:${payload.x}px;top:${payload.y}px;z-index:9999;
            background:var(--gs-color-bg-primary,#fff);border:1px solid var(--gs-color-border,#e0e0e0);
            border-radius:4px;padding:4px 0;min-width:180px;box-shadow:0 4px 12px rgba(0,0,0,0.15);
            font-size:13px;
          `;

          for (const item of items) {
            if (item.separator) {
              const sep = document.createElement('div');
              sep.style.cssText = 'height:1px;background:var(--gs-color-border,#e0e0e0);margin:4px 0;';
              menuElement.appendChild(sep);
              continue;
            }

            const isDisabled = typeof item.disabled === 'function' ? item.disabled(params) : item.disabled;

            const btn = document.createElement('button');
            btn.className = `gs-context-menu-item ${item.cssClass ?? ''} ${isDisabled ? 'disabled' : ''}`;
            btn.style.cssText = `
              display:flex;align-items:center;gap:8px;width:100%;border:none;background:none;
              padding:6px 12px;cursor:${isDisabled ? 'default' : 'pointer'};text-align:left;
              color:${isDisabled ? '#999' : 'inherit'};font-size:13px;
            `;
            btn.textContent = item.label;

            if (item.shortcut) {
              const shortcutEl = document.createElement('span');
              shortcutEl.style.cssText = 'margin-left:auto;opacity:0.5;font-size:11px;';
              shortcutEl.textContent = item.shortcut;
              btn.appendChild(shortcutEl);
            }

            if (!isDisabled && item.action) {
              btn.addEventListener('click', () => {
                item.action!(params);
                hideMenu();
              });
            }

            menuElement.appendChild(btn);
          }

          document.body.appendChild(menuElement);

          // Close handlers
          const onClickOutside = (e: MouseEvent) => {
            if (!menuElement?.contains(e.target as Node)) {
              hideMenu();
            }
          };
          const onEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') hideMenu();
          };

          setTimeout(() => {
            document.addEventListener('click', onClickOutside);
            document.addEventListener('keydown', onEscape);
          }, 0);

          // Store cleanup references
          (menuElement as any).__cleanup = () => {
            document.removeEventListener('click', onClickOutside);
            document.removeEventListener('keydown', onEscape);
          };

          ctx.eventBus.emit('contextMenu:opened', {
            node: payload.node,
            colId: payload.colId,
            x: payload.x,
            y: payload.y,
          });
        },
      );

      // ── Hide menu command ──
      const unregHide = ctx.commandBus.registerHandler('contextMenu:hide', () => {
        hideMenu();
      });

      function hideMenu() {
        if (menuElement) {
          (menuElement as any).__cleanup?.();
          menuElement.remove();
          menuElement = null;
          ctx.eventBus.emit('contextMenu:closed', {});
        }
      }

      // ── Listen for right-click on grid ──
      const onContextMenu = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const cellEl = target.closest<HTMLElement>('.gs-cell');
        const rowEl = target.closest<HTMLElement>('.gs-row');

        if (!cellEl && !rowEl) return;

        e.preventDefault();

        const rowId = rowEl?.getAttribute('data-row-id');
        const colId = cellEl?.getAttribute('data-col-id') ?? null;
        const state = ctx.store.getState();
        const node = rowId ? state.rowNodes.get(rowId) ?? null : null;

        let value: any;
        if (node && colId) {
          const col = state.columns.find((c: ColumnState) => c.colId === colId);
          value = col ? getValueFromData(node.data, col.field) : undefined;
        }

        ctx.commandBus.dispatch('contextMenu:show', {
          x: e.clientX,
          y: e.clientY,
          node,
          colId,
          value,
        });
      };

      // Attach on grid ready
      let rootEl: HTMLElement | null = null;
      const unsubReady = ctx.eventBus.on('grid:ready', () => {
        requestAnimationFrame(() => {
          rootEl = document.querySelector('.gs-root');
          rootEl?.addEventListener('contextmenu', onContextMenu);
        });
      });

      return () => {
        unregRegister();
        unregShow();
        unregHide();
        unsubReady();
        hideMenu();
        rootEl?.removeEventListener('contextmenu', onContextMenu);
      };
    },
  };
}
