// ─── useGridFilter Tests ──────────────────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import React from 'react';
import { GridStorm } from '../GridStorm';
import { useGridFilter } from '../hooks/useGridFilter';
import type { GridApi } from '@gridstorm/core';

const COLUMNS = [
  { field: 'id',   headerName: 'ID',   filterable: true },
  { field: 'name', headerName: 'Name', filterable: true },
];

const ROWS = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' },
];

function FilterWidget() {
  const { filterModel, quickFilterText, isFiltered, setQuickFilter, clearFilters } =
    useGridFilter();

  return (
    <div>
      <span data-testid="filter-keys">{Object.keys(filterModel).length}</span>
      <span data-testid="quick-text">{quickFilterText}</span>
      <span data-testid="is-filtered">{String(isFiltered)}</span>
      <button data-testid="set-quick" onClick={() => setQuickFilter('Alice')}>
        quick
      </button>
      <button data-testid="clear-all" onClick={() => clearFilters()}>
        clear
      </button>
    </div>
  );
}

describe('useGridFilter', () => {
  it('returns initial state — empty filterModel and quickFilterText', async () => {
    render(
      <GridStorm columns={COLUMNS} rowData={ROWS}>
        <FilterWidget />
      </GridStorm>,
    );

    await waitFor(() => screen.getByTestId('filter-keys'));

    expect(screen.getByTestId('filter-keys').textContent).toBe('0');
    expect(screen.getByTestId('quick-text').textContent).toBe('');
    expect(screen.getByTestId('is-filtered').textContent).toBe('false');
  });

  it('setQuickFilter updates quickFilterText and isFiltered', async () => {
    render(
      <GridStorm columns={COLUMNS} rowData={ROWS}>
        <FilterWidget />
      </GridStorm>,
    );

    await waitFor(() => screen.getByTestId('set-quick'));

    await act(async () => {
      screen.getByTestId('set-quick').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('quick-text').textContent).toBe('Alice'),
    );
    expect(screen.getByTestId('is-filtered').textContent).toBe('true');
  });

  it('clearFilters resets quick filter text', async () => {
    let capturedApi: GridApi | null = null;

    render(
      <GridStorm
        columns={COLUMNS}
        rowData={ROWS}
        onGridReady={(a) => { capturedApi = a; }}
      >
        <FilterWidget />
      </GridStorm>,
    );

    await waitFor(() => expect(capturedApi).not.toBeNull());

    await act(async () => {
      capturedApi!.setQuickFilter('Bob');
    });

    await waitFor(() =>
      expect(screen.getByTestId('quick-text').textContent).toBe('Bob'),
    );

    await act(async () => {
      screen.getByTestId('clear-all').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('quick-text').textContent).toBe(''),
    );
    expect(screen.getByTestId('is-filtered').textContent).toBe('false');
  });

  it('isFiltered is true when filterModel has entries', async () => {
    let capturedApi: GridApi | null = null;

    render(
      <GridStorm
        columns={COLUMNS}
        rowData={ROWS}
        onGridReady={(a) => { capturedApi = a; }}
      >
        <FilterWidget />
      </GridStorm>,
    );

    await waitFor(() => expect(capturedApi).not.toBeNull());

    await act(async () => {
      capturedApi!.setFilterModel({
        name: { type: 'contains', filter: 'Ali' } as any,
      });
    });

    await waitFor(() =>
      expect(screen.getByTestId('is-filtered').textContent).toBe('true'),
    );
    expect(screen.getByTestId('filter-keys').textContent).toBe('1');
  });
});
