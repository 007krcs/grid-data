import { describe, it, expect } from 'vitest';
import { I18nManager, createI18n } from '../i18n-manager';
import { isRTL } from '../rtl';
import { createFormatters } from '../formatters';
import { defaultStrings } from '../locales/en';
import { deStrings } from '../locales/de';
import { frStrings } from '../locales/fr';
import { esStrings } from '../locales/es';
import { jaStrings } from '../locales/ja';
import { arStrings } from '../locales/ar';
import { zhStrings } from '../locales/zh';

describe('I18nManager', () => {
  it('should default to en-US locale', () => {
    const i18n = createI18n();
    expect(i18n.getLocale()).toBe('en-US');
  });

  it('should accept custom locale in config', () => {
    const i18n = createI18n({ locale: 'de-DE' });
    expect(i18n.getLocale()).toBe('de-DE');
  });

  it('should return correct translated strings via t()', () => {
    const i18n = createI18n();
    expect(i18n.t('loading')).toBe('Loading...');
    expect(i18n.t('noRowsToShow')).toBe('No rows to show');
    expect(i18n.t('selectAll')).toBe('Select all');
    expect(i18n.t('sortAscending')).toBe('Sort ascending');
    expect(i18n.t('copy')).toBe('Copy');
    expect(i18n.t('page')).toBe('Page');
  });

  it('should allow custom strings to override defaults', () => {
    const i18n = createI18n({
      strings: {
        loading: 'Please wait...',
        noRowsToShow: 'Empty grid',
      },
    });
    expect(i18n.t('loading')).toBe('Please wait...');
    expect(i18n.t('noRowsToShow')).toBe('Empty grid');
    // Non-overridden strings remain default
    expect(i18n.t('copy')).toBe('Copy');
    expect(i18n.t('page')).toBe('Page');
  });

  it('should return all strings via getStrings()', () => {
    const i18n = createI18n();
    const strings = i18n.getStrings();
    expect(strings).toEqual(defaultStrings);
  });

  it('should update locale at runtime via setLocale()', () => {
    const i18n = createI18n({ locale: 'en-US' });
    expect(i18n.getLocale()).toBe('en-US');

    i18n.setLocale('de-DE', deStrings);
    expect(i18n.getLocale()).toBe('de-DE');
    expect(i18n.t('loading')).toBe('Laden...');
    expect(i18n.t('copy')).toBe('Kopieren');
  });

  it('setLocale should merge overrides with defaults', () => {
    const i18n = createI18n();
    i18n.setLocale('fr-FR', { loading: 'Chargement personnalisé...' });
    expect(i18n.t('loading')).toBe('Chargement personnalisé...');
    // Non-overridden strings fall back to English defaults
    expect(i18n.t('page')).toBe('Page');
  });
});

describe('RTL detection', () => {
  it('should detect Arabic as RTL', () => {
    expect(isRTL('ar')).toBe(true);
    expect(isRTL('ar-SA')).toBe(true);
    expect(isRTL('ar-EG')).toBe(true);
    expect(isRTL('ar-AE')).toBe(true);
  });

  it('should detect Hebrew as RTL', () => {
    expect(isRTL('he')).toBe(true);
    expect(isRTL('he-IL')).toBe(true);
  });

  it('should detect Persian as RTL', () => {
    expect(isRTL('fa')).toBe(true);
    expect(isRTL('fa-IR')).toBe(true);
  });

  it('should detect Urdu as RTL', () => {
    expect(isRTL('ur')).toBe(true);
    expect(isRTL('ur-PK')).toBe(true);
  });

  it('should detect English as LTR', () => {
    expect(isRTL('en')).toBe(false);
    expect(isRTL('en-US')).toBe(false);
    expect(isRTL('en-GB')).toBe(false);
  });

  it('should detect German as LTR', () => {
    expect(isRTL('de')).toBe(false);
    expect(isRTL('de-DE')).toBe(false);
  });

  it('should detect French as LTR', () => {
    expect(isRTL('fr')).toBe(false);
    expect(isRTL('fr-FR')).toBe(false);
  });

  it('should detect Japanese as LTR', () => {
    expect(isRTL('ja')).toBe(false);
    expect(isRTL('ja-JP')).toBe(false);
  });

  it('should detect Chinese as LTR', () => {
    expect(isRTL('zh')).toBe(false);
    expect(isRTL('zh-CN')).toBe(false);
  });

  it('I18nManager.getDirection() returns rtl for Arabic', () => {
    const i18n = createI18n({ locale: 'ar-SA' });
    expect(i18n.isRTL()).toBe(true);
    expect(i18n.getDirection()).toBe('rtl');
  });

  it('I18nManager.getDirection() returns ltr for English', () => {
    const i18n = createI18n({ locale: 'en-US' });
    expect(i18n.isRTL()).toBe(false);
    expect(i18n.getDirection()).toBe('ltr');
  });

  it('I18nManager.getDirection() returns ltr for German', () => {
    const i18n = createI18n({ locale: 'de-DE' });
    expect(i18n.isRTL()).toBe(false);
    expect(i18n.getDirection()).toBe('ltr');
  });
});

describe('Number formatting', () => {
  it('should format numbers for en-US', () => {
    const i18n = createI18n({ locale: 'en-US' });
    expect(i18n.formatNumber(1234.56)).toBe('1,234.56');
    expect(i18n.formatNumber(0)).toBe('0');
    expect(i18n.formatNumber(1000000)).toBe('1,000,000');
  });

  it('should format numbers for de-DE', () => {
    const i18n = createI18n({ locale: 'de-DE' });
    expect(i18n.formatNumber(1234.56)).toBe('1.234,56');
    expect(i18n.formatNumber(1000000)).toBe('1.000.000');
  });

  it('should format numbers with custom options', () => {
    const i18n = createI18n({ locale: 'en-US' });
    expect(i18n.formatNumber(1234.5, { minimumFractionDigits: 3 })).toBe('1,234.500');
  });
});

describe('Date formatting', () => {
  it('should format dates for en-US', () => {
    const i18n = createI18n({ locale: 'en-US' });
    const date = new Date(2024, 0, 15); // Jan 15, 2024
    const formatted = i18n.formatDate(date);
    expect(formatted).toContain('Jan');
    expect(formatted).toContain('15');
    expect(formatted).toContain('2024');
  });

  it('should format dates for de-DE', () => {
    const i18n = createI18n({ locale: 'de-DE' });
    const date = new Date(2024, 0, 15);
    const formatted = i18n.formatDate(date);
    expect(formatted).toContain('Jan');
    expect(formatted).toContain('15');
    expect(formatted).toContain('2024');
  });

  it('should format dates from string input', () => {
    const i18n = createI18n({ locale: 'en-US' });
    const formatted = i18n.formatDate('2024-06-15T00:00:00');
    expect(formatted).toContain('Jun');
    expect(formatted).toContain('15');
    expect(formatted).toContain('2024');
  });

  it('should format dates from timestamp input', () => {
    const i18n = createI18n({ locale: 'en-US' });
    const date = new Date(2024, 5, 15); // Jun 15, 2024
    const formatted = i18n.formatDate(date.getTime());
    expect(formatted).toContain('Jun');
    expect(formatted).toContain('15');
    expect(formatted).toContain('2024');
  });

  it('should accept custom date format options', () => {
    const i18n = createI18n({ locale: 'en-US' });
    const date = new Date(2024, 0, 15);
    const formatted = i18n.formatDate(date, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    expect(formatted).toContain('Monday');
    expect(formatted).toContain('January');
    expect(formatted).toContain('15');
    expect(formatted).toContain('2024');
  });
});

describe('Currency formatting', () => {
  it('should format USD for en-US', () => {
    const i18n = createI18n({ locale: 'en-US', currency: 'USD' });
    const formatted = i18n.formatCurrency(1234.56);
    expect(formatted).toBe('$1,234.56');
  });

  it('should format EUR for de-DE', () => {
    const i18n = createI18n({ locale: 'de-DE', currency: 'EUR' });
    const formatted = i18n.formatCurrency(1234.56);
    // German formatting uses period for thousands, comma for decimals
    expect(formatted).toContain('1.234,56');
    // Should contain the euro sign
    expect(formatted).toMatch(/€/);
  });

  it('should allow overriding currency per call', () => {
    const i18n = createI18n({ locale: 'en-US', currency: 'USD' });
    const formatted = i18n.formatCurrency(1234.56, 'GBP');
    expect(formatted).toContain('1,234.56');
    expect(formatted).toMatch(/£/);
  });

  it('should default to USD when no currency specified', () => {
    const i18n = createI18n({ locale: 'en-US' });
    const formatted = i18n.formatCurrency(99.99);
    expect(formatted).toBe('$99.99');
  });

  it('should format JPY for ja-JP', () => {
    const i18n = createI18n({ locale: 'ja-JP', currency: 'JPY' });
    const formatted = i18n.formatCurrency(1234);
    expect(formatted).toContain('1,234');
    expect(formatted).toMatch(/¥|￥/);
  });
});

describe('Percentage formatting', () => {
  it('should format percentages for en-US', () => {
    const i18n = createI18n({ locale: 'en-US' });
    const formatted = i18n.formatPercent(0.1234);
    expect(formatted).toBe('12.3%');
  });

  it('should format percentages with custom decimals', () => {
    const i18n = createI18n({ locale: 'en-US' });
    expect(i18n.formatPercent(0.1234, 2)).toBe('12.34%');
    expect(i18n.formatPercent(0.1234, 0)).toBe('12%');
  });

  it('should format percentages for de-DE', () => {
    const i18n = createI18n({ locale: 'de-DE' });
    const formatted = i18n.formatPercent(0.1234);
    // German uses comma for decimal separator and non-breaking space before %
    expect(formatted).toContain('12,3');
    expect(formatted).toContain('%');
  });
});

describe('String comparison (collation)', () => {
  it('should compare strings in locale-aware order', () => {
    const i18n = createI18n({ locale: 'en-US' });
    expect(i18n.compare('apple', 'banana')).toBeLessThan(0);
    expect(i18n.compare('banana', 'apple')).toBeGreaterThan(0);
    expect(i18n.compare('apple', 'apple')).toBe(0);
  });

  it('should be case-insensitive with base sensitivity', () => {
    const i18n = createI18n({ locale: 'en-US' });
    expect(i18n.compare('Apple', 'apple')).toBe(0);
    expect(i18n.compare('BANANA', 'banana')).toBe(0);
  });

  it('should handle German umlauts correctly', () => {
    const formatters = createFormatters('de-DE');
    // In German collation, 'ä' is treated like 'a' with base sensitivity
    expect(formatters.compare('ä', 'a')).toBe(0);
    expect(formatters.compare('ö', 'o')).toBe(0);
    expect(formatters.compare('ü', 'u')).toBe(0);
  });

  it('should handle accented characters in French', () => {
    const formatters = createFormatters('fr-FR');
    // With base sensitivity, accented characters equal their base
    expect(formatters.compare('é', 'e')).toBe(0);
    expect(formatters.compare('à', 'a')).toBe(0);
  });
});

describe('setLocale updates formatting', () => {
  it('should update number formatting after setLocale', () => {
    const i18n = createI18n({ locale: 'en-US' });
    expect(i18n.formatNumber(1234.56)).toBe('1,234.56');

    i18n.setLocale('de-DE');
    expect(i18n.formatNumber(1234.56)).toBe('1.234,56');
    expect(i18n.getLocale()).toBe('de-DE');
  });

  it('should update currency formatting after setLocale', () => {
    const i18n = createI18n({ locale: 'en-US', currency: 'USD' });
    expect(i18n.formatCurrency(100)).toBe('$100.00');

    i18n.setLocale('ja-JP');
    // After setLocale without specifying currency, defaults to USD
    const formatted = i18n.formatCurrency(100, 'JPY');
    expect(formatted).toMatch(/¥|￥/);
  });

  it('should update direction after setLocale', () => {
    const i18n = createI18n({ locale: 'en-US' });
    expect(i18n.getDirection()).toBe('ltr');

    i18n.setLocale('ar-SA', arStrings);
    expect(i18n.getDirection()).toBe('rtl');
    expect(i18n.t('loading')).toBe('جارٍ التحميل...');
  });
});

describe('Locale string catalogs completeness', () => {
  const allKeys = Object.keys(defaultStrings) as (keyof typeof defaultStrings)[];

  it('German strings should have all keys', () => {
    for (const key of allKeys) {
      expect(deStrings[key], `Missing German string for key: ${key}`).toBeDefined();
      expect(typeof deStrings[key]).toBe('string');
      expect(deStrings[key].length).toBeGreaterThan(0);
    }
  });

  it('French strings should have all keys', () => {
    for (const key of allKeys) {
      expect(frStrings[key], `Missing French string for key: ${key}`).toBeDefined();
      expect(typeof frStrings[key]).toBe('string');
      expect(frStrings[key].length).toBeGreaterThan(0);
    }
  });

  it('Spanish strings should have all keys', () => {
    for (const key of allKeys) {
      expect(esStrings[key], `Missing Spanish string for key: ${key}`).toBeDefined();
      expect(typeof esStrings[key]).toBe('string');
      expect(esStrings[key].length).toBeGreaterThan(0);
    }
  });

  it('Japanese strings should have all keys', () => {
    for (const key of allKeys) {
      expect(jaStrings[key], `Missing Japanese string for key: ${key}`).toBeDefined();
      expect(typeof jaStrings[key]).toBe('string');
      expect(jaStrings[key].length).toBeGreaterThan(0);
    }
  });

  it('Arabic strings should have all keys', () => {
    for (const key of allKeys) {
      expect(arStrings[key], `Missing Arabic string for key: ${key}`).toBeDefined();
      expect(typeof arStrings[key]).toBe('string');
      expect(arStrings[key].length).toBeGreaterThan(0);
    }
  });

  it('Chinese strings should have all keys', () => {
    for (const key of allKeys) {
      expect(zhStrings[key], `Missing Chinese string for key: ${key}`).toBeDefined();
      expect(typeof zhStrings[key]).toBe('string');
      expect(zhStrings[key].length).toBeGreaterThan(0);
    }
  });
});

describe('createFormatters standalone', () => {
  it('should create formatters without currency parameter', () => {
    const formatters = createFormatters('en-US');
    expect(formatters.formatNumber(42)).toBe('42');
    expect(formatters.formatCurrency(100)).toBe('$100.00');
  });

  it('should use specified default currency', () => {
    const formatters = createFormatters('en-US', 'EUR');
    const formatted = formatters.formatCurrency(100);
    expect(formatted).toMatch(/€/);
    expect(formatted).toContain('100.00');
  });
});

describe('I18nManager constructor', () => {
  it('should work with empty config', () => {
    const i18n = new I18nManager();
    expect(i18n.getLocale()).toBe('en-US');
    expect(i18n.t('loading')).toBe('Loading...');
  });

  it('should work with createI18n factory', () => {
    const i18n = createI18n({ locale: 'fr-FR', strings: frStrings });
    expect(i18n.getLocale()).toBe('fr-FR');
    expect(i18n.t('loading')).toBe('Chargement...');
    expect(i18n.t('copy')).toBe('Copier');
  });
});
