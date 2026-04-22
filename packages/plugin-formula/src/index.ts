// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── @gridstorm/plugin-formula — Public API ───

export { FormulaPlugin } from './formula-plugin';
export { tokenize } from './tokenizer';
export { parse, Parser } from './parser';
export { Evaluator } from './evaluator';
export { DependencyGraph } from './dependency-graph';
export { builtinFunctions, createFunctionRegistry } from './functions';
export { columnLetterToIndex, columnIndexToLetter, cellKey } from './utils';
export type {
  TokenType,
  Token,
  ASTNode,
  NumberLiteral,
  StringLiteral,
  BooleanLiteral,
  CellReference,
  RangeReference,
  BinaryExpression,
  UnaryExpression,
  FunctionCall,
  CellFormula,
  CellAddress,
  FormulaError,
  FormulaFunction,
  FormulaState,
  FormulaPluginOptions,
} from './types';
