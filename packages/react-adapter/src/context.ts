// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Grid Context ───
// Provides the engine, API, and metadata to all child hooks and components.

import { createContext, useContext } from 'react';
import type { GridEngine, GridApi } from '@gridstorm/core';

export interface GridContextValue<TData = any> {
  engine: GridEngine<TData>;
  api: GridApi<TData>;
  /** The root DOM element (.gs-root) of the grid. */
  rootElement: HTMLElement | null;
}

export const GridContext = createContext<GridContextValue | null>(null);

/**
 * Internal helper — gets grid context with null-check.
 * All public hooks use this internally.
 */
export function useGridContext<TData = any>(): GridContextValue<TData> {
  const ctx = useContext(GridContext);
  if (!ctx) {
    throw new Error(
      '[GridStorm] Hook must be used within a <GridStorm> component.',
    );
  }
  return ctx as GridContextValue<TData>;
}
