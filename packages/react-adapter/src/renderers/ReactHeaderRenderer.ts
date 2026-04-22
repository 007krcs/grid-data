// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── React Header Renderer Marker ───
// Same pattern as ReactCellRenderer but for header cells.

import type { ReactHeaderRenderer } from '../types';

/** Symbol marker for React header renderers. */
export const REACT_HEADER_RENDERER = Symbol.for('gridstorm:reactHeaderRenderer');

/**
 * Wrap a React component to use as a header renderer.
 *
 * @example
 * ```tsx
 * const SortHeader = ({ displayName, sortDirection, onSortRequested }: HeaderRendererProps) => (
 *   <div onClick={() => onSortRequested(false)}>
 *     {displayName} {sortDirection === 'asc' ? '▲' : sortDirection === 'desc' ? '▼' : ''}
 *   </div>
 * );
 *
 * const columns = [
 *   { field: 'name', headerRenderer: reactHeaderRenderer(SortHeader) },
 * ];
 * ```
 */
export function reactHeaderRenderer<TData = any>(
  Component: ReactHeaderRenderer<TData>,
): any {
  const fn = () => '';
  (fn as any)[REACT_HEADER_RENDERER] = Component;
  return fn;
}

/** Check if a headerRenderer is a wrapped React component. */
export function isReactHeaderRenderer(fn: unknown): boolean {
  return typeof fn === 'function' && REACT_HEADER_RENDERER in (fn as any);
}

/** Extract the React component from a wrapped header renderer. */
export function getReactHeaderComponent<TData = any>(
  fn: unknown,
): ReactHeaderRenderer<TData> | null {
  if (isReactHeaderRenderer(fn)) {
    return (fn as any)[REACT_HEADER_RENDERER];
  }
  return null;
}
