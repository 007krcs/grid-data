// ─── useGridSort Tests ────────────────────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import React from 'react';
import { GridStorm } from '../GridStorm';
import { useGridSort } from '../hooks/useGridSort';
import type { GridApi } from '@gridstorm/core';

const COLUMNS = [
  { field: 'id',   headerName: 'ID',   sortable: true },
  { field: 'name', headerName: 'Name', sortable: true },
];

const ROWS = [
  { id: 3, name: 'Charlie' },
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];

function SortWidget({ onApi }: { onApi: (api: GridApi) => void }) {
  const { sortModel, isSorted, setSortModel, toggleSort, clearSort } = useGridSort();
  return (
    <div>
      <span data-testid="sort-count">{sortModel.length}</span>
      <span data-testid="is-sorted">{String(isSorted)}</span>
      <button data-testid="set-sort"    onClick={() => setSortModel([{ colId: 'id', sort: 'asc' }])}>set</button>
      <button data-testid="toggle-sort" onClick={() => toggleSort('name')}>toggle</button>
      <button data-testid="clear-sort"  onClick={() => clearSort()}>clear</button>
    </div>
  );
}

describe('useGridSort', () => {
  it('returns initial empty sort model', async () => {
    let capturedApi: GridApi | null = null;

    render(
      <GridStorm columns={COLUMNS} rowData={ROWS} onGridReady={(a) => { capturedApi = a; }}>
        <SortWidget onApi={(a) => { capturedApi = a; }} />
      </GridStorm>,
    );

    await waitFor(() => expect(capturedApi).not.toBeNull());

    expect(screen.getByTestId('sort-count').textContent).toBe('0');
    expect(screen.getByTestId('is-sorted').textContent).toBe('false');
  });

  it('setSortModel updates the sort model', async () => {
    render(
      <GridStorm columns={COLUMNS} rowData={ROWS}>
        <SortWidget onApi={() => {}} />
      </GridStorm>,
    );

    await waitFor(() =>
      screen.getByTestId('sort-count'),
    );

    await act(async () => {
      screen.getByTestId('set-sort').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('sort-count').textContent).toBe('1'),
    );
    expect(screen.getByTestId('is-sorted').textContent).toBe('true');
  });

  it('toggleSort dispatches sort command and updates isSorted', async () => {
    render(
      <GridStorm columns={COLUMNS} rowData={ROWS}>
        <SortWidget onApi={() => {}} />
      </GridStorm>,
    );

    await waitFor(() => screen.getByTestId('toggle-sort'));

    await act(async () => {
      screen.getByTestId('toggle-sort').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('is-sorted').textContent).toBe('true'),
    );
  });

  it('clearSort resets the sort model to empty', async () => {
    let capturedApi: GridApi | null = null;

    render(
      <GridStorm
        columns={COLUMNS}
        rowData={ROWS}
        onGridReady={(a) => { capturedApi = a; }}
      >
        <SortWidget onApi={() => {}} />
      </GridStorm>,
    );

    await waitFor(() => expect(capturedApi).not.toBeNull());

    // Set sort first
    await act(async () => {
      capturedApi!.setSortModel([{ colId: 'id', sort: 'desc' }]);
    });

    await waitFor(() =>
      expect(screen.getByTestId('sort-count').textContent).toBe('1'),
    );

    // Now clear
    await act(async () => {
      screen.getByTestId('clear-sort').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('sort-count').textContent).toBe('0'),
    );
    expect(screen.getByTestId('is-sorted').textContent).toBe('false');
  });
});
