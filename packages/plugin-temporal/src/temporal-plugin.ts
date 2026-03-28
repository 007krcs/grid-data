import type { GridPlugin } from '@gridstorm/core';
import type { TemporalSnapshot, TemporalState, TemporalOptions } from './types';

const PLUGIN_STATE_KEY = 'temporal';

function generateId(): string {
  return `snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function captureSnapshot(
  ctx: Parameters<GridPlugin['install']>[0],
  label: string,
): TemporalSnapshot {
  return {
    id: generateId(),
    label,
    timestamp: Date.now(),
    sortModel: (ctx.api.getSortModel?.() ?? []) as unknown[],
    filterModel: (ctx.api.getFilterModel?.() ?? {}) as Record<string, unknown>,
    quickFilterText:
      (ctx.api as Record<string, unknown>)['quickFilterText'] as string ?? '',
  };
}

function applySnapshot(
  ctx: Parameters<GridPlugin['install']>[0],
  snap: TemporalSnapshot,
): void {
  ctx.api.setSortModel?.(snap.sortModel as never);
  ctx.api.setFilterModel?.(snap.filterModel as never);
  ctx.api.setQuickFilter?.(snap.quickFilterText);
}

export function TemporalPlugin(options: TemporalOptions = {}): GridPlugin {
  const {
    maxHistory = 50,
    autoSnapshot = false,
    autoLabel = (t) => `Auto: ${t}`,
  } = options;

  return {
    id: 'temporal',
    name: 'Temporal (Time Travel)',
    version: '0.1.0',
    install(ctx) {
      ctx.registerState(PLUGIN_STATE_KEY, {
        snapshots: [],
        undoStack: [],
        redoStack: [],
        current: null,
      } as TemporalState);

      function pushUndo(snap: TemporalSnapshot) {
        ctx.setState(PLUGIN_STATE_KEY, (prev: unknown) => {
          const state = prev as TemporalState;
          const undoStack = [...state.undoStack, snap].slice(-maxHistory);
          return { ...state, undoStack, redoStack: [] }; // clear redo on new action
        });
      }

      const unregisterSnapshot = ctx.commandBus.registerHandler(
        'temporal:snapshot' as never,
        (payload: unknown) => {
          const { label = 'Snapshot' } = (payload as { label?: string }) ?? {};
          const currentState = ctx.getState(PLUGIN_STATE_KEY) as TemporalState;
          if (currentState.current) pushUndo(currentState.current);

          const snap = captureSnapshot(ctx, label);
          ctx.setState(PLUGIN_STATE_KEY, (prev: unknown) => {
            const state = prev as TemporalState;
            return { ...state, snapshots: [...state.snapshots, snap], current: snap };
          });
          ctx.eventBus.emit('temporal:snapshot-taken' as never, { snapshot: snap } as never);
        },
      );

      const unregisterUndo = ctx.commandBus.registerHandler(
        'temporal:undo' as never,
        () => {
          ctx.setState(PLUGIN_STATE_KEY, (prev: unknown) => {
            const state = prev as TemporalState;
            if (state.undoStack.length === 0) return state;
            const undoStack = [...state.undoStack];
            const target = undoStack.pop()!;
            const redoStack = state.current
              ? [...state.redoStack, state.current]
              : state.redoStack;
            applySnapshot(ctx, target);
            ctx.eventBus.emit(
              'temporal:restored' as never,
              { snapshot: target, direction: 'undo' } as never,
            );
            return { ...state, undoStack, redoStack, current: target };
          });
        },
      );

      const unregisterRedo = ctx.commandBus.registerHandler(
        'temporal:redo' as never,
        () => {
          ctx.setState(PLUGIN_STATE_KEY, (prev: unknown) => {
            const state = prev as TemporalState;
            if (state.redoStack.length === 0) return state;
            const redoStack = [...state.redoStack];
            const target = redoStack.pop()!;
            const undoStack = state.current
              ? [...state.undoStack, state.current]
              : state.undoStack;
            applySnapshot(ctx, target);
            ctx.eventBus.emit(
              'temporal:restored' as never,
              { snapshot: target, direction: 'redo' } as never,
            );
            return { ...state, redoStack, undoStack, current: target };
          });
        },
      );

      const unregisterGoto = ctx.commandBus.registerHandler(
        'temporal:goto' as never,
        (payload: unknown) => {
          const { id } = payload as { id: string };
          const state = ctx.getState(PLUGIN_STATE_KEY) as TemporalState;
          const target = state.snapshots.find(s => s.id === id);
          if (!target) return;
          applySnapshot(ctx, target);
          ctx.setState(PLUGIN_STATE_KEY, (prev: unknown) => ({
            ...(prev as TemporalState),
            current: target,
          }));
          ctx.eventBus.emit(
            'temporal:restored' as never,
            { snapshot: target, direction: 'goto' } as never,
          );
        },
      );

      const unsubs: Array<() => void> = [];

      if (autoSnapshot) {
        let debounce: ReturnType<typeof setTimeout> | null = null;
        const scheduleSnapshot = (trigger: string) => {
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(() => {
            ctx.commandBus.dispatch?.(
              'temporal:snapshot' as never,
              { label: autoLabel(trigger) } as never,
            );
          }, 300);
        };
        unsubs.push(
          ctx.eventBus.on('sort:changed' as never, () => scheduleSnapshot('sort')),
          ctx.eventBus.on('filter:changed' as never, () => scheduleSnapshot('filter')),
        );
      }

      return () => {
        unregisterSnapshot();
        unregisterUndo();
        unregisterRedo();
        unregisterGoto();
        unsubs.forEach(u => u());
      };
    },
  };
}
