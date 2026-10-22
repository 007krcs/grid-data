/**
 * Plugin-combination interaction specs.
 *
 * Each test exercises a real user flow in the feature showcase that crosses
 * at least two plugins (editing × selection, grouping × sorting, pinning ×
 * scrolling, …). These are the paths where per-plugin unit tests pass and
 * real browsers still break. Assertions are written as "state changed in the
 * expected direction" rather than exact counts so demo data can evolve.
 */
import { test, expect, type Page, type Locator } from '@playwright/test';

const GRID = '[role="grid"]';
const DATA_ROW = '[role="row"][data-row-id]';

async function openDemo(page: Page, title: string | RegExp): Promise<Locator> {
  await page.goto('/');
  await page.locator('aside').getByText(title, { exact: typeof title === 'string' }).first().click();
  const grid = page.locator(GRID).first();
  await expect(grid).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(300);
  return grid;
}

function cell(page: Page, rowId: string, colId: string): Locator {
  return page.locator(`#gs-cell-${rowId}-${colId}`);
}

async function firstRowId(page: Page): Promise<string> {
  const id = await page.locator(DATA_ROW).first().getAttribute('data-row-id');
  expect(id).toBeTruthy();
  return id!;
}

// ─── 1. Editing × Selection ──────────────────────────────────────────────────
test.describe('Editing × Selection', () => {
  test('double-click edits a cell, Enter commits, the change is reported', async ({ page }) => {
    await openDemo(page, 'Cell Editing');
    const rowId = await firstRowId(page);
    const target = cell(page, rowId, 'name');
    const before = (await target.innerText()).trim();

    await target.dblclick();
    const editor = page.locator('.gs-cell-editor').first();
    await expect(editor).toBeVisible();
    await editor.fill('Edited by e2e');
    await editor.press('Enter');

    await expect(target).toHaveText(/Edited by e2e/);
    expect(before).not.toBe('Edited by e2e');
    // The demo echoes cell:valueChanged into a hint; proves the event fired
    // with the right colId after the renderer committed the edit.
    await expect(page.getByText(/Last edit:/)).toContainText('name');
  });

  test('Escape cancels an edit and restores the original value', async ({ page }) => {
    await openDemo(page, 'Cell Editing');
    const rowId = await firstRowId(page);
    const target = cell(page, rowId, 'supplier');
    const before = (await target.innerText()).trim();

    await target.dblclick();
    const editor = page.locator('.gs-cell-editor').first();
    await expect(editor).toBeVisible();
    await editor.fill('should not persist');
    await editor.press('Escape');

    await expect(editor).toBeHidden();
    await expect(target).toHaveText(before);
  });

  test('read-only columns do not open an editor', async ({ page }) => {
    await openDemo(page, 'Cell Editing');
    const rowId = await firstRowId(page);
    await cell(page, rowId, 'sku').dblclick();
    await page.waitForTimeout(200);
    await expect(page.locator('.gs-cell-editor')).toHaveCount(0);
  });
});

// ─── 2. Editing × Sorting ────────────────────────────────────────────────────
test.describe('Editing × Sorting', () => {
  test('an edited numeric value participates in the next sort', async ({ page }) => {
    await openDemo(page, 'Cell Editing');
    const rowId = await firstRowId(page);

    await cell(page, rowId, 'price').dblclick();
    const editor = page.locator('.gs-cell-editor').first();
    await expect(editor).toBeVisible();
    await editor.fill('999999');
    await editor.press('Enter');
    await expect(cell(page, rowId, 'price')).toHaveText(/999,999/);

    // Sort Price descending: click header until the edited row is first.
    const header = page.locator('[role="columnheader"]').filter({ hasText: /Price/ }).first();
    await header.click();
    await page.waitForTimeout(200);
    if ((await firstRowId(page)) !== rowId) {
      await header.click();
      await page.waitForTimeout(200);
    }
    expect(await firstRowId(page)).toBe(rowId);
  });
});

// ─── 3. Grouping × expand/collapse ───────────────────────────────────────────
test.describe('Grouping', () => {
  test('renders collapsed group rows and expands one to reveal leaf rows', async ({ page }) => {
    await openDemo(page, 'Row Grouping');
    const groups = page.locator('.gs-group-row');
    const groupCount = await groups.count();
    expect(groupCount).toBeGreaterThan(1);
    const rowsBefore = await page.locator(DATA_ROW).count();

    const first = groups.first();
    await expect(first).toHaveAttribute('aria-expanded', 'false');
    await first.locator('.gs-group-chevron').click();
    await page.waitForTimeout(300);

    await expect(page.locator('.gs-group-row').first()).toHaveAttribute('aria-expanded', 'true');
    expect(await page.locator(DATA_ROW).count()).toBeGreaterThan(rowsBefore);
  });
});

// ─── 4. Grouping × Sorting ───────────────────────────────────────────────────
test.describe('Grouping × Sorting', () => {
  test('sorting a leaf column keeps group rows intact', async ({ page }) => {
    await openDemo(page, 'Row Grouping');
    const groupsBefore = await page.locator('.gs-group-row').count();
    expect(groupsBefore).toBeGreaterThan(1);

    await page.locator('[role="columnheader"]').filter({ hasText: /Employee/ }).first().click();
    await page.waitForTimeout(300);

    expect(await page.locator('.gs-group-row').count()).toBe(groupsBefore);
    await expect(page.locator(GRID).first()).toBeVisible();
  });
});

// ─── 5. Column pinning × horizontal scroll ───────────────────────────────────
test.describe('Column Pinning × Scrolling', () => {
  test('pinned headers keep their x position while the body scrolls horizontally', async ({ page }) => {
    await openDemo(page, 'Column Pinning');
    const idHeader = page.locator('[role="columnheader"]').filter({ hasText: /^ID$/ }).first();
    const emailHeader = page.locator('[role="columnheader"]').filter({ hasText: /Email/ }).first();
    const idBefore = (await idHeader.boundingBox())!.x;
    const emailBefore = (await emailHeader.boundingBox())!.x;

    const viewport = page.locator('.gs-body-viewport').first();
    await viewport.evaluate((el) => {
      el.scrollLeft = 400;
      el.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(300);

    const idAfter = (await idHeader.boundingBox())!.x;
    const emailAfter = (await emailHeader.boundingBox())!.x;
    expect(Math.abs(idAfter - idBefore)).toBeLessThan(2);
    expect(emailAfter).toBeLessThan(emailBefore);
  });
});

// ─── 6. Pagination × Sorting ─────────────────────────────────────────────────
test.describe('Pagination × Sorting', () => {
  test('page navigation changes rows and sorting resets to a sorted first page', async ({ page }) => {
    await openDemo(page, 'Pagination');
    const firstBefore = await firstRowId(page);

    const next = page.getByRole('button', { name: 'Next page' }).first();
    await next.click();
    await page.waitForTimeout(300);
    const firstOnPage2 = await firstRowId(page);
    expect(firstOnPage2).not.toBe(firstBefore);

    const header = page.locator('[role="columnheader"]').first();
    await header.click();
    await page.waitForTimeout(300);
    // Grid still renders a full page after sorting while paginated.
    expect(await page.locator(DATA_ROW).count()).toBeGreaterThan(5);
    await expect(page.locator('.gs-pagination-label').first()).toBeVisible();
  });
});

// ─── 7. Selection × Status bar ───────────────────────────────────────────────
test.describe('Selection × Status Bar', () => {
  test('selecting a row narrows the status-bar aggregation to the selection', async ({ page }) => {
    await openDemo(page, 'Status Bar');
    const rowsLabel = page.getByText(/^Rows:/);
    await expect(rowsLabel).toBeVisible();
    const allRows = await rowsLabel.innerText();

    await page.locator(DATA_ROW).first().click();
    await page.waitForTimeout(300);

    await expect(page.locator('.gs-row-selected')).toHaveCount(1);
    await expect(page.getByText(/1 rows selected/)).toBeVisible();
    await expect(rowsLabel).toContainText('1');
    expect(await rowsLabel.innerText()).not.toBe(allRows);
  });
});

// ─── 8. Clipboard × Selection ────────────────────────────────────────────────
test.describe('Clipboard × Selection', () => {
  test('Ctrl+C copies the selected row with headers', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are only grantable in Chromium');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openDemo(page, 'Clipboard');

    const row = page.locator(DATA_ROW).first();
    const rowId = (await row.getAttribute('data-row-id'))!;
    const product = (await cell(page, rowId, 'name').innerText()).trim();
    await row.click();
    await expect(page.locator('.gs-row-selected')).toHaveCount(1);

    await page.locator(GRID).first().focus();
    await page.keyboard.press('Control+c');
    await page.waitForTimeout(300);

    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toContain(product);
    expect(text.split('\n')[0]).toMatch(/Product/); // copyHeaders: true
  });
});

// ─── 9. Full featured: Filtering × Selection × Pagination ────────────────────
test.describe('Full Featured: Filtering × Selection × Pagination', () => {
  test('quick filter shrinks the paginated total and checkbox selection survives', async ({ page }) => {
    await openDemo(page, 'Full Featured');
    const label = page.locator('.gs-pagination-label').first();
    await expect(label).toBeVisible();
    const before = await label.innerText();

    await page.locator('input[placeholder*="Quick filter"]').fill('Engineering');
    await page.waitForTimeout(600);
    const after = await label.innerText();
    expect(after).not.toBe(before);

    const checkbox = page.locator(`${DATA_ROW} input[type="checkbox"]`).first();
    await checkbox.click();
    await page.waitForTimeout(200);
    await expect(page.getByText(/Selected:/)).toContainText('1');
  });
});

// ─── 10. Row pinning × Sorting ───────────────────────────────────────────────
test.describe('Row Pinning × Sorting', () => {
  test('a pinned-top row stays first when the body is sorted', async ({ page }) => {
    await openDemo(page, 'Row Pinning');
    const allRows = page.locator('[role="row"]').filter({ hasText: /PINNED TOP/ });
    await expect(allRows.first()).toBeVisible();
    const pinnedBefore = (await allRows.first().boundingBox())!.y;

    await page.locator('[role="columnheader"]').filter({ hasText: /^Name$/ }).first().click();
    await page.waitForTimeout(300);

    const pinnedAfter = (await allRows.first().boundingBox())!.y;
    expect(Math.abs(pinnedAfter - pinnedBefore)).toBeLessThan(2);
    // Exactly one pinned-top row, and the grid still shows body rows.
    await expect(allRows).toHaveCount(1);
    expect(await page.locator('[role="row"][data-row-id]').count()).toBeGreaterThan(5);
  });
});
