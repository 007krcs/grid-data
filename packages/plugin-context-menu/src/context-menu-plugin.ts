// ─── Context Menu Plugin ───
// Provides right-click context menus for grid cells and headers.
// Supports custom menu items, built-in defaults, icons, submenus,
// keyboard navigation, and runtime registration.

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
      if (suppressContextMenu) return () => {};

      // Runtime-registered items from other plugins
      const registeredItems: ContextMenuItem[] = [];
      let menuElement: HTMLElement | null = null;
      let activeSubMenu: HTMLElement | null = null;
      let subMenuTimer: ReturnType<typeof setTimeout> | null = null;

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
            dispatch: (command: string, cmdPayload?: any) => {
              ctx.commandBus.dispatch(command, cmdPayload);
            },
          };

          // Build item list
          let items: ContextMenuItem[] = [];
          if (!hideDefaultItems) {
            items.push(...getDefaultItems(params));
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

          // Remove trailing/leading/consecutive separators
          items = cleanSeparators(items);

          if (items.length === 0) return;

          // Create DOM menu
          menuElement = buildMenuElement(items, params, payload.x, payload.y);
          document.body.appendChild(menuElement);

          // Position within viewport bounds
          clampMenuToViewport(menuElement, payload.x, payload.y);

          // Focus first item for keyboard nav
          const firstItem = menuElement.querySelector<HTMLElement>(
            '.gs-context-menu-item:not(.gs-context-menu-item--disabled)',
          );
          firstItem?.focus();

          // Close handlers
          const onClickOutside = (e: MouseEvent) => {
            if (
              !menuElement?.contains(e.target as Node) &&
              !activeSubMenu?.contains(e.target as Node)
            ) {
              hideMenu();
            }
          };

          setTimeout(() => {
            document.addEventListener('click', onClickOutside);
          }, 0);

          // Store cleanup references
          (menuElement as any).__cleanup = () => {
            document.removeEventListener('click', onClickOutside);
          };

          ctx.eventBus.emit('contextMenu:opened', {
            node: payload.node,
            colId: payload.colId,
            x: payload.x,
            y: payload.y,
          });
        },
      );

      // ── Build a menu DOM element from items ──
      function buildMenuElement(
        items: ContextMenuItem[],
        params: MenuItemParams,
        x: number,
        y: number,
        isSubMenu = false,
      ): HTMLElement {
        const menu = document.createElement('div');
        menu.className = `gs-context-menu${isSubMenu ? ' gs-context-menu--sub' : ''}`;
        menu.setAttribute('role', 'menu');
        menu.style.cssText = `
          position:fixed;left:${x}px;top:${y}px;z-index:${isSubMenu ? 10000 : 9999};
          background:var(--gs-color-popup-bg,#fff);
          border:1px solid var(--gs-color-popup-border,#e2e8f0);
          border-radius:6px;padding:4px 0;min-width:200px;
          box-shadow:0 4px 16px var(--gs-color-popup-shadow,rgba(0,0,0,0.12));
          font-size:13px;font-family:var(--gs-font-family,inherit);
          outline:none;
        `;

        // Keyboard navigation on the menu container
        menu.addEventListener('keydown', (e) => {
          handleMenuKeyboard(e, menu, params);
        });

        for (const item of items) {
          if (item.separator) {
            const sep = document.createElement('div');
            sep.className = 'gs-context-menu-separator';
            sep.setAttribute('role', 'separator');
            sep.style.cssText =
              'height:1px;background:var(--gs-color-border,#e2e8f0);margin:4px 8px;';
            menu.appendChild(sep);
            continue;
          }

          const isDisabled =
            typeof item.disabled === 'function' ? item.disabled(params) : !!item.disabled;

          const btn = document.createElement('button');
          btn.className = `gs-context-menu-item${isDisabled ? ' gs-context-menu-item--disabled' : ''}${item.cssClass ? ` ${item.cssClass}` : ''}`;
          btn.setAttribute('role', 'menuitem');
          btn.setAttribute('tabindex', '-1');
          if (isDisabled) btn.setAttribute('aria-disabled', 'true');
          btn.style.cssText = `
            display:flex;align-items:center;gap:8px;width:100%;border:none;
            background:none;padding:6px 12px;cursor:${isDisabled ? 'default' : 'pointer'};
            text-align:left;color:${isDisabled ? 'var(--gs-color-muted,#94a3b8)' : 'var(--gs-color-foreground,inherit)'};
            font-size:13px;font-family:inherit;outline:none;
            border-radius:0;
          `;

          // Icon
          const iconSpan = document.createElement('span');
          iconSpan.className = 'gs-menu-icon';
          iconSpan.style.cssText =
            'width:16px;text-align:center;flex-shrink:0;font-size:14px;line-height:1;';
          iconSpan.textContent = item.icon ?? '';
          btn.appendChild(iconSpan);

          // Label
          const labelSpan = document.createElement('span');
          labelSpan.className = 'gs-menu-label';
          labelSpan.style.cssText =
            'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
          labelSpan.textContent = item.label;
          btn.appendChild(labelSpan);

          // Shortcut or submenu indicator
          if (item.subMenu && item.subMenu.length > 0) {
            const arrow = document.createElement('span');
            arrow.className = 'gs-menu-arrow';
            arrow.style.cssText = 'margin-left:auto;opacity:0.5;font-size:10px;';
            arrow.textContent = '▸';
            btn.appendChild(arrow);
          } else if (item.shortcut) {
            const shortcutEl = document.createElement('span');
            shortcutEl.className = 'gs-menu-shortcut';
            shortcutEl.style.cssText = 'margin-left:auto;opacity:0.4;font-size:11px;';
            shortcutEl.textContent = item.shortcut;
            btn.appendChild(shortcutEl);
          }

          // Click action
          if (!isDisabled && item.action && !item.subMenu) {
            btn.addEventListener('click', () => {
              item.action!(params);
              hideMenu();
            });
          }

          // Submenu hover
          if (item.subMenu && item.subMenu.length > 0 && !isDisabled) {
            btn.addEventListener('mouseenter', () => {
              if (subMenuTimer) clearTimeout(subMenuTimer);
              closeActiveSubMenu();

              const rect = btn.getBoundingClientRect();
              const subItems = item.subMenu!.filter((si) => {
                if (si.visible === false) return false;
                if (typeof si.visible === 'function') return si.visible(params);
                return true;
              });
              if (subItems.length === 0) return;

              activeSubMenu = buildMenuElement(subItems, params, rect.right - 4, rect.top, true);
              document.body.appendChild(activeSubMenu);
              clampMenuToViewport(activeSubMenu, rect.right - 4, rect.top);
            });

            btn.addEventListener('mouseleave', (e) => {
              const related = (e as MouseEvent).relatedTarget as Node | null;
              if (activeSubMenu?.contains(related)) return;
              subMenuTimer = setTimeout(() => {
                closeActiveSubMenu();
              }, 200);
            });
          }

          // Non-submenu items close submenu on hover
          if (!item.subMenu) {
            btn.addEventListener('mouseenter', () => {
              if (subMenuTimer) clearTimeout(subMenuTimer);
              subMenuTimer = setTimeout(() => {
                closeActiveSubMenu();
              }, 100);
            });
          }

          menu.appendChild(btn);
        }

        // Keep submenu alive when mouse enters it
        if (isSubMenu) {
          menu.addEventListener('mouseenter', () => {
            if (subMenuTimer) clearTimeout(subMenuTimer);
          });
          menu.addEventListener('mouseleave', () => {
            subMenuTimer = setTimeout(() => {
              closeActiveSubMenu();
            }, 200);
          });
        }

        return menu;
      }

      // ── Keyboard navigation ──
      function handleMenuKeyboard(
        e: KeyboardEvent,
        menu: HTMLElement,
        _params: MenuItemParams,
      ) {
        const items = Array.from(
          menu.querySelectorAll<HTMLElement>(
            '.gs-context-menu-item:not(.gs-context-menu-item--disabled)',
          ),
        );
        const focused = document.activeElement as HTMLElement;
        const idx = items.indexOf(focused);

        switch (e.key) {
          case 'ArrowDown': {
            e.preventDefault();
            const next = idx < items.length - 1 ? idx + 1 : 0;
            items[next]?.focus();
            break;
          }
          case 'ArrowUp': {
            e.preventDefault();
            const prev = idx > 0 ? idx - 1 : items.length - 1;
            items[prev]?.focus();
            break;
          }
          case 'Home': {
            e.preventDefault();
            items[0]?.focus();
            break;
          }
          case 'End': {
            e.preventDefault();
            items[items.length - 1]?.focus();
            break;
          }
          case 'Escape': {
            e.preventDefault();
            hideMenu();
            break;
          }
          case 'Enter':
          case ' ': {
            e.preventDefault();
            if (focused) focused.click();
            break;
          }
          case 'ArrowRight': {
            // Open submenu if focused item has one
            if (focused) {
              const mouseEnter = new MouseEvent('mouseenter', { bubbles: true });
              focused.dispatchEvent(mouseEnter);
              // Focus first item in submenu after a tick
              setTimeout(() => {
                const subItem = activeSubMenu?.querySelector<HTMLElement>(
                  '.gs-context-menu-item:not(.gs-context-menu-item--disabled)',
                );
                subItem?.focus();
              }, 50);
            }
            break;
          }
          case 'ArrowLeft': {
            // Close submenu
            closeActiveSubMenu();
            break;
          }
        }
      }

      // ── Clamp menu to viewport ──
      function clampMenuToViewport(menu: HTMLElement, x: number, y: number) {
        const rect = menu.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let finalX = x;
        let finalY = y;

        if (rect.right > vw) finalX = Math.max(0, vw - rect.width - 8);
        if (rect.bottom > vh) finalY = Math.max(0, vh - rect.height - 8);

        menu.style.left = `${finalX}px`;
        menu.style.top = `${finalY}px`;
      }

      // ── Remove consecutive / trailing / leading separators ──
      function cleanSeparators(items: ContextMenuItem[]): ContextMenuItem[] {
        const result: ContextMenuItem[] = [];
        for (const item of items) {
          if (item.separator) {
            // Don't add if result is empty or last item is also separator
            if (result.length === 0 || result[result.length - 1]?.separator) continue;
            result.push(item);
          } else {
            result.push(item);
          }
        }
        // Remove trailing separator
        while (result.length > 0 && result[result.length - 1]?.separator) {
          result.pop();
        }
        return result;
      }

      function closeActiveSubMenu() {
        if (activeSubMenu) {
          activeSubMenu.remove();
          activeSubMenu = null;
        }
      }

      // ── Hide menu command ──
      const unregHide = ctx.commandBus.registerHandler('contextMenu:hide', () => {
        hideMenu();
      });

      function hideMenu() {
        closeActiveSubMenu();
        if (subMenuTimer) {
          clearTimeout(subMenuTimer);
          subMenuTimer = null;
        }
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
          // Prefer the root element stored by the DOM renderer on the engine.
          // Falls back to scanning `.gs-root` elements (for single-grid pages).
          const engineRootEl = (ctx.api as any).__gsRootEl ?? (ctx as any).__gsRootEl;
          if (engineRootEl) {
            rootEl = engineRootEl;
          } else {
            const containers = document.querySelectorAll<HTMLElement>('.gs-root');
            rootEl = containers.length === 1
              ? containers[0]!
              : (ctx as any).rootElement ?? containers[0] ?? null;
          }
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
