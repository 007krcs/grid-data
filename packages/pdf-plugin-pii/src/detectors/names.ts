import type { PiiMatch } from '../types';

// Pattern: Honorific + Capitalized words
const NAME_AFTER_HONORIFIC =
  /(?:Mr|Mrs|Ms|Miss|Dr|Prof)\.\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/g;

// Pattern: "Name:" or "Patient:" followed by a name
const LABELED_NAME =
  /(?:Name|Patient|Client|Applicant|Employee|Borrower|Tenant):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/g;

export function detectNames(text: string, pageIndex: number): PiiMatch[] {
  const matches: PiiMatch[] = [];

  // Detect names after honorifics
  const honorificRegex = new RegExp(
    NAME_AFTER_HONORIFIC.source,
    NAME_AFTER_HONORIFIC.flags,
  );
  let match: RegExpExecArray | null;

  while ((match = honorificRegex.exec(text)) !== null) {
    matches.push({
      type: 'name',
      value: match[0],
      pageIndex,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      confidence: 0.8,
    });
  }

  // Detect labeled names
  const labeledRegex = new RegExp(LABELED_NAME.source, LABELED_NAME.flags);
  while ((match = labeledRegex.exec(text)) !== null) {
    if (match[1]) {
      matches.push({
        type: 'name',
        value: match[1],
        pageIndex,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.75,
      });
    }
  }

  return matches;
}
