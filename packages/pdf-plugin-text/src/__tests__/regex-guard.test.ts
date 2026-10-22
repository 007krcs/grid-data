// User-supplied regex in the search box must never be able to hang the tab.
import { describe, it, expect } from 'vitest';
import { isSafeUserRegex, MAX_REGEX_QUERY_LENGTH, SearchEngine } from '../search-engine';
import { TextExtractor } from '../text-extractor';

function pageText(text: string) {
  const extractor = new TextExtractor();
  const page = { index: 0, width: 612, height: 792, rotation: 0, textContent: null } as any;
  return extractor.extract(extractor.buildCharsFromString(text, 72, 72, 12), page);
}

describe('isSafeUserRegex', () => {
  it('accepts ordinary patterns', () => {
    expect(isSafeUserRegex('inv(oice|ce)\\s+\\d+')).toBe(true);
    expect(isSafeUserRegex('^Total:')).toBe(true);
  });

  it('rejects nested quantifiers, backreferences and oversized input', () => {
    expect(isSafeUserRegex('(a+)+$')).toBe(false);
    expect(isSafeUserRegex('(\\w*)*x')).toBe(false);
    expect(isSafeUserRegex('(x|y+)*z')).toBe(false);
    expect(isSafeUserRegex('(a)\\1')).toBe(false);
    expect(isSafeUserRegex('a'.repeat(MAX_REGEX_QUERY_LENGTH + 1))).toBe(false);
  });
});

describe('SearchEngine with regex option', () => {
  it('falls back to a literal search for unsafe patterns instead of compiling them', () => {
    const engine = new SearchEngine();
    engine.setPageTextContent(0, pageText('literal (a+)+$ appears here and aaaaaaaaaaaaaaaaaaaaaaaaaaaaaab too'));
    const t0 = performance.now();
    const result = engine.search('(a+)+$', { regex: true });
    expect(performance.now() - t0).toBeLessThan(500);
    // Literal fallback matches the literal text once.
    expect(result.totalCount).toBe(1);
  });
});
