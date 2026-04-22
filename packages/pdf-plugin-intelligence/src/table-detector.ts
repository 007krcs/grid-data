// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
import type { DetectedTable } from './types';

interface TextLine {
  text: string;
  rect: [number, number, number, number];
}

export function detectTables(lines: TextLine[], pageIndex: number): DetectedTable[] {
  const tables: DetectedTable[] = [];

  if (lines.length < 2) return tables;

  // Heuristic: Look for consecutive lines with similar column-like patterns
  // (lines with multiple tab/space-separated values at similar x positions)

  const potentialRows: TextLine[][] = [];
  let currentGroup: TextLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const parts = line.text.split(/\t|\s{3,}/).filter(Boolean);

    if (parts.length >= 2) {
      currentGroup.push(line);
    } else {
      if (currentGroup.length >= 2) {
        potentialRows.push([...currentGroup]);
      }
      currentGroup = [];
    }
  }

  // Don't forget last group
  if (currentGroup.length >= 2) {
    potentialRows.push([...currentGroup]);
  }

  // Convert groups to tables
  for (const group of potentialRows) {
    const rows = group.map((line) => {
      return line.text.split(/\t|\s{3,}/).filter(Boolean);
    });

    if (rows.length < 2) continue;

    // First row is likely header
    const headerRow = rows[0] || [];
    const dataRows = rows.slice(1);

    // Compute bounds
    const x1 = Math.min(...group.map((l) => l.rect[0]));
    const y1 = Math.min(...group.map((l) => l.rect[1]));
    const x2 = Math.max(...group.map((l) => l.rect[2]));
    const y2 = Math.max(...group.map((l) => l.rect[3]));

    tables.push({
      pageIndex,
      rows: dataRows,
      headerRow,
      bounds: [x1, y1, x2, y2],
      confidence: Math.min(0.5 + rows.length * 0.05, 0.9),
    });
  }

  return tables;
}
