import { test, expect } from '@playwright/test';

test.describe('Coach Training Plan Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/coach/lucy');
    await page.waitForLoadState('networkidle');
  });

  test('should display training plan after coach interaction', async ({ page }) => {
    const chatInput = page.locator('textarea, input[type="text"]').first();
    await chatInput.fill('Erstelle mir einen Trainingsplan für Kraftaufbau');
    await page.keyboard.press('Enter');
    
    // Wait for training plan to appear
    await expect(page.getByText('Trainingsplan')).toBeVisible({ timeout: 15000 });
  });

  test('should handle training plan display correctly', async ({ page }) => {
    const chatInput = page.locator('textarea, input[type="text"]').first();
    await chatInput.fill('Trainingsplan für 3 Tage die Woche');
    await page.keyboard.press('Enter');
    
    await expect(page.getByText('Trainingsplan')).toBeVisible({ timeout: 15000 });
    
    // Verify no raw JSON is displayed
    await expect(page.locator('text=/\\{.*"id".*\\}/')).not.toBeVisible();
  });

  test('should handle dark mode toggle', async ({ page }) => {
    // Toggle dark mode if available
    const themeToggle = page.locator('[data-testid="theme-toggle"], button:has-text("theme"), [aria-label*="theme"]').first();
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
    }
    
    // Test still works in dark mode
    const chatInput = page.locator('textarea, input[type="text"]').first();
    await chatInput.fill('Kurzer Trainingsplan');
    await page.keyboard.press('Enter');
    
    await expect(page.getByText('Trainingsplan')).toBeVisible({ timeout: 15000 });
  });
});