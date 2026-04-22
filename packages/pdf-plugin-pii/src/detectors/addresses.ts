// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
import type { PiiMatch } from '../types';

// US street address pattern
const STREET_ADDRESS =
  /\b\d{1,5}\s+(?:[A-Z][a-z]+\s+){1,3}(?:St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Ln|Lane|Way|Ct|Court|Pl|Place|Cir|Circle)\.?\b/gi;

// State abbreviation + ZIP
const STATE_ZIP = /\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/g;

export function detectAddresses(text: string, pageIndex: number): PiiMatch[] {
  const matches: PiiMatch[] = [];

  // Street addresses
  const streetRegex = new RegExp(STREET_ADDRESS.source, STREET_ADDRESS.flags);
  let match: RegExpExecArray | null;

  while ((match = streetRegex.exec(text)) !== null) {
    matches.push({
      type: 'address',
      value: match[0],
      pageIndex,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      confidence: 0.8,
    });
  }

  // State + ZIP combinations
  const stateZipRegex = new RegExp(STATE_ZIP.source, STATE_ZIP.flags);
  while ((match = stateZipRegex.exec(text)) !== null) {
    matches.push({
      type: 'address',
      value: match[0],
      pageIndex,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      confidence: 0.7,
    });
  }

  return matches;
}
