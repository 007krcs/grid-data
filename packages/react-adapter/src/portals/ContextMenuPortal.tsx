// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Context Menu Portal ───
// Renders a user-provided context menu component at the right-click position.

import { useEffect, useRef } from 'react';
import type { ContextMenuProps, ReactContextMenu } from '../types';

interface ContextMenuPortalProps<TData = any> {
  x: number;
  y: number;
  menuProps: ContextMenuProps<TData>;
  Component: ReactContextMenu<TData>;
}

export function ContextMenuPortal<TData = any>(
  props: ContextMenuPortalProps<TData>,
) {
  const { x, y, menuProps, Component } = props;
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        menuProps.closeMenu();
      }
    };
    // Use setTimeout so the current click doesn't immediately close the menu
    const id = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', handler);
    };
  }, [menuProps]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') menuProps.closeMenu();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [menuProps]);

  return (
    <div
      ref={ref}
      className="gs-context-menu-portal"
      style={{
        position: 'absolute',
        top: y,
        left: x,
        zIndex: 100,
        minWidth: 160,
      }}
    >
      <Component {...menuProps} />
    </div>
  );
}
