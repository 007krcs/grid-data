// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
import type { I18nConfig, LocaleStrings, LocaleFormatters } from './types';
import { defaultStrings } from './locales/en';
import { isRTL } from './rtl';
import { createFormatters } from './formatters';

export class I18nManager {
  private locale: string;
  private strings: LocaleStrings;
  private formatters: LocaleFormatters;

  constructor(config: I18nConfig = {}) {
    this.locale = config.locale ?? 'en-US';
    this.strings = { ...defaultStrings, ...config.strings };
    this.formatters = createFormatters(this.locale, config.currency);
  }

  /** Get a translated string by key */
  t(key: keyof LocaleStrings): string {
    return this.strings[key];
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
  }

  /** Get all strings */
  getStrings(): Readonly<LocaleStrings> {
    return this.strings;
  }
}

export function createI18n(config?: I18nConfig): I18nManager {
  return new I18nManager(config);
}
