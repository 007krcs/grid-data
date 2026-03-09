/** BCP 47 language tags that use RTL script */
export const RTL_LOCALES = new Set([
  'ar', 'ar-SA', 'ar-EG', 'ar-AE', 'ar-MA',
  'he', 'he-IL',
  'fa', 'fa-IR',
  'ur', 'ur-PK',
  'ps', // Pashto
  'sd', // Sindhi
  'yi', // Yiddish
  'dv', // Dhivehi
  'ku', // Kurdish (Sorani)
  'ckb', // Central Kurdish
]);

/** Check if a locale uses RTL script */
export function isRTL(locale: string): boolean {
  // Check exact match
  if (RTL_LOCALES.has(locale)) return true;
  // Check language subtag
  const lang = locale.split('-')[0]!;
  return RTL_LOCALES.has(lang);
}
