import type { LocaleFormatters } from './types';

export interface NumberFormatOptions extends Intl.NumberFormatOptions {}
export interface DateFormatOptions extends Intl.DateTimeFormatOptions {}

export function createFormatters(locale: string, defaultCurrency: string = 'USD'): LocaleFormatters {
  const numberFormatter = new Intl.NumberFormat(locale);
  const collator = new Intl.Collator(locale, { sensitivity: 'base' });

  return {
    formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
      if (options) {
        return new Intl.NumberFormat(locale, options).format(value);
      }
      return numberFormatter.format(value);
    },

    formatDate(value: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
      const date = value instanceof Date ? value : new Date(value);
      return new Intl.DateTimeFormat(locale, options ?? {
        year: 'numeric', month: 'short', day: 'numeric',
      }).format(date);
    },

    formatCurrency(value: number, currency?: string): string {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency ?? defaultCurrency,
      }).format(value);
    },

    formatPercent(value: number, decimals: number = 1): string {
      return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
    },

    compare(a: string, b: string): number {
      return collator.compare(a, b);
    },
  };
}
