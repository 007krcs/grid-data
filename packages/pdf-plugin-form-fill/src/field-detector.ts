import type { FormField, FieldType } from './types';

// Keywords that indicate field types
const TYPE_KEYWORDS: Record<string, FieldType> = {
  'name': 'name', 'full name': 'name', 'first name': 'name', 'last name': 'name',
  'email': 'email', 'e-mail': 'email', 'email address': 'email',
  'phone': 'phone', 'telephone': 'phone', 'mobile': 'phone', 'cell': 'phone',
  'address': 'address', 'street': 'address', 'city': 'address', 'zip': 'address', 'postal': 'address',
  'date': 'date', 'dob': 'date', 'date of birth': 'date', 'birthday': 'date',
  'ssn': 'text', 'social security': 'text',
  'signature': 'signature', 'sign here': 'signature', 'authorized signature': 'signature',
  'amount': 'number', 'total': 'number', 'price': 'number', 'qty': 'number', 'quantity': 'number',
};

let fieldCounter = 0;

export function detectFields(textLines: Array<{ text: string; rect: [number, number, number, number] }>, pageIndex: number): FormField[] {
  const fields: FormField[] = [];

  for (const line of textLines) {
    const text = line.text.trim();

    // Pattern 1: "Label:" followed by empty space or underscores
    const colonMatch = text.match(/^(.+?):\s*(_+|\.{3,}|\s{3,})?$/);
    if (colonMatch) {
      const label = colonMatch[1]!.trim();
      const type = inferFieldType(label);
      const [_x1, y1, x2, y2] = line.rect;

      fields.push({
        id: `field-${++fieldCounter}`,
        label,
        type,
        pageIndex,
        labelRect: line.rect,
        valueRect: [x2 + 5, y1, x2 + 200, y2],  // Estimated value area to the right
        value: '',
        required: text.includes('*') || text.toLowerCase().includes('required'),
        confidence: colonMatch[2] ? 0.9 : 0.7,  // Higher confidence if there's a clear blank area
      });
    }

    // Pattern 2: Line of underscores (blank field, label likely above)
    if (/^_{5,}$/.test(text) || /^\.{5,}$/.test(text)) {
      fields.push({
        id: `field-${++fieldCounter}`,
        label: 'Unknown',
        type: 'text',
        pageIndex,
        labelRect: [line.rect[0], line.rect[1] - 20, line.rect[2], line.rect[1]],
        valueRect: line.rect,
        value: '',
        required: false,
        confidence: 0.5,
      });
    }
  }

  return fields;
}

export function inferFieldType(label: string): FieldType {
  const lower = label.toLowerCase().replace(/[*:]/g, '').trim();

  for (const [keyword, type] of Object.entries(TYPE_KEYWORDS)) {
    if (lower === keyword || lower.includes(keyword)) {
      return type;
    }
  }

  return 'text';
}

export function resetFieldCounter(): void {
  fieldCounter = 0;
}
