// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
import type {
  I18nConfig,
  LocaleStrings,
  LocaleFormatters,
  PluralCategory,
  PluralForms,
} from './types';
import { defaultStrings } from './locales/en';
import { isRTL } from './rtl';
import { createFormatters } from './formatters';

export class I18nManager {
  private locale: string;
  private strings: LocaleStrings;
  private formatters: LocaleFormatters;
  private pluralRules: Intl.PluralRules;

  constructor(config: I18nConfig = {}) {
    this.locale = config.locale ?? 'en-US';
    this.strings = { ...defaultStrings, ...config.strings };
    this.formatters = createFormatters(this.locale, config.currency);
    this.pluralRules = new Intl.PluralRules(this.locale);
  }

  /** Get a translated string by key */
  t(key: keyof LocaleStrings): string {
    return this.strings[key];
  }

  /**
   * Get a translated string with `{name}` placeholder interpolation.
   *
   * Placeholders use the form `{key}` and are replaced with the matching
   * value from `params`. Missing values fall through as the literal token,
   * so a translator who forgot a placeholder gets `{count}` visibly in the
   * UI rather than a silent empty string. Numbers are formatted via the
   * current locale's number formatter.
   *
   * @example
   * ```ts
   * // locale string: 'rowsSelected': '{count} rows selected'
   * i18n.tWith('rowsSelected', { count: 3 });
   * // → '3 rows selected'  (or '3' formatted per locale: '3'/'٣'/etc.)
   * ```
   */
  tWith(key: keyof LocaleStrings, params: Record<string, string | number>): string {
    return this.interpolate(this.strings[key], params);
  }

  /**
   * Select the CLDR plural category for `count` in the current locale.
   *
   * English returns `'one'` for 1 and `'other'` otherwise; Polish distinguishes
   * `'one'`/`'few'`/`'many'`/`'other'`; CJK locales always return `'other'`.
   * Backed by `Intl.PluralRules`, so the rules stay correct across every locale.
   */
  selectPlural(count: number): PluralCategory {
    return this.pluralRules.select(count) as PluralCategory;
  }

  /**
   * Resolve a plural message for `count`, choosing the grammatically-correct
   * form for the current locale, then interpolating placeholders.
   *
   * The form is picked by {@link selectPlural}; if the selected category has no
   * entry in `forms`, `forms.other` is used (so `{ other }` alone always works).
   * `{count}` is available in every form — locale-formatted — alongside any
   * extra `params`. Explicit `params` win over the automatic `count` binding.
   *
   * @example
   * ```ts
   * const rows = { one: '{count} row selected', other: '{count} rows selected' };
   * i18n.tPlural(1, rows);   // → '1 row selected'
   * i18n.tPlural(5, rows);   // → '5 rows selected'
   * // pl-PL: tPlural(2, {...}) selects 'few'; tPlural(5, {...}) selects 'many'
   * ```
   */
  tPlural(
    count: number,
    forms: PluralForms,
    params?: Record<string, string | number>,
  ): string {
    const category = this.selectPlural(count);
    const template = forms[category] ?? forms.other;
    return this.interpolate(template, { count, ...params });
  }

  /**
   * Replace `{name}` placeholders in `template` with values from `params`.
   * Missing values fall through as the literal `{name}` token so an
   * untranslated placeholder is visible in the UI rather than silently empty.
   * Numbers are formatted with the current locale's number formatter.
   */
  private interpolate(template: string, params: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (raw, name: string) => {
      if (!Object.prototype.hasOwnProperty.call(params, name)) return raw;
      const value = params[name];
      if (typeof value === 'number') return this.formatters.formatNumber(value);
      return String(value);
    });
  }

  /** Get current locale */
  getLocale(): string {
    return this.locale;
  }

  /** Check if current locale is RTL */
  isRTL(): boolean {
    return isRTL(this.locale);
  }

  /** Get CSS direction value */
  getDirection(): 'ltr' | 'rtl' {
    return this.isRTL() ? 'rtl' : 'ltr';
  }

  /** Format a number */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return this.formatters.formatNumber(value, options);
  }

  /** Format a date */
  formatDate(value: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
    return this.formatters.formatDate(value, options);
  }

  /** Format currency */
  formatCurrency(value: number, currency?: string): string {
    return this.formatters.formatCurrency(value, currency);
  }

  /** Format percentage */
  formatPercent(value: number, decimals?: number): string {
    return this.formatters.formatPercent(value, decimals);
  }

  /** Locale-aware string comparison (for sorting) */
  compare(a: string, b: string): number {
    return this.formatters.compare(a, b);
  }

  /** Update locale at runtime */
  setLocale(locale: string, strings?: Partial<LocaleStrings>): void {
    this.locale = locale;
    // Load locale-specific strings, merge with defaults and overrides
    this.strings = { ...defaultStrings, ...strings };
    this.formatters = createFormatters(locale);
    this.pluralRules = new Intl.PluralRules(locale);
  }

  /** Get all strings */
  getStrings(): Readonly<LocaleStrings> {
    return this.strings;
  }
}

export function createI18n(config?: I18nConfig): I18nManager {
  return new I18nManager(config);
}
