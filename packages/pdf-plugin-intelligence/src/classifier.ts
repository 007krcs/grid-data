import type { DocumentClass, Classification } from './types';

interface ClassProfile {
  docClass: DocumentClass;
  keywords: string[];
  weight: number;
}

const CLASS_PROFILES: ClassProfile[] = [
  { docClass: 'invoice', weight: 1, keywords: ['invoice', 'bill to', 'ship to', 'total', 'subtotal', 'tax', 'due date', 'payment', 'qty', 'quantity', 'unit price', 'amount due', 'invoice number', 'po number'] },
  { docClass: 'contract', weight: 1, keywords: ['agreement', 'contract', 'parties', 'whereas', 'hereby', 'terms and conditions', 'shall', 'obligations', 'termination', 'governing law', 'witness', 'executed', 'effective date', 'indemnification'] },
  { docClass: 'receipt', weight: 1, keywords: ['receipt', 'transaction', 'paid', 'change', 'cashier', 'store', 'subtotal', 'tax', 'total', 'card ending', 'thank you'] },
  { docClass: 'letter', weight: 1, keywords: ['dear', 'sincerely', 'regards', 'yours truly', 'attention', 'subject', 'enclosed', 'please find', 'looking forward'] },
  { docClass: 'report', weight: 1, keywords: ['report', 'analysis', 'findings', 'conclusion', 'recommendation', 'executive summary', 'methodology', 'results', 'appendix', 'figure', 'table'] },
  { docClass: 'form', weight: 1, keywords: ['form', 'please fill', 'applicant', 'signature', 'date of birth', 'check one', 'select', 'required', 'submit', 'application'] },
  { docClass: 'legal', weight: 1, keywords: ['court', 'plaintiff', 'defendant', 'jurisdiction', 'statute', 'judgment', 'motion', 'brief', 'counsel', 'hearing', 'deposition', 'exhibit'] },
  { docClass: 'medical', weight: 1, keywords: ['patient', 'diagnosis', 'treatment', 'prescription', 'physician', 'medical', 'symptoms', 'blood pressure', 'dosage', 'allergies', 'medical history'] },
  { docClass: 'financial', weight: 1, keywords: ['balance', 'assets', 'liabilities', 'equity', 'revenue', 'expenses', 'profit', 'loss', 'dividend', 'shares', 'portfolio', 'investment', 'fiscal year'] },
];

export function classifyDocument(text: string): Classification[] {
  const lower = text.toLowerCase();
  const scores: Map<DocumentClass, number> = new Map();

  for (const profile of CLASS_PROFILES) {
    let score = 0;
    for (const keyword of profile.keywords) {
      // Count occurrences
      const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = lower.match(regex);
      if (matches) {
        score += matches.length * profile.weight;
      }
    }
    if (score > 0) {
      scores.set(profile.docClass, score);
    }
  }

  // Normalize to confidence scores
  const totalScore = Array.from(scores.values()).reduce((sum, s) => sum + s, 0);
  if (totalScore === 0) return [{ documentClass: 'unknown', confidence: 1.0 }];

  const classifications: Classification[] = Array.from(scores.entries())
    .map(([docClass, score]) => ({
      documentClass: docClass,
      confidence: Math.min(score / totalScore, 1.0),
    }))
    .sort((a, b) => b.confidence - a.confidence);

  return classifications.length > 0 ? classifications : [{ documentClass: 'unknown', confidence: 1.0 }];
}
