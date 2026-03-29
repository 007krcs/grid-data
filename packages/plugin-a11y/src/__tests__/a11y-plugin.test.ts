import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { A11yPlugin } from '../a11y-plugin';
import type { A11yState } from '../types';

// Mock PluginContext factory
function createMockContext() {
  const eventHandlers = new Map<string, Set<Function>>();
  const commandHandlers = new Map<string, Function>();
  const pluginState = new Map<string, any>();

  // Create a mock DOM
  const root = document.createElement('div');
  root.setAttribute('role', 'grid');

  // Live region
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'gs-live-region';
  root.appendChild(liveRegion);

  // Header with column headers
  const header = document.createElement('div');
  const headerCell = document.createElement('div');
  headerCell.setAttribute('role', 'columnheader');
  headerCell.setAttribute('data-col-id', 'name');
  header.appendChild(headerCell);
  root.appendChild(header);

  // A cell
  const row = document.createElement('div');
  row.setAttribute('role', 'row');
  const cell = document.createElement('div');
  cell.setAttribute('role', 'gridcell');
  row.appendChild(cell);
  root.appendChild(row);

  document.body.appendChild(root);

  const ctx: any = {
    api: {
      __gsRootEl: root,
      getGridOption: (key: string) => {
        if (key === 'ariaLabel') return 'Test Grid';
        return undefined;
      },
    },
    store: {
      getState: () => ({
        columns: [
          { colId: 'name', field: 'name', headerName: 'Name', sort: null, originalDef: { sortable: true } },
          { colId: 'value', field: 'value', headerName: 'Value', sort: null, originalDef: { sortable: true } },
        ],
        displayedRowIds: ['row-0', 'row-1'],
        selection: { selectedRowIds: new Set(), rangeSelections: [] },
      }),
      select: vi.fn(() => () => {}),
      subscribe: vi.fn(() => () => {}),
    },
    eventBus: {
      on(event: string, handler: Function) {
        if (!eventHandlers.has(event)) eventHandlers.set(event, new Set());
        eventHandlers.get(event)!.add(handler);
        return () => eventHandlers.get(event)?.delete(handler);
      },
      emit(event: string, payload: any) {
        for (const handler of eventHandlers.get(event) ?? []) {
          handler(payload);
        }
      },
    },
    commandBus: {
      dispatch(command: string, payload: any) {
        commandHandlers.get(command)?.(payload);
      },
      registerHandler(command: string, handler: Function) {
        commandHandlers.set(command, handler);
        return () => commandHandlers.delete(command);
      },
    },
    registerState<S>(key: string, initial: S) {
      pluginState.set(key, initial);
    },
    getState<S>(key: string): S {
      return pluginState.get(key);
    },
    setState<S>(key: string, updater: (prev: S) => S) {
      const prev = pluginState.get(key);
      pluginState.set(key, updater(prev));
    },
  };

  return {
    ctx,
    root,
    liveRegion,
    eventHandlers,
    commandHandlers,
    pluginState,
    cleanup() {
      root.remove();
    },
  };
}

describe('A11yPlugin', () => {
  let mock: ReturnType<typeof createMockContext>;
  let dispose: (() => void) | undefined;

  beforeEach(() => {
    mock = createMockContext();
  });

  afterEach(() => {
    dispose?.();
    mock.cleanup();
    vi.restoreAllMocks();
  });

  it('creates plugin with correct metadata', () => {
    const plugin = A11yPlugin();
    expect(plugin.id).toBe('a11y');
    expect(plugin.name).toBe('Accessibility (WCAG 2.1 AA)');
    expect(plugin.version).toBe('0.1.2');
    expect(plugin.dependencies).toEqual([]);
  });

  it('installs and registers state', () => {
    const plugin = A11yPlugin();
    dispose = plugin.install(mock.ctx) as () => void;
    const state = mock.pluginState.get('a11y') as A11yState;
    expect(state).toBeDefined();
    expect(state.announcementsEnabled).toBe(true);
    expect(state.focusMode).toBe('navigate');
  });

  it('returns noop disposer when no root element', () => {
    const noRootCtx = { ...mock.ctx, api: {} };
    const plugin = A11yPlugin();
    dispose = plugin.install(noRootCtx) as () => void;
    expect(typeof dispose).toBe('function');
    dispose();
    dispose = undefined;
  });

  it('announces sort changes', async () => {
    const plugin = A11yPlugin({ announceDebounce: 0 });
    dispose = plugin.install(mock.ctx) as () => void;

    mock.ctx.eventBus.emit('column:sort:changed', {
      sortModel: [{ colId: 'name', sort: 'asc' }],
    });

    // Wait for debounce + rAF
    await new Promise((r) => setTimeout(r, 50));
    expect(mock.liveRegion.textContent).toBe('Sorted by Name ascending');
  });

  it('announces filter changes', async () => {
    const plugin = A11yPlugin({ announceDebounce: 0 });
    dispose = plugin.install(mock.ctx) as () => void;

    mock.ctx.eventBus.emit('filter:changed', {
      filterModel: { name: { type: 'contains', filter: 'test' } },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(mock.liveRegion.textContent).toBe('Filter applied on Name');
  });

  it('announces selection changes', async () => {
    const plugin = A11yPlugin({ announceDebounce: 0 });
    dispose = plugin.install(mock.ctx) as () => void;

    mock.ctx.eventBus.emit('selection:changed', {
      selectedNodes: [{}, {}, {}],
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(mock.liveRegion.textContent).toBe('3 rows selected');
  });

  it('announces cell edit start and sets focus mode', async () => {
    const plugin = A11yPlugin({ announceDebounce: 0 });
    dispose = plugin.install(mock.ctx) as () => void;

    mock.ctx.eventBus.emit('cell:editingStarted', {
      colId: 'name',
      rowIndex: 2,
    });

    await new Promise((r) => setTimeout(r, 50));
    const state = mock.pluginState.get('a11y') as A11yState;
    expect(state.focusMode).toBe('edit');
    expect(mock.liveRegion.textContent).toBe('Editing cell in column Name, row 2');
  });

  it('announces cell edit stop and restores focus mode', async () => {
    const plugin = A11yPlugin({ announceDebounce: 0 });
    dispose = plugin.install(mock.ctx) as () => void;

    mock.ctx.eventBus.emit('cell:editingStopped', { colId: 'name' });

    await new Promise((r) => setTimeout(r, 50));
    const state = mock.pluginState.get('a11y') as A11yState;
    expect(state.focusMode).toBe('navigate');
  });

  it('announces row data loaded', async () => {
    const plugin = A11yPlugin({ announceDebounce: 0 });
    dispose = plugin.install(mock.ctx) as () => void;

    mock.ctx.eventBus.emit('rowData:changed', {
      rowData: [1, 2, 3, 4, 5],
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(mock.liveRegion.textContent).toBe('5 rows loaded');
  });

  it('handles custom announcement formatter', async () => {
    const plugin = A11yPlugin({
      announceDebounce: 0,
      formatAnnouncement: (type, ctx) => {
        if (type === 'sort-changed') return `Custom: sorted ${ctx.columnName}`;
        return null;
      },
    });
    dispose = plugin.install(mock.ctx) as () => void;

    mock.ctx.eventBus.emit('column:sort:changed', {
      sortModel: [{ colId: 'name', sort: 'asc' }],
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(mock.liveRegion.textContent).toBe('Custom: sorted Name');
  });

  it('handles a11y:announce command', async () => {
    const plugin = A11yPlugin({ announceDebounce: 0 });
    dispose = plugin.install(mock.ctx) as () => void;

    mock.ctx.commandBus.dispatch('a11y:announce', { message: 'Custom message' });

    await new Promise((r) => setTimeout(r, 50));
    expect(mock.liveRegion.textContent).toBe('Custom message');
  });

  it('handles a11y:setMode command', () => {
    const plugin = A11yPlugin();
    dispose = plugin.install(mock.ctx) as () => void;

    mock.ctx.commandBus.dispatch('a11y:setMode', { mode: 'edit' });

    const state = mock.pluginState.get('a11y') as A11yState;
    expect(state.focusMode).toBe('edit');
  });

  it('handles a11y:toggleHighContrast command', () => {
    const plugin = A11yPlugin();
    dispose = plugin.install(mock.ctx) as () => void;

    mock.ctx.commandBus.dispatch('a11y:toggleHighContrast', {});

    const state = mock.pluginState.get('a11y') as A11yState;
    expect(state.highContrastActive).toBe(true);
  });

  it('creates skip navigation links', () => {
    const plugin = A11yPlugin();
    dispose = plugin.install(mock.ctx) as () => void;

    const skipNavLinks = document.querySelectorAll('[data-a11y-skip-nav] a');
    expect(skipNavLinks.length).toBe(2);
    expect(skipNavLinks[0].textContent).toBe('Skip to grid content');
    expect(skipNavLinks[1].textContent).toBe('Skip past grid');
  });

  it('disables skip nav when option is false', () => {
    const plugin = A11yPlugin({ skipNav: false });
    dispose = plugin.install(mock.ctx) as () => void;

    const skipNavLinks = document.querySelectorAll('[data-a11y-skip-nav] a');
    expect(skipNavLinks.length).toBe(0);
  });

  it('injects high contrast CSS', () => {
    const plugin = A11yPlugin();
    dispose = plugin.install(mock.ctx) as () => void;

    const styleEl = mock.root.querySelector('[data-a11y-high-contrast]');
    expect(styleEl).not.toBeNull();
    expect(styleEl?.textContent).toContain('prefers-contrast');
    expect(styleEl?.textContent).toContain('forced-colors');
  });

  it('does not inject high contrast CSS when disabled', () => {
    const plugin = A11yPlugin({ highContrast: false });
    dispose = plugin.install(mock.ctx) as () => void;

    const styleEl = mock.root.querySelector('[data-a11y-high-contrast]');
    expect(styleEl).toBeNull();
  });

  it('enhances header cells with tabindex', () => {
    const plugin = A11yPlugin();
    dispose = plugin.install(mock.ctx) as () => void;

    const headerCell = mock.root.querySelector('[role="columnheader"]');
    expect(headerCell?.getAttribute('tabindex')).toBe('-1');
  });

  it('disables announcements when option is false', async () => {
    const plugin = A11yPlugin({ announcements: false, announceDebounce: 0 });
    dispose = plugin.install(mock.ctx) as () => void;

    mock.ctx.eventBus.emit('column:sort:changed', {
      sortModel: [{ colId: 'name', sort: 'asc' }],
    });

    await new Promise((r) => setTimeout(r, 50));
    // Live region should remain empty since announcements are disabled
    expect(mock.liveRegion.textContent).toBe('');
  });

  it('cleans up on dispose', () => {
    const plugin = A11yPlugin();
    dispose = plugin.install(mock.ctx) as () => void;

    // Verify skip nav exists
    expect(document.querySelector('[data-a11y-skip-nav]')).not.toBeNull();

    dispose();
    dispose = undefined;

    // Verify skip nav removed
    expect(document.querySelector('[data-a11y-skip-nav]')).toBeNull();
    // Verify high contrast style removed
    expect(mock.root.querySelector('[data-a11y-high-contrast]')).toBeNull();
  });

  it('announces page changes', async () => {
    const plugin = A11yPlugin({ announceDebounce: 0 });
    dispose = plugin.install(mock.ctx) as () => void;

    mock.ctx.eventBus.emit('pagination:changed', {
      currentPage: 2,
      totalPages: 10,
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(mock.liveRegion.textContent).toBe('Page 3 of 10');
  });

  it('announces group expand/collapse', async () => {
    const plugin = A11yPlugin({ announceDebounce: 0 });
    dispose = plugin.install(mock.ctx) as () => void;

    mock.ctx.eventBus.emit('row:groupOpened', {
      node: { expanded: true, groupValue: 'Category A' },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(mock.liveRegion.textContent).toBe('Group Category A expanded');
  });
});
