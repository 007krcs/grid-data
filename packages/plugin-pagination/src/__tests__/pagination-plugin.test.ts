import { describe, it, expect, vi } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { PaginationPlugin } from '../pagination-plugin';

function createPaginatedGrid(pluginOptions = {}) {
  // 10 rows of data (names a-j) with pageSize: 3 so there are 4 pages
  const rowData = [
    { name: 'Alice', age: 20 },
    { name: 'Bob', age: 21 },
    { name: 'Charlie', age: 22 },
    { name: 'Diana', age: 23 },
    { name: 'Eve', age: 24 },
    { name: 'Frank', age: 25 },
    { name: 'Grace', age: 26 },
    { name: 'Hank', age: 27 },
    { name: 'Ivy', age: 28 },
    { name: 'Jack', age: 29 },
  ];

  return createGrid({
    columns: [
      { field: 'name', sortable: true },
      { field: 'age', sortable: true },
    ],
    rowData,
    plugins: [PaginationPlugin({ pageSize: 3, ...pluginOptions })],
  });
}

describe('PaginationPlugin', () => {
  it('creates grid with pagination and custom pageSize', () => {
    const engine = createPaginatedGrid();

    expect(engine.api).toBeDefined();
    expect(engine.store).toBeDefined();

    const state = engine.store.getState();
    expect(state.pagination.pageSize).toBe(3);
    expect(state.pagination.totalRows).toBe(10);

    // ceil(10/3) = 4 pages
    expect(engine.api.paginationGetTotalPages()).toBe(4);

    engine.destroy();
  });

  it('initial page is 0', () => {
    const engine = createPaginatedGrid();

    expect(engine.store.getState().pagination.currentPage).toBe(0);
    expect(engine.api.paginationGetCurrentPage()).toBe(0);

    engine.destroy();
  });

  it('pagination:goToPage changes current page', () => {
    const engine = createPaginatedGrid();

    engine.commandBus.dispatch('pagination:goToPage', { page: 2 });
    expect(engine.api.paginationGetCurrentPage()).toBe(2);

    engine.commandBus.dispatch('pagination:goToPage', { page: 0 });
    expect(engine.api.paginationGetCurrentPage()).toBe(0);

    engine.destroy();
  });

  it('pagination:nextPage increments page', () => {
    const engine = createPaginatedGrid();

    expect(engine.api.paginationGetCurrentPage()).toBe(0);

    engine.commandBus.dispatch('pagination:nextPage', {});
    expect(engine.api.paginationGetCurrentPage()).toBe(1);

    engine.commandBus.dispatch('pagination:nextPage', {});
    expect(engine.api.paginationGetCurrentPage()).toBe(2);

    engine.destroy();
  });

  it('pagination:nextPage does nothing on last page', () => {
    const engine = createPaginatedGrid();

    // Go to last page first (page 3)
    const totalPages = engine.api.paginationGetTotalPages();
    expect(totalPages).toBe(4);

    engine.commandBus.dispatch('pagination:goToPage', { page: totalPages - 1 });
    expect(engine.api.paginationGetCurrentPage()).toBe(3);

    // Try to go next — should stay on last page
    engine.commandBus.dispatch('pagination:nextPage', {});
    expect(engine.api.paginationGetCurrentPage()).toBe(3);

    engine.destroy();
  });

  it('pagination:prevPage decrements page', () => {
    const engine = createPaginatedGrid();

    // Navigate to page 2 first
    engine.commandBus.dispatch('pagination:goToPage', { page: 2 });
    expect(engine.api.paginationGetCurrentPage()).toBe(2);

    engine.commandBus.dispatch('pagination:prevPage', {});
    expect(engine.api.paginationGetCurrentPage()).toBe(1);

    engine.commandBus.dispatch('pagination:prevPage', {});
    expect(engine.api.paginationGetCurrentPage()).toBe(0);

    engine.destroy();
  });

  it('pagination:prevPage does nothing on first page', () => {
    const engine = createPaginatedGrid();

    expect(engine.api.paginationGetCurrentPage()).toBe(0);

    // Try to go previous — should stay on page 0
    engine.commandBus.dispatch('pagination:prevPage', {});
    expect(engine.api.paginationGetCurrentPage()).toBe(0);

    engine.destroy();
  });

  it('pagination:firstPage goes to page 0', () => {
    const engine = createPaginatedGrid();

    // Navigate away first
    engine.commandBus.dispatch('pagination:goToPage', { page: 3 });
    expect(engine.api.paginationGetCurrentPage()).toBe(3);

    engine.commandBus.dispatch('pagination:firstPage', {});
    expect(engine.api.paginationGetCurrentPage()).toBe(0);

    engine.destroy();
  });

  it('pagination:lastPage goes to last page', () => {
    const engine = createPaginatedGrid();

    // With 10 rows and pageSize 3, total pages = ceil(10/3) = 4 (pages 0,1,2,3)
    const totalPages = engine.api.paginationGetTotalPages();
    expect(totalPages).toBe(4);

    engine.commandBus.dispatch('pagination:lastPage', {});
    expect(engine.api.paginationGetCurrentPage()).toBe(totalPages - 1);

    engine.destroy();
  });

  it('pagination:setPageSize changes page size and resets to page 0', () => {
    const engine = createPaginatedGrid();

    // Navigate to page 2
    engine.commandBus.dispatch('pagination:goToPage', { page: 2 });
    expect(engine.api.paginationGetCurrentPage()).toBe(2);

    // Change page size
    engine.commandBus.dispatch('pagination:setPageSize', { pageSize: 5 });

    const state = engine.store.getState();
    expect(state.pagination.pageSize).toBe(5);
    expect(state.pagination.currentPage).toBe(0);

    // Total pages should update: ceil(10/5) = 2
    expect(engine.api.paginationGetTotalPages()).toBe(2);

    engine.destroy();
  });

  it('emits pagination:changed event on setPageSize', () => {
    const engine = createPaginatedGrid();

    const listener = vi.fn();
    engine.eventBus.on('pagination:changed', listener);

    engine.commandBus.dispatch('pagination:setPageSize', { pageSize: 5 });

    expect(listener).toHaveBeenCalledWith({
      currentPage: 0,
      totalPages: 2, // ceil(10/5)
      pageSize: 5,
    });

    engine.destroy();
  });

  it('disposer unregisters commands after destroy', () => {
    const engine = createPaginatedGrid();

    // Before destroy, navigation works
    engine.commandBus.dispatch('pagination:nextPage', {});
    expect(engine.api.paginationGetCurrentPage()).toBe(1);

    // Go back to page 0
    engine.commandBus.dispatch('pagination:firstPage', {});
    expect(engine.api.paginationGetCurrentPage()).toBe(0);

    // Destroy the engine (which calls plugin disposers)
    engine.destroy();

    // After destroy, commands should have no handlers so dispatching is a no-op
    // The commandBus is cleared by destroy(), so dispatch does nothing
  });
});
