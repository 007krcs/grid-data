// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── useGridApi Hook ───
// Access the GridApi from context.

import type { GridApi } from '@gridstorm/core';
import { useGridContext } from '../context';

/**
 * Access the GridApi instance.
 * Must be used within a `<GridStorm>` component.
 */
export function useGridApi<TData = any>(): GridApi<TData> {
  return useGridContext<TData>().api;
}
