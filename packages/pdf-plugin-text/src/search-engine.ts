// ─── Search Engine ───
//
// Full-text search across PDF pages with match navigation.

import type { PdfTextContent, PdfRect } from '@gridstorm/pdf-core';

/** Search options. */
export interface SearchOptions {
  /** Case-sensitive search. */
  caseSensitive?: boolean;
  /** Match whole words only. */
  wholeWord?: boolean;
  /** Use regex pattern. */
  regex?: boolean;
}

/** A single search match. */
export interface SearchMatch {
  /** Page index where the match was found. */
  pageIndex: number;
  /** Start character index within the page text. */
  charStart: number;
  /** End character index (exclusive). */
  charEnd: number;
  /** Bounding rectangles covering the match (may span multiple lines). */
  rects: PdfRect[];
  /** The matched text. */
  text: string;
}

/** Search result set. */
export interface SearchResult {
  /** All matches across all pages. */
  matches: SearchMatch[];
  /** Total match count. */
  totalCount: number;
  /** Currently active match index (-1 if none). */
  activeIndex: number;
}

/** Search engine for finding text in PDF pages. */
export class SearchEngine {
  private textContents = new Map<number, PdfTextContent>();
  private lastResult: SearchResult = {
    matches: [],
    totalCount: 0,
    activeIndex: -1,
  };

  /** Set the text content for a page. */
  setPageTextContent(pageIndex: number, textContent: PdfTextContent): void {
    this.textContents.set(pageIndex, textContent);
  }

  /** Clear text content for a page. */
  clearPageTextContent(pageIndex: number): void {
    this.textContents.delete(pageIndex);
  }

  /** Clear all cached text content. */
  clearAll(): void {
    this.textContents.clear();
    this.lastResult = { matches: [], totalCount: 0, activeIndex: -1 };
  }

  /** Search for a query across all loaded pages. */
  search(query: string, options: SearchOptions = {}): SearchResult {
    if (!query) {
      this.lastResult = { matches: [], totalCount: 0, activeIndex: -1 };
      return this.lastResult;
    }

    const matches: SearchMatch[] = [];

    // Sort pages by index for consistent ordering
    const sortedPages = [...this.textContents.entries()].sort(
      ([a], [b]) => a - b,
    );

    for (const [pageIndex, textContent] of sortedPages) {
      const pageMatches = this.searchPage(
        pageIndex,
        textContent,
        query,
        options,
      );
      matches.push(...pageMatches);
    }

    this.lastResult = {
      matches,
      totalCount: matches.length,
      activeIndex: matches.length > 0 ? 0 : -1,
    };

    return this.lastResult;
  }

  /** Navigate to the next search match. */
  nextMatch(): SearchMatch | null {
    if (this.lastResult.totalCount === 0) return null;

    this.lastResult.activeIndex =
      (this.lastResult.activeIndex + 1) % this.lastResult.totalCount;
    return this.lastResult.matches[this.lastResult.activeIndex] ?? null;
  }

  /** Navigate to the previous search match. */
  prevMatch(): SearchMatch | null {
    if (this.lastResult.totalCount === 0) return null;

    this.lastResult.activeIndex =
      (this.lastResult.activeIndex - 1 + this.lastResult.totalCount) %
      this.lastResult.totalCount;
    return this.lastResult.matches[this.lastResult.activeIndex] ?? null;
  }

  /** Get the current active match. */
  getActiveMatch(): SearchMatch | null {
    if (
      this.lastResult.activeIndex < 0 ||
      this.lastResult.activeIndex >= this.lastResult.totalCount
    ) {
      return null;
    }
    return this.lastResult.matches[this.lastResult.activeIndex] ?? null;
  }

  /** Get the last search result. */
  getLastResult(): SearchResult {
    return this.lastResult;
  }

  private searchPage(
    pageIndex: number,
    textContent: PdfTextContent,
    query: string,
    options: SearchOptions,
  ): SearchMatch[] {
    const matches: SearchMatch[] = [];

    // Build full page text from lines
    const fullText = textContent.lines.map((l) => l.text).join('\n');

    let pattern: RegExp;
    try {
      if (options.regex) {
        const flags = options.caseSensitive ? 'g' : 'gi';
        pattern = new RegExp(query, flags);
      } else {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const flags = options.caseSensitive ? 'g' : 'gi';
        const word = options.wholeWord ? `\\b${escaped}\\b` : escaped;
        pattern = new RegExp(word, flags);
      }
    } catch {
      return matches;
    }

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(fullText)) !== null) {
      const matchText = match[0];
      const matchStart = match.index;
      const matchEnd = matchStart + matchText.length;

      // Find covering word rects
      const rects = this.findMatchRects(textContent, matchStart, matchEnd);

      matches.push({
        pageIndex,
        charStart: matchStart,
        charEnd: matchEnd,
        rects,
        text: matchText,
      });

      // Avoid infinite loop for zero-length matches
      if (matchText.length === 0) {
        pattern.lastIndex++;
      }
    }

    return matches;
  }

  /** Find bounding rects for a text range. */
  private findMatchRects(
    textContent: PdfTextContent,
    _start: number,
    _end: number,
  ): PdfRect[] {
    // In Phase 1 we use word-level rects; Phase 2 will use char-level precision.
    // For now, return rects for all words that overlap the match range.
    const rects: PdfRect[] = [];

    // Simple approach: iterate lines and match by character offset
    let charOffset = 0;
    for (const line of textContent.lines) {
      const lineEnd = charOffset + line.text.length;

      if (lineEnd > _start && charOffset < _end) {
        // This line overlaps the match — use word-level rects within the line
        for (let wi = line.wordIndices[0]; wi <= line.wordIndices[1]; wi++) {
          const word = textContent.words[wi];
          if (word) {
            rects.push(word.rect);
          }
        }
      }

      charOffset = lineEnd + 1; // +1 for \n
    }

    return rects.length > 0 ? rects : [[0, 0, 0, 0]];
  }
}
