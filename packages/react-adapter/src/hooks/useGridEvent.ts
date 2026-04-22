// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── useGridEvent Hook ───
// Subscribe to typed grid events.

import { useEffect, useRef } from 'react';
import type { GridEventMap } from '@gridstorm/core';
import { useGridContext } from '../context';

/**
 * Subscribe to a specific grid event.
 * Handler ref prevents stale closures without re-subscribing.
 *
 * @example
 * ```tsx
 * useGridEvent('cell:clicked', (event) => {
 *   console.log('Clicked cell:', event.colId, event.value);
 * });
 * ```
 */
export function useGridEvent<
  TData = any,
  K extends keyof GridEventMap<TData> = any,
>(
  event: K,
  handler: (payload: GridEventMap<TData>[K]) => void,
): void {
  const { engine } = useGridContext<TData>();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const unsub = engine.eventBus.on(event as any, (payload: any) => {
      handlerRef.current(payload);
    });
    return unsub;
  }, [engine, event]);
}
