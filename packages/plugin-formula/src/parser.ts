// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Formula Parser ───
// Recursive descent parser: Token[] -> ASTNode

import type { Token, ASTNode, CellReference } from './types';

export class Parser {
  private tokens: Token[];
  private pos: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.pos = 0;
  }

  parse(): ASTNode {
    const node = this.parseComparison();
    if (this.current().type !== 'EOF') {
      throw new Error(`Unexpected token: ${this.current().value} at position ${this.current().position}`);
    }
    return node;
  }

  private current(): Token {
    return this.tokens[this.pos] ?? { type: 'EOF', value: '', position: -1 };
  }

  private advance(): Token {
    const tok = this.current();
    this.pos++;
    return tok;
  }

  private expect(type: string, value?: string): Token {
    const tok = this.current();
    if (tok.type !== type || (value !== undefined && tok.value !== value)) {
      throw new Error(
        `Expected ${type}${value ? ` '${value}'` : ''} but got ${tok.type} '${tok.value}' at position ${tok.position}`,
      );
    }
    return this.advance();
  }

  // Precedence 1: Comparison operators (>, <, >=, <=, =, <>)
  private parseComparison(): ASTNode {
    let left = this.parseConcatenation();
    while (
      this.current().type === 'OPERATOR' &&
      ['>', '<', '>=', '<=', '=', '<>'].includes(this.current().value)
    ) {
      const op = this.advance().value;
      const right = this.parseConcatenation();
      left = { type: 'BinaryExpression', operator: op, left, right };
    }
    return left;
  }

  // Precedence 2: Concatenation (&)
  private parseConcatenation(): ASTNode {
    let left = this.parseAddition();
    while (this.current().type === 'OPERATOR' && this.current().value === '&') {
      this.advance();
      const right = this.parseAddition();
      left = { type: 'BinaryExpression', operator: '&', left, right };
    }
    return left;
  }

  // Precedence 3: Addition (+, -)
  private parseAddition(): ASTNode {
    let left = this.parseMultiplication();
    while (
      this.current().type === 'OPERATOR' &&
      (this.current().value === '+' || this.current().value === '-')
    ) {
      const op = this.advance().value;
      const right = this.parseMultiplication();
      left = { type: 'BinaryExpression', operator: op, left, right };
    }
    return left;
  }

  // Precedence 4: Multiplication (*, /)
  private parseMultiplication(): ASTNode {
    let left = this.parsePower();
    while (
      this.current().type === 'OPERATOR' &&
      (this.current().value === '*' || this.current().value === '/')
    ) {
      const op = this.advance().value;
      const right = this.parsePower();
      left = { type: 'BinaryExpression', operator: op, left, right };
    }
    return left;
  }

  // Precedence 5: Power (^)
  private parsePower(): ASTNode {
    let left = this.parseUnary();
    while (this.current().type === 'OPERATOR' && this.current().value === '^') {
      this.advance();
      const right = this.parseUnary();
      left = { type: 'BinaryExpression', operator: '^', left, right };
    }
    return left;
  }

  // Precedence 6: Unary (-, +)
  private parseUnary(): ASTNode {
    if (
      this.current().type === 'OPERATOR' &&
      (this.current().value === '-' || this.current().value === '+')
    ) {
      const op = this.advance().value;
      const operand = this.parseUnary();
      return { type: 'UnaryExpression', operator: op, operand };
    }
    return this.parsePrimary();
  }

  // Precedence 7: Primary values
  private parsePrimary(): ASTNode {
    const tok = this.current();

    // Number
    if (tok.type === 'NUMBER') {
      this.advance();
      return { type: 'NumberLiteral', value: parseFloat(tok.value) };
    }

    // String
    if (tok.type === 'STRING') {
      this.advance();
      return { type: 'StringLiteral', value: tok.value };
    }

    // Boolean
    if (tok.type === 'BOOLEAN') {
      this.advance();
      return { type: 'BooleanLiteral', value: tok.value === 'TRUE' };
    }

    // Cell reference — may be followed by : for range
    if (tok.type === 'CELL_REF') {
      const cellRef = this.parseCellRef();
      // Check for range reference (A1:B10)
      if (this.current().type === 'COLON') {
        this.advance(); // skip :
        const endRef = this.parseCellRef();
        return { type: 'RangeReference', start: cellRef, end: endRef };
      }
      return cellRef;
    }

    // Function call
    if (tok.type === 'FUNCTION') {
      return this.parseFunctionCall();
    }

    // Parenthesized expression
    if (tok.type === 'LPAREN') {
      this.advance(); // skip (
      const expr = this.parseComparison();
      this.expect('RPAREN');
      return expr;
    }

    throw new Error(`Unexpected token: ${tok.type} '${tok.value}' at position ${tok.position}`);
  }

  private parseCellRef(): CellReference {
    const tok = this.expect('CELL_REF');
    const match = tok.value.match(/^(\$?)([A-Z]+)(\$?)(\d+)$/);
    if (!match) {
      throw new Error(`Invalid cell reference: ${tok.value}`);
    }
    return {
      type: 'CellReference',
      absCol: match[1] === '$',
      col: match[2]!,
      absRow: match[3] === '$',
      row: parseInt(match[4]!, 10),
    };
  }

  private parseFunctionCall(): ASTNode {
    const nameTok = this.advance(); // function name
    this.expect('LPAREN'); // (
    const args: ASTNode[] = [];

    if (this.current().type !== 'RPAREN') {
      args.push(this.parseComparison());
      while (this.current().type === 'COMMA') {
        this.advance(); // skip ,
        args.push(this.parseComparison());
      }
    }

    this.expect('RPAREN'); // )
    return { type: 'FunctionCall', name: nameTok.value, args };
  }
}

export function parse(tokens: Token[]): ASTNode {
  return new Parser(tokens).parse();
}
