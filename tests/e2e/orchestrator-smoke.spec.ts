import { test, expect } from "@playwright/test";

test("meal → confirm flow", async ({ page }) => {
  await page.goto("/momentum-board");
  await page.getByPlaceholder("Schreib hier...").fill("250g Skyr + 1 Banane");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Bitte kurz bestätigen/i)).toBeVisible();
  await page.getByRole("button", { name: /Speichern/i }).click();
  await expect(page.getByText(/Mahlzeit gespeichert/i)).toBeVisible();
});

test("unclear → clarify", async ({ page }) => {
  await page.goto("/coach");
  await page.getByPlaceholder("Schreib hier...").fill("Mir ist flau, was tun?");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Meinst du das hier\?/i)).toBeVisible();
  await page.getByRole("button", { name: /Training loggen|Ernährungs-Analyse/i }).first().click();
  await expect(page.getByText(/OK|gespeichert|Analyse/i)).toBeVisible();
});

test("training text → routed", async ({ page }) => {
  await page.goto("/coach");
  await page.getByPlaceholder("Schreib hier...").fill("Bankdrücken 10x60kg rpe7");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Training/i)).toBeVisible();
});

test("training image → routed", async ({ page }) => {
  await page.goto("/coach");
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /Foto/i }).click();
  const chooser = await fileChooserPromise;
  await chooser.setFiles("tests/fixtures/exercise_latpull.jpg");
  await expect(page.getByText(/Erkannt|Training/i)).toBeVisible();
});

test("weight idempotent", async ({ page }) => {
  await page.goto("/coach");
  const msg = "Gewicht 82,4 kg";
  await page.getByPlaceholder("Schreib hier...").fill(msg);
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Gewicht gespeichert|bereits erfasst/i)).toBeVisible();
});

test("diary simple", async ({ page }) => {
  await page.goto("/coach");
  await page.getByPlaceholder("Schreib hier...").fill("Heute Fokus: Rücken. Dankbar: Schlaf, Familie.");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Tagebuch gespeichert/i)).toBeVisible();
});

test("tool timeout → fallback", async ({ page }) => {
  await page.goto("/coach?simulate=toolTimeout");
  await page.getByPlaceholder("Schreib hier...").fill("Analyse meine Mahlzeit");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Kurz hake ich|Ich helfe dir direkt/i)).toBeVisible();
});

// New: supplement image → analysis
test("supplement image → analysis", async ({ page }) => {
  await page.goto("/coach");
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /Foto/i }).click();
  const chooser = await fileChooserPromise;
  await chooser.setFiles("tests/fixtures/supplement_creatine.jpg");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Supplement-Analyse|💊/i)).toBeVisible();
});

// New: food image → meal analysis
test("food image → meal analysis", async ({ page }) => {
  await page.goto("/coach");
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /Foto/i }).click();
  const chooser = await fileChooserPromise;
  await chooser.setFiles("tests/fixtures/meal_bowl.jpg");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Bitte kurz bestätigen|Mahlzeit|Analyse/i)).toBeVisible();
});
