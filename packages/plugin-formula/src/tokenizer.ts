// ─── Formula Tokenizer ───
// Lexer that converts a formula string (without leading `=`) into Token[].

import type { Token, TokenType } from './types';

const OPERATORS = new Set(['+', '-', '*', '/', '^', '>', '<', '=', '&']);
const MULTI_CHAR_OPS = new Set(['>=', '<=', '<>']);

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function isAlpha(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
}

function isAlphaNumeric(ch: string): boolean {
  return isAlpha(ch) || isDigit(ch);
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < input.length) {
    const ch = input[pos]!;

    // Skip whitespace
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      pos++;
      continue;
    }

    // String literals (double-quoted)
    if (ch === '"') {
      const start = pos;
      pos++; // skip opening quote
      let value = '';
      while (pos < input.length && input[pos] !== '"') {
        value += input[pos];
        pos++;
      }
      if (pos < input.length) {
        pos++; // skip closing quote
      }
      tokens.push({ type: 'STRING', value, position: start });
      continue;
    }

    // Numbers
    if (isDigit(ch) || (ch === '.' && pos + 1 < input.length && isDigit(input[pos + 1]!))) {
      const start = pos;
      let numStr = '';
      while (pos < input.length && isDigit(input[pos]!)) {
        numStr += input[pos];
        pos++;
      }
      if (pos < input.length && input[pos] === '.') {
        numStr += '.';
        pos++;
        while (pos < input.length && isDigit(input[pos]!)) {
          numStr += input[pos];
          pos++;
        }
      }
      tokens.push({ type: 'NUMBER', value: numStr, position: start });
      continue;
    }

    // Multi-character operators
    if (pos + 1 < input.length) {
      const twoChar = input[pos]! + input[pos + 1]!;
      if (MULTI_CHAR_OPS.has(twoChar)) {
        tokens.push({ type: 'OPERATOR', value: twoChar, position: pos });
        pos += 2;
        continue;
      }
    }

    // Single-character operators
    if (OPERATORS.has(ch)) {
      tokens.push({ type: 'OPERATOR', value: ch, position: pos });
      pos++;
      continue;
    }

    // Parentheses
    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: '(', position: pos });
      pos++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')', position: pos });
      pos++;
      continue;
    }

    // Comma
    if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ',', position: pos });
      pos++;
      continue;
    }

    // Colon
    if (ch === ':') {
      tokens.push({ type: 'COLON', value: ':', position: pos });
      pos++;
      continue;
    }

    // $ sign — start of absolute cell reference
    if (ch === '$') {
      const result = readCellRef(input, pos);
      if (result) {
        tokens.push(result.token);
        pos = result.newPos;
        continue;
      }
    }

    // Identifiers: function names, cell references, booleans
    if (isAlpha(ch)) {
      const start = pos;
      let ident = '';
      while (pos < input.length && (isAlphaNumeric(input[pos]!) || input[pos] === '$')) {
        ident += input[pos];
        pos++;
      }

      // Check for boolean literals
      const upper = ident.toUpperCase();
      if (upper === 'TRUE' || upper === 'FALSE') {
        tokens.push({ type: 'BOOLEAN', value: upper, position: start });
        continue;
      }

      // Check if it's a function call (identifier followed by open paren)
      if (pos < input.length && input[pos] === '(') {
        tokens.push({ type: 'FUNCTION', value: upper, position: start });
        continue;
      }

      // Check if it looks like a cell reference (letters followed by digits)
      if (isCellRefPattern(ident)) {
        const ref = parseCellRefString(ident);
        tokens.push({ type: 'CELL_REF', value: ident.toUpperCase(), position: start, ...ref } as Token);
        continue;
      }

      // Otherwise treat as a function name (might be used without parens — error)
      tokens.push({ type: 'FUNCTION', value: upper, position: start });
      continue;
    }

    // Unknown character — skip
    pos++;
  }

  tokens.push({ type: 'EOF', value: '', position: pos });
  return tokens;
}

function readCellRef(
  input: string,
  pos: number,
): { token: Token; newPos: number } | null {
  const start = pos;
  let absCol = false;
  let absRow = false;
  let col = '';
  let row = '';
  let p = pos;

  // Optional $ for absolute column
  if (p < input.length && input[p] === '$') {
    absCol = true;
    p++;
  }

  // Column letters
  while (p < input.length && isAlpha(input[p]!)) {
    col += input[p]!.toUpperCase();
    p++;
  }

  if (col.length === 0) return null;

  // Optional $ for absolute row
  if (p < input.length && input[p] === '$') {
    absRow = true;
    p++;
  }

  // Row digits
  while (p < input.length && isDigit(input[p]!)) {
    row += input[p];
    p++;
  }

  if (row.length === 0) return null;

  const value = (absCol ? '$' : '') + col + (absRow ? '$' : '') + row;
  return {
    token: { type: 'CELL_REF' as TokenType, value, position: start },
    newPos: p,
  };
}

function isCellRefPattern(str: string): boolean {
  // Match: optional $ + letters + optional $ + digits
  const match = str.match(/^(\$?)([A-Za-z]+)(\$?)(\d+)$/);
  return match !== null;
}

function parseCellRefString(
  str: string,
): { absCol: boolean; absRow: boolean; col: string; row: string } {
  const match = str.match(/^(\$?)([A-Za-z]+)(\$?)(\d+)$/);
  if (!match) return { absCol: false, absRow: false, col: '', row: '' };
  return {
    absCol: match[1] === '$',
    col: match[2]!.toUpperCase(),
    absRow: match[3] === '$',
    row: match[4]!,
  };
}
