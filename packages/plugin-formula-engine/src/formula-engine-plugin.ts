// ─── Formula Engine Plugin ───
// Extends the base formula plugin with 50+ Excel-compatible functions,
// named ranges, and array formula support.

import type { GridPlugin, PluginContext } from '@gridstorm/core';
import type { FormulaEnginePluginOptions, FormulaEngineState, NamedRange } from './types';
import { createExtendedFunctions } from './extended-functions';
import { createNamedRange, isValidRangeName } from './named-ranges';

const STATE_KEY = 'formula-engine';

export function FormulaEnginePlugin(options: FormulaEnginePluginOptions = {}): GridPlugin {
  void options.arrayFormulas; // reserved for future use

  return {
    id: 'formula-engine',
    name: 'Formula Engine (Excel-Compatible)',
    version: '0.1.2',
    dependencies: ['formula'],

    install(ctx: PluginContext) {
      // Register state
      const initialRanges = new Map<string, NamedRange>();
      if (options.namedRanges) {
        for (const [name, range] of Object.entries(options.namedRanges)) {
          if (isValidRangeName(name)) {
            initialRanges.set(name.toUpperCase(), createNamedRange(name, range));
          }
        }
      }

      ctx.registerState<FormulaEngineState>(STATE_KEY, {
        namedRanges: initialRanges,
        arrayFormulas: new Map(),
      });

      // Register all extended functions with the base formula plugin
      const extendedFunctions = createExtendedFunctions();
      ctx.commandBus.dispatch('formula:registerFunctions' as any, {
        functions: extendedFunctions,
      });

      // ── Commands ──

      const unregSetRange = ctx.commandBus.registerHandler(
        'formula-engine:setNamedRange' as any,
        (payload: { name: string; range: string }) => {
          if (!isValidRangeName(payload.name)) return;
          const namedRange = createNamedRange(payload.name, payload.range);
          ctx.setState<FormulaEngineState>(STATE_KEY, (prev: FormulaEngineState) => {
            const newRanges = new Map(prev.namedRanges);
            newRanges.set(namedRange.name, namedRange);
            return { ...prev, namedRanges: newRanges };
          });

          (ctx.eventBus as any).emit('formula-engine:namedRangeChanged', {
            action: 'set',
            name: namedRange.name,
            range: payload.range,
          });
        },
      );

      const unregRemoveRange = ctx.commandBus.registerHandler(
        'formula-engine:removeNamedRange' as any,
        (payload: { name: string }) => {
          const upperName = payload.name.toUpperCase();
          ctx.setState<FormulaEngineState>(STATE_KEY, (prev: FormulaEngineState) => {
            const newRanges = new Map(prev.namedRanges);
            newRanges.delete(upperName);
            return { ...prev, namedRanges: newRanges };
          });

          (ctx.eventBus as any).emit('formula-engine:namedRangeChanged', {
            action: 'remove',
            name: upperName,
          });
        },
      );

      const unregGetRanges = ctx.commandBus.registerHandler(
        'formula-engine:getNamedRanges' as any,
        (_payload: unknown) => {
          const state = ctx.getState<FormulaEngineState>(STATE_KEY);
          (ctx.eventBus as any).emit('formula-engine:namedRanges', {
            ranges: Object.fromEntries(state.namedRanges),
          });
        },
      );

      // ── Disposer ──

      return () => {
        unregSetRange();
        unregRemoveRange();
        unregGetRanges();
      };
    },
  };
}
