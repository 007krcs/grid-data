import type { PiiMatch, PiiType } from '../types';

interface PatternDef {
  type: PiiType;
  pattern: RegExp;
  confidence: number;
  validate?: (match: string) => boolean;
}

const PATTERNS: PatternDef[] = [
  // Email
  {
    type: 'email',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    confidence: 0.95,
  },

  // US Phone numbers
  {
    type: 'phone',
    pattern: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    confidence: 0.85,
  },

  // SSN (US Social Security Number)
  {
    type: 'ssn',
    pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    confidence: 0.9,
    validate: (m) => {
      const clean = m.replace(/[-\s]/g, '');
      return (
        clean.length === 9 &&
        !/^0{3}/.test(clean) &&
        !/^.{3}0{2}/.test(clean)
      );
    },
  },

  // Credit card numbers (Visa, MC, Amex, Discover)
  {
    type: 'credit-card',
    pattern:
      /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    confidence: 0.9,
  },

  // Date of birth patterns
  {
    type: 'date-of-birth',
    pattern:
      /\b(?:0[1-9]|1[0-2])[/\-](?:0[1-9]|[12]\d|3[01])[/\-](?:19|20)\d{2}\b/g,
    confidence: 0.7,
  },

  // IP addresses
  {
    type: 'ip-address',
    pattern:
      /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
    confidence: 0.9,
  },

  // Passport (US format)
  {
    type: 'passport',
    pattern: /\b[A-Z]\d{8}\b/g,
    confidence: 0.6,
  },
];

export function detectPatterns(
  text: string,
  pageIndex: number,
  enabledTypes?: PiiType[],
): PiiMatch[] {
  const matches: PiiMatch[] = [];

  for (const def of PATTERNS) {
    if (enabledTypes && !enabledTypes.includes(def.type)) continue;

    // Reset regex lastIndex
    const regex = new RegExp(def.pattern.source, def.pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const value = match[0];

      // Run validator if present
      if (def.validate && !def.validate(value)) continue;

      matches.push({
        type: def.type,
        value,
        pageIndex,
        startIndex: match.index,
        endIndex: match.index + value.length,
        confidence: def.confidence,
      });
    }
  }

  return matches;
}
