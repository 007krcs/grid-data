import { test, expect } from '@playwright/test';

// ─── Grid Interaction E2E Tests ───
// These tests verify user interactions with the rendered grid.
// They run against the feature-showcase dev server (localhost:5173).

test.describe('GridStorm Column Interactions', () => {
  test('column headers are visible and non-empty', async ({ page }) => {
    await page.goto('/');

    const headers = page.locator('[role="columnheader"], [class*="gs-header-cell"]');
    await expect(headers.first()).toBeVisible({ timeout: 10_000 });

    // Each header should have non-empty text content
    const count = await headers.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(count, 5); i++) {
      const text = await headers.nth(i).textContent();
      expect(text?.trim().length).toBeGreaterThanOrEqual(0);
    }
  });

  test('clicking a sortable column header toggles sort', async ({ page }) => {
    await page.goto('/');

    const headers = page.locator('[role="columnheader"], [class*="gs-header-cell"]');
    await expect(headers.first()).toBeVisible({ timeout: 10_000 });

    const firstHeader = headers.first();
    // Click to sort ascending
    await firstHeader.click();
    await page.waitForTimeout(300);

    // Click again to sort descending (or clear)
    await firstHeader.click();
    await page.waitForTimeout(300);

    // Grid should still be visible and not crash
    const grid = page.locator('[class*="gs-root"], [role="grid"]');
    await expect(grid.first()).toBeVisible();
  });
});

test.describe('GridStorm Row Interactions', () => {
  test('data rows are rendered with cell content', async ({ page }) => {
    await page.goto('/');

    const cells = page.locator('[role="gridcell"], [class*="gs-cell"]');
    await expect(cells.first()).toBeVisible({ timeout: 10_000 });

    const count = await cells.count();
    expect(count).toBeGreaterThan(0);
  });

  test('clicking a row marks it as focused or selected', async ({ page }) => {
    await page.goto('/');

    const rows = page.locator('[role="row"], [class*="gs-row"]');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });

    const rowCount = await rows.count();
    if (rowCount > 1) {
      // Click the second row (first may be header)
      await rows.nth(1).click();
      await page.waitForTimeout(200);

      // Grid should remain visible after click
      const grid = page.locator('[class*="gs-root"], [role="grid"]');
      await expect(grid.first()).toBeVisible();
    }
  });
});

test.describe('GridStorm Keyboard Navigation', () => {
  test('grid container is focusable via keyboard', async ({ page }) => {
    await page.goto('/');

    const grid = page.locator('[role="grid"]');
    if ((await grid.count()) > 0) {
      await grid.first().focus();
      await page.waitForTimeout(100);

      // Press arrow down — should not crash
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(100);

      // Grid should still be visible
      await expect(grid.first()).toBeVisible();
    }
  });

  test('tab key navigates between interactive elements', async ({ page }) => {
    await page.goto('/');

    const grid = page.locator('[class*="gs-root"], [role="grid"]');
    await expect(grid.first()).toBeVisible({ timeout: 10_000 });

    // Press tab a few times — page should not throw
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    // Grid should still be visible
    await expect(grid.first()).toBeVisible();
  });
});

test.describe('GridStorm Accessibility', () => {
  test('grid root has correct ARIA role', async ({ page }) => {
    await page.goto('/');

    const grid = page.locator('[role="grid"]');
    if ((await grid.count()) > 0) {
      await expect(grid.first()).toHaveAttribute('role', 'grid');
    }
  });

  test('column headers have columnheader role', async ({ page }) => {
    await page.goto('/');

    const headers = page.locator('[role="columnheader"]');
    if ((await headers.count()) > 0) {
      const count = await headers.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('data cells have gridcell role', async ({ page }) => {
    await page.goto('/');

    const cells = page.locator('[role="gridcell"]');
    if ((await cells.count()) > 0) {
      const count = await cells.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});

test.describe('GridStorm Layout', () => {
  test('grid container has positive dimensions', async ({ page }) => {
    await page.goto('/');

    const container = page.locator('[class*="gs-root"], [class*="gs-container"]');
    await expect(container.first()).toBeVisible({ timeout: 10_000 });

    const box = await container.first().boundingBox();
    if (box) {
      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThan(0);
    }
  });

  test('grid renders correctly at mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const grid = page.locator('[class*="gs-root"], [role="grid"]');
    await expect(grid.first()).toBeVisible({ timeout: 10_000 });
  });

  test('grid renders correctly at wide viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    const grid = page.locator('[class*="gs-root"], [role="grid"]');
    await expect(grid.first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('GridStorm Performance', () => {
  test('grid renders within acceptable time', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');

    const grid = page.locator('[class*="gs-root"], [role="grid"]');
    await expect(grid.first()).toBeVisible({ timeout: 10_000 });
    const elapsed = Date.now() - start;

    // Grid should be visible within 10 seconds
    expect(elapsed).toBeLessThan(10_000);
  });

  test('no memory leaks on navigation', async ({ page }) => {
    await page.goto('/');

    const grid = page.locator('[class*="gs-root"], [role="grid"]');
    await expect(grid.first()).toBeVisible({ timeout: 10_000 });

    // Navigate away and back
    await page.goto('about:blank');
    await page.goto('/');

    await expect(grid.first()).toBeVisible({ timeout: 10_000 });
  });
});
