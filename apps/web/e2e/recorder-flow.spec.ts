import { test, expect } from '@playwright/test';

test.describe('Recorder flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/nl/scorer');
  });

  test('recorder enters access code and navigates to scorer', async ({ page }) => {
    await page.fill('input[placeholder*="toegangscode"]', 'ABCDEFGH');
    await page.click('button:has-text("Start")');

    await page.waitForURL(/\/nl\/scorer\/[^/]+\/[^/]+/, { timeout: 10000 });
    await expect(page.getByText(/hole/i)).toBeVisible();
  });

  test('recorder enters scores for holes', async ({ page }) => {
    await page.fill('input[placeholder*="toegangscode"]', 'ABCDEFGH');
    await page.click('button:has-text("Start")');

    await page.waitForURL(/\/nl\/scorer\/[^/]+\/[^/]+/, { timeout: 10000 });

    for (let i = 1; i <= 3; i++) {
      await page.fill('input[placeholder*="hole"]', String(i));
      await page.fill('input[placeholder*="slag"]', String(4 + i));
      await page.click('button:has-text("Opslaan")');
      await page.waitForTimeout(500);
    }

    await expect(page.getByText('3')).toBeVisible();
  });

  test('recorder sees sync status', async ({ page }) => {
    await page.fill('input[placeholder*="toegangscode"]', 'ABCDEFGH');
    await page.click('button:has-text("Start")');

    await page.waitForURL(/\/nl\/scorer\/[^/]+\/[^/]+/, { timeout: 10000 });

    await expect(page.getByText(/gesynchroniseerd|offline|synchroniseren/i)).toBeVisible();
  });
});
