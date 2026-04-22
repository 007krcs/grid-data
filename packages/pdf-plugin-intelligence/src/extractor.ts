// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
import type { ExtractedField } from './types';

interface ExtractionRule {
  name: string;
  patterns: RegExp[];
}

const EXTRACTION_RULES: ExtractionRule[] = [
  { name: 'date', patterns: [/(?:date|dated|as of)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi, /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/g] },
  { name: 'total_amount', patterns: [/(?:total|amount due|grand total|balance due)[:\s]*\$?([\d,]+\.?\d*)/gi] },
  { name: 'invoice_number', patterns: [/(?:invoice|inv)[#\s:]*([A-Z0-9\-]+)/gi] },
  { name: 'reference_number', patterns: [/(?:ref|reference|po|order)[#\s:]*([A-Z0-9\-]+)/gi] },
  { name: 'company_name', patterns: [/^([A-Z][A-Za-z\s&,.']+(?:Inc|LLC|Ltd|Corp|Co|Company|Group)\.?)/gm] },
  { name: 'email', patterns: [/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g] },
  { name: 'phone', patterns: [/(?:phone|tel|fax)[:\s]*([+\d\s\-\(\)]{7,20})/gi] },
];

export function extractFields(text: string, pageIndex: number): ExtractedField[] {
  const fields: ExtractedField[] = [];
  const seen = new Set<string>();

  for (const rule of EXTRACTION_RULES) {
    for (const pattern of rule.patterns) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        const value = (match[1] || match[0]).trim();
        const key = `${rule.name}:${value}`;

        if (seen.has(key)) continue;
        seen.add(key);

        fields.push({
          name: rule.name,
          value,
          pageIndex,
          confidence: 0.8,
        });

        break; // Take first match per pattern
      }
    }
  }

  return fields;
}
