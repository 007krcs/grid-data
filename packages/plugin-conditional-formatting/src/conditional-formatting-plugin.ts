// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Conditional Formatting Plugin ───
// Provides rule-based cell styling (like Excel conditional formatting).
// Evaluates formatting rules against cell values and applies computed
// styles and CSS classes to matching cells.

import type { GridPlugin, PluginContext } from '@gridstorm/core';

// ─── Types ───

export interface CellStyle {
  backgroundColor?: string;
  color?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  borderColor?: string;
}

export type FormattingCondition =
  | { type: 'greaterThan'; value: number }
  | { type: 'lessThan'; value: number }
  | { type: 'between'; min: number; max: number }
  | { type: 'equals'; value: unknown }
  | { type: 'notEquals'; value: unknown }
  | { type: 'contains'; value: string }
  | { type: 'startsWith'; value: string }
  | { type: 'endsWith'; value: string }
  | { type: 'isEmpty' }
  | { type: 'isNotEmpty' }
  | { type: 'custom'; evaluate: (params: { value: unknown; data: unknown; colId: string }) => boolean }
  | { type: 'colorScale'; min: number; max: number; minColor: string; maxColor: string }
  | { type: 'dataBar'; min: number; max: number; color: string }
  | { type: 'iconSet'; thresholds: number[]; icons: string[] }
  | { type: 'duplicates' }
  | { type: 'topN'; count: number }
  | { type: 'bottomN'; count: number }
  | { type: 'aboveAverage' }
  | { type: 'belowAverage' };

export interface FormattingRule {
  id: string;
  /** Column IDs this rule applies to. Empty or undefined = all columns. */
  columns?: string[];
  /** The condition to evaluate */
  condition: FormattingCondition;
  /** The style to apply when condition is true */
  style: CellStyle;
  /** CSS class to add when condition is true */
  cssClass?: string;
  /** Priority — lower number = higher priority */
  priority?: number;
  /** Whether rule is active */
  enabled?: boolean;
}

export interface ConditionalFormattingPluginOptions {
  /** Initial formatting rules */
  rules?: FormattingRule[];
  /** Max rules that can apply to one cell (default: 10) */
  maxRulesPerCell?: number;
}

/** Internal state for the plugin */
interface ConditionalFormattingState {
  rules: FormattingRule[];
  /** Map of "rowId:colId" -> computed result */
  computedStyles: Map<string, ComputedCellFormat>;
}

interface ComputedCellFormat {
  style: CellStyle;
  cssClasses: string[];
  /** For dataBar conditions */
  dataBarPercent?: number;
  /** For iconSet conditions */
  icon?: string;
}

// ─── Color Utilities ───

interface RGB {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RGB {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return { r, g, b };
}

function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

function interpolateColor(color1: string, color2: string, ratio: number): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  return rgbToHex({
    r: rgb1.r + (rgb2.r - rgb1.r) * clampedRatio,
    g: rgb1.g + (rgb2.g - rgb1.g) * clampedRatio,
    b: rgb1.b + (rgb2.b - rgb1.b) * clampedRatio,
  });
}

// ─── Condition Evaluation ───

function evaluateSimpleCondition(
  condition: FormattingCondition,
  value: unknown,
  data: unknown,
  colId: string,
): boolean {
  switch (condition.type) {
    case 'greaterThan':
      return typeof value === 'number' && value > condition.value;

    case 'lessThan':
      return typeof value === 'number' && value < condition.value;

    case 'between':
      return typeof value === 'number' && value >= condition.min && value <= condition.max;

    case 'equals':
      return value === condition.value;

    case 'notEquals':
      return value !== condition.value;

    case 'contains':
      return typeof value === 'string' && value.includes(condition.value);

    case 'startsWith':
      return typeof value === 'string' && value.startsWith(condition.value);

    case 'endsWith':
      return typeof value === 'string' && value.endsWith(condition.value);

    case 'isEmpty':
      return value === null || value === undefined || value === '';

    case 'isNotEmpty':
      return value !== null && value !== undefined && value !== '';

    case 'custom':
      return condition.evaluate({ value, data, colId });

    // Aggregate-dependent types always return true at evaluation time;
    // their styling is computed differently (colorScale, dataBar, iconSet).
    case 'colorScale':
    case 'dataBar':
    case 'iconSet':
      return typeof value === 'number';

    // Statistical conditions require dataset context — handled separately
    case 'duplicates':
    case 'topN':
    case 'bottomN':
    case 'aboveAverage':
    case 'belowAverage':
      // These are pre-computed; return true here as a placeholder.
      // Actual filtering happens in evaluateStatisticalCondition.
      return true;
  }
}

/** Check if a rule applies to the given column */
function ruleAppliesToColumn(rule: FormattingRule, colId: string): boolean {
  if (!rule.columns || rule.columns.length === 0) return true;
  return rule.columns.includes(colId);
}

// ─── Plugin Factory ───

export function ConditionalFormattingPlugin(
  options: ConditionalFormattingPluginOptions = {},
): GridPlugin {
  const { rules: initialRules = [], maxRulesPerCell = 10 } = options;

  return {
    id: 'conditional-formatting',
    name: 'Conditional Formatting',
    version: '0.1.0',

    install(ctx: PluginContext) {
      // ─── State Registration ───
      const stateKey = 'conditionalFormatting';
      const initialState: ConditionalFormattingState = {
        rules: initialRules.map((r) => ({ ...r, enabled: r.enabled ?? true })),
        computedStyles: new Map(),
      };
      ctx.registerState(stateKey, initialState);

      /** Helper to get current plugin state */
      function getPluginState(): ConditionalFormattingState {
        return ctx.getState<ConditionalFormattingState>(stateKey);
      }

      /** Helper to update plugin state */
      function setPluginState(
        updater: (prev: ConditionalFormattingState) => ConditionalFormattingState,
      ): void {
        ctx.setState(stateKey, updater);
      }

      // ─── Core Evaluation Logic ───

      /**
       * Collect all numeric values for a column from the current row data.
       * Used for statistical conditions (topN, bottomN, aboveAverage, etc.).
       */
      function collectColumnValues(colId: string): number[] {
        const state = ctx.store.getState();
        const values: number[] = [];
        for (const [_nodeId, rowNode] of state.rowNodes) {
          if (rowNode.group || !rowNode.data) continue;
          const val = (rowNode.data as Record<string, unknown>)[colId];
          if (typeof val === 'number') {
            values.push(val);
          }
        }
        return values;
      }

      /**
       * Check if a value passes a statistical condition given the full column dataset.
       */
      function evaluateStatisticalCondition(
        condition: FormattingCondition,
        value: unknown,
        colId: string,
      ): boolean {
        if (typeof value !== 'number') return false;

        switch (condition.type) {
          case 'duplicates': {
            const values = collectColumnValues(colId);
            return values.filter((v) => v === value).length > 1;
          }

          case 'topN': {
            const values = collectColumnValues(colId);
            const sorted = [...values].sort((a, b) => b - a);
            const threshold = sorted[Math.min(condition.count - 1, sorted.length - 1)];
            return threshold !== undefined && value >= threshold;
          }

          case 'bottomN': {
            const values = collectColumnValues(colId);
            const sorted = [...values].sort((a, b) => a - b);
            const threshold = sorted[Math.min(condition.count - 1, sorted.length - 1)];
            return threshold !== undefined && value <= threshold;
          }

          case 'aboveAverage': {
            const values = collectColumnValues(colId);
            if (values.length === 0) return false;
            const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
            return value > avg;
          }

          case 'belowAverage': {
            const values = collectColumnValues(colId);
            if (values.length === 0) return false;
            const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
            return value < avg;
          }

          default:
            return false;
        }
      }

      /**
       * Evaluate a single cell against all active rules and produce a computed format.
       */
      function evaluateCell(
        value: unknown,
        data: unknown,
        colId: string,
      ): ComputedCellFormat | null {
        const pluginState = getPluginState();
        const activeRules = pluginState.rules
          .filter((r) => r.enabled !== false && ruleAppliesToColumn(r, colId))
          .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));

        const mergedStyle: CellStyle = {};
        const cssClasses: string[] = [];
        let dataBarPercent: number | undefined;
        let icon: string | undefined;
        let matchCount = 0;

        for (const rule of activeRules) {
          if (matchCount >= maxRulesPerCell) break;

          const { condition } = rule;

          // Check statistical conditions separately
          const isStatistical =
            condition.type === 'duplicates' ||
            condition.type === 'topN' ||
            condition.type === 'bottomN' ||
            condition.type === 'aboveAverage' ||
            condition.type === 'belowAverage';

          let matches: boolean;
          if (isStatistical) {
            matches = evaluateStatisticalCondition(condition, value, colId);
          } else {
            matches = evaluateSimpleCondition(condition, value, data, colId);
          }

          if (!matches) continue;

          matchCount++;

          // Handle special condition types that produce computed values
          if (condition.type === 'colorScale' && typeof value === 'number') {
            const range = condition.max - condition.min;
            const ratio = range === 0 ? 0.5 : (value - condition.min) / range;
            const bgColor = interpolateColor(condition.minColor, condition.maxColor, ratio);
            mergedStyle.backgroundColor = bgColor;
          } else if (condition.type === 'dataBar' && typeof value === 'number') {
            const range = condition.max - condition.min;
            const pct = range === 0 ? 0 : ((value - condition.min) / range) * 100;
            dataBarPercent = Math.max(0, Math.min(100, pct));
            // Apply a linear-gradient background for the data bar
            mergedStyle.backgroundColor =
              `linear-gradient(to right, ${condition.color} ${dataBarPercent}%, transparent ${dataBarPercent}%)`;
          } else if (condition.type === 'iconSet' && typeof value === 'number') {
            // Determine which icon to show based on thresholds
            let iconIndex = condition.icons.length - 1;
            for (let i = 0; i < condition.thresholds.length; i++) {
              if (value < condition.thresholds[i]!) {
                iconIndex = i;
                break;
              }
            }
            icon = condition.icons[Math.min(iconIndex, condition.icons.length - 1)];
          } else {
            // Merge the rule's explicit style
            Object.assign(mergedStyle, rule.style);
          }

          if (rule.cssClass) {
            cssClasses.push(rule.cssClass);
          }
        }

        if (matchCount === 0) return null;

        return { style: mergedStyle, cssClasses, dataBarPercent, icon };
      }

      /**
       * Re-evaluate all rules against all visible cells and update computedStyles.
       */
      function evaluateAllRules(): void {
        const gridState = ctx.store.getState();
        const computed = new Map<string, ComputedCellFormat>();

        for (const [_nodeId, rowNode] of gridState.rowNodes) {
          if (rowNode.group || !rowNode.data) continue;

          const rowId = rowNode.id;

          for (const col of gridState.columns) {
            const cellValue = (rowNode.data as Record<string, unknown>)[col.colId];
            const result = evaluateCell(cellValue, rowNode.data, col.colId);
            if (result) {
              computed.set(`${rowId}:${col.colId}`, result);
            }
          }
        }

        setPluginState((prev) => ({
          ...prev,
          computedStyles: computed,
        }));
      }

      // ─── Command Handlers ───

      const unregAddRule = ctx.commandBus.registerHandler(
        'formatting:addRule',
        (payload: { rule: FormattingRule }) => {
          setPluginState((prev) => ({
            ...prev,
            rules: [...prev.rules, { ...payload.rule, enabled: payload.rule.enabled ?? true }],
          }));
          evaluateAllRules();
        },
      );

      const unregRemoveRule = ctx.commandBus.registerHandler(
        'formatting:removeRule',
        (payload: { ruleId: string }) => {
          setPluginState((prev) => ({
            ...prev,
            rules: prev.rules.filter((r) => r.id !== payload.ruleId),
          }));
          evaluateAllRules();
        },
      );

      const unregUpdateRule = ctx.commandBus.registerHandler(
        'formatting:updateRule',
        (payload: { ruleId: string; updates: Partial<FormattingRule> }) => {
          setPluginState((prev) => ({
            ...prev,
            rules: prev.rules.map((r) =>
              r.id === payload.ruleId ? { ...r, ...payload.updates } : r,
            ),
          }));
          evaluateAllRules();
        },
      );

      const unregClearRules = ctx.commandBus.registerHandler(
        'formatting:clearRules',
        () => {
          setPluginState((_prev) => ({
            rules: [],
            computedStyles: new Map(),
          }));
        },
      );

      const unregSetRules = ctx.commandBus.registerHandler(
        'formatting:setRules',
        (payload: { rules: FormattingRule[] }) => {
          setPluginState((_prev) => ({
            rules: payload.rules.map((r) => ({ ...r, enabled: r.enabled ?? true })),
            computedStyles: new Map(),
          }));
          evaluateAllRules();
        },
      );

      const unregEvaluate = ctx.commandBus.registerHandler(
        'formatting:evaluate',
        () => {
          evaluateAllRules();
        },
      );

      // ─── Cell Renderer ───

      ctx.registerCellRenderer('condFormat', (params) => {
        const pluginState = getPluginState();
        const key = `${params.node.id}:${params.colId}`;
        const format = pluginState.computedStyles.get(key);

        const container = document.createElement('span');
        container.textContent = params.value != null ? String(params.value) : '';

        if (format) {
          // Apply inline styles
          if (format.style.backgroundColor) {
            // dataBar uses linear-gradient which needs 'background', not 'backgroundColor'
            if (format.style.backgroundColor.startsWith('linear-gradient')) {
              container.style.background = format.style.backgroundColor;
            } else {
              container.style.backgroundColor = format.style.backgroundColor;
            }
          }
          if (format.style.color) container.style.color = format.style.color;
          if (format.style.fontWeight) container.style.fontWeight = format.style.fontWeight;
          if (format.style.fontStyle) container.style.fontStyle = format.style.fontStyle;
          if (format.style.textDecoration)
            container.style.textDecoration = format.style.textDecoration;
          if (format.style.borderColor)
            container.style.border = `1px solid ${format.style.borderColor}`;

          // Apply CSS classes
          for (const cls of format.cssClasses) {
            container.classList.add(cls);
          }

          // Prepend icon if present
          if (format.icon) {
            const iconSpan = document.createElement('span');
            iconSpan.classList.add('gs-cond-format-icon');
            iconSpan.textContent = format.icon;
            iconSpan.style.marginRight = '4px';
            container.prepend(iconSpan);
          }
        }

        return container;
      });

      // ─── Initial Evaluation ───

      if (initialRules.length > 0) {
        // Defer initial evaluation to allow grid data to be loaded first
        queueMicrotask(() => {
          evaluateAllRules();
        });
      }

      // ─── Cleanup ───

      return () => {
        unregAddRule();
        unregRemoveRule();
        unregUpdateRule();
        unregClearRules();
        unregSetRules();
        unregEvaluate();
      };
    },
  };
}
