import { expect } from '@playwright/test';
import { requireE2eQaCredentials } from './loadEnv.js';

const DEFAULT_REQUIRED_PERMS = [
  'companies:write',
  'orders:write',
  'activities:write',
];

/**
 * UI login with QA admin from env. Asserts session + write permissions.
 * @param {import('@playwright/test').Page} page
 * @param {{ requiredPermissions?: string[] }} [options]
 */
export async function loginAsQaAdmin(page, options = {}) {
  const { username, password } = requireE2eQaCredentials();
  const required = options.requiredPermissions || DEFAULT_REQUIRED_PERMS;

  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#auth-username')).toBeVisible();
  await page.fill('#auth-username', username);
  await page.fill('#auth-password', password);

  const [loginResponse] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('/auth/login') && res.request().method() === 'POST',
      { timeout: 60_000 },
    ),
    page.getByRole('button', { name: /ورود/ }).click(),
  ]);
  expect(
    loginResponse.ok(),
    `Login HTTP ${loginResponse.status()}`,
  ).toBeTruthy();

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 });

  const token = await page.evaluate(() => localStorage.getItem('jarian_auth_token'));
  expect(token, 'session token missing after login').toBeTruthy();

  const profileRaw = await page.evaluate(() => localStorage.getItem('jarian_auth_profile'));
  expect(profileRaw, 'session profile missing after login').toBeTruthy();
  const profile = JSON.parse(profileRaw);
  const permissions = Array.isArray(profile.permissions) ? profile.permissions : [];

  for (const code of required) {
    expect(permissions, `missing permission ${code}`).toContain(code);
  }

  return { token, profile, permissions, username };
}
