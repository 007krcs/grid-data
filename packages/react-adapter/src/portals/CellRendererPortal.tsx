// ─── Cell Renderer Portal ───
// Memoized wrapper for individual React cell renderer portals.
// Custom comparator prevents re-renders when cell data hasn't changed.

import { memo } from 'react';
import type { ReactCellRenderer, CellRendererProps } from '../types';

interface CellRendererPortalProps<TData = any, TValue = any> {
  Component: ReactCellRenderer<TData, TValue>;
  rendererProps: CellRendererProps<TData, TValue>;
  nodeVersion: number;
}

function CellRendererPortalInner<TData = any, TValue = any>(
  props: CellRendererPortalProps<TData, TValue>,
) {
  const { Component, rendererProps } = props;
  return <Component {...rendererProps} />;
}

/** Memoized cell renderer portal — only re-renders when value or version changes. */
export const CellRendererPortal = memo(
  CellRendererPortalInner,
  (prev, next) =>
    prev.nodeVersion === next.nodeVersion &&
    prev.rendererProps.value === next.rendererProps.value &&
    prev.rendererProps.rowIndex === next.rendererProps.rowIndex &&
    prev.rendererProps.colId === next.rendererProps.colId,
) as typeof CellRendererPortalInner;
