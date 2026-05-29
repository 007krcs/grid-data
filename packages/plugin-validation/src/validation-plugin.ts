// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Validation Plugin ───
// Provides data validation with 10+ built-in validators, cross-cell rules,
// and editing integration for GridStorm.

import type { GridPlugin, PluginContext } from '@gridstorm/core';
import type { ValidationPluginOptions, ValidationState, ValidationRule, ValidationError } from './types';
import { validateCell, validateAll } from './validation-engine';

function createInitialState(rules: ValidationRule[]): ValidationState {
  return {
    rules,
    errors: new Map(),
    isValidating: false,
    totalErrors: 0,
    totalWarnings: 0,
  };
}

function countBySeverity(errors: Map<string, ValidationError[]>): { totalErrors: number; totalWarnings: number } {
  let totalErrors = 0;
  let totalWarnings = 0;
  for (const cellErrors of errors.values()) {
    for (const err of cellErrors) {
      if (err.severity === 'error') totalErrors++;
      else if (err.severity === 'warning') totalWarnings++;
    }
  }
  return { totalErrors, totalWarnings };
}

export function ValidationPlugin(options: ValidationPluginOptions = {}): GridPlugin {
  const {
    rules: initialRules = [],
    validateOnEdit = true,
    validateOnLoad: _validateOnLoad = false,
    errorCssClass: _errorCssClass = 'gs-cell-invalid',
    warningCssClass: _warningCssClass = 'gs-cell-warning',
  } = options;

  return {
    id: 'validation',
    name: 'Data Validation',
    version: '0.1.0',

    install(ctx: PluginContext) {
      // Register plugin state
      ctx.registerState<ValidationState>('validation', createInitialState(initialRules));

      // Helper: get current validation state
      const getValidation = () => ctx.getState<ValidationState>('validation');

      // Helper: update validation state and emit event
      const updateValidation = (updater: (prev: ValidationState) => ValidationState) => {
        ctx.setState<ValidationState>('validation', updater);
        const state = getValidation();
        (ctx.eventBus as any).emit('validation:changed', {
          errors: state.errors,
          totalErrors: state.totalErrors,
          totalWarnings: state.totalWarnings,
        });
      };

      // Helper: get all row data as a Map
      const getAllRowData = (): Map<string, Record<string, unknown>> => {
        const gridState = ctx.store.getState();
        const allRows = new Map<string, Record<string, unknown>>();
        for (const [rowId, node] of gridState.rowNodes) {
          if (node.data) {
            allRows.set(rowId, node.data as Record<string, unknown>);
          }
        }
        return allRows;
      };

      // Helper: get column IDs
      const getColumnIds = (): string[] => {
        const gridState = ctx.store.getState();
        return gridState.columns.map((c) => c.colId);
      };

      // ── Command: validation:setRules ──
      const unregSetRules = ctx.commandBus.registerHandler(
        'validation:setRules',
        (payload: { rules: ValidationRule[] }) => {
          updateValidation((prev) => ({
            ...prev,
            rules: payload.rules,
          }));
        },
      );

      // ── Command: validation:addRule ──
      const unregAddRule = ctx.commandBus.registerHandler(
        'validation:addRule',
        (payload: { rule: ValidationRule }) => {
          updateValidation((prev) => ({
            ...prev,
            rules: [...prev.rules, payload.rule],
          }));
        },
      );

      // ── Command: validation:removeRule ──
      const unregRemoveRule = ctx.commandBus.registerHandler(
        'validation:removeRule',
        (payload: { ruleId: string }) => {
          updateValidation((prev) => ({
            ...prev,
            rules: prev.rules.filter((r) => r.id !== payload.ruleId),
          }));
        },
      );

      // ── Command: validation:validate ──
      const unregValidate = ctx.commandBus.registerHandler(
        'validation:validate',
        (payload: { rowId?: string; colId?: string }) => {
          const validation = getValidation();
          const gridState = ctx.store.getState();

          if (payload.rowId && payload.colId) {
            // Validate a single cell
            const node = gridState.rowNodes.get(payload.rowId);
            if (!node || !node.data) return;
            const rowData = node.data as Record<string, unknown>;
            const value = rowData[payload.colId];
            const cellErrors = validateCell(
              value,
              payload.rowId,
              payload.colId,
              rowData,
              validation.rules,
            );
            const newErrors = new Map(validation.errors);
            const key = `${payload.rowId}:${payload.colId}`;
            if (cellErrors.length > 0) {
              newErrors.set(key, cellErrors);
            } else {
              newErrors.delete(key);
            }
            const counts = countBySeverity(newErrors);
            updateValidation((_prev) => ({
              ...validation,
              errors: newErrors,
              ...counts,
            }));
          } else if (payload.rowId) {
            // Validate an entire row
            const node = gridState.rowNodes.get(payload.rowId);
            if (!node || !node.data) return;
            const rowData = node.data as Record<string, unknown>;
            const colIds = getColumnIds();
            const newErrors = new Map(validation.errors);

            // Clear existing errors for this row
            for (const key of [...newErrors.keys()]) {
              if (key.startsWith(`${payload.rowId}:`)) {
                newErrors.delete(key);
              }
            }

            // Validate each cell in the row
            for (const colId of colIds) {
              const value = rowData[colId];
              const cellErrors = validateCell(value, payload.rowId, colId, rowData, validation.rules);
              if (cellErrors.length > 0) {
                newErrors.set(`${payload.rowId}:${colId}`, cellErrors);
              }
            }

            const counts = countBySeverity(newErrors);
            updateValidation((_prev) => ({
              ...validation,
              errors: newErrors,
              ...counts,
            }));
          }
        },
      );

      // ── Command: validation:validateAll ──
      const unregValidateAll = ctx.commandBus.registerHandler(
        'validation:validateAll',
        (_payload: Record<string, never>) => {
          const validation = getValidation();
          const allRows = getAllRowData();
          const colIds = getColumnIds();

          updateValidation((_prev) => {
            const errors = validateAll(allRows, colIds, validation.rules);
            const counts = countBySeverity(errors);
            return {
              ...validation,
              errors,
              isValidating: false,
              ...counts,
            };
          });
        },
      );

      // ── Command: validation:getErrors ──
      const unregGetErrors = ctx.commandBus.registerHandler(
        'validation:getErrors',
        (payload: { rowId?: string; colId?: string }) => {
          const validation = getValidation();
          let errors: ValidationError[] = [];

          if (payload.rowId && payload.colId) {
            const key = `${payload.rowId}:${payload.colId}`;
            errors = validation.errors.get(key) || [];
          } else if (payload.rowId) {
            for (const [key, cellErrors] of validation.errors) {
              if (key.startsWith(`${payload.rowId}:`)) {
                errors.push(...cellErrors);
              }
            }
          } else {
            for (const cellErrors of validation.errors.values()) {
              errors.push(...cellErrors);
            }
          }

          (ctx.eventBus as any).emit('validation:errors', { errors });
        },
      );

      // ── Command: validation:clearErrors ──
      const unregClearErrors = ctx.commandBus.registerHandler(
        'validation:clearErrors',
        (_payload: Record<string, never>) => {
          updateValidation((prev) => ({
            ...prev,
            errors: new Map(),
            totalErrors: 0,
            totalWarnings: 0,
          }));
        },
      );

      // ── Edit integration ──
      let unsubCellChanged: (() => void) | undefined;
      if (validateOnEdit) {
        unsubCellChanged = ctx.eventBus.on('cell:valueChanged', (event: any) => {
          const { rowId, colId } = event;
          if (!rowId || !colId) return;

          const validation = getValidation();
          const gridState = ctx.store.getState();
          const node = gridState.rowNodes.get(rowId);
          if (!node || !node.data) return;

          const rowData = node.data as Record<string, unknown>;
          const value = rowData[colId];
          const cellErrors = validateCell(value, rowId, colId, rowData, validation.rules);
          const newErrors = new Map(validation.errors);
          const key = `${rowId}:${colId}`;

          if (cellErrors.length > 0) {
            newErrors.set(key, cellErrors);
          } else {
            newErrors.delete(key);
          }

          const counts = countBySeverity(newErrors);
          updateValidation((_prev) => ({
            ...validation,
            errors: newErrors,
            ...counts,
          }));
        });
      }

      // Return disposer
      return () => {
        unregSetRules();
        unregAddRule();
        unregRemoveRule();
        unregValidate();
        unregValidateAll();
        unregGetErrors();
        unregClearErrors();
        unsubCellChanged?.();
      };
    },
  };
}
