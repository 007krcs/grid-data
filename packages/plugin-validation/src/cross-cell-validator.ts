// ─── Cross-Cell Validator ───
// Compare one cell's value against another cell in the same row.

export function validateCrossCell(
  value: unknown,
  targetValue: unknown,
  operator: '<' | '>' | '<=' | '>=' | '=' | '!=',
): boolean | string {
  if (value === null || value === undefined || targetValue === null || targetValue === undefined) {
    return true; // Skip validation if either value is absent
  }

  // Compare as numbers if both are numeric
  const numA = Number(value);
  const numB = Number(targetValue);
  const useNumeric = !isNaN(numA) && !isNaN(numB);

  const a = useNumeric ? numA : String(value);
  const b = useNumeric ? numB : String(targetValue);

  switch (operator) {
    case '<':
      if (a < b) return true;
      return `Value must be less than ${String(targetValue)}`;
    case '>':
      if (a > b) return true;
      return `Value must be greater than ${String(targetValue)}`;
    case '<=':
      if (a <= b) return true;
      return `Value must be less than or equal to ${String(targetValue)}`;
    case '>=':
      if (a >= b) return true;
      return `Value must be greater than or equal to ${String(targetValue)}`;
    case '=':
      if (a === b) return true;
      return `Value must be equal to ${String(targetValue)}`;
    case '!=':
      if (a !== b) return true;
      return `Value must not be equal to ${String(targetValue)}`;
    default:
      return true;
  }
}
