/**
 * Smoke specs for every example app, plus the hub's live benchmark.
 *
 * Each app boots on its own port (see playwright.config.ts). A spec asserts
 * that the page loads, renders its primary UI, and logs no console errors.
 */
import { test, expect, type Page } from '@playwright/test';
import { appUrl, type AppName } from './playwright.config';

const GRID_APPS: AppName[] = [
  'feature-showcase',
  'react-demo',
  'spreadsheet',
  'financial-trading',
  'analytics-explorer',
  'cookbook',
  'playground',
];

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

const benign = (e: string) =>
  e.includes('favicon') ||
  e.includes('404') ||
  e.includes('Download the React DevTools') ||
  e.includes('GridStorm MCP') ||
  e.includes('ERR_BLOCKED_BY_CLIENT');

for (const app of GRID_APPS) {
  test.describe(`${app} smoke`, () => {
    test('renders a grid with header and data rows, no console errors', async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(appUrl(app));

      const grid = page.locator('[role="grid"]').first();
      await expect(grid).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('[role="columnheader"]').first()).toBeVisible();
      await expect(page.locator('[role="row"][data-row-id]').first()).toBeVisible();

      await page.waitForTimeout(1_000);
      expect(errors.filter((e) => !benign(e))).toEqual([]);
    });
  });
}

test.describe('pdf-viewer smoke', () => {
  test('loads its shell without console errors', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(appUrl('pdf-viewer'));
    await expect(page.locator('#root, main, body').first()).toBeVisible();
    await expect(page.getByText(/PDF/i).first()).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1_000);
    expect(errors.filter((e) => !benign(e))).toEqual([]);
  });
});

test.describe('hub smoke', () => {
  test('home page renders the live benchmark control', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(appUrl('hub'));
    await expect(page.getByRole('button', { name: /Run 100k-row benchmark/i })).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(500);
    expect(errors.filter((e) => !benign(e))).toEqual([]);
  });

  test('live benchmark runs in-page and produces measured numbers', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'timing-sensitive; one engine is enough for the smoke');
    test.setTimeout(120_000);
    await page.goto(appUrl('hub'));
    const run = page.getByRole('button', { name: /Run 100k-row benchmark/i });
    await run.click();

    await expect(page.getByRole('button', { name: /Run again/i })).toBeVisible({ timeout: 90_000 });

    const values = page.locator('#benchmarks .benchmark-value');
    const texts = await values.allInnerTexts();
    // First four cards: time to first row, fps, sort, filter — all measured.
    expect(texts[0]).toMatch(/\d+(\.\d+)? ms/);
    expect(texts[1]).toMatch(/\d+ fps/);
    expect(texts[2]).toMatch(/\d+(\.\d+)? ms/);
    expect(texts[3]).toMatch(/\d+(\.\d+)? ms/);
    // The grid built for the benchmark must have been torn down again.
    await expect(page.locator('#benchmarks [role="grid"]')).toHaveCount(0);
  });
});
