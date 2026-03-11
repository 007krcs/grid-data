import type { PiiMatch } from './types';

export function deduplicateMatches(matches: PiiMatch[]): PiiMatch[] {
  // Sort by startIndex, then by confidence (highest first)
  const sorted = [...matches].sort((a, b) => {
    if (a.pageIndex !== b.pageIndex) return a.pageIndex - b.pageIndex;
    if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
    return b.confidence - a.confidence;
  });

  const result: PiiMatch[] = [];
  for (const match of sorted) {
    // Check if this match overlaps with the last added match on the same page
    const last = result[result.length - 1];
    if (
      last &&
      last.pageIndex === match.pageIndex &&
      match.startIndex < last.endIndex
    ) {
      // Overlapping — keep the one with higher confidence (already there)
      continue;
    }
    result.push(match);
  }

  return result;
}

export function filterByThreshold(
  matches: PiiMatch[],
  threshold: number,
): PiiMatch[] {
  return matches.filter((m) => m.confidence >= threshold);
}

export function computeOverallRisk(
  matches: PiiMatch[],
): 'low' | 'medium' | 'high' | 'critical' {
  if (matches.length === 0) return 'low';
  const hasSsn = matches.some((m) => m.type === 'ssn');
  const hasCreditCard = matches.some((m) => m.type === 'credit-card');
  const hasPassport = matches.some((m) => m.type === 'passport');
  if (hasSsn || hasCreditCard || hasPassport) return 'critical';
  if (matches.length > 10) return 'high';
  if (matches.length > 3) return 'medium';
  return 'low';
}
