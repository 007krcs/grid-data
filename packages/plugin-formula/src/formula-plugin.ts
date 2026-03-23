// ─── Formula Plugin ───
// Excel-like formula engine for GridStorm.

import type { GridPlugin, PluginContext } from '@gridstorm/core';
import type {
  ASTNode,
  CellAddress,
  CellFormula,
  FormulaError,
  FormulaPluginOptions,
  FormulaState,
} from './types';
import { tokenize } from './tokenizer';
import { parse } from './parser';
import { Evaluator } from './evaluator';
import { createFunctionRegistry } from './functions';
import { DependencyGraph } from './dependency-graph';
import { cellKey, columnLetterToIndex } from './utils';

/**
 * Extract cell dependencies from an AST node.
 */
function extractDependencies(node: ASTNode): CellAddress[] {
  const deps: CellAddress[] = [];

  function walk(n: ASTNode): void {
    switch (n.type) {
      case 'CellReference':
        deps.push({
          rowIndex: n.row - 1,
          colIndex: columnLetterToIndex(n.col),
        });
        break;
      case 'RangeReference': {
        const startRow = n.start.row - 1;
        const endRow = n.end.row - 1;
        const startCol = columnLetterToIndex(n.start.col);
        const endCol = columnLetterToIndex(n.end.col);
        const minRow = Math.min(startRow, endRow);
        const maxRow = Math.max(startRow, endRow);
        const minCol = Math.min(startCol, endCol);
        const maxCol = Math.max(startCol, endCol);
        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            deps.push({ rowIndex: r, colIndex: c });
          }
        }
        break;
      }
      case 'BinaryExpression':
        walk(n.left);
        walk(n.right);
        break;
      case 'UnaryExpression':
        walk(n.operand);
        break;
      case 'FunctionCall':
        for (const arg of n.args) {
          walk(arg);
        }
        break;
      // Literals have no dependencies
    }
  }

  walk(node);
  return deps;
}

/**
 * Create the formula plugin.
 */
export function FormulaPlugin(options?: FormulaPluginOptions): GridPlugin {
  return {
    id: 'formula',
    name: 'Formula Engine',
    version: '0.1.0',

    install(ctx: PluginContext) {
      const maxDepth = options?.maxDepth ?? 100;
      const functionRegistry = createFunctionRegistry(options?.customFunctions);
      const graph = new DependencyGraph();

      // Initial state
      const initialState: FormulaState = {
        formulas: new Map(),
        errors: new Map(),
        isEvaluating: false,
      };
      ctx.registerState('formula', initialState);

      // --- Helpers ---

      function getFormulaState(): FormulaState {
        return ctx.getState<FormulaState>('formula');
      }

      function updateFormulaState(updater: (prev: FormulaState) => FormulaState): void {
        ctx.setState<FormulaState>('formula', updater);
      }

      /**
       * Resolve a row ID and col ID to row/col indices.
       */
      function resolveIndices(
        rowId: string,
        colId: string,
      ): { rowIndex: number; colIndex: number } | null {
        const state = ctx.store.getState();
        const displayedRowIds = state.displayedRowIds;
        const rowIndex = displayedRowIds.indexOf(rowId);
        if (rowIndex === -1) return null;

        const colIndex = state.columns.findIndex(
          (c) => c.colId === colId || c.field === colId,
        );
        if (colIndex === -1) return null;

        return { rowIndex, colIndex };
      }

      /**
       * Cell resolver for the evaluator.
       * Reads a cell value from the grid store by row index and column index.
       */
      function resolveCellValue(rowIndex: number, colIndex: number): unknown {
        const state = ctx.store.getState();
        const columns = state.columns;

        if (colIndex < 0 || colIndex >= columns.length) {
          return { type: '#REF!', message: 'Column out of range' } as FormulaError;
        }

        const displayedRowIds = state.displayedRowIds;
        if (rowIndex < 0 || rowIndex >= displayedRowIds.length) {
          return { type: '#REF!', message: 'Row out of range' } as FormulaError;
        }

        const rowId = displayedRowIds[rowIndex]!;
        const rowNode = state.rowNodes.get(rowId);
        if (!rowNode || !rowNode.data) {
          return undefined;
        }

        const col = columns[colIndex]!;
        const field = col.field;
        if (!field) return undefined;

        return (rowNode.data as Record<string, unknown>)[field];
      }

      /**
       * Evaluate a single formula and return its value.
       */
      function evaluateFormula(formula: CellFormula): { value: unknown; error?: FormulaError } {
        const evaluator = new Evaluator(functionRegistry, resolveCellValue, maxDepth);
        try {
          const result = evaluator.evaluate(formula.ast);
          if (
            result !== null &&
            typeof result === 'object' &&
            'type' in result &&
            'message' in result
          ) {
            return { value: undefined, error: result as FormulaError };
          }
          return { value: result };
        } catch (err) {
          return {
            value: undefined,
            error: {
              type: '#VALUE!',
              message: err instanceof Error ? err.message : String(err),
            } as FormulaError,
          };
        }
      }

      /**
       * Write a computed value back to the grid row data.
       */
      function writeCellValue(rowId: string, colId: string, value: unknown): void {
        const state = ctx.store.getState();
        const rowNode = state.rowNodes.get(rowId);
        if (!rowNode || !rowNode.data) return;

        const col = state.columns.find((c) => c.colId === colId || c.field === colId);
        if (!col || !col.field) return;

        (rowNode.data as Record<string, unknown>)[col.field] = value;
        // Bump version for re-render
        rowNode.version++;
      }

      /**
       * Evaluate dependent formulas when a cell changes.
       */
      function evaluateDependents(changedCellKey: string): void {
        const dependents = graph.getDependents(changedCellKey);
        if (dependents.length === 0) return;

        const formulaState = getFormulaState();
        const newFormulas = new Map(formulaState.formulas);
        const newErrors = new Map(formulaState.errors);

        for (const depKey of dependents) {
          const formula = newFormulas.get(depKey);
          if (!formula) continue;

          const { value, error } = evaluateFormula(formula);
          formula.cachedValue = value;
          formula.error = error;

          if (error) {
            newErrors.set(depKey, error);
          } else {
            newErrors.delete(depKey);
          }

          // Find the rowId and colId for this cell key
          const [rowIdx, colIdx] = depKey.split(':').map(Number) as [number, number];
          const state = ctx.store.getState();
          const rowId = state.displayedRowIds[rowIdx];
          const col = state.columns[colIdx];
          if (rowId && col) {
            writeCellValue(rowId, col.colId, value);
          }
        }

        updateFormulaState((_prev) => ({
          formulas: newFormulas,
          errors: newErrors,
          isEvaluating: false,
        }));
      }

      // --- Commands ---

      const unregisterSet = ctx.commandBus.registerHandler(
        'formula:set',
        (payload: { rowId: string; colId: string; formula: string }) => {
          const { rowId, colId, formula } = payload;

          // Parse the formula
          let formulaStr = formula;
          if (formulaStr.startsWith('=')) {
            formulaStr = formulaStr.slice(1);
          }

          const indices = resolveIndices(rowId, colId);
          if (!indices) return;

          const key = cellKey(indices.rowIndex, indices.colIndex);

          try {
            const tokens = tokenize(formulaStr);
            const ast = parse(tokens);
            const dependencies = extractDependencies(ast);

            // Check for circular references
            const depKeys = dependencies.map((d) => cellKey(d.rowIndex, d.colIndex));
            if (graph.wouldCreateCycle(key, depKeys)) {
              const error: FormulaError = {
                type: '#CIRC!',
                message: 'Circular reference detected',
              };
              updateFormulaState((prev) => {
                const newFormulas = new Map(prev.formulas);
                const newErrors = new Map(prev.errors);
                newErrors.set(key, error);
                return { ...prev, formulas: newFormulas, errors: newErrors };
              });
              return;
            }

            // Register dependencies
            graph.setDependencies(key, depKeys);

            const cellFormula: CellFormula = {
              raw: formula,
              ast,
              dependencies,
              cachedValue: undefined,
            };

            // Evaluate
            const { value, error } = evaluateFormula(cellFormula);
            cellFormula.cachedValue = value;
            cellFormula.error = error;

            // Write value to grid
            writeCellValue(rowId, colId, value);

            updateFormulaState((prev) => {
              const newFormulas = new Map(prev.formulas);
              const newErrors = new Map(prev.errors);
              newFormulas.set(key, cellFormula);
              if (error) {
                newErrors.set(key, error);
              } else {
                newErrors.delete(key);
              }
              return { formulas: newFormulas, errors: newErrors, isEvaluating: false };
            });

            // Re-evaluate dependents
            evaluateDependents(key);

            // Emit event
            (ctx.eventBus as any).emit('formula:evaluated', {
              rowId,
              colId,
              value,
              error,
            });
          } catch (err) {
            const error: FormulaError = {
              type: '#VALUE!',
              message: err instanceof Error ? err.message : String(err),
            };
            updateFormulaState((prev) => {
              const newErrors = new Map(prev.errors);
              newErrors.set(key, error);
              return { ...prev, errors: newErrors };
            });
          }
        },
      );

      const unregisterRemove = ctx.commandBus.registerHandler(
        'formula:remove',
        (payload: { rowId: string; colId: string }) => {
          const { rowId, colId } = payload;
          const indices = resolveIndices(rowId, colId);
          if (!indices) return;

          const key = cellKey(indices.rowIndex, indices.colIndex);
          graph.removeDependencies(key);

          updateFormulaState((prev) => {
            const newFormulas = new Map(prev.formulas);
            const newErrors = new Map(prev.errors);
            newFormulas.delete(key);
            newErrors.delete(key);
            return { formulas: newFormulas, errors: newErrors, isEvaluating: false };
          });
        },
      );

      const unregisterEvaluate = ctx.commandBus.registerHandler(
        'formula:evaluate',
        (payload: { rowId: string; colId: string }) => {
          const { rowId, colId } = payload;
          const indices = resolveIndices(rowId, colId);
          if (!indices) return;

          const key = cellKey(indices.rowIndex, indices.colIndex);
          const formulaState = getFormulaState();
          const formula = formulaState.formulas.get(key);
          if (!formula) return;

          const { value, error } = evaluateFormula(formula);
          formula.cachedValue = value;
          formula.error = error;

          writeCellValue(rowId, colId, value);

          updateFormulaState((prev) => {
            const newFormulas = new Map(prev.formulas);
            const newErrors = new Map(prev.errors);
            newFormulas.set(key, formula);
            if (error) {
              newErrors.set(key, error);
            } else {
              newErrors.delete(key);
            }
            return { formulas: newFormulas, errors: newErrors, isEvaluating: false };
          });
        },
      );

      const unregisterEvaluateAll = ctx.commandBus.registerHandler(
        'formula:evaluateAll',
        (_payload: Record<string, never>) => {
          const formulaState = getFormulaState();
          const formulaKeys = Array.from(formulaState.formulas.keys());

          const order = graph.topologicalSort(formulaKeys);
          if (!order) {
            // Cycle detected — mark all as circular error
            updateFormulaState((prev) => {
              const newErrors = new Map(prev.errors);
              for (const key of formulaKeys) {
                newErrors.set(key, {
                  type: '#CIRC!',
                  message: 'Circular reference detected',
                } as FormulaError);
              }
              return { ...prev, errors: newErrors };
            });
            return;
          }

          const newFormulas = new Map(formulaState.formulas);
          const newErrors = new Map(formulaState.errors);

          for (const key of order) {
            const formula = newFormulas.get(key);
            if (!formula) continue;

            const { value, error } = evaluateFormula(formula);
            formula.cachedValue = value;
            formula.error = error;

            if (error) {
              newErrors.set(key, error);
            } else {
              newErrors.delete(key);
            }

            // Write to grid
            const [rowIdx, colIdx] = key.split(':').map(Number) as [number, number];
            const state = ctx.store.getState();
            const rowId = state.displayedRowIds[rowIdx];
            const col = state.columns[colIdx];
            if (rowId && col) {
              writeCellValue(rowId, col.colId, value);
            }
          }

          updateFormulaState((_prev) => ({
            formulas: newFormulas,
            errors: newErrors,
            isEvaluating: false,
          }));
        },
      );

      const unregisterBulkSet = ctx.commandBus.registerHandler(
        'formula:bulkSet',
        (payload: { formulas: Array<{ rowId: string; colId: string; formula: string }> }) => {
          for (const item of payload.formulas) {
            ctx.commandBus.dispatch('formula:set', item);
          }
        },
      );

      const unregisterGetErrors = ctx.commandBus.registerHandler(
        'formula:getErrors',
        (_payload: Record<string, never>) => {
          const formulaState = getFormulaState();
          (ctx.eventBus as any).emit('formula:errors', {
            errors: Object.fromEntries(formulaState.errors),
          });
        },
      );

      // --- Event Listeners ---

      // Listen for cell value changes to re-evaluate dependent formulas
      const unsubValueChanged = ctx.eventBus.on('cell:valueChanged', (event) => {
        const { node, colId } = event;
        const state = ctx.store.getState();
        const colIndex = state.columns.findIndex(
          (c) => c.colId === colId || c.field === colId,
        );
        if (colIndex === -1) return;

        const rowIndex = state.displayedRowIds.indexOf(node.id);
        if (rowIndex === -1) return;

        const key = cellKey(rowIndex, colIndex);
        evaluateDependents(key);
      });

      // --- Disposer ---

      return () => {
        unregisterSet();
        unregisterRemove();
        unregisterEvaluate();
        unregisterEvaluateAll();
        unregisterBulkSet();
        unregisterGetErrors();
        unsubValueChanged();
        graph.clear();
      };
    },
  };
}
