// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Formula Plugin Types ───

// Token types for the lexer
export type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'BOOLEAN'
  | 'CELL_REF'
  | 'RANGE_REF'
  | 'FUNCTION'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'COLON'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

// AST node types
export type ASTNode =
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | CellReference
  | RangeReference
  | BinaryExpression
  | UnaryExpression
  | FunctionCall;

export interface NumberLiteral {
  type: 'NumberLiteral';
  value: number;
}

export interface StringLiteral {
  type: 'StringLiteral';
  value: string;
}

export interface BooleanLiteral {
  type: 'BooleanLiteral';
  value: boolean;
}

export interface CellReference {
  type: 'CellReference';
  col: string;
  row: number;
  absCol: boolean;
  absRow: boolean;
}

export interface RangeReference {
  type: 'RangeReference';
  start: CellReference;
  end: CellReference;
}

export interface BinaryExpression {
  type: 'BinaryExpression';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryExpression {
  type: 'UnaryExpression';
  operator: string;
  operand: ASTNode;
}

export interface FunctionCall {
  type: 'FunctionCall';
  name: string;
  args: ASTNode[];
}

// Cell formula stored on a cell
export interface CellFormula {
  raw: string;
  ast: ASTNode;
  dependencies: CellAddress[];
  cachedValue: unknown;
  error?: FormulaError;
}

export interface CellAddress {
  rowIndex: number;
  colIndex: number;
}

export type FormulaError =
  | { type: '#REF!'; message: string }
  | { type: '#VALUE!'; message: string }
  | { type: '#DIV/0!'; message: string }
  | { type: '#NAME?'; message: string }
  | { type: '#CIRC!'; message: string }
  | { type: '#N/A'; message: string };

export interface FormulaFunction {
  name: string;
  minArgs: number;
  maxArgs: number;
  evaluate: (args: unknown[]) => unknown;
}

export interface FormulaState {
  formulas: Map<string, CellFormula>;
  errors: Map<string, FormulaError>;
  isEvaluating: boolean;
}

export interface FormulaPluginOptions {
  customFunctions?: FormulaFunction[];
  maxDepth?: number;
  columnMapping?: 'auto' | Record<string, string>;
}
