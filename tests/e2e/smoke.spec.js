import { test, expect } from '@playwright/test';

/**
 * Smoke: real Backend+Postgres health + Login UI render.
 * Does not use mock API. No credentials in this file.
 */
test('smoke: backend health and login page render', async ({ page, request }) => {
  const healthResponse = await request.get('http://localhost:3100/api/health');
  expect(healthResponse.ok()).toBeTruthy();

  const health = await healthResponse.json();
  expect(health.ok).toBe(true);
  expect(health.db).toBe('up');

  await page.goto('/login');

  await expect(page.locator('.auth-page')).toBeVisible();
  await expect(page.locator('form.auth-form')).toBeVisible();
  await expect(page.locator('#auth-username')).toBeVisible();
  await expect(page.locator('#auth-password')).toBeVisible();
  await expect(page.getByRole('button', { name: /ورود/i })).toBeVisible();
});
