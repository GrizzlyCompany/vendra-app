import { test, expect } from '@playwright/test';

test('homepage has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Vendra/);
});

test('homepage has main heading', async ({ page }) => {
  await page.goto('/');

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Welcome to Vendra' })).toBeVisible();
});
