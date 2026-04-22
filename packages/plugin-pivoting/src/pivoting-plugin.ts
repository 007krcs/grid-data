// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Pivoting Plugin ───
// Transforms row-grouped data into dynamic columns (pivot table).
// Generates secondary columns based on distinct values in pivot columns.

import type { GridPlugin, PluginContext, ColumnState } from '@gridstorm/core';
import { validateLicense, createWatermark } from '@gridstorm/license';
import type { PivotPluginOptions, PivotState } from './types';
import { generatePivotColumns, computePivotValues } from './pivot-columns';

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
        initialState.pivotMode = true;
      }

      ctx.registerState('pivoting', initialState);

      // ── Enable pivot mode ──
      const unregEnable = ctx.commandBus.registerHandler('pivot:enable', () => {
        // Save original columns before pivot
        const currentState = ctx.store.getState();
        ctx.setState<PivotState>('pivoting', (prev) => ({
          ...prev,
          pivotMode: true,
          originalColumns: currentState.columns,
        }));
        rebuildPivot(ctx, pivotMaxGeneratedColumns, processSecondaryColumns);
        // Inject generated columns into state.columns
        const ps = ctx.getState<PivotState>('pivoting');
        if (ps.generatedColumns.length > 0) {
          const groupCols = currentState.columns.filter((c: ColumnState) =>
            !ps.pivotColumns.includes(c.colId) && c.aggFunc == null
          );
          // Convert generated ColumnDefs to proper ColumnState with originalDef
          const generatedColStates = ps.generatedColumns.map((def: any) => ({
            colId: def.colId ?? def.field ?? '',
            field: def.field ?? def.colId ?? '',
            headerName: def.headerName ?? def.field ?? '',
            width: def.width ?? 150,
            minWidth: def.minWidth ?? 50,
            maxWidth: def.maxWidth ?? 2000,
            flex: def.flex ?? null,
            hide: false,
            pinned: null,
            sort: null,
            sortIndex: null,
            sortable: def.sortable ?? false,
            filterable: def.filterable ?? false,
            resizable: true,
            editable: false,
            rowGroup: false,
            rowGroupIndex: null,
            pivot: false,
            pivotIndex: null,
            aggFunc: null,
            originalDef: def,
          })) as ColumnState[];

          ctx.store.setState((prev) => ({
            ...prev,
            columns: [...groupCols, ...generatedColStates],
          }));

          // Notify renderer that column structure changed (triggers header + row rebuild)
          ctx.eventBus.emit('columns:changed', {
            columns: ctx.store.getState().columns,
          } as any);

          // Compute pivot values for all group nodes
          const pivotCols = currentState.columns.filter((c: ColumnState) => ps.pivotColumns.includes(c.colId));
          const valueCols = currentState.columns.filter((c: ColumnState) => c.aggFunc != null);
          const state = ctx.store.getState();
          for (const [, node] of state.rowNodes) {
            if (node.group && node.children) {
              const pivotData = computePivotValues(node, pivotCols, valueCols);
              node.aggData = { ...(node.aggData ?? {}), ...pivotData };
              node.version = (node.version || 0) + 1;
            }
          }
        }
        emitPivotChanged(ctx);
      });

      // ── Disable pivot mode ──
      const unregDisable = ctx.commandBus.registerHandler('pivot:disable', () => {
        const ps = ctx.getState<PivotState>('pivoting');
        const originalColumns = (ps as any).originalColumns;
        ctx.setState<PivotState>('pivoting', (prev) => ({
          ...prev,
          pivotMode: false,
          generatedColumns: [],
        }));
        // Restore original columns
        if (originalColumns) {
          ctx.store.setState((prev) => ({
            ...prev,
            columns: originalColumns,
          }));
          // Notify renderer that column structure changed
          ctx.eventBus.emit('columns:changed', {
            columns: originalColumns,
          } as any);
        }
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

      // Auto-enable pivot when pivot columns are detected from column defs
      let unsubGridReady: (() => void) | undefined;
      if (autoPivotCols.length > 0) {
        unsubGridReady = ctx.eventBus.on('grid:ready', () => {
          ctx.commandBus.dispatch('pivot:enable', {});
        });
      }

      // Re-compute pivot values after group expand/collapse (reprocessWithGroups recreates group nodes)
      const unsubGroupOpened = ctx.eventBus.on('row:groupOpened', () => {
        const ps = ctx.getState<PivotState>('pivoting');
        if (!ps.pivotMode || ps.pivotColumns.length === 0) return;
        const state = ctx.store.getState();
        const pivotCols = ((ps as any).originalColumns || state.columns)
          .filter((c: ColumnState) => ps.pivotColumns.includes(c.colId));
        const valueCols = ((ps as any).originalColumns || state.columns)
          .filter((c: ColumnState) => c.aggFunc != null);
        for (const [, node] of state.rowNodes) {
          if (node.group && node.children) {
            const pivotData = computePivotValues(node, pivotCols, valueCols);
            node.aggData = { ...(node.aggData ?? {}), ...pivotData };
          }
        }
      });

      return () => {
        unsubLicenseWatermark?.();
        unsubGridReady?.();
        unsubGroupOpened();
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
