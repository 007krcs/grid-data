// ─── Accessibility Plugin ───
// WCAG 2.1 AA compliance for GridStorm.

import type { GridPlugin, PluginContext } from '@gridstorm/core';
import type { A11yPluginOptions, A11yState, AnnouncementContext } from './types';
import { createAnnouncer } from './announcer';
import { createFocusManager } from './focus-manager';
import { createSkipNav } from './skip-nav';
import { createHighContrastSupport } from './high-contrast';

const STATE_KEY = 'a11y';

export function A11yPlugin(options: A11yPluginOptions = {}): GridPlugin {
  const enableAnnouncements = options.announcements !== false;
  const enableSkipNav = options.skipNav !== false;
  const enableHighContrast = options.highContrast !== false;

  return {
    id: 'a11y',
    name: 'Accessibility (WCAG 2.1 AA)',
    version: '0.1.2',
    dependencies: [],

    install(ctx: PluginContext) {
      // Register plugin state
      ctx.registerState<A11yState>(STATE_KEY, {
        announcementsEnabled: enableAnnouncements,
        highContrastActive: false,
        lastAnnouncement: '',
        focusMode: 'navigate',
      });

      // Access root element (set by DOM renderer)
      const rootEl = (ctx.api as any).__gsRootEl as HTMLElement | undefined;
      if (!rootEl) {
        // If no DOM renderer attached yet, skip DOM operations
        return () => {};
      }

      // Initialize sub-modules
      const announcer = enableAnnouncements ? createAnnouncer(rootEl, options) : null;
      const focusManager = createFocusManager(ctx, rootEl);
      const skipNav = enableSkipNav ? createSkipNav(ctx, rootEl) : null;
      const highContrast = enableHighContrast ? createHighContrastSupport(rootEl) : null;

      // Helper to announce
      function doAnnounce(type: string, context: Record<string, unknown>): void {
        if (!announcer) return;
        const announcementContext: AnnouncementContext = { type: type as any, ...context };
        announcer.announce(type as any, announcementContext);
        ctx.setState<A11yState>(STATE_KEY, (prev: A11yState) => ({
          ...prev,
          lastAnnouncement: announcer.getLastAnnouncement(),
        }));
      }

      // ── Event Subscriptions ──

      // Sort changes
      const unsubSort = ctx.eventBus.on('column:sort:changed' as any, (payload: any) => {
        const model = payload?.sortModel ?? payload;
        if (Array.isArray(model) && model.length > 0) {
          const item = model[0];
          const col = ctx.store.getState().columns.find((c) => c.colId === item.colId);
          doAnnounce('sort-changed', {
            columnName: col?.headerName ?? item.colId,
            direction: item.sort === 'asc' ? 'ascending' : 'descending',
          });
        }
      });

      // Filter changes
      const unsubFilter = ctx.eventBus.on('filter:changed' as any, (payload: any) => {
        const filterModel = payload?.filterModel ?? payload;
        const keys = filterModel ? Object.keys(filterModel) : [];
        doAnnounce('filter-changed', {
          active: keys.length > 0,
          columnName: keys.length === 1 ? keys[0] : undefined,
          filterCount: keys.length,
        });
      });

      // Selection changes
      const unsubSelection = ctx.eventBus.on('selection:changed' as any, (payload: any) => {
        const nodes = payload?.selectedNodes ?? [];
        doAnnounce('selection-changed', { count: nodes.length });
      });

      // Cell editing
      const unsubEditStart = ctx.eventBus.on('cell:editingStarted' as any, (payload: any) => {
        ctx.setState<A11yState>(STATE_KEY, (prev: A11yState) => ({ ...prev, focusMode: 'edit' }));
        focusManager.setFocusMode('edit');
        const col = ctx.store.getState().columns.find((c) => c.colId === payload?.colId || c.field === payload?.colId);
        doAnnounce('cell-edit-started', {
          columnName: col?.headerName ?? payload?.colId ?? 'unknown',
          rowIndex: payload?.rowIndex ?? 0,
        });
      });

      const unsubEditStop = ctx.eventBus.on('cell:editingStopped' as any, (payload: any) => {
        ctx.setState<A11yState>(STATE_KEY, (prev: A11yState) => ({ ...prev, focusMode: 'navigate' }));
        focusManager.setFocusMode('navigate');
        const col = ctx.store.getState().columns.find((c) => c.colId === payload?.colId || c.field === payload?.colId);
        doAnnounce('cell-edit-stopped', {
          columnName: col?.headerName ?? payload?.colId ?? 'unknown',
        });
      });

      // Row group expand/collapse
      const unsubGroupOpen = ctx.eventBus.on('row:groupOpened' as any, (payload: any) => {
        const node = payload?.node;
        const expanded = node?.expanded ?? payload?.expanded;
        doAnnounce(expanded ? 'row-expanded' : 'row-collapsed', {
          groupValue: node?.groupValue ?? node?.data?.toString() ?? '',
        });
      });

      // Pagination
      const unsubPage = ctx.eventBus.on('pagination:changed' as any, (payload: any) => {
        doAnnounce('page-changed', {
          page: (payload?.currentPage ?? 0) + 1,
          totalPages: payload?.totalPages ?? 1,
        });
      });

      // Data loaded
      const unsubDataChanged = ctx.eventBus.on('rowData:changed' as any, (payload: any) => {
        const count = payload?.rowData?.length ?? ctx.store.getState().displayedRowIds.length;
        doAnnounce('data-loaded', { rowCount: count });
      });

      // Enhance headers on initial render and after header re-renders
      focusManager.enhanceHeaders();
      const unsubHeaderRender = ctx.eventBus.on('dom:headerRendered' as any, () => {
        focusManager.enhanceHeaders();
      });

      // Update high contrast state
      if (highContrast) {
        ctx.setState<A11yState>(STATE_KEY, (prev: A11yState) => ({
          ...prev,
          highContrastActive: highContrast.isActive(),
        }));
      }

      // ── Commands ──

      const unregAnnounce = ctx.commandBus.registerHandler(
        'a11y:announce' as any,
        (payload: { message: string }) => {
          if (announcer) {
            announcer.announceRaw(payload.message);
          }
        },
      );

      const unregSetMode = ctx.commandBus.registerHandler(
        'a11y:setMode' as any,
        (payload: { mode: 'navigate' | 'edit' }) => {
          ctx.setState<A11yState>(STATE_KEY, (prev: A11yState) => ({
            ...prev,
            focusMode: payload.mode,
          }));
          focusManager.setFocusMode(payload.mode);
        },
      );

      const unregToggleHC = ctx.commandBus.registerHandler(
        'a11y:toggleHighContrast' as any,
        (_payload: unknown) => {
          ctx.setState<A11yState>(STATE_KEY, (prev: A11yState) => ({
            ...prev,
            highContrastActive: !prev.highContrastActive,
          }));
        },
      );

      // ── Disposer ──

      return () => {
        unsubSort();
        unsubFilter();
        unsubSelection();
        unsubEditStart();
        unsubEditStop();
        unsubGroupOpen();
        unsubPage();
        unsubDataChanged();
        unsubHeaderRender();
        unregAnnounce();
        unregSetMode();
        unregToggleHC();
        announcer?.destroy();
        focusManager.destroy();
        skipNav?.destroy();
        highContrast?.destroy();
      };
    },
  };
}
