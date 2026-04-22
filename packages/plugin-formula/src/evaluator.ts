// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Formula Evaluator ───
// Walks the AST tree and evaluates expressions.

import type { ASTNode, CellReference, FormulaError, FormulaFunction } from './types';
import { columnLetterToIndex } from './utils';

export type CellResolver = (rowIndex: number, colIndex: number) => unknown;

function isFormulaError(val: unknown): val is FormulaError {
  return (
    val !== null &&
    typeof val === 'object' &&
    'type' in val &&
    'message' in val &&
    typeof (val as FormulaError).type === 'string' &&
    (val as FormulaError).type.startsWith('#')
  );
}

export class Evaluator {
  private functions: Map<string, FormulaFunction>;
  private resolveCell: CellResolver;
  private depth: number;
  private maxDepth: number;

  constructor(
    functions: Map<string, FormulaFunction>,
    resolveCell: CellResolver,
    maxDepth: number = 100,
  ) {
    this.functions = functions;
    this.resolveCell = resolveCell;
    this.depth = 0;
    this.maxDepth = maxDepth;
  }

  evaluate(node: ASTNode): unknown {
    this.depth++;
    if (this.depth > this.maxDepth) {
      this.depth--;
      return { type: '#REF!', message: 'Maximum evaluation depth exceeded' } as FormulaError;
    }

    try {
      const result = this.evalNode(node);
      return result;
    } finally {
      this.depth--;
    }
  }

  private evalNode(node: ASTNode): unknown {
    switch (node.type) {
      case 'NumberLiteral':
        return node.value;
      case 'StringLiteral':
        return node.value;
      case 'BooleanLiteral':
        return node.value;
      case 'CellReference':
        return this.evalCellRef(node);
      case 'RangeReference':
        return this.evalRange(node);
      case 'BinaryExpression':
        return this.evalBinary(node);
      case 'UnaryExpression':
        return this.evalUnary(node);
      case 'FunctionCall':
        return this.evalFunction(node);
      default:
        return { type: '#VALUE!', message: 'Unknown node type' } as FormulaError;
    }
  }

  private evalCellRef(node: CellReference): unknown {
    const colIndex = columnLetterToIndex(node.col);
    const rowIndex = node.row - 1; // Convert from 1-based to 0-based
    return this.resolveCell(rowIndex, colIndex);
  }

  private evalRange(node: { start: CellReference; end: CellReference }): unknown[][] {
    const startCol = columnLetterToIndex(node.start.col);
    const endCol = columnLetterToIndex(node.end.col);
    const startRow = node.start.row - 1;
    const endRow = node.end.row - 1;

    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    const result: unknown[][] = [];
    for (let r = minRow; r <= maxRow; r++) {
      const row: unknown[] = [];
      for (let c = minCol; c <= maxCol; c++) {
        row.push(this.resolveCell(r, c));
      }
      result.push(row);
    }
    return result;
  }

  private evalBinary(node: {
    operator: string;
    left: ASTNode;
    right: ASTNode;
  }): unknown {
    const left = this.evaluate(node.left);
    if (isFormulaError(left)) return left;

    const right = this.evaluate(node.right);
    if (isFormulaError(right)) return right;

    switch (node.operator) {
      case '+':
        return toNum(left) + toNum(right);
      case '-':
        return toNum(left) - toNum(right);
      case '*':
        return toNum(left) * toNum(right);
      case '/': {
        const divisor = toNum(right);
        if (divisor === 0) {
          return { type: '#DIV/0!', message: 'Division by zero' } as FormulaError;
        }
        return toNum(left) / divisor;
      }
      case '^':
        return Math.pow(toNum(left), toNum(right));
      case '&':
        return String(left ?? '') + String(right ?? '');
      case '>':
        return toNum(left) > toNum(right);
      case '<':
        return toNum(left) < toNum(right);
      case '>=':
        return toNum(left) >= toNum(right);
      case '<=':
        return toNum(left) <= toNum(right);
      case '=':
        return left === right || String(left) === String(right);
      case '<>':
        return left !== right && String(left) !== String(right);
      default:
        return {
          type: '#VALUE!',
          message: `Unknown operator: ${node.operator}`,
        } as FormulaError;
    }
  }

  private evalUnary(node: { operator: string; operand: ASTNode }): unknown {
    const operand = this.evaluate(node.operand);
    if (isFormulaError(operand)) return operand;

    if (node.operator === '-') return -toNum(operand);
    if (node.operator === '+') return toNum(operand);
    return {
      type: '#VALUE!',
      message: `Unknown unary operator: ${node.operator}`,
    } as FormulaError;
  }

  private evalFunction(node: { name: string; args: ASTNode[] }): unknown {
    const fn = this.functions.get(node.name);
    if (!fn) {
      return { type: '#NAME?', message: `Unknown function: ${node.name}` } as FormulaError;
    }

    if (node.args.length < fn.minArgs) {
      return {
        type: '#VALUE!',
        message: `${node.name} requires at least ${fn.minArgs} argument(s)`,
      } as FormulaError;
    }
    if (node.args.length > fn.maxArgs) {
      return {
        type: '#VALUE!',
        message: `${node.name} accepts at most ${fn.maxArgs} argument(s)`,
      } as FormulaError;
    }

    // Evaluate arguments
    const resolvedArgs: unknown[] = [];
    for (const arg of node.args) {
      const val = this.evaluate(arg);
      // Propagate errors for non-IFERROR functions
      if (isFormulaError(val) && node.name !== 'IFERROR') {
        return val;
      }
      resolvedArgs.push(val);
    }

    try {
      return fn.evaluate(resolvedArgs);
    } catch (err) {
      return {
        type: '#VALUE!',
        message: `Error in ${node.name}: ${err instanceof Error ? err.message : String(err)}`,
      } as FormulaError;
    }
  }
}

function toNum(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (typeof val === 'string') {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}
