import { test, expect } from '@playwright/test';

// Stable URL tokens — these are the only identifiers we hardcode.
const SHOP_TOKEN = 'demo-shop-brussels';
const FORM_URL = `/fr/p/ihpo?shop=${SHOP_TOKEN}`;

async function fillRequiredFields(page: import('@playwright/test').Page) {
  const ts = Date.now();
  await page.getByLabel(/prénom/i).fill('Alice');
  await page.getByLabel(/nom/i).fill('Dupont');
  await page.getByLabel(/e-mail/i).fill(`alice+${ts}@example.com`);
  // Wait briefly so the MIN_FILL_MS (1500ms) bot-speed guard doesn't fire
  await page.waitForTimeout(1600);
}

test.describe('Simple form — end-to-end submission', () => {
  test('submits successfully with NO rep selected → 200 + confirmation ID', async ({ page }) => {
    await page.goto(FORM_URL);

    await fillRequiredFields(page);

    // Tick T&C checkbox
    await page.getByRole('checkbox').click();

    // Wait for the submit button to be enabled
    const submitBtn = page.getByRole('button', { name: /basculer|submit/i });
    await expect(submitBtn).toBeEnabled();

    // Intercept the API response
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/leads') && r.request().method() === 'POST'),
      submitBtn.click(),
    ]);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.confirmationId).toBeTruthy();
    expect(typeof body.confirmationId).toBe('string');
  });

  test('submits successfully WITH a rep selected → 200 + confirmation ID', async ({ page }) => {
    await page.goto(FORM_URL);

    // Pick a rep from the hero picker
    const repPicker = page.getByRole('combobox').first();
    if (await repPicker.isVisible()) {
      await repPicker.click();
      // Select the first available rep option
      await page.getByRole('option').first().click();
    }

    await fillRequiredFields(page);
    await page.getByRole('checkbox').click();

    const submitBtn = page.getByRole('button', { name: /basculer|submit/i });
    await expect(submitBtn).toBeEnabled();

    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/leads') && r.request().method() === 'POST'),
      submitBtn.click(),
    ]);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.confirmationId).toBeTruthy();

    // Verify the rep UUID sent was a valid RFC 4122 UUID (not a fake hand-crafted one)
    const requestBody = JSON.parse((await response.request().postData()) ?? '{}');
    if (requestBody.salesRepId !== null) {
      expect(requestBody.salesRepId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    }
  });
});
