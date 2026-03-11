import { describe, it, expect } from 'vitest';
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

describe('TextExtractor', () => {
  const extractor = new TextExtractor();
  const page = makePage();

  describe('buildCharsFromString', () => {
    it('creates chars from a string', () => {
      const chars = extractor.buildCharsFromString('Hello', 72, 72, 12);
      expect(chars).toHaveLength(5);
      expect(chars[0]!.char).toBe('H');
      expect(chars[4]!.char).toBe('o');
    });

    it('positions chars sequentially', () => {
      const chars = extractor.buildCharsFromString('AB', 0, 0, 10);
      const charWidth = 10 * 0.6;
      expect(chars[0]!.rect[0]).toBe(0);
      expect(chars[1]!.rect[0]).toBeCloseTo(charWidth, 4);
    });

    it('sets correct font info', () => {
      const chars = extractor.buildCharsFromString('X', 0, 0, 14, 'Arial');
      expect(chars[0]!.fontName).toBe('Arial');
      expect(chars[0]!.fontSize).toBe(14);
    });
  });

  describe('extract', () => {
    it('extracts words from characters', () => {
      const chars = extractor.buildCharsFromString('Hello World', 72, 72, 12);
      const result = extractor.extract(chars, page);

      expect(result.chars).toHaveLength(11);
      expect(result.words.length).toBeGreaterThanOrEqual(2);
      expect(result.words[0]!.text).toBe('Hello');
      expect(result.words[1]!.text).toBe('World');
    });

    it('handles empty input', () => {
      const result = extractor.extract([], page);
      expect(result.chars).toHaveLength(0);
      expect(result.words).toHaveLength(0);
      expect(result.lines).toHaveLength(0);
    });

    it('groups words into lines', () => {
      const chars = extractor.buildCharsFromString('Hello World', 72, 72, 12);
      const result = extractor.extract(chars, page);

      expect(result.lines.length).toBeGreaterThanOrEqual(1);
      expect(result.lines[0]!.text).toContain('Hello');
      expect(result.lines[0]!.text).toContain('World');
    });

    it('creates bounding rects for words', () => {
      const chars = extractor.buildCharsFromString('Test', 10, 20, 12);
      const result = extractor.extract(chars, page);

      expect(result.words).toHaveLength(1);
      const word = result.words[0]!;
      expect(word.rect[0]).toBe(10); // x1 = startX
      expect(word.rect[1]).toBe(20); // y1 = startY
      expect(word.rect[2]).toBeGreaterThan(10); // x2 > x1
      expect(word.rect[3]).toBe(32); // y2 = startY + fontSize
    });

    it('tracks char indices in words', () => {
      const chars = extractor.buildCharsFromString('Hi World', 72, 72, 12);
      const result = extractor.extract(chars, page);

      expect(result.words[0]!.charIndices[0]).toBe(0);
      expect(result.words[0]!.charIndices[1]).toBe(1); // 'Hi' = indices 0-1
    });
  });
});
