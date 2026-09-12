import { test, expect } from '@playwright/test';
import { loginAsQaAdmin } from '../helpers/auth.js';
import { loadRepoEnv } from '../helpers/loadEnv.js';

loadRepoEnv();

/**
 * JOURNEY — Product Master (Vitrin ساختار کالا hub + Product create), DDL-24 / DDL-49.
 * Real FE + BE + Postgres, VITE_USE_MOCK_API=false.
 * Covers Group -> Category -> Product Type -> Attribute bind on /vitrin/structure,
 * then schema-driven Product create + backend canonical-duplicate block + lifecycle.
 */

test.describe.configure({ mode: 'serial' });

test('JOURNEY: Product Master — ساختار کالا then Product create + duplicate block + lifecycle (Vitrin)', async ({ page }) => {
  test.setTimeout(180_000);

  const stamp = Date.now();
  const groupName = `E2Eگروه${stamp}`;
  const categoryName = `E2Eدسته${stamp}`;
  const typeName = `E2Eورق${stamp}`;
  const attrNameFa = `E2Eضخامت${stamp}`;
  const attrCode = `e2e_thk_${stamp}`;

  await loginAsQaAdmin(page, {
    requiredPermissions: ['products:read', 'products:write', 'products:manage-taxonomy', 'products:lifecycle'],
  });

  await page.goto('/vitrin/structure?tab=attributes');
  await expect(page.getByRole('tab', { name: 'بانک ویژگی‌ها' })).toHaveAttribute('aria-selected', 'true');
  await page.getByPlaceholder('نام فارسی (مثلاً: سایز)').fill(attrNameFa);
  await page.getByPlaceholder('کد لاتین (پیشنهاد)').fill(attrCode);
  await page.locator('select.shirazeh-pm__select').first().selectOption('DECIMAL');
  await page.locator('form.shirazeh-pm__create').first().getByRole('button', { name: 'افزودن' }).click();
  await expect(page.locator('.shirazeh-pm__item-name', { hasText: attrNameFa })).toBeVisible({ timeout: 15_000 });

  await page.goto('/vitrin/structure');
  await expect(page.getByRole('tab', { name: 'ساختار' })).toHaveAttribute('aria-selected', 'true');

  const groupCol = page.locator('.shirazeh-pm__col', { hasText: 'گروه کالا' }).first();
  await groupCol.getByPlaceholder('نام فارسی گروه').fill(groupName);
  await groupCol.getByRole('button', { name: 'افزودن گروه' }).click();
  await expect(page.locator('.shirazeh-pm__item-name', { hasText: groupName })).toBeVisible({ timeout: 15_000 });
  await page.locator('.shirazeh-pm__item-name', { hasText: groupName }).click();

  const categoryCol = page.locator('.shirazeh-pm__col', { hasText: 'دسته کالا' });
  await categoryCol.getByPlaceholder('نام فارسی دسته').fill(categoryName);
  await categoryCol.getByRole('button', { name: 'افزودن دسته' }).click();
  await expect(page.locator('.shirazeh-pm__item-name', { hasText: categoryName })).toBeVisible({ timeout: 15_000 });
  await page.locator('.shirazeh-pm__item-name', { hasText: categoryName }).click();

  const typeCol = page.locator('.shirazeh-pm__col', { hasText: 'نوع کالا' });
  await typeCol.getByPlaceholder('نام فارسی نوع کالا').fill(typeName);
  await typeCol.getByRole('button', { name: 'افزودن نوع' }).click();
  await expect(page.locator('.shirazeh-pm__item-name', { hasText: typeName })).toBeVisible({ timeout: 15_000 });

  const detail = page.locator('.vitrin-structure__detail');
  await expect(detail).toBeVisible({ timeout: 15_000 });
  await expect(detail.getByRole('heading', { name: typeName })).toBeVisible();

  await detail.getByText('ویژگی‌ها', { exact: true }).click();
  const schemaPanel = detail.locator('.shirazeh-pm__schema-panel');
  await schemaPanel.locator('select').first().selectOption({ label: attrNameFa });
  await schemaPanel.getByRole('button', { name: 'افزودن ویژگی' }).click();
  await expect(schemaPanel.getByText(attrNameFa)).toBeVisible({ timeout: 15_000 });

  // ---- Vitrin: schema-driven Product create ----
  await page.goto('/vitrin');
  await page.getByRole('button', { name: 'ثبت کالای جدید' }).click();
  const dialog = page.getByRole('dialog', { name: 'ثبت کالای جدید' });
  await expect(dialog).toBeVisible();

  await dialog.locator('select').nth(0).selectOption({ label: groupName });
  await dialog.locator('select').nth(1).selectOption({ label: categoryName });
  await dialog.locator('select').nth(2).selectOption({ label: typeName });

  const attrField = dialog.locator('label.vitrin-form__field', { hasText: attrNameFa });
  const attrInput = attrField.locator('input');
  await expect(attrInput).toBeVisible({ timeout: 10_000 });
  await attrInput.fill('6');

  // Generated-name preview must reflect Product Type + the identity/display attribute value.
  await expect(dialog.locator('.vitrin-form__readonly')).toHaveValue(new RegExp(`${typeName}.*6`));

  await Promise.all([
    page.waitForResponse((res) => /\/api\/v1\/products$/.test(res.url()) && res.request().method() === 'POST'),
    dialog.getByRole('button', { name: 'ثبت کالا' }).click(),
  ]);
  await expect(dialog).toBeHidden({ timeout: 15_000 });

  const productRow = page.locator('tr.vitrin-table__row', { hasText: typeName }).first();
  await expect(productRow).toBeVisible({ timeout: 15_000 });

  // Duplicate identity reuses the existing Product; list must still have one row.
  await page.getByRole('button', { name: 'ثبت کالای جدید' }).click();
  const dialog2 = page.getByRole('dialog', { name: 'ثبت کالای جدید' });
  await expect(dialog2).toBeVisible();
  await dialog2.locator('select').nth(0).selectOption({ label: groupName });
  await dialog2.locator('select').nth(1).selectOption({ label: categoryName });
  await dialog2.locator('select').nth(2).selectOption({ label: typeName });
  const attrInput2 = dialog2.locator('label.vitrin-form__field', { hasText: attrNameFa }).locator('input');
  await attrInput2.fill('6.0');
  await Promise.all([
    page.waitForResponse((res) => /\/api\/v1\/products$/.test(res.url()) && res.request().method() === 'POST'),
    dialog2.getByRole('button', { name: 'ثبت کالا' }).click(),
  ]);
  await expect(dialog2).toBeHidden({ timeout: 15_000 });
  await expect(page.locator('tr.vitrin-table__row', { hasText: typeName })).toHaveCount(1);

  // ---- Lifecycle: deactivate the created Product; row must show inactive status, not disappear ----
  await productRow.getByRole('button', { name: 'غیرفعال کردن' }).click();
  await expect(productRow).toHaveClass(/is-inactive/, { timeout: 15_000 });
  await expect(productRow.getByText('غیرفعال')).toBeVisible();
});
