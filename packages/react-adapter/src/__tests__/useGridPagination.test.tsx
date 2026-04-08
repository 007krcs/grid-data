// ─── useGridPagination Tests ──────────────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import React from 'react';
import { GridStorm } from '../GridStorm';
import { useGridPagination } from '../hooks/useGridPagination';
import type { GridApi } from '@gridstorm/core';

const COLUMNS = [{ field: 'id', headerName: 'ID' }];
// 25 rows, page size 10 → 3 pages
const ROWS = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));

function PaginationWidget({ onApi }: { onApi?: (a: GridApi) => void }) {
  const {
    currentPage,
    totalPages,
    pageSize,
    totalRows,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    goToPage,
  } = useGridPagination();

  return (
    <div>
      <span data-testid="current">{currentPage}</span>
      <span data-testid="total-pages">{totalPages}</span>
      <span data-testid="page-size">{pageSize}</span>
      <span data-testid="total-rows">{totalRows}</span>
      <span data-testid="has-next">{String(hasNextPage)}</span>
      <span data-testid="has-prev">{String(hasPreviousPage)}</span>
      <button data-testid="next"  onClick={nextPage}>next</button>
      <button data-testid="prev"  onClick={previousPage}>prev</button>
      <button data-testid="first" onClick={firstPage}>first</button>
      <button data-testid="last"  onClick={lastPage}>last</button>
      <button data-testid="go2"   onClick={() => goToPage(2)}>go2</button>
    </div>
  );
}

describe('useGridPagination', () => {
  it('returns initial pagination state', async () => {
    render(
      <GridStorm
        columns={COLUMNS}
        rowData={ROWS}
        enablePagination={true}
        paginationPageSize={10}
      >
        <PaginationWidget />
      </GridStorm>,
    );

    await waitFor(() => screen.getByTestId('current'));
    expect(screen.getByTestId('current').textContent).toBe('0');
    expect(screen.getByTestId('has-prev').textContent).toBe('false');
  });

  it('hasNextPage is true when there are more pages', async () => {
    render(
      <GridStorm
        columns={COLUMNS}
        rowData={ROWS}
        enablePagination={true}
        paginationPageSize={10}
      >
        <PaginationWidget />
      </GridStorm>,
    );

    await waitFor(() => screen.getByTestId('has-next'));
    expect(screen.getByTestId('has-next').textContent).toBe('true');
  });

  it('nextPage increments currentPage', async () => {
    render(
      <GridStorm
        columns={COLUMNS}
        rowData={ROWS}
        enablePagination={true}
        paginationPageSize={10}
      >
        <PaginationWidget />
      </GridStorm>,
    );

    await waitFor(() => screen.getByTestId('next'));

    await act(async () => {
      screen.getByTestId('next').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('current').textContent).toBe('1'),
    );
    expect(screen.getByTestId('has-prev').textContent).toBe('true');
  });

  it('previousPage decrements currentPage', async () => {
    let capturedApi: GridApi | null = null;

    render(
      <GridStorm
        columns={COLUMNS}
        rowData={ROWS}
        enablePagination={true}
        paginationPageSize={10}
        onGridReady={(a) => { capturedApi = a; }}
      >
        <PaginationWidget />
      </GridStorm>,
    );

    await waitFor(() => expect(capturedApi).not.toBeNull());

    await act(async () => {
      capturedApi!.paginationGoToPage(2);
    });

    await waitFor(() =>
      expect(screen.getByTestId('current').textContent).toBe('2'),
    );

    await act(async () => {
      screen.getByTestId('prev').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('current').textContent).toBe('1'),
    );
  });

  it('firstPage goes to page 0', async () => {
    let capturedApi: GridApi | null = null;

    render(
      <GridStorm
        columns={COLUMNS}
        rowData={ROWS}
        enablePagination={true}
        paginationPageSize={10}
        onGridReady={(a) => { capturedApi = a; }}
      >
        <PaginationWidget />
      </GridStorm>,
    );

    await waitFor(() => expect(capturedApi).not.toBeNull());

    await act(async () => {
      capturedApi!.paginationGoToPage(2);
    });

    await waitFor(() =>
      expect(screen.getByTestId('current').textContent).toBe('2'),
    );

    await act(async () => {
      screen.getByTestId('first').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('current').textContent).toBe('0'),
    );
  });

  it('goToPage navigates to specific page', async () => {
    render(
      <GridStorm
        columns={COLUMNS}
        rowData={ROWS}
        enablePagination={true}
        paginationPageSize={10}
      >
        <PaginationWidget />
      </GridStorm>,
    );

    await waitFor(() => screen.getByTestId('go2'));

    await act(async () => {
      screen.getByTestId('go2').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('current').textContent).toBe('2'),
    );
    expect(screen.getByTestId('has-next').textContent).toBe('false');
  });

  it('lastPage navigates to the last page', async () => {
    render(
      <GridStorm
        columns={COLUMNS}
        rowData={ROWS}
        enablePagination={true}
        paginationPageSize={10}
      >
        <PaginationWidget />
      </GridStorm>,
    );

    await waitFor(() => screen.getByTestId('last'));

    await act(async () => {
      screen.getByTestId('last').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('has-next').textContent).toBe('false'),
    );
  });

  it('totalRows matches rowData length', async () => {
    render(
      <GridStorm
        columns={COLUMNS}
        rowData={ROWS}
        enablePagination={true}
        paginationPageSize={10}
      >
        <PaginationWidget />
      </GridStorm>,
    );

    await waitFor(() => {
      const el = screen.getByTestId('total-rows');
      return parseInt(el.textContent ?? '0') === 25;
    });

    expect(screen.getByTestId('total-rows').textContent).toBe('25');
  });
});
