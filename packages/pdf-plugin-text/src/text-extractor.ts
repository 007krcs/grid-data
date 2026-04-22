// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Text Extractor ───
//
// Extracts text content from PDF pages with character, word, and line bounding boxes.
// Phase 1 implementation uses synthetic extraction; Phase 2 will integrate pdf.js getTextContent().

import type {
  PdfTextContent,
  PdfCharInfo,
  PdfWordInfo,
  PdfLineInfo,
  PdfRect,
  PdfPageState,
} from '@gridstorm/pdf-core';

/** Configuration for text extraction. */
export interface TextExtractorConfig {
  /** Threshold for word break detection (in PDF points). */
  wordSpacingThreshold?: number;
  /** Threshold for line break detection (in PDF points). */
  lineSpacingThreshold?: number;
}

const DEFAULT_WORD_SPACING = 3;
const DEFAULT_LINE_SPACING = 5;

/** Extracts structured text content from PDF text items. */
export class TextExtractor {
  private wordSpacingThreshold: number;
  private lineSpacingThreshold: number;

  constructor(config: TextExtractorConfig = {}) {
    this.wordSpacingThreshold = config.wordSpacingThreshold ?? DEFAULT_WORD_SPACING;
    this.lineSpacingThreshold = config.lineSpacingThreshold ?? DEFAULT_LINE_SPACING;
  }

  /** Extract text content from raw text items.
   *  In Phase 2 this will accept pdf.js TextItem[]; for now it works with PdfCharInfo[]. */
  extract(chars: PdfCharInfo[], _page: PdfPageState): PdfTextContent {
    if (chars.length === 0) {
      return { chars, words: [], lines: [] };
    }

    const words = this.segmentWords(chars);
    const lines = this.segmentLines(words, chars);

    return { chars, words, lines };
  }

  /** Build PdfCharInfo from a simple text string (for testing/placeholder). */
  buildCharsFromString(
    text: string,
    startX: number,
    startY: number,
    fontSize: number,
    fontName = 'Helvetica',
  ): PdfCharInfo[] {
    const chars: PdfCharInfo[] = [];
    let x = startX;
    const charWidth = fontSize * 0.6; // Approximate monospace width

    for (let i = 0; i < text.length; i++) {
      const char = text[i]!;
      const rect: PdfRect = [x, startY, x + charWidth, startY + fontSize];

      chars.push({
        char,
        rect,
        fontName,
        fontSize,
        transform: [fontSize, 0, 0, fontSize, x, startY],
      });

      x += charWidth;
    }

    return chars;
  }

  /** Segment characters into words based on spacing. */
  private segmentWords(chars: PdfCharInfo[]): PdfWordInfo[] {
    if (chars.length === 0) return [];

    const words: PdfWordInfo[] = [];
    let wordStart = 0;
    let wordChars: PdfCharInfo[] = [chars[0]!];

    for (let i = 1; i < chars.length; i++) {
      const prev = chars[i - 1]!;
      const curr = chars[i]!;

      const gap = curr.rect[0] - prev.rect[2]; // x1 of current - x2 of previous
      const isSpace = curr.char === ' ' || prev.char === ' ';
      const isNewLine = Math.abs(curr.rect[1] - prev.rect[1]) > this.lineSpacingThreshold;
      const isWordBreak = gap > this.wordSpacingThreshold || isSpace || isNewLine;

      if (isWordBreak) {
        // Complete current word (skip if only spaces)
        const text = wordChars.map((c) => c.char).join('').trim();
        if (text.length > 0) {
          words.push({
            text,
            rect: this.boundingRect(wordChars),
            charIndices: [wordStart, wordStart + wordChars.length - 1],
          });
        }

        // Skip space characters
        if (curr.char !== ' ') {
          wordStart = i;
          wordChars = [curr];
        } else {
          wordStart = i + 1;
          wordChars = [];
        }
      } else {
        wordChars.push(curr);
      }
    }

    // Final word
    if (wordChars.length > 0) {
      const text = wordChars.map((c) => c.char).join('').trim();
      if (text.length > 0) {
        words.push({
          text,
          rect: this.boundingRect(wordChars),
          charIndices: [wordStart, wordStart + wordChars.length - 1],
        });
      }
    }

    return words;
  }

  /** Segment words into lines based on vertical position. */
  private segmentLines(words: PdfWordInfo[], _chars: PdfCharInfo[]): PdfLineInfo[] {
    if (words.length === 0) return [];

    const lines: PdfLineInfo[] = [];
    let lineStart = 0;
    let lineWords: PdfWordInfo[] = [words[0]!];
    let lineY = words[0]!.rect[1]; // y1 of first word

    for (let i = 1; i < words.length; i++) {
      const word = words[i]!;
      const yDiff = Math.abs(word.rect[1] - lineY);

      if (yDiff > this.lineSpacingThreshold) {
        // New line
        lines.push(this.createLine(lineWords, lineStart));
        lineStart = i;
        lineWords = [word];
        lineY = word.rect[1];
      } else {
        lineWords.push(word);
      }
    }

    // Final line
    if (lineWords.length > 0) {
      lines.push(this.createLine(lineWords, lineStart));
    }

    return lines;
  }

  private createLine(words: PdfWordInfo[], startIndex: number): PdfLineInfo {
    const text = words.map((w) => w.text).join(' ');
    const rects = words.map((w) => w.rect);
    const rect: PdfRect = [
      Math.min(...rects.map((r) => r[0])),
      Math.min(...rects.map((r) => r[1])),
      Math.max(...rects.map((r) => r[2])),
      Math.max(...rects.map((r) => r[3])),
    ];
    return {
      text,
      rect,
      wordIndices: [startIndex, startIndex + words.length - 1],
    };
  }

  /** Compute bounding rect for a set of characters. */
  private boundingRect(chars: PdfCharInfo[]): PdfRect {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    for (const c of chars) {
      if (c.rect[0] < minX) minX = c.rect[0];
      if (c.rect[1] < minY) minY = c.rect[1];
      if (c.rect[2] > maxX) maxX = c.rect[2];
      if (c.rect[3] > maxY) maxY = c.rect[3];
    }

    return [minX, minY, maxX, maxY];
  }
}
