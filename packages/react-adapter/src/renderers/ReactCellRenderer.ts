// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── React Cell Renderer Marker ───
// Wraps a React component so it can be used as a CellRendererFn.
// The DomRenderer will receive an empty string (creating an empty cell),
// and the PortalManager will detect the marker and portal the React
// component into that cell.

import type { ReactCellRenderer } from '../types';

/** Symbol marker for React cell renderers. */
export const REACT_CELL_RENDERER = Symbol.for('gridstorm:reactCellRenderer');

/**
 * Wrap a React component to use as a cell renderer.
 *
 * @example
 * ```tsx
 * const StatusCell = ({ value }: CellRendererProps) => (
 *   <span className={value ? 'active' : 'inactive'}>{value ? 'Yes' : 'No'}</span>
 * );
 *
 * const columns = [
 *   { field: 'active', cellRenderer: reactCellRenderer(StatusCell) },
 * ];
 * ```
 */
export function reactCellRenderer<TData = any, TValue = any>(
  Component: ReactCellRenderer<TData, TValue>,
): any {
  // Return a CellRendererFn that outputs empty string.
  // The DomRenderer will create an empty cell; the PortalManager portals React content into it.
  const fn = () => '';
  (fn as any)[REACT_CELL_RENDERER] = Component;
  return fn;
}

/** Check if a cellRenderer is a wrapped React component. */
export function isReactCellRenderer(fn: unknown): boolean {
  return typeof fn === 'function' && REACT_CELL_RENDERER in (fn as any);
}

/** Extract the React component from a wrapped cell renderer. */
export function getReactCellComponent<TData = any, TValue = any>(
  fn: unknown,
): ReactCellRenderer<TData, TValue> | null {
  if (isReactCellRenderer(fn)) {
    return (fn as any)[REACT_CELL_RENDERER];
  }
  return null;
}
