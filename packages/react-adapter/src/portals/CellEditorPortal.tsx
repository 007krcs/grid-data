// ─── Cell Editor Portal ───
// Renders a React cell editor component as an absolutely-positioned
// overlay on top of the editing cell.

import { useEffect, useRef, useState, useCallback } from 'react';
import type { GridEngine, GridApi } from '@gridstorm/core';
import type { ReactCellEditor, EditorPortalState } from '../types';

interface CellEditorPortalProps<TData = any> {
  state: EditorPortalState;
  api: GridApi<TData>;
  engine: GridEngine<TData>;
  EditorComponent: ReactCellEditor<TData>;
  editorParams: Record<string, unknown>;
  gridRootRect: DOMRect;
}

export function CellEditorPortal<TData = any>(props: CellEditorPortalProps<TData>) {
  const { state, api, engine, EditorComponent, editorParams, gridRootRect } = props;
  const { editing, cellRect } = state;
  const [value, setValue] = useState(editing.value);
  const containerRef = useRef<HTMLDivElement>(null);

  const onValueChange = useCallback(
    (newValue: any) => {
      setValue(newValue);
      engine.commandBus.dispatch('editing:setValue', { value: newValue });
    },
    [engine],
  );

  const stopEditing = useCallback(
    (cancel?: boolean) => {
      api.stopEditing(cancel);
    },
    [api],
  );

  // Auto-focus the editor on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      const el = containerRef.current;
      if (!el) return;
      const focusable = el.querySelector<HTMLElement>(
        'input, textarea, select, [tabindex]',
      );
      focusable?.focus();
    });
  }, []);

  const column = engine.store
    .getState()
    .columns.find((c) => c.colId === editing.colId)!;

  const node = engine.store.getState().rowNodes.get(editing.rowId);

  // Position relative to the grid root
  const top = cellRect.top - gridRootRect.top;
  const left = cellRect.left - gridRootRect.left;

  return (
    <div
      ref={containerRef}
      className="gs-editor-portal"
      style={{
        position: 'absolute',
        top,
        left,
        width: cellRect.width,
        height: cellRect.height,
        zIndex: 10,
        boxSizing: 'border-box',
        background: 'var(--gs-color-cell-editing-bg, #fff)',
        border: '2px solid var(--gs-color-cell-editing-border, #2196f3)',
      }}
    >
      <EditorComponent
        value={value}
        data={node?.data as TData}
        colId={editing.colId}
        rowId={editing.rowId}
        column={column}
        editorParams={editorParams}
        onValueChange={onValueChange}
        stopEditing={stopEditing}
        api={api}
      />
    </div>
  );
}
