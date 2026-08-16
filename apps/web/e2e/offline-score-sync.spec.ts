import { test, expect } from '@playwright/test';

test.describe('Offline score sync', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/nl/scorer');
  });

  test('offline score appears in local UI', async ({ page }) => {
    await page.context().setOffline(true);

    await page.fill('input[placeholder*="toegangscode"]', 'ABCDEFGH');
    await page.click('button:has-text("Start")');

    await page.waitForTimeout(1000);

    await page.fill('input[placeholder*="holes"]', '1');
    await page.fill('input[placeholder*="slag"]', '4');
    await page.click('button:has-text("Opslaan")');

    await expect(page.getByText('4')).toBeVisible();
  });

  test('reconnect triggers sync', async ({ page }) => {
    await page.context().setOffline(true);
    await page.fill('input[placeholder*="toegangscode"]', 'ABCDEFGH');
    await page.click('button:has-text("Start")');
    await page.waitForTimeout(1000);
    await page.fill('input[placeholder*="holes"]', '1');
    await page.fill('input[placeholder*="slag"]', '4');
    await page.click('button:has-text("Opslaan")');

    await page.context().setOffline(false);
    await page.waitForTimeout(2000);

    await expect(page.getByText('Gesynchroniseerd')).toBeVisible();
  });

  test('score appears in leaderboard after sync', async ({ page }) => {
    await page.context().setOffline(true);
    await page.fill('input[placeholder*="toegangscode"]', 'ABCDEFGH');
    await page.click('button:has-text("Start")');
    await page.waitForTimeout(1000);
    await page.fill('input[placeholder*="holes"]', '1');
    await page.fill('input[placeholder*="slag"]', '4');
    await page.click('button:has-text("Opslaan")');

    await page.context().setOffline(false);
    await page.waitForTimeout(2000);

    await page.goto('/nl/tournament/abc123');
    await expect(page.getByText('4')).toBeVisible();
  });

  test('multiple pending scores sync in correct order', async ({ page }) => {
    await page.context().setOffline(true);
    await page.fill('input[placeholder*="toegangscode"]', 'ABCDEFGH');
    await page.click('button:has-text("Start")');
    await page.waitForTimeout(1000);

    for (let hole = 1; hole <= 3; hole++) {
      await page.fill('input[placeholder*="holes"]', String(hole));
      await page.fill('input[placeholder*="slag"]', String(4 + hole));
      await page.click('button:has-text("Opslaan")');
      await page.waitForTimeout(500);
    }

    await page.context().setOffline(false);
    await page.waitForTimeout(3000);

    await expect(page.getByText('Gesynchroniseerd')).toBeVisible();
  });

  test('sync error handled gracefully', async ({ page }) => {
    await page.context().setOffline(true);
    await page.fill('input[placeholder*="toegangscode"]', 'ABCDEFGH');
    await page.click('button:has-text("Start")');
    await page.waitForTimeout(1000);
    await page.fill('input[placeholder*="holes"]', '1');
    await page.fill('input[placeholder*="slag"]', '4');
    await page.click('button:has-text("Opslaan")');

    await page.route('**/rest/v1/**', route => route.fulfill({ status: 500 }));
    await page.context().setOffline(false);
    await page.waitForTimeout(2000);

    await expect(page.getByText(/Fout bij sync/)).toBeVisible();
  });
});
