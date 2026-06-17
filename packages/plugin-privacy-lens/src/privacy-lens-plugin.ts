// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Privacy Lens Plugin ───
// Scans grid cell values for PII using pattern recognition.
// Masks sensitive values and generates GDPR/CCPA data maps.

import type { GridPlugin, PluginContext } from '@gridstorm/core';
import type {
  PiiCategory,
  PrivacyColumnConfig,
  PrivacyAuditEntry,
  PrivacyDataMap,
  PrivacyLensOptions,
} from './types';

// ─── PII detection patterns ───

const PII_PATTERNS: Record<PiiCategory, RegExp> = {
  'email': /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  'phone': /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
  'ssn': /^\d{3}-\d{2}-\d{4}$|^\d{9}$/,
  'credit-card': /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})$/,
  'ip-address': /^(\d{1,3}\.){3}\d{1,3}$/,
  'full-name': /^[A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?$/,
  'iban': /^[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}$/,
  'passport': /^[A-Z]{1,2}\d{6,9}$/,
  'date-of-birth': /^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/,
  'national-id': /^\d{8,12}$|^[A-Z]\d{7}$/,
  'address': /\d+\s+[A-Z][a-z]+\s+(St|Ave|Rd|Blvd|Dr|Ln|Ct|Way)/,
  'medical-record': /^MRN-?\d{6,10}$|^MED-\d+$/,
};

// ─── Masking utility ───

export function maskValue(value: string, maskChar: string, maskLength: number): string {
  if (maskLength > 0 && value.length > maskLength) {
    return value.slice(0, maskLength) + maskChar.repeat(Math.max(value.length - maskLength, 3));
  }
  return maskChar.repeat(Math.min(value.length, 8));
}

// ─── Public getMaskedValue utility ───

export function getMaskedValue(value: unknown, config: PrivacyColumnConfig): string {
  if (!config.masked) return String(value ?? '');
  const str = String(value ?? '');
  const char = config.maskChar ?? '*';
  const len = config.maskLength ?? 0;
  return maskValue(str, char, len);
}

// ─── Scan a list of string values for PII categories ───

// Real PII tokens (emails, phones, SSNs, credit cards, IBANs, etc.) all
// fit comfortably under 256 chars. Capping defends against ReDoS on
// attacker-controlled cell strings before any of the PII_PATTERNS regexes
// see the input.
const MAX_INPUT_LEN = 256;

function isShortEnough(v: string): boolean {
  return typeof v === 'string' && v.length <= MAX_INPUT_LEN;
}

function detectPiiCategories(values: string[]): { categories: PiiCategory[]; confidence: number } {
  const matched = new Set<PiiCategory>();
  const safeValues = values.filter(isShortEnough);
  const total = safeValues.length;
  if (total === 0) return { categories: [], confidence: 0 };

  let totalMatches = 0;

  for (const [category, pattern] of Object.entries(PII_PATTERNS) as [PiiCategory, RegExp][]) {
    const count = safeValues.filter((v) => pattern.test(v)).length;
    if (count / total >= 0.3) {
      matched.add(category);
      totalMatches += count;
    }
  }

  const confidence = matched.size > 0 ? Math.min(totalMatches / (total * matched.size), 1) : 0;
  return { categories: [...matched], confidence };
}

// ─── Plugin factory ───

export function PrivacyLensPlugin(options: PrivacyLensOptions = {}): GridPlugin {
  return {
    id: 'privacy-lens',
    name: 'Privacy Lens',
    version: '0.1.0',

    install(ctx: PluginContext) {
      const unsubscribers: Array<() => void> = [];

      const bus = ctx.eventBus as unknown as {
        emit: (event: string, payload: unknown) => void;
        on: (event: string, listener: (p: unknown) => void) => () => void;
      };

      // Internal state
      const columnConfigs = new Map<string, PrivacyColumnConfig>();
      const auditLog: PrivacyAuditEntry[] = [];

      let currentOptions: Required<Omit<PrivacyLensOptions, 'onReveal' | 'columns'>> & {
        onReveal?: PrivacyLensOptions['onReveal'];
        columns?: PrivacyLensOptions['columns'];
      } = {
        autoDetect: options.autoDetect ?? true,
        defaultRevealPolicy: options.defaultRevealPolicy ?? 'on-click',
        defaultMaskChar: options.defaultMaskChar ?? '*',
        auditLog: options.auditLog ?? true,
        onReveal: options.onReveal,
        columns: options.columns,
      };

      // Load initial column configs
      if (currentOptions.columns) {
        for (const col of currentOptions.columns) {
          columnConfigs.set(col.columnId, col);
        }
      }

      // ─── Helper: get row count for a column ───
      function getRowCountForColumn(_columnId: string): number {
        let count = 0;
        ctx.api.forEachNode(() => { count++; });
        return count;
      }

      // ─── Helper: get column values ───
      function getColumnValues(columnId: string): string[] {
        const values: string[] = [];
        ctx.api.forEachNode((node) => {
          const n = node as unknown as { data?: Record<string, unknown>; id?: string };
          if (n.data) {
            const v = n.data[columnId];
            if (v !== null && v !== undefined) {
              values.push(String(v));
            }
          }
        });
        return values;
      }

      // ─── privacy:configure ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('privacy:configure', (payload: unknown) => {
          const config = payload as PrivacyColumnConfig;
          columnConfigs.set(config.columnId, { ...config });
        }),
      );

      // ─── privacy:mask ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('privacy:mask', (payload: unknown) => {
          const { columnId } = payload as { columnId: string };
          const existing = columnConfigs.get(columnId);
          if (existing) {
            existing.masked = true;
          } else {
            columnConfigs.set(columnId, {
              columnId,
              piiCategories: [],
              masked: true,
              revealPolicy: currentOptions.defaultRevealPolicy,
              maskChar: currentOptions.defaultMaskChar,
              maskLength: 0,
            });
          }
          bus.emit('privacy:column-masked', { columnId });
        }),
      );

      // ─── privacy:unmask ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('privacy:unmask', (payload: unknown) => {
          const { columnId } = payload as { columnId: string };
          const existing = columnConfigs.get(columnId);
          if (existing) {
            existing.masked = false;
          }
          bus.emit('privacy:column-unmasked', { columnId });
        }),
      );

      // ─── privacy:reveal-cell ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('privacy:reveal-cell', (payload: unknown) => {
          const { columnId, rowId, userId } = payload as { columnId: string; rowId: string; userId?: string };
          const entry: PrivacyAuditEntry = {
            userId,
            columnId,
            rowId,
            action: 'revealed',
            timestamp: Date.now(),
          };
          if (currentOptions.auditLog) {
            auditLog.push(entry);
          }
          currentOptions.onReveal?.(entry);
          bus.emit('privacy:cell-revealed', entry);
        }),
      );

      // ─── privacy:scan-column ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('privacy:scan-column', (payload: unknown) => {
          const { columnId } = payload as { columnId: string };
          const values = getColumnValues(columnId);
          const { categories, confidence } = detectPiiCategories(values);

          if (categories.length > 0) {
            const existing = columnConfigs.get(columnId);
            if (existing) {
              existing.piiCategories = [...new Set([...existing.piiCategories, ...categories])];
            } else {
              columnConfigs.set(columnId, {
                columnId,
                piiCategories: categories,
                masked: false,
                revealPolicy: currentOptions.defaultRevealPolicy,
                maskChar: currentOptions.defaultMaskChar,
                maskLength: 0,
              });
            }
            bus.emit('privacy:pii-detected', { columnId, piiCategories: categories, confidence });
          }
        }),
      );

      // ─── privacy:export-map ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('privacy:export-map', () => {
          let totalPiiCells = 0;
          const columns = [...columnConfigs.values()]
            .filter((c) => c.piiCategories.length > 0)
            .map((c) => {
              const rowCount = getRowCountForColumn(c.columnId);
              totalPiiCells += rowCount;
              return {
                columnId: c.columnId,
                piiCategories: c.piiCategories,
                rowCount,
                masked: c.masked,
                revealPolicy: c.revealPolicy,
              };
            });

          // Log export action for all PII columns
          if (currentOptions.auditLog) {
            for (const col of columns) {
              auditLog.push({
                columnId: col.columnId,
                rowId: '*',
                action: 'exported',
                timestamp: Date.now(),
              });
            }
          }

          const dataMap: PrivacyDataMap = {
            columns,
            generatedAt: Date.now(),
            totalPiiColumns: columns.length,
            totalPiiCells,
          };
          bus.emit('privacy:map-exported', dataMap);
        }),
      );

      // ─── privacy:get-audit ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('privacy:get-audit', () => {
          bus.emit('privacy:audit-listed', { entries: [...auditLog] });
        }),
      );

      // ─── Auto-detect on data:changed ───
      unsubscribers.push(
        bus.on('data:changed', () => {
          if (currentOptions.autoDetect) {
            const allColumns = ctx.api.getAllColumns();
            for (const col of allColumns) {
              const c = col as unknown as { id?: string; colId?: string; field?: string };
              const columnId = c.id ?? c.colId ?? c.field ?? String(col);
              const values = getColumnValues(columnId);
              const { categories, confidence } = detectPiiCategories(values);
              if (categories.length > 0) {
                const existing = columnConfigs.get(columnId);
                if (existing) {
                  existing.piiCategories = [...new Set([...existing.piiCategories, ...categories])];
                } else {
                  columnConfigs.set(columnId, {
                    columnId,
                    piiCategories: categories,
                    masked: false,
                    revealPolicy: currentOptions.defaultRevealPolicy,
                    maskChar: currentOptions.defaultMaskChar,
                    maskLength: 0,
                  });
                }
                bus.emit('privacy:pii-detected', { columnId, piiCategories: categories, confidence });
              }
            }
          }
        }),
      );

      return () => {
        for (const u of unsubscribers) u();
      };
    },
  };
}
