// ─── Pivoting Plugin ───
// Transforms row-grouped data into dynamic columns (pivot table).
// Generates secondary columns based on distinct values in pivot columns.

import type { GridPlugin, PluginContext, ColumnState } from '@gridstorm/core';
import { validateLicense, createWatermark } from '@gridstorm/license';
import type { PivotPluginOptions, PivotState } from './types';
import { generatePivotColumns } from './pivot-columns';

export function PivotPlugin(options: PivotPluginOptions = {}): GridPlugin {
  const {
    pivotMode: initialPivotMode = false,
    pivotMaxGeneratedColumns = 1000,
    processSecondaryColumns,
  } = options;

  return {
    id: 'pivoting',
    name: 'Pivoting',
    version: '0.1.0',
    dependencies: ['aggregation'],

    install(ctx: PluginContext) {
      // ── License validation ──
      const licenseResult = validateLicense('pivoting');
      let unsubLicenseWatermark: (() => void) | undefined;
      if (!licenseResult.valid && !licenseResult.isDevelopment) {
        console.warn(licenseResult.message);
        unsubLicenseWatermark = ctx.eventBus.on('grid:ready', () => {
          const container = document.querySelector<HTMLElement>('.gs-root');
          if (container) createWatermark(container);
        });
      }
      if (!licenseResult.pluginLicensed && !licenseResult.isDevelopment) {
        console.warn(licenseResult.message);
      }

      const initialState: PivotState = {
        pivotMode: initialPivotMode,
        pivotColumns: [],
        generatedColumns: [],
      };

      // Detect initial pivot columns from column defs
      const state = ctx.store.getState();
      const autoPivotCols = state.columns
        .filter((c: ColumnState) => c.pivot)
        .sort((a: ColumnState, b: ColumnState) => (a.pivotIndex ?? 0) - (b.pivotIndex ?? 0))
        .map((c: ColumnState) => c.colId);

      if (autoPivotCols.length > 0) {
        initialState.pivotColumns = autoPivotCols;
      }

      ctx.registerState('pivoting', initialState);

      // ── Enable pivot mode ──
      const unregEnable = ctx.commandBus.registerHandler('pivot:enable', () => {
        ctx.setState<PivotState>('pivoting', (prev) => ({ ...prev, pivotMode: true }));
        rebuildPivot(ctx, pivotMaxGeneratedColumns, processSecondaryColumns);
        emitPivotChanged(ctx);
      });

      // ── Disable pivot mode ──
      const unregDisable = ctx.commandBus.registerHandler('pivot:disable', () => {
        ctx.setState<PivotState>('pivoting', (prev) => ({
          ...prev,
          pivotMode: false,
          generatedColumns: [],
        }));
        emitPivotChanged(ctx);
      });

      // ── Add pivot column ──
      const unregAdd = ctx.commandBus.registerHandler(
        'pivot:addColumn',
        (payload: { colId: string }) => {
          const ps = ctx.getState<PivotState>('pivoting');
          if (ps.pivotColumns.includes(payload.colId)) return;
          ctx.setState<PivotState>('pivoting', (prev) => ({
            ...prev,
            pivotColumns: [...prev.pivotColumns, payload.colId],
          }));
          rebuildPivot(ctx, pivotMaxGeneratedColumns, processSecondaryColumns);
          emitPivotChanged(ctx);
        },
      );

      // ── Remove pivot column ──
      const unregRemove = ctx.commandBus.registerHandler(
        'pivot:removeColumn',
        (payload: { colId: string }) => {
          ctx.setState<PivotState>('pivoting', (prev) => ({
            ...prev,
            pivotColumns: prev.pivotColumns.filter((c) => c !== payload.colId),
          }));
          rebuildPivot(ctx, pivotMaxGeneratedColumns, processSecondaryColumns);
          emitPivotChanged(ctx);
        },
      );

      // ── Set all pivot columns ──
      const unregSet = ctx.commandBus.registerHandler(
        'pivot:setColumns',
        (payload: { colIds: string[] }) => {
          ctx.setState<PivotState>('pivoting', (prev) => ({
            ...prev,
            pivotColumns: payload.colIds,
          }));
          rebuildPivot(ctx, pivotMaxGeneratedColumns, processSecondaryColumns);
          emitPivotChanged(ctx);
        },
      );

      return () => {
        unsubLicenseWatermark?.();
        unregEnable();
        unregDisable();
        unregAdd();
        unregRemove();
        unregSet();
      };
    },
  };
}

function rebuildPivot(
  ctx: PluginContext,
  maxColumns: number,
  processSecondaryColumns?: (cols: any[]) => any[],
): void {
  const ps = ctx.getState<PivotState>('pivoting');
  if (!ps.pivotMode || ps.pivotColumns.length === 0) return;

  const state = ctx.store.getState();
  const pivotCols = state.columns.filter((c: ColumnState) => ps.pivotColumns.includes(c.colId));

  // Value columns are those with aggFunc set
  const valueCols = state.columns.filter((c: ColumnState) => c.aggFunc != null);

  // Get leaf rows
  const leafRows = Array.from(state.rowNodes.values()).filter((n) => !n.group);

  let generated = generatePivotColumns(leafRows, pivotCols, valueCols, maxColumns);

  if (processSecondaryColumns) {
    generated = processSecondaryColumns(generated);
  }

  ctx.setState<PivotState>('pivoting', (prev) => ({
    ...prev,
    generatedColumns: generated,
  }));
}

function emitPivotChanged(ctx: PluginContext): void {
  const ps = ctx.getState<PivotState>('pivoting');
  ctx.eventBus.emit('pivot:changed', {
    pivotColumns: ps.pivotColumns,
    pivotMode: ps.pivotMode,
  });
}
