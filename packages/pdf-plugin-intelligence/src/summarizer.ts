// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
import type { DocumentSummary } from './types';

export function summarizeDocument(
  text: string,
  pageCount: number,
  maxLength: number = 500,
): DocumentSummary {
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Extract sentences
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 20);

  // Score sentences by keyword importance
  const wordFreq = new Map<string, number>();
  for (const word of words) {
    const lower = word.toLowerCase().replace(/[^a-z]/g, '');
    if (lower.length > 3) {
      wordFreq.set(lower, (wordFreq.get(lower) || 0) + 1);
    }
  }

  // Score each sentence
  const scored = sentences.map((sentence) => {
    const sentWords = sentence.toLowerCase().split(/\s+/);
    let score = 0;
    for (const w of sentWords) {
      const clean = w.replace(/[^a-z]/g, '');
      score += wordFreq.get(clean) || 0;
    }
    // Normalize by length
    score = sentWords.length > 0 ? score / sentWords.length : 0;
    return { sentence, score };
  });

  // Sort by score and take top sentences
  scored.sort((a, b) => b.score - a.score);

  const topSentences = scored.slice(0, 5);

  // Build description from top sentences
  let description = '';
  for (const s of topSentences) {
    if ((description + s.sentence).length > maxLength) break;
    description += (description ? '. ' : '') + s.sentence;
  }
  if (!description && sentences.length > 0) {
    description = sentences[0]!.substring(0, maxLength);
  }

  // Extract title (first meaningful line, usually)
  const firstLines = text.split('\n').filter((l) => l.trim().length > 3);
  const title = firstLines[0]?.trim().substring(0, 100) || 'Untitled Document';

  // Key points = top scored sentences
  const keyPoints = topSentences.slice(0, 3).map((s) => s.sentence.substring(0, 150));

  return { title, description, keyPoints, wordCount, pageCount };
}
