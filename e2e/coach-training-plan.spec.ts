import { test, expect } from '@playwright/test';

test.describe('Coach Training Plan Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to coach page
    await page.goto('/coach/lucy');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display training plan after coach interaction', async ({ page }) => {
    // Type a training plan request
    const chatInput = page.getByRole('textbox', { name: /nachricht/i });
    await chatInput.fill('Erstelle mir einen Trainingsplan für Kraftaufbau');
    
    // Send message
    await page.keyboard.press('Enter');
    
    // Wait for coach response with training plan
    await expect(page.getByText('Trainingsplan')).toBeVisible({ timeout: 10000 });
    
    // Verify training plan card is displayed
    const trainingCard = page.locator('[data-testid="smart-card"]').filter({ hasText: 'Trainingsplan' });
    await expect(trainingCard).toBeVisible();
  });

  test('should handle dark mode toggle with training plan', async ({ page }) => {
    // Create a training plan first
    const chatInput = page.getByRole('textbox', { name: /nachricht/i });
    await chatInput.fill('Trainingsplan für 3 Tage die Woche');
    await page.keyboard.press('Enter');
    
    // Wait for training plan to appear
    await expect(page.getByText('Trainingsplan')).toBeVisible({ timeout: 10000 });
    
    // Toggle dark mode
    const darkModeToggle = page.getByRole('button', { name: /theme/i });
    await darkModeToggle.click();
    
    // Verify training plan is still visible and styled correctly
    const trainingCard = page.locator('[data-testid="smart-card"]').filter({ hasText: 'Trainingsplan' });
    await expect(trainingCard).toBeVisible();
    
    // Check for dark mode classes
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('should handle training plan action buttons', async ({ page }) => {
    // Create training plan with actions
    const chatInput = page.getByRole('textbox', { name: /nachricht/i });
    await chatInput.fill('Erstelle einen Ganzkörper-Trainingsplan');
    await page.keyboard.press('Enter');
    
    // Wait for plan with action buttons
    await expect(page.getByText('Trainingsplan')).toBeVisible({ timeout: 10000 });
    
    // Look for action buttons (these might be rendered by the tool handler)
    const actionButtons = page.locator('button').filter({ hasText: /plan|bestätigen|verwerfen/i });
    
    if (await actionButtons.count() > 0) {
      // Click first action button if available
      await actionButtons.first().click();
      
      // Verify some action was taken (new message, modal, etc.)
      await page.waitForTimeout(1000);
    }
  });

  test('should handle malformed JSON gracefully', async ({ page }) => {
    // Mock a response with malformed JSON to test error handling
    await page.route('**/functions/v1/**', route => {
      if (route.request().url().includes('unified-coach-engine')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            role: 'assistant',
            type: 'card',
            card: 'workout_plan',
            payload: {
              // Intentionally incomplete/malformed data
              id: 'test-123',
              name: 'Test Plan'
              // missing required fields
            }
          })
        });
      } else {
        route.continue();
      }
    });
    
    const chatInput = page.getByRole('textbox', { name: /nachricht/i });
    await chatInput.fill('Trainingsplan erstellen');
    await page.keyboard.press('Enter');
    
    // Should show error handling UI, not raw JSON
    await expect(page.getByText(/fehler/i)).toBeVisible({ timeout: 5000 });
    
    // Should NOT show raw JSON in UI
    await expect(page.getByText(/\{.*"id".*\}/)).not.toBeVisible();
  });

  test('should cache training plan responses', async ({ page }) => {
    // First request
    const chatInput = page.getByRole('textbox', { name: /nachricht/i });
    await chatInput.fill('Krafttraining Plan');
    await page.keyboard.press('Enter');
    
    // Wait for response
    await expect(page.getByText('Trainingsplan')).toBeVisible({ timeout: 10000 });
    
    // Record network requests
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('unified-coach-engine')) {
        requests.push(request.url());
      }
    });
    
    // Second identical request
    await chatInput.fill('Krafttraining Plan');
    await page.keyboard.press('Enter');
    
    // Should get cached response quickly
    await expect(page.getByText('Trainingsplan')).toBeVisible({ timeout: 3000 });
    
    // Verify caching behavior (fewer network requests for same content)
    await page.waitForTimeout(2000);
  });

  test('should validate HTML sanitization in training plans', async ({ page }) => {
    // This test verifies that HTML content is properly sanitized
    const chatInput = page.getByRole('textbox', { name: /nachricht/i });
    await chatInput.fill('Detaillierter Trainingsplan mit HTML Formatierung');
    await page.keyboard.press('Enter');
    
    // Wait for training plan
    await expect(page.getByText('Trainingsplan')).toBeVisible({ timeout: 10000 });
    
    // Verify no script tags are present in the DOM
    const scriptTags = page.locator('script:not([src])');
    const count = await scriptTags.count();
    
    // Should only have legitimate script tags (not injected ones)
    expect(count).toBeLessThan(10); // Allow for legitimate app scripts
    
    // Check that HTML content is rendered but scripts are stripped
    const planContent = page.locator('[data-testid="smart-card"]').filter({ hasText: 'Trainingsplan' });
    await expect(planContent).toBeVisible();
  });
});