// ─── Command Validator Tests ───
// Verifies that registerCoreCommandValidators correctly validates
// payloads for each built-in core command.

import { describe, it, expect, vi } from 'vitest';
import { CommandBus } from '../events/command-bus';
import { registerCoreCommandValidators } from '../validation/command-validators';
import { ErrorHandler } from '../errors/error-handler';

function makeCommandBus() {
  const bus = new CommandBus();
  const errorHandler = new ErrorHandler();
  errorHandler.setSuppressConsole(true);
  const errors: string[] = [];
  errorHandler.onError(({ error }) => errors.push(error.message));
  bus.setErrorHandler(errorHandler);
  registerCoreCommandValidators(bus);
  return { bus, errors };
}

describe('registerCoreCommandValidators', () => {
  describe('sort:set', () => {
    it('accepts a valid sort model', () => {
      const { bus, errors } = makeCommandBus();
      // Register a handler so the command actually runs
      bus.registerHandler('sort:set', vi.fn());

      bus.dispatch('sort:set', { sortModel: [{ colId: 'name', sort: 'asc' }] });
      expect(errors).toHaveLength(0);
    });

    it('accepts an empty sort model array', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('sort:set', vi.fn());

      bus.dispatch('sort:set', { sortModel: [] });
      expect(errors).toHaveLength(0);
    });

    it('rejects missing sortModel', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('sort:set', vi.fn());

      bus.dispatch('sort:set', {} as any);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('"sortModel" must be an array');
    });

    it('rejects non-array sortModel', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('sort:set', vi.fn());

      bus.dispatch('sort:set', { sortModel: 'asc' } as any);
      expect(errors).toHaveLength(1);
    });

    it('rejects sortModel item without colId', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('sort:set', vi.fn());

      bus.dispatch('sort:set', { sortModel: [{ sort: 'asc' }] } as any);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('"colId"');
    });

    it('rejects sortModel item with invalid sort direction', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('sort:set', vi.fn());

      bus.dispatch('sort:set', { sortModel: [{ colId: 'name', sort: 'random' }] } as any);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('"asc" or "desc"');
    });
  });

  describe('filter:set', () => {
    it('accepts a valid filter model', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('filter:set', vi.fn());

      bus.dispatch('filter:set', { filterModel: { name: { type: 'text', filter: 'Ali' } as any } });
      expect(errors).toHaveLength(0);
    });

    it('accepts undefined filterModel', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('filter:set', vi.fn());

      bus.dispatch('filter:set', { filterModel: undefined });
      expect(errors).toHaveLength(0);
    });

    it('accepts null filterModel', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('filter:set', vi.fn());

      bus.dispatch('filter:set', { filterModel: null } as any);
      expect(errors).toHaveLength(0);
    });

    it('rejects non-object filterModel', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('filter:set', vi.fn());

      bus.dispatch('filter:set', { filterModel: 'invalid' } as any);
      expect(errors).toHaveLength(1);
    });
  });

  describe('group:addColumn / group:removeColumn', () => {
    it('accepts a valid colId', () => {
      for (const cmd of ['group:addColumn', 'group:removeColumn'] as const) {
        const { bus, errors } = makeCommandBus();
        bus.registerHandler(cmd, vi.fn());
        bus.dispatch(cmd, { colId: 'category' });
        expect(errors).toHaveLength(0);
      }
    });

    it('rejects missing colId', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('group:addColumn', vi.fn());

      bus.dispatch('group:addColumn', {} as any);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('"colId"');
    });

    it('rejects empty string colId', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('group:addColumn', vi.fn());

      bus.dispatch('group:addColumn', { colId: '' });
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('empty');
    });
  });

  describe('group:setColumns', () => {
    it('accepts a valid colIds array', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('group:setColumns', vi.fn());

      bus.dispatch('group:setColumns', { colIds: ['category', 'region'] });
      expect(errors).toHaveLength(0);
    });

    it('accepts empty colIds array', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('group:setColumns', vi.fn());

      bus.dispatch('group:setColumns', { colIds: [] });
      expect(errors).toHaveLength(0);
    });

    it('rejects non-array colIds', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('group:setColumns', vi.fn());

      bus.dispatch('group:setColumns', { colIds: 'category' } as any);
      expect(errors).toHaveLength(1);
    });

    it('rejects colIds with non-string entries', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('group:setColumns', vi.fn());

      bus.dispatch('group:setColumns', { colIds: [1, 2] } as any);
      expect(errors).toHaveLength(1);
    });
  });

  describe('group:expand / group:collapse', () => {
    it('accepts valid rowId', () => {
      for (const cmd of ['group:expand', 'group:collapse'] as const) {
        const { bus, errors } = makeCommandBus();
        bus.registerHandler(cmd, vi.fn());
        bus.dispatch(cmd, { rowId: 'row-group-1' } as any);
        expect(errors).toHaveLength(0);
      }
    });

    it('accepts legacy groupId', () => {
      for (const cmd of ['group:expand', 'group:collapse'] as const) {
        const { bus, errors } = makeCommandBus();
        bus.registerHandler(cmd, vi.fn());
        bus.dispatch(cmd, { groupId: 'row-group-1' });
        expect(errors).toHaveLength(0);
      }
    });

    it('rejects missing both rowId and groupId', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('group:expand', vi.fn());

      bus.dispatch('group:expand', {} as any);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('"rowId" or "groupId"');
    });
  });

  describe('group:expandToLevel', () => {
    it('accepts a valid level', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('group:expandToLevel', vi.fn());

      bus.dispatch('group:expandToLevel', { level: 2 });
      expect(errors).toHaveLength(0);
    });

    it('accepts level 0', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('group:expandToLevel', vi.fn());

      bus.dispatch('group:expandToLevel', { level: 0 });
      expect(errors).toHaveLength(0);
    });

    it('rejects negative level', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('group:expandToLevel', vi.fn());

      bus.dispatch('group:expandToLevel', { level: -1 });
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('non-negative');
    });
  });

  describe('tree commands', () => {
    it('accepts valid nodeId for tree:toggle', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('tree:toggle', vi.fn());

      bus.dispatch('tree:toggle', { nodeId: 'node-1' });
      expect(errors).toHaveLength(0);
    });

    it('rejects missing nodeId for tree:expand', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('tree:expand', vi.fn());

      bus.dispatch('tree:expand', {} as any);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('"nodeId"');
    });
  });

  describe('row:move', () => {
    it('accepts valid rowId and toIndex', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('row:move', vi.fn());

      bus.dispatch('row:move', { rowId: 'row-1', toIndex: 3 });
      expect(errors).toHaveLength(0);
    });

    it('rejects missing rowId', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('row:move', vi.fn());

      bus.dispatch('row:move', { toIndex: 3 } as any);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('"rowId"');
    });

    it('accepts negative toIndex (handler clamps it to valid bounds)', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('row:move', vi.fn());

      // Negative indices are allowed — the handler clamps them
      bus.dispatch('row:move', { rowId: 'row-1', toIndex: -1 });
      expect(errors).toHaveLength(0);
    });

    it('rejects non-number toIndex', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('row:move', vi.fn());

      bus.dispatch('row:move', { rowId: 'row-1', toIndex: 'end' as any });
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('"toIndex"');
    });
  });

  describe('row:swap', () => {
    it('accepts valid rowIdA and rowIdB', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('row:swap', vi.fn());

      bus.dispatch('row:swap', { rowIdA: 'row-1', rowIdB: 'row-2' });
      expect(errors).toHaveLength(0);
    });

    it('rejects missing rowIdB', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('row:swap', vi.fn());

      bus.dispatch('row:swap', { rowIdA: 'row-1' } as any);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('"rowIdB"');
    });
  });

  describe('ssrm:ensureRows', () => {
    it('accepts valid startRow and endRow', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('ssrm:ensureRows', vi.fn());

      bus.dispatch('ssrm:ensureRows', { startRow: 0, endRow: 50 });
      expect(errors).toHaveLength(0);
    });

    it('rejects negative startRow', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('ssrm:ensureRows', vi.fn());

      bus.dispatch('ssrm:ensureRows', { startRow: -1, endRow: 50 });
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('"startRow"');
    });

    it('rejects endRow < startRow', () => {
      const { bus, errors } = makeCommandBus();
      bus.registerHandler('ssrm:ensureRows', vi.fn());

      bus.dispatch('ssrm:ensureRows', { startRow: 50, endRow: 10 });
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('"endRow" must be >=');
    });
  });

  describe('cleanup', () => {
    it('removeValidators unregisters all validators', () => {
      const bus = new CommandBus();
      const errorHandler = new ErrorHandler();
      errorHandler.setSuppressConsole(true);
      const errors: string[] = [];
      errorHandler.onError(({ error }) => errors.push(error.message));
      bus.setErrorHandler(errorHandler);

      const remove = registerCoreCommandValidators(bus);
      bus.registerHandler('sort:set', vi.fn());

      // Invalid payload should trigger error
      bus.dispatch('sort:set', {} as any);
      expect(errors).toHaveLength(1);

      // After removing validators, same invalid payload should not trigger error
      remove();
      bus.dispatch('sort:set', {} as any);
      expect(errors).toHaveLength(1); // still 1, no new error
    });

    it('validators are removed when grid is destroyed', async () => {
      const { createGrid } = await import('../engine/grid-engine');
      const errorHandler = new ErrorHandler();
      errorHandler.setSuppressConsole(true);
      const errors: string[] = [];
      errorHandler.onError(({ error }) => errors.push(error.message));

      const engine = createGrid({
        columns: [{ field: 'name' }],
        rowData: [],
      });
      engine.commandBus.setErrorHandler(errorHandler);

      // Dispatch invalid command — should fail validation
      engine.commandBus.dispatch('sort:set', {} as any);
      expect(errors.length).toBeGreaterThan(0);

      const errorCount = errors.length;
      engine.destroy();

      // After destroy, command bus is cleared — no more validators or handlers
      engine.commandBus.dispatch('sort:set', {} as any);
      // No new errors since bus was cleared
      expect(errors.length).toBe(errorCount);
    });
  });
});
