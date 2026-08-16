import { test, expect, devices } from '@playwright/test';

test.describe('Course management responsive', () => {
  const viewports = [
    { name: 'mobile', ...devices['iPhone 12'] },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 },
  ];

  for (const viewport of viewports) {
    test(`course page works on ${viewport.name}`, async ({ page }) => {
      test.setTimeout(120000);

      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/nl/course');

      const body = await page.locator('body');
      await expect(body).toBeVisible();

      const hasHorizontalScroll = await body.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
      expect(hasHorizontalScroll).toBe(false);
    });
  }
});
