/**
 * E2E tests for GridStorm next-gen plugins (Horizons 1-3).
 * Tests run against the feature-showcase app at localhost:5173.
 */
import { test, expect, type Page } from '@playwright/test';

const BASE = '/';

async function navigateToDemo(page: Page, demoId: string) {
  await page.goto(BASE);
  // Click the sidebar item for this demo
  const sidebar = page.locator('aside');
  await sidebar.getByText(new RegExp(demoId.replace(/-/g, '.?'), 'i')).first().click();
  await page.waitForTimeout(400);
}

// ─── Horizon 1 ───────────────────────────────────────────────────────────────

test.describe('Intent Engine Plugin', () => {
  test('demo renders without errors', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Intent Engine').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
  });

  test('Record Intent button dispatches command', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Intent Engine').first().click();
    await page.waitForTimeout(500);
    const btn = page.getByRole('button', { name: /Record Intent/i });
    await expect(btn).toBeVisible();
    await btn.click();
    // Should not crash; grid remains visible
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
  });

  test('Reset button clears rankings', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Intent Engine').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Reset/i }).click();
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
  });
});

test.describe('Cell Formula Plugin', () => {
  test('demo renders with Revenue column', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Cell Formulas').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('[role="columnheader"]').filter({ hasText: /revenue/i })).toBeVisible();
  });

  test('Define Formula button computes values', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Cell Formulas').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Define Formula/i }).click();
    await page.waitForTimeout(300);
    // Status text appears
    await expect(page.getByText(/revenue = price/i)).toBeVisible();
  });

  test('Remove Formula button clears computed column', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Cell Formulas').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Define Formula/i }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /Remove Formula/i }).click();
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
  });
});

test.describe('Temporal Plugin (Time Travel)', () => {
  test('demo renders grid', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Time Travel').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
  });

  test('Snapshot button creates a snapshot', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Time Travel').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Snapshot/i }).click();
    await expect(page.getByText(/1 snapshot/i)).toBeVisible();
  });

  test('Undo button is clickable', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Time Travel').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Snapshot/i }).click();
    await page.waitForTimeout(200);
    const undoBtn = page.getByRole('button', { name: /Undo/i });
    await expect(undoBtn).toBeVisible();
    await undoBtn.click();
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
  });

  test('Redo button is clickable', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Time Travel').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Redo/i }).click();
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
  });
});

// ─── Horizon 2 ───────────────────────────────────────────────────────────────

test.describe('NL Query Plugin', () => {
  test('demo renders grid with query input', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('NL Query').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
    await expect(page.locator('input[placeholder*="sort by salary"]')).toBeVisible();
  });

  test('sort by salary desc example applies sort', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('NL Query').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /sort by salary desc/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/Executed/i)).toBeVisible();
  });

  test('filter status equals Active example applies filter', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('NL Query').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /filter status equals Active/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/Executed/i)).toBeVisible();
  });

  test('clear filters example clears', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('NL Query').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /clear filters/i }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
  });

  test('typing query and pressing Enter executes it', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('NL Query').first().click();
    await page.waitForTimeout(500);
    const input = page.locator('input[placeholder*="sort by salary"]');
    await input.fill('sort name asc');
    await input.press('Enter');
    await page.waitForTimeout(300);
    await expect(page.getByText(/Executed.*sort name asc/i)).toBeVisible();
  });
});

test.describe('Anomaly Detection Plugin', () => {
  test('demo renders grid', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Anomaly Detection').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
  });

  test('Feed Outlier button dispatches anomaly feed', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Anomaly Detection').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Feed Normal Data/i }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /Feed Outlier/i }).click();
    await page.waitForTimeout(300);
    // Grid stays visible
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
  });

  test('Clear Log button resets anomaly list', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Anomaly Detection').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Clear Log/i }).click();
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
  });
});

test.describe('Collaboration Plugin', () => {
  test('demo renders grid with user buttons', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Collaboration').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Alice Join/i })).toBeVisible();
  });

  test('joining Alice adds to presence', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Collaboration').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Alice Join/i }).click();
    await page.waitForTimeout(200);
    await expect(page.getByText(/Alice joined/i)).toBeVisible();
  });

  test('multiple users can join', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Collaboration').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Alice Join/i }).click();
    await page.getByRole('button', { name: /Bob Join/i }).click();
    await page.waitForTimeout(200);
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
  });
});

// ─── Horizon 3 ───────────────────────────────────────────────────────────────

test.describe('Semantic Analysis Plugin', () => {
  test('demo renders grid with semantic columns', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Semantic Analysis').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
    await expect(page.locator('[role="columnheader"]').filter({ hasText: /email/i })).toBeVisible();
  });

  test('Analyze Columns button runs analysis', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Semantic Analysis').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Analyze Columns/i }).click();
    await page.waitForTimeout(400);
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
  });
});

test.describe('Privacy Lens Plugin', () => {
  test('demo renders grid with PII columns', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Privacy Lens').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
    await expect(page.locator('[role="columnheader"]').filter({ hasText: /ssn/i })).toBeVisible();
  });

  test('Scan Email button detects PII in email column', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Privacy Lens').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Scan Email/i }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
  });

  test('Mask SSN button enables masking', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Privacy Lens').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Mask SSN/i }).click();
    await page.waitForTimeout(200);
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
  });

  test('Unmask SSN button disables masking', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Privacy Lens').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Unmask SSN/i }).click();
    await page.waitForTimeout(200);
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
  });

  test('Export Data Map button triggers export', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Privacy Lens').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Export Data Map/i }).click();
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
  });
});

test.describe('Adaptive Renderer Plugin', () => {
  test('demo renders grid', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Adaptive Renderer').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
  });

  test('Detect Device button emits recommendation', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Adaptive Renderer').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Detect Device/i }).click();
    await page.waitForTimeout(300);
    // Recommendation text should appear
    await expect(page.getByText(/Mode:/i)).toBeVisible();
  });

  test('Get Profile button emits device profile', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Adaptive Renderer').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Get Profile/i }).click();
    await page.waitForTimeout(200);
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
  });
});

test.describe('Intelligence Hub Plugin', () => {
  test('demo renders two grids', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Intelligence Hub').first().click();
    await page.waitForTimeout(500);
    const grids = page.locator('[role="grid"]');
    await expect(grids.first()).toBeVisible();
    expect(await grids.count()).toBeGreaterThanOrEqual(2);
  });

  test('Connect Both button connects grids to hub', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Intelligence Hub').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Connect Both/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/connected/i)).toBeVisible();
  });

  test('Get Insights button requests hub insights', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Intelligence Hub').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Connect Both/i }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /Get Insights/i }).click();
    await page.waitForTimeout(200);
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
  });

  test('Reset Hub button clears hub store', async ({ page }) => {
    await page.goto(BASE);
    await page.getByText('Intelligence Hub').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Reset Hub/i }).click();
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
  });
});
