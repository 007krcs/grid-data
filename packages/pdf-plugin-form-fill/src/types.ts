// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
export type FieldType = 'text' | 'date' | 'email' | 'phone' | 'address' | 'name' | 'number' | 'checkbox' | 'signature' | 'custom';

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  pageIndex: number;
  labelRect: [number, number, number, number];
  valueRect: [number, number, number, number];
  value: string;
  required: boolean;
  confidence: number;
}

export interface FillResult {
  fieldId: string;
  filled: boolean;
  value: string;
  error?: string;
}

export interface FormFillConfig {
  autoDetect?: boolean;
  validationRules?: Record<FieldType, RegExp>;
}

export interface FormFillPluginState {
  fields: FormField[];
  fillData: Record<string, string>;
  validated: boolean;
  lastDetectionAt: number | null;
}
