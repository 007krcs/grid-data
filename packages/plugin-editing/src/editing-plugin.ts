// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Editing Plugin ───
// Provides cell editing with built-in editors (text, number, select).
// Manages the editing lifecycle: start → value change → stop (commit/cancel).
// Supports Tab navigation between editable cells.

import type {
  GridPlugin,
  PluginContext,
  CellEditorDef,
  ColumnState,
} from '@gridstorm/core';
import { TextCellEditor } from './editors/text-editor';
import { NumberCellEditor } from './editors/number-editor';
import { SelectCellEditor } from './editors/select-editor';
import { EditHistory } from './edit-history';
// Validators available for future use
import type { ValidationRule as _ValidationRule } from './validators';
import { runValidation as _runValidation } from './validators';

export interface EditingPluginOptions {
  /** Default editor type when column doesn't specify one. Default: 'text'. */
  defaultEditor?: string;
  /** Stop editing when the user clicks outside the editing cell. Default: true. */
  stopEditingWhenCellLoseFocus?: boolean;
  /** Enable undo/redo via Ctrl+Z/Ctrl+Y. Default: false. */
  undoRedo?: boolean;
}

export function EditingPlugin(options: EditingPluginOptions = {}): GridPlugin {
  const {
    defaultEditor = 'text',
    stopEditingWhenCellLoseFocus: _stopOnBlur = true,
    undoRedo: undoRedoEnabled = false,
  } = options;

  return {
    id: 'editing',
    name: 'Cell Editing',
    version: '0.1.0',
    capabilities: ['cell-editing'],

    install(ctx: PluginContext) {
      // ── Edit History (undo/redo) ──
      const history = undoRedoEnabled ? new EditHistory() : null;

      // ── Register built-in editors ──
      ctx.registerCellRenderer('__text_editor', TextCellEditor.create as any);
      ctx.registerCellEditor('text', TextCellEditor);
      ctx.registerCellEditor('number', NumberCellEditor);
      ctx.registerCellEditor('select', SelectCellEditor);

      // ── Register editing:start command ──
      const unregisterStart = ctx.commandBus.registerHandler(
        'editing:start',
        (payload: { rowId: string; colId: string }) => {
          const state = ctx.store.getState();
          const node = state.rowNodes.get(payload.rowId);
          if (!node) return;

          const col = state.columns.find((c: ColumnState) => c.colId === payload.colId);
          if (!col) return;

          // Check if column is editable
          const editable =
            typeof col.editable === 'function'
              ? col.editable({
                  data: node.data,
                  value: undefined,
                  node,
                  colDef: col.originalDef,
                  colId: col.colId,
                  rowIndex: node.displayIndex,
                })
              : col.editable;

          if (!editable) return;

          // Get current value
          let value: any;
          const valueGetter = col.originalDef.valueGetter;
          if (valueGetter && node.data != null) {
            try {
              value = valueGetter({ data: node.data, node, colDef: col.originalDef, colId: col.colId });
            } catch {
              const field = col.field ?? col.colId;
              value = node.data != null ? (node.data as any)[field] : undefined;
            }
          } else {
            const field = col.field ?? col.colId;
            value = node.data != null ? (node.data as any)[field] : undefined;
          }

          ctx.store.setState((prev) => ({
            ...prev,
            editing: {
              rowId: payload.rowId,
              colId: payload.colId,
              value,
              originalValue: value,
              rowEditMode: false,
            },
          }));

          ctx.eventBus.emit('cell:editingStarted', {
            node,
            colId: payload.colId,
            value,
          });
        },
      );

      // ── Register editing:stop command ──
      const unregisterStop = ctx.commandBus.registerHandler(
        'editing:stop',
        (payload: { cancel?: boolean }) => {
          const cancel = payload?.cancel ?? false;
          ctx.api.stopEditing(cancel);
        },
      );

      // ── Register editing:setValue command ──
      const unregisterSetValue = ctx.commandBus.registerHandler(
        'editing:setValue',
        (payload: { value: any }) => {
          const editing = ctx.store.getState().editing;
          if (!editing) return;

          ctx.store.setState((prev) => ({
            ...prev,
            editing: prev.editing
              ? { ...prev.editing, value: payload.value }
              : null,
          }));
        },
      );

      // ── Register editing:getEditorDef command ──
      const unregisterGetEditor = ctx.commandBus.registerHandler(
        'editing:getEditorDef',
        (payload: { colId: string; callback: (def: CellEditorDef | null) => void }) => {
          const col = ctx.store
            .getState()
            .columns.find((c: ColumnState) => c.colId === payload.colId);
          if (!col) {
            payload.callback(null);
            return;
          }

          const editorName = col.originalDef.cellEditor ?? defaultEditor;
          // Try plugin-registered editors first
          let editorDef: CellEditorDef | null = null;
          if (editorName === 'text') editorDef = TextCellEditor;
          else if (editorName === 'number') editorDef = NumberCellEditor;
          else if (editorName === 'select') editorDef = SelectCellEditor;

          payload.callback(editorDef);
        },
      );

      // ── Register editing:undo command ──
      const unregisterUndo = ctx.commandBus.registerHandler('editing:undo', () => {
        if (!history) return;
        const record = history.undo();
        if (!record) return;

        const state = ctx.store.getState();
        const node = state.rowNodes.get(record.rowId);
        if (!node?.data) return;

        const col = state.columns.find((c: ColumnState) => c.colId === record.colId);
        const field = col?.field ?? record.colId;
        (node.data as any)[field] = record.oldValue;
        node.version++;

        ctx.eventBus.emit('cell:valueChanged', {
          node,
          colId: record.colId,
          oldValue: record.newValue,
          newValue: record.oldValue,
        });
        ctx.commandBus.dispatch('rows:reprocess', {});
      });

      // ── Register editing:redo command ──
      const unregisterRedo = ctx.commandBus.registerHandler('editing:redo', () => {
        if (!history) return;
        const record = history.redo();
        if (!record) return;

        const state = ctx.store.getState();
        const node = state.rowNodes.get(record.rowId);
        if (!node?.data) return;

        const col = state.columns.find((c: ColumnState) => c.colId === record.colId);
        const field = col?.field ?? record.colId;
        (node.data as any)[field] = record.newValue;
        node.version++;

        ctx.eventBus.emit('cell:valueChanged', {
          node,
          colId: record.colId,
          oldValue: record.oldValue,
          newValue: record.newValue,
        });
        ctx.commandBus.dispatch('rows:reprocess', {});
      });

      // ── Track edits for undo/redo ──
      let unsubEditingStopped: (() => void) | undefined;
      if (history) {
        unsubEditingStopped = ctx.eventBus.on('cell:editingStopped', (event) => {
          if (!event.cancelled && event.oldValue !== event.newValue) {
            history.push({
              rowId: event.node.id,
              colId: event.colId,
              oldValue: event.oldValue,
              newValue: event.newValue,
              timestamp: Date.now(),
            });
          }
        });
      }

      // ── Handle double-click to start editing ──
      const unsubDblClick = ctx.eventBus.on(
        'cell:doubleClicked',
        ({ node, colId }) => {
          ctx.commandBus.dispatch('editing:start', {
            rowId: node.id,
            colId,
          });
        },
      );

      return () => {
        unregisterStart();
        unregisterStop();
        unregisterSetValue();
        unregisterGetEditor();
        unregisterUndo();
        unregisterRedo();
        unsubDblClick();
        unsubEditingStopped?.();
      };
    },
  };
}
