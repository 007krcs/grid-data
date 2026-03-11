import { describe, it, expect } from 'vitest';
import { SearchEngine } from '../search-engine';
import { TextExtractor } from '../text-extractor';
import type { PdfPageState } from '@gridstorm/pdf-core';

function makePage(): PdfPageState {
  return {
    index: 0,
    width: 612,
    height: 792,
    rotation: 0,
    annotationIds: [],
    rendered: false,
    textContent: null,
  };
}

describe('SearchEngine', () => {
  function setupSearch(texts: string[]) {
    const engine = new SearchEngine();
    const extractor = new TextExtractor();
    const page = makePage();

    for (let i = 0; i < texts.length; i++) {
      const chars = extractor.buildCharsFromString(texts[i]!, 72, 72, 12);
      const textContent = extractor.extract(chars, page);
      engine.setPageTextContent(i, textContent);
    }

    return engine;
  }

  it('finds text across pages', () => {
    const engine = setupSearch(['Hello World', 'World Peace']);
    const result = engine.search('World');

    expect(result.totalCount).toBe(2);
    expect(result.matches[0]!.pageIndex).toBe(0);
    expect(result.matches[1]!.pageIndex).toBe(1);
  });

  it('returns empty for no matches', () => {
    const engine = setupSearch(['Hello World']);
    const result = engine.search('xyz');

    expect(result.totalCount).toBe(0);
    expect(result.matches).toHaveLength(0);
  });

  it('supports case-insensitive search (default)', () => {
    const engine = setupSearch(['Hello World']);
    const result = engine.search('hello');

    expect(result.totalCount).toBe(1);
    expect(result.matches[0]!.text).toBe('Hello');
  });

  it('supports case-sensitive search', () => {
    const engine = setupSearch(['Hello World']);
    const result = engine.search('hello', { caseSensitive: true });
    expect(result.totalCount).toBe(0);

    const result2 = engine.search('Hello', { caseSensitive: true });
    expect(result2.totalCount).toBe(1);
  });

  it('supports whole word search', () => {
    const engine = setupSearch(['Hello World']);
    const result = engine.search('Hell', { wholeWord: true });
    expect(result.totalCount).toBe(0);

    const result2 = engine.search('Hello', { wholeWord: true });
    expect(result2.totalCount).toBe(1);
  });

  it('navigates to next match', () => {
    const engine = setupSearch(['One Two One']);
    engine.search('One');

    const first = engine.getActiveMatch();
    expect(first).not.toBeNull();

    const second = engine.nextMatch();
    expect(second).not.toBeNull();
    expect(second!.charStart).toBeGreaterThan(first!.charStart);
  });

  it('wraps around on next match', () => {
    const engine = setupSearch(['One Two One']);
    engine.search('One');

    engine.nextMatch(); // second
    const wrapped = engine.nextMatch(); // wraps to first
    expect(wrapped).not.toBeNull();
  });

  it('navigates to previous match', () => {
    const engine = setupSearch(['One Two One']);
    engine.search('One');

    // activeIndex starts at 0, prevMatch wraps to last
    const prev = engine.prevMatch();
    expect(prev).not.toBeNull();
  });

  it('returns null for empty search', () => {
    const engine = setupSearch(['Hello']);
    const result = engine.search('');

    expect(result.totalCount).toBe(0);
    expect(engine.nextMatch()).toBeNull();
    expect(engine.prevMatch()).toBeNull();
  });

  it('clears all text content', () => {
    const engine = setupSearch(['Hello World']);
    engine.search('Hello');
    expect(engine.getLastResult().totalCount).toBe(1);

    engine.clearAll();
    const result = engine.search('Hello');
    expect(result.totalCount).toBe(0);
  });

  it('clears specific page content', () => {
    const engine = setupSearch(['Hello', 'World']);
    engine.clearPageTextContent(0);

    const result = engine.search('Hello');
    expect(result.totalCount).toBe(0);
  });

  it('handles regex search', () => {
    const engine = setupSearch(['Hello World 123']);
    const result = engine.search('\\d+', { regex: true });

    expect(result.totalCount).toBe(1);
    expect(result.matches[0]!.text).toBe('123');
  });

  it('handles invalid regex gracefully', () => {
    const engine = setupSearch(['Hello']);
    const result = engine.search('[invalid', { regex: true });
    expect(result.totalCount).toBe(0);
  });
});
