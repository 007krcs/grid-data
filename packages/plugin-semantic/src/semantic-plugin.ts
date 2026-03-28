// ─── Semantic Detection Plugin ───
// Analyzes column values to detect semantic data types and mathematical
// relationships between numeric columns.

import type { GridPlugin, PluginContext } from '@gridstorm/core';
import type {
  SemanticType,
  SemanticDetectionResult,
  ColumnSemantics,
  ColumnRelationship,
  SemanticAnalysis,
  SemanticPluginOptions,
} from './types';

// ─── Pattern definitions ───

const PATTERNS: Record<SemanticType, RegExp> = {
  'email': /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  'url': /^https?:\/\/.+/,
  'phone': /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
  'ip-address': /^(\d{1,3}\.){3}\d{1,3}$/,
  'uuid': /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'postal-code': /^\d{5}(-\d{4})?$|^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i,
  'country-code': /^[A-Z]{2,3}$/,
  'percentage': /^-?\d+(\.\d+)?%$/,
  'currency': /^[$€£¥₹]?\s?-?\d{1,3}(,\d{3})*(\.\d{2})?$/,
  'date': /^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/,
  'datetime': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,
  'boolean': /^(true|false|yes|no|1|0|on|off)$/i,
  'id': /^\d+$|^[A-Z]{2,4}\d+$/,
  'integer': /^-?\d+$/,
  'decimal': /^-?\d+\.\d+$/,
  'name': /^[A-Z][a-z]+ [A-Z][a-z]+$/,
  'text': /^.{10,}$/,
  'unknown': /.*/,
};

// Priority order: more specific types first
const TYPE_PRIORITY: SemanticType[] = [
  'email', 'url', 'uuid', 'datetime', 'date', 'ip-address',
  'phone', 'ssn' as SemanticType, 'credit-card' as SemanticType,
  'iban' as SemanticType, 'postal-code', 'percentage', 'currency',
  'boolean', 'country-code', 'name', 'id', 'decimal', 'integer',
  'text', 'unknown',
].filter((t) => t in PATTERNS) as SemanticType[];

// ─── Core detection ───

export function detectSemanticType(
  values: unknown[],
  sampleSize: number,
  minConfidence: number,
): SemanticDetectionResult[] {
  const sample = values
    .filter((v) => v !== null && v !== undefined && v !== '')
    .slice(0, sampleSize)
    .map((v) => String(v));

  const total = sample.length;
  if (total === 0) return [{ type: 'unknown', confidence: 1, sampleMatches: 0, sampleTotal: 0 }];

  const results: SemanticDetectionResult[] = [];

  for (const type of TYPE_PRIORITY) {
    if (type === 'unknown') continue;
    const pattern = PATTERNS[type];
    const matches = sample.filter((v) => pattern.test(v)).length;
    const confidence = matches / total;
    if (confidence >= minConfidence) {
      results.push({ type, confidence, sampleMatches: matches, sampleTotal: total });
    }
  }

  // Always add unknown as fallback
  results.push({ type: 'unknown', confidence: 1, sampleMatches: total, sampleTotal: total });

  // Sort descending by confidence
  results.sort((a, b) => b.confidence - a.confidence);

  return results;
}

// ─── Relationship detection ───

function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denomX = 0;
  let denomY = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] ?? 0) - meanX;
    const dy = (ys[i] ?? 0) - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  const denom = Math.sqrt(denomX * denomY);
  return denom === 0 ? 0 : num / denom;
}

export function detectRelationships(
  columnSemantics: ColumnSemantics[],
  rows: unknown[][],
): ColumnRelationship[] {
  const relationships: ColumnRelationship[] = [];
  const numericColumns = columnSemantics.filter(
    (c) => c.detectedType === 'integer' || c.detectedType === 'decimal' || c.detectedType === 'currency',
  );

  for (let i = 0; i < numericColumns.length; i++) {
    for (let j = i + 1; j < numericColumns.length; j++) {
      const colA = numericColumns[i]!;
      const colB = numericColumns[j]!;
      const idxA = columnSemantics.indexOf(colA);
      const idxB = columnSemantics.indexOf(colB);

      const xs: number[] = [];
      const ys: number[] = [];
      for (const row of rows) {
        const vA = row[idxA];
        const vB = row[idxB];
        if (typeof vA === 'number' && typeof vB === 'number') {
          xs.push(vA);
          ys.push(vB);
        }
      }

      if (xs.length < 3) continue;

      const r = pearsonCorrelation(xs, ys);
      const absR = Math.abs(r);

      if (absR > 0.8) {
        const relType = r > 0 ? 'correlated' : 'inverse';
        relationships.push({
          columnA: colA.columnId,
          columnB: colB.columnId,
          relationshipType: relType,
          strength: absR,
          description: `${relType} relationship (r=${r.toFixed(3)})`,
        });
      }

      // Check for derived relationship: does A ≈ B * constant?
      if (xs.length >= 3) {
        const ratios = xs.map((x, k) => {
          const y = ys[k] ?? 0;
          return y !== 0 ? x / y : null;
        }).filter((v): v is number => v !== null);

        if (ratios.length >= 3) {
          const meanRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
          const variance = ratios.reduce((a, b) => a + (b - meanRatio) ** 2, 0) / ratios.length;
          const cv = Math.sqrt(variance) / Math.abs(meanRatio);
          if (cv < 0.05 && absR <= 0.8) {
            relationships.push({
              columnA: colA.columnId,
              columnB: colB.columnId,
              relationshipType: 'derived',
              strength: 1 - cv,
              description: `${colA.columnId} ≈ ${meanRatio.toFixed(3)} × ${colB.columnId}`,
            });
          }
        }
      }
    }
  }

  return relationships;
}

// ─── Plugin factory ───

export function SemanticPlugin(options: SemanticPluginOptions = {}): GridPlugin {
  return {
    id: 'semantic',
    name: 'Semantic Detection',
    version: '0.1.0',

    install(ctx: PluginContext) {
      const unsubscribers: Array<() => void> = [];
      let currentOptions: Required<SemanticPluginOptions> = {
        sampleSize: options.sampleSize ?? 200,
        minConfidence: options.minConfidence ?? 0.6,
        autoAnalyze: options.autoAnalyze ?? true,
        detectRelationships: options.detectRelationships ?? true,
      };

      const bus = ctx.eventBus as unknown as {
        emit: (event: string, payload: unknown) => void;
      };

      let lastAnalysis: SemanticAnalysis | null = null;

      // ─── Analysis logic ───
      function runAnalysis(columnIds?: string[]): void {
        const allColumns = ctx.api.getAllColumns();
        const targetColumns = columnIds
          ? allColumns.filter((c) => {
              const col = c as unknown as { id?: string; colId?: string; field?: string };
              const id = col.id ?? col.colId ?? col.field ?? '';
              return columnIds.includes(id);
            })
          : allColumns;

        const rows: unknown[][] = [];
        ctx.api.forEachNode((node) => {
          const n = node as unknown as { data?: unknown };
          if (n.data && typeof n.data === 'object') {
            rows.push(Object.values(n.data as Record<string, unknown>));
          }
        });

        const columnSemanticsResults: ColumnSemantics[] = [];

        for (const col of targetColumns) {
          const c = col as unknown as { id?: string; colId?: string; field?: string };
          const columnId = c.id ?? c.colId ?? c.field ?? String(col);

          const colIndex = allColumns.indexOf(col);
          const colValues = rows.map((r) => r[colIndex]);
          const nonNullValues = colValues.filter((v) => v !== null && v !== undefined);

          const detectionResults = detectSemanticType(colValues, currentOptions.sampleSize, currentOptions.minConfidence);
          const best = detectionResults[0] ?? { type: 'unknown' as SemanticType, confidence: 1, sampleMatches: 0, sampleTotal: 0 };

          const uniqueValues = new Set(nonNullValues.map(String));
          const numericVals = nonNullValues.filter((v): v is number => typeof v === 'number');
          const numericRange = numericVals.length > 0
            ? { min: Math.min(...numericVals), max: Math.max(...numericVals) }
            : undefined;

          let isMonotonic: boolean | undefined;
          if (numericVals.length > 1) {
            isMonotonic = numericVals.every((v, i) => i === 0 || v >= (numericVals[i - 1] ?? 0));
          }

          const result: ColumnSemantics = {
            columnId,
            detectedType: best.type,
            confidence: best.confidence,
            alternativeTypes: detectionResults.slice(1),
            statistics: {
              cardinality: uniqueValues.size,
              nullCount: colValues.length - nonNullValues.length,
              sampleSize: colValues.length,
              isMonotonic,
              numericRange,
            },
            analyzedAt: Date.now(),
          };

          columnSemanticsResults.push(result);
          bus.emit('semantic:column-typed', result);
        }

        const relationships: ColumnRelationship[] = currentOptions.detectRelationships
          ? detectRelationships(columnSemanticsResults, rows)
          : [];

        for (const rel of relationships) {
          bus.emit('semantic:relationship-detected', rel);
        }

        lastAnalysis = {
          columns: columnSemanticsResults,
          relationships,
          analyzedAt: Date.now(),
        };

        bus.emit('semantic:analysis-complete', lastAnalysis);
      }

      // ─── semantic:analyze ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('semantic:analyze', (payload: unknown) => {
          const p = payload as { columnIds?: string[] } | undefined;
          runAnalysis(p?.columnIds);
        }),
      );

      // ─── semantic:configure ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('semantic:configure', (payload: unknown) => {
          const p = payload as Partial<SemanticPluginOptions>;
          currentOptions = { ...currentOptions, ...p };
        }),
      );

      // ─── semantic:get-analysis ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('semantic:get-analysis', () => {
          if (lastAnalysis !== null) {
            bus.emit('semantic:analysis-complete', lastAnalysis);
          } else {
            runAnalysis();
          }
        }),
      );

      // ─── Auto-analyze on data:changed ───
      unsubscribers.push(
        ctx.eventBus.on('data:changed', () => {
          if (currentOptions.autoAnalyze) {
            runAnalysis();
          }
        }),
      );

      // ─── Auto-analyze on grid:ready ───
      unsubscribers.push(
        ctx.eventBus.on('grid:ready', () => {
          if (currentOptions.autoAnalyze) {
            runAnalysis();
          }
        }),
      );

      return () => {
        for (const u of unsubscribers) u();
      };
    },
  };
}
