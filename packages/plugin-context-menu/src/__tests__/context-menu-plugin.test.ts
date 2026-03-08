import { describe, it, expect, vi } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { ContextMenuPlugin } from '../context-menu-plugin';
import { getDefaultItems } from '../default-items';

function createMenuGrid(pluginOptions = {}) {
  return createGrid({
    columns: [
      { field: 'name', headerName: 'Name' },
      { field: 'age', headerName: 'Age' },
      { field: 'city', headerName: 'City' },
      { field: 'score', headerName: 'Score' },
    ],
    rowData: [{ name: 'Alice', age: 30, city: 'NYC', score: 90 }],
    plugins: [ContextMenuPlugin(pluginOptions)],
  });
}

describe('ContextMenuPlugin', () => {
  it('creates grid with context menu plugin successfully', () => {
    const engine = createMenuGrid();
    expect(engine.api).toBeDefined();
    expect(engine.store).toBeDefined();
    expect(engine.api.getDisplayedRowCount()).toBe(1);
    engine.destroy();
  });

  it('suppressContextMenu prevents command registration', () => {
    const engine = createMenuGrid({ suppressContextMenu: true });

    // When suppressContextMenu is true, install returns early with no command handlers.
    // Dispatching contextMenu:show should be a no-op (no handler registered).
    engine.commandBus.dispatch('contextMenu:show', {
      x: 100,
      y: 100,
      node: null,
      colId: null,
      value: null,
    });

    // No menu element should exist in the DOM
    const menuEl = document.querySelector('.gs-context-menu');
    expect(menuEl).toBeNull();
    engine.destroy();
  });

  it('contextMenu:show creates a menu element in the DOM', () => {
    const engine = createMenuGrid();

    engine.commandBus.dispatch('contextMenu:show', {
      x: 100,
      y: 200,
      node: null,
      colId: null,
      value: null,
    });

    const menuEl = document.querySelector('.gs-context-menu');
    expect(menuEl).not.toBeNull();
    expect(menuEl).toBeInstanceOf(HTMLElement);

    // Clean up: hide menu before destroy
    engine.commandBus.dispatch('contextMenu:hide', {});
    engine.destroy();
  });

  it('contextMenu:hide removes menu from DOM', () => {
    const engine = createMenuGrid();

    // Show menu first
    engine.commandBus.dispatch('contextMenu:show', {
      x: 100,
      y: 100,
      node: null,
      colId: null,
      value: null,
    });
    expect(document.querySelector('.gs-context-menu')).not.toBeNull();

    // Hide menu
    engine.commandBus.dispatch('contextMenu:hide', {});
    expect(document.querySelector('.gs-context-menu')).toBeNull();

    engine.destroy();
  });

  it('contextMenu:show with hideDefaultItems shows no default items', () => {
    const engine = createMenuGrid({ hideDefaultItems: true });

    engine.commandBus.dispatch('contextMenu:show', {
      x: 100,
      y: 100,
      node: null,
      colId: null,
      value: null,
    });

    // With hideDefaultItems and no custom items, the menu should not be created
    // because the items array is empty after filtering
    const menuEl = document.querySelector('.gs-context-menu');
    expect(menuEl).toBeNull();

    engine.destroy();
  });

  it('contextMenu:show with default items renders menu buttons', () => {
    const engine = createMenuGrid({ hideDefaultItems: false });

    engine.commandBus.dispatch('contextMenu:show', {
      x: 100,
      y: 100,
      node: null,
      colId: null,
      value: null,
    });

    const menuEl = document.querySelector('.gs-context-menu');
    expect(menuEl).not.toBeNull();

    // Default items include 'Copy Cell Value', 'Copy Row', separator, 'Export as CSV'
    const defaultItems = getDefaultItems();
    const nonSeparatorItems = defaultItems.filter((item) => !item.separator);
    const buttons = menuEl!.querySelectorAll('button.gs-context-menu-item');
    expect(buttons.length).toBe(nonSeparatorItems.length);

    engine.commandBus.dispatch('contextMenu:hide', {});
    engine.destroy();
  });

  it('contextMenu:registerItem adds custom items to menu', () => {
    const engine = createMenuGrid({ hideDefaultItems: true });

    // Register a custom item
    engine.commandBus.dispatch('contextMenu:registerItem', {
      item: {
        id: 'custom-action',
        label: 'Custom Action',
        action: vi.fn(),
      },
    });

    // Now show the menu -- registered items should appear
    engine.commandBus.dispatch('contextMenu:show', {
      x: 100,
      y: 100,
      node: null,
      colId: null,
      value: null,
    });

    const menuEl = document.querySelector('.gs-context-menu');
    expect(menuEl).not.toBeNull();

    const buttons = menuEl!.querySelectorAll('button.gs-context-menu-item');
    expect(buttons.length).toBe(1);
    expect(buttons[0]!.textContent).toContain('Custom Action');

    engine.commandBus.dispatch('contextMenu:hide', {});
    engine.destroy();
  });

  it('contextMenu:show with custom menuItems option renders them', () => {
    const customItems = [
      { id: 'item-a', label: 'Action A', action: vi.fn() },
      { id: 'item-b', label: 'Action B', action: vi.fn() },
    ];
    const engine = createMenuGrid({ hideDefaultItems: true, menuItems: customItems });

    engine.commandBus.dispatch('contextMenu:show', {
      x: 50,
      y: 50,
      node: null,
      colId: null,
      value: null,
    });

    const menuEl = document.querySelector('.gs-context-menu');
    expect(menuEl).not.toBeNull();

    const buttons = menuEl!.querySelectorAll('button.gs-context-menu-item');
    expect(buttons.length).toBe(2);
    expect(buttons[0]!.textContent).toContain('Action A');
    expect(buttons[1]!.textContent).toContain('Action B');

    engine.commandBus.dispatch('contextMenu:hide', {});
    engine.destroy();
  });

  it('emits contextMenu:opened on show', () => {
    const engine = createMenuGrid();
    const listener = vi.fn();
    engine.eventBus.on('contextMenu:opened', listener);

    engine.commandBus.dispatch('contextMenu:show', {
      x: 100,
      y: 200,
      node: null,
      colId: 'name',
      value: 'Alice',
    });

    expect(listener).toHaveBeenCalledTimes(1);
    const payload = listener.mock.calls[0][0];
    expect(payload).toHaveProperty('x', 100);
    expect(payload).toHaveProperty('y', 200);
    expect(payload).toHaveProperty('colId', 'name');

    engine.commandBus.dispatch('contextMenu:hide', {});
    engine.destroy();
  });

  it('emits contextMenu:closed on hide', () => {
    const engine = createMenuGrid();
    const listener = vi.fn();
    engine.eventBus.on('contextMenu:closed', listener);

    // Show menu first (required for hide to emit the event)
    engine.commandBus.dispatch('contextMenu:show', {
      x: 100,
      y: 100,
      node: null,
      colId: null,
      value: null,
    });

    engine.commandBus.dispatch('contextMenu:hide', {});

    expect(listener).toHaveBeenCalledTimes(1);
    engine.destroy();
  });

  it('contextMenu:hide when no menu is open does not emit event', () => {
    const engine = createMenuGrid();
    const listener = vi.fn();
    engine.eventBus.on('contextMenu:closed', listener);

    // Hide without showing first -- should be a no-op
    engine.commandBus.dispatch('contextMenu:hide', {});

    expect(listener).not.toHaveBeenCalled();
    engine.destroy();
  });

  it('showing menu twice replaces the previous menu', () => {
    const engine = createMenuGrid();

    // Show menu first time
    engine.commandBus.dispatch('contextMenu:show', {
      x: 100,
      y: 100,
      node: null,
      colId: null,
      value: null,
    });

    // Show menu second time (should hide the first and create a new one)
    engine.commandBus.dispatch('contextMenu:show', {
      x: 200,
      y: 200,
      node: null,
      colId: null,
      value: null,
    });

    const menus = document.querySelectorAll('.gs-context-menu');
    expect(menus.length).toBe(1);

    engine.commandBus.dispatch('contextMenu:hide', {});
    engine.destroy();
  });

  it('disposer cleans up menu and unregisters commands', () => {
    const engine = createMenuGrid();

    // Show a menu
    engine.commandBus.dispatch('contextMenu:show', {
      x: 100,
      y: 100,
      node: null,
      colId: null,
      value: null,
    });
    expect(document.querySelector('.gs-context-menu')).not.toBeNull();

    // Destroy the engine (calls plugin disposers which should remove menu)
    engine.destroy();

    // Menu should be cleaned up from DOM
    expect(document.querySelector('.gs-context-menu')).toBeNull();
  });
});
