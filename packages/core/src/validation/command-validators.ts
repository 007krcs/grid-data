// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Built-in Command Payload Validators ───
// Lightweight runtime validation for core command payloads.
// Uses the CommandBus.registerValidator() mechanism — no external dependencies.
//
// Each validator returns null on success or an error message string on failure.

import type { CommandBus } from '../events/command-bus';

// ── Primitive helpers ──

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && !isNaN(v);
}

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Register runtime validators for all built-in core commands.
 *
 * Call this once after creating a CommandBus instance (done automatically
 * in createGrid). Validators reject malformed payloads before handlers run,
 * preventing subtle state corruption and improving debugging.
 *
 * @returns A cleanup function that removes all registered validators.
 */
export function registerCoreCommandValidators(commandBus: CommandBus): () => void {
  const removers: Array<() => void> = [];

  // ── sort:set ──
  removers.push(
    commandBus.registerValidator('sort:set', (payload) => {
      if (!isObject(payload)) return 'payload must be an object';
      if (!isArray((payload as any).sortModel)) return '"sortModel" must be an array';
      for (const item of (payload as any).sortModel) {
        if (!isObject(item)) return 'each sortModel item must be an object';
        if (!isString((item as any).colId)) return 'each sortModel item must have a string "colId"';
        if ((item as any).sort !== 'asc' && (item as any).sort !== 'desc') {
          return `sortModel item "sort" must be "asc" or "desc", got: ${JSON.stringify((item as any).sort)}`;
        }
      }
      return null;
    }),
  );

  // ── filter:set ──
  removers.push(
    commandBus.registerValidator('filter:set', (payload) => {
      if (!isObject(payload)) return 'payload must be an object';
      const { filterModel } = payload as any;
      if (filterModel !== undefined && filterModel !== null && !isObject(filterModel)) {
        return '"filterModel" must be an object or null/undefined';
      }
      return null;
    }),
  );

  // ── group:addColumn / group:removeColumn ──
  for (const cmd of ['group:addColumn', 'group:removeColumn'] as const) {
    removers.push(
      commandBus.registerValidator(cmd, (payload) => {
        if (!isObject(payload)) return 'payload must be an object';
        if (!isString((payload as any).colId)) return '"colId" must be a non-empty string';
        if ((payload as any).colId.trim() === '') return '"colId" must not be empty';
        return null;
      }),
    );
  }

  // ── group:setColumns ──
  removers.push(
    commandBus.registerValidator('group:setColumns', (payload) => {
      if (!isObject(payload)) return 'payload must be an object';
      if (!isArray((payload as any).colIds)) return '"colIds" must be an array';
      for (const id of (payload as any).colIds) {
        if (!isString(id)) return 'each entry in "colIds" must be a string';
      }
      return null;
    }),
  );

  // ── group:expand / group:collapse ──
  // These commands accept either a rowId (from RowNode) or a groupId (legacy).
  for (const cmd of ['group:expand', 'group:collapse'] as const) {
    removers.push(
      commandBus.registerValidator(cmd, (payload) => {
        if (!isObject(payload)) return 'payload must be an object';
        const p = payload as any;
        // Accept rowId (standard) or groupId (legacy path)
        if (!isString(p.rowId) && !isString(p.groupId)) {
          return '"rowId" or "groupId" must be a string';
        }
        return null;
      }),
    );
  }

  // ── group:expandToLevel ──
  removers.push(
    commandBus.registerValidator('group:expandToLevel', (payload) => {
      if (!isObject(payload)) return 'payload must be an object';
      if (!isNumber((payload as any).level) || (payload as any).level < 0) {
        return '"level" must be a non-negative number';
      }
      return null;
    }),
  );

  // ── tree:toggle / tree:expand / tree:collapse / tree:getNodeState ──
  for (const cmd of ['tree:toggle', 'tree:expand', 'tree:collapse', 'tree:getNodeState'] as const) {
    removers.push(
      commandBus.registerValidator(cmd, (payload) => {
        if (!isObject(payload)) return 'payload must be an object';
        if (!isString((payload as any).nodeId)) return '"nodeId" must be a string';
        return null;
      }),
    );
  }

  // ── detail:expand / detail:collapse / detail:toggle / detail:refreshDetail ──
  for (const cmd of ['detail:expand', 'detail:collapse', 'detail:toggle', 'detail:refreshDetail'] as const) {
    removers.push(
      commandBus.registerValidator(cmd, (payload) => {
        if (!isObject(payload)) return 'payload must be an object';
        if (!isString((payload as any).nodeId)) return '"nodeId" must be a string';
        return null;
      }),
    );
  }

  // ── row:move ──
  removers.push(
    commandBus.registerValidator('row:move', (payload) => {
      if (!isObject(payload)) return 'payload must be an object';
      if (!isString((payload as any).rowId)) return '"rowId" must be a string';
      // toIndex may be negative — the handler clamps it to valid bounds
      if (!isNumber((payload as any).toIndex)) {
        return '"toIndex" must be a number';
      }
      return null;
    }),
  );

  // ── row:swap ──
  removers.push(
    commandBus.registerValidator('row:swap', (payload) => {
      if (!isObject(payload)) return 'payload must be an object';
      if (!isString((payload as any).rowIdA)) return '"rowIdA" must be a string';
      if (!isString((payload as any).rowIdB)) return '"rowIdB" must be a string';
      return null;
    }),
  );

  // ── ssrm:ensureRows ──
  removers.push(
    commandBus.registerValidator('ssrm:ensureRows', (payload) => {
      if (!isObject(payload)) return 'payload must be an object';
      if (!isNumber((payload as any).startRow) || (payload as any).startRow < 0) {
        return '"startRow" must be a non-negative number';
      }
      if (!isNumber((payload as any).endRow) || (payload as any).endRow < 0) {
        return '"endRow" must be a non-negative number';
      }
      if ((payload as any).endRow < (payload as any).startRow) {
        return '"endRow" must be >= "startRow"';
      }
      return null;
    }),
  );

  return () => {
    for (const remove of removers) remove();
  };
}
