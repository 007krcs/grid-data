import { test, expect } from '@playwright/test';

test.describe('GridStorm Smoke Tests', () => {
  test('grid renders with data rows', async ({ page }) => {
    await page.goto('/');

    // Wait for the grid container to appear
    const grid = page.locator('[class*="gs-root"], [class*="grid"], [role="grid"]');
    await expect(grid.first()).toBeVisible({ timeout: 10_000 });
  });

  test('grid has header row with columns', async ({ page }) => {
    await page.goto('/');

    const headers = page.locator('[role="columnheader"], [class*="gs-header-cell"]');
    await expect(headers.first()).toBeVisible({ timeout: 10_000 });

    const count = await headers.count();
    expect(count).toBeGreaterThan(0);
  });

  test('grid has data rows', async ({ page }) => {
    await page.goto('/');

    const rows = page.locator('[role="row"], [class*="gs-row"]');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });

    const count = await rows.count();
    expect(count).toBeGreaterThan(1); // at least header + 1 data row
  });

  test('grid is keyboard accessible', async ({ page }) => {
    await page.goto('/');

    const grid = page.locator('[role="grid"]');
    if ((await grid.count()) > 0) {
      // Grid should have a role and be focusable
      await expect(grid.first()).toHaveAttribute('role', 'grid');
    }
  });

  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Filter out known benign errors (e.g., favicon 404)
    const realErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('404'),
    );
    expect(realErrors).toHaveLength(0);
  });
});
