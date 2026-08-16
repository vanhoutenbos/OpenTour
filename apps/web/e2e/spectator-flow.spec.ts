import { test, expect } from '@playwright/test';

test.describe('Spectator flow', () => {
  test('spectator views public tournament leaderboard', async ({ page }) => {
    await page.goto('/nl/tournament/abc123');

    await expect(page.getByText(/leaderboard/i)).toBeVisible();
  });

  test('spectator can see player scores', async ({ page }) => {
    await page.goto('/nl/tournament/abc123/scores');

    await expect(page.getByText(/scores/i)).toBeVisible();
  });

  test('spectator cannot access draft tournament', async ({ page }) => {
    const response = await page.goto('/nl/tournament/draft-tournament-id');
    expect(response?.status()).toBe(404);
  });
});
