import { test, expect } from '@playwright/test';

const TEST_EMAIL = `test-${Date.now()}@opentour-test.nl`;

test('MVP Organizer Flow', async ({ page }) => {
  let tournamentId: string;

  // ==================== 1. Login ====================
  await test.step('Login via dev-magic-link', async () => {
    await page.goto('/nl/login');
    await expect(page.getByRole('heading', { name: 'Inloggen' })).toBeVisible();

    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.getByRole('button', { name: /direct inloggen/i }).click();

    await page.waitForURL(/\/nl\/dashboard/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Mijn toernooien' })).toBeVisible();
  });

  // ==================== 2. Create tournament ====================
  await test.step('Create tournament via wizard', async () => {
    await page.goto('/nl/tournament/new');
    await page.waitForTimeout(2000);
    await page.locator('input[type="text"]').first().fill('E2E Test Toernooi');
    await page.locator('input[type="date"]').fill('2026-07-15');
    await page.locator('button:has-text("Volgende")').click({ force: true });
    await expect(page.getByRole('heading', { name: 'Golfbaan' })).toBeVisible({ timeout: 10000 });

    await page.locator('button:has-text("Nog niet kiezen")').click({ force: true });
    await page.locator('button:has-text("Volgende")').click({ force: true });
    await expect(page.getByRole('heading', { name: /lussen.*afslagen/i })).toBeVisible({ timeout: 10000 });

    await page.locator('button:has-text("Volgende")').click({ force: true });
    await expect(page.getByRole('heading', { name: 'Spelformat' })).toBeVisible({ timeout: 10000 });

    await page.locator('button:has-text("Netto")').click({ force: true });
    await page.locator('button:has-text("Volgende")').click({ force: true });
    await expect(page.getByRole('heading', { name: 'Bevestigen' })).toBeVisible({ timeout: 10000 });

    await page.locator('button:has-text("Toernooi aanmaken")').click({ force: true });
    await page.waitForURL(/\/nl\/tournament\/.+?\/manage/, { timeout: 15000 });
    await expect(page.getByText('E2E Test Toernooi')).toBeVisible();

    const url = page.url();
    const match = url.match(/\/tournament\/([^/]+)\/manage/);
    tournamentId = match?.[1] ?? '';
    expect(tournamentId).toBeTruthy();
  });

  // ==================== 3. Add players ====================
  await test.step('Add players', async () => {
    await page.goto(`/nl/tournament/${tournamentId}/manage`);

    // Go to Players tab
    await page.getByRole('button', { name: /spelers/i }).first().click({ force: true });
    await page.waitForTimeout(500);

    // Add 4 players by filling the form input and clicking "Toevoegen" via evaluate
    // (avoids React re-render detachment issues with Playwright clicks)
    const players = ['Jan Jansen', 'Piet Pietersen', 'Kees de Vries', 'Marie van Dijk'];
    for (const name of players) {
      const result = await page.evaluate(async (playerName) => {
        const input = document.querySelector('input[placeholder="Naam *"]') as HTMLInputElement;
        if (!input) return 'input not found';
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        nativeSetter?.call(input, playerName);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(r => setTimeout(r, 200));
        const btns = Array.from(document.querySelectorAll('button'));
        const addBtn = btns.find(b => b.textContent?.includes('Toevoegen') && !b.disabled);
        if (!addBtn) return 'button disabled';
        addBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await new Promise(r => setTimeout(r, 2000));
        return 'ok';
      }, name);
      console.log(`Add "${name}":`, result);
    }

    // Wait for player list to update
    await page.waitForTimeout(2000);

    // Verify all 4 players appear in the list
    await expect(page.getByText('Jan Jansen')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Piet Pietersen')).toBeVisible();
    await expect(page.getByText('Kees de Vries')).toBeVisible();
    await expect(page.getByText('Marie van Dijk')).toBeVisible();

    // Verify player count is shown in tab
    await expect(page.getByRole('button', { name: /Spelers \(4\)/i })).toBeVisible();
  });
});
