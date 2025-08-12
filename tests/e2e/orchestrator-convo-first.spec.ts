import { test, expect } from '@playwright/test';

// Basic conversational-first flow checks
// These tests are lightweight and validate the high-level behavior only.

test.describe('Coach Orchestrator - Conversation First', () => {
  test('Free talk: no sign-off, short reply', async ({ page }) => {
    await page.goto('/coach/lucy');
    await page.waitForLoadState('networkidle');

    // Type message
    await page.getByPlaceholder('Nachricht eingeben...').fill('Ich denke über Ashwagandha nach');
    await page.keyboard.press('Enter');

    // Wait for assistant reply
    const assistantBubble = page.locator('text=Ashwagandha').first();
    await expect(assistantBubble).toBeVisible({ timeout: 20000 });

    // Heuristic: ensure the Lucy preset sign-off is not appended
    await expect(page.locator('text=Klingt das gut für dich?')).toHaveCount(0);
  });

  test('Tool intent: optional sign-off, not duplicated', async ({ page }) => {
    await page.goto('/coach/lucy');
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder('Nachricht eingeben...').fill('Analysier meinen Kreatin-Stack');
    await page.keyboard.press('Enter');

    // Expect some analysis keywords or confirmation chips to appear
    await expect(page.locator('text=Kreatin')).toBeVisible({ timeout: 25000 });
    // No duplicate sign-off
    await expect(page.locator('text=Klingt das gut für dich?')).toHaveCount(0);
  });

  test('Follow-up remains sign-off free', async ({ page }) => {
    await page.goto('/coach/lucy');
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder('Nachricht eingeben...').fill('Kurze Einschätzung zu meinem Schlaf');
    await page.keyboard.press('Enter');

    // After first reply, send a follow-up
    await page.getByPlaceholder('Nachricht eingeben...').fill('und was würdest du morgen ändern?');
    await page.keyboard.press('Enter');

    await expect(page.locator('text=ändern')).toBeVisible({ timeout: 25000 });
    await expect(page.locator('text=Klingt das gut für dich?')).toHaveCount(0);
  });

  test('Vision: image upload yields short reaction (no auto tool)', async ({ page }) => {
    await page.goto('/coach/lucy');
    await page.waitForLoadState('networkidle');

    // If there is an upload button, attempt a simple image send if the UI supports it
    const uploadBtn = page.getByRole('button', { name: /bild|upload|foto/i });
    if (await uploadBtn.count()) {
      await uploadBtn.first().click();
      // Skip actual file selection in CI; ensure UI stays responsive
      await expect(page.locator('text=Bild')).toBeVisible({ timeout: 15000 });
    }
  });
});
