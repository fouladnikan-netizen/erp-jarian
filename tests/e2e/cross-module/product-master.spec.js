import { test, expect } from '@playwright/test';
import { loginAsQaAdmin } from '../helpers/auth.js';
import { loadRepoEnv } from '../helpers/loadEnv.js';

loadRepoEnv();

/**
 * JOURNEY — Product Master (Shirazeh taxonomy/attribute admin + Vitrin
 * Product/SKU creation), DDL-24. Real FE + BE + Postgres, VITE_USE_MOCK_API=false.
 * Covers the core end-to-end contract: Group -> Category -> Product Type ->
 * Attribute Schema (Shirazeh), then a schema-driven Product create + backend
 * canonical-duplicate block (normalized digit equivalence) + lifecycle
 * deactivation (Vitrin).
 */

test.describe.configure({ mode: 'serial' });

test('JOURNEY: Product Master — taxonomy/attribute admin (Shirazeh) then Product create + duplicate block + lifecycle (Vitrin)', async ({ page }) => {
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

  // ---- Shirazeh: Taxonomy (Group -> Category -> Product Type) ----
  await page.goto('/shirazeh/product-master');
  await expect(page.getByRole('heading', { name: 'طبقه‌بندی و مرجع کالا (شیرازه)' })).toBeVisible();

  const groupCol = page.locator('.shirazeh-pm__col', { hasText: 'گروه‌های کالا' });
  await groupCol.getByPlaceholder('نام گروه (مثلاً: آهن‌آلات)').fill(groupName);
  await groupCol.getByRole('button', { name: 'افزودن' }).click();
  await expect(page.locator('.shirazeh-pm__item-name', { hasText: groupName })).toBeVisible({ timeout: 15_000 });
  await page.locator('.shirazeh-pm__item-name', { hasText: groupName }).click();

  const categoryCol = page.locator('.shirazeh-pm__col', { hasText: 'دسته‌های کالا' });
  await categoryCol.getByPlaceholder('نام دسته (مثلاً: ورق گرم)').fill(categoryName);
  await categoryCol.getByRole('button', { name: 'افزودن' }).click();
  await expect(page.locator('.shirazeh-pm__item-name', { hasText: categoryName })).toBeVisible({ timeout: 15_000 });
  await page.locator('.shirazeh-pm__item-name', { hasText: categoryName }).click();

  const typeCol = page.locator('.shirazeh-pm__col', { hasText: 'انواع کالا' });
  await typeCol.getByPlaceholder('نام نوع کالا (مثلاً: ورق سیاه)').fill(typeName);
  await typeCol.getByRole('button', { name: 'افزودن' }).click();
  await expect(page.locator('.shirazeh-pm__item-name', { hasText: typeName })).toBeVisible({ timeout: 15_000 });
  await page.locator('.shirazeh-pm__item-name', { hasText: typeName }).click();

  // ---- Shirazeh: Attribute Engine — define a DECIMAL attribute, bind it as identity+display ----
  await page.getByRole('button', { name: 'ویژگی‌ها و شما' }).click();
  await expect(page.getByText(`— ${typeName}`)).toBeVisible({ timeout: 15_000 });

  await page.getByPlaceholder('کد لاتین (مثلاً: thickness)').fill(attrCode);
  await page.getByPlaceholder('نام فارسی (مثلاً: ضخامت)').fill(attrNameFa);
  await page.locator('select.shirazeh-pm__select').first().selectOption('DECIMAL');
  await page.locator('form.shirazeh-pm__create').first().getByRole('button', { name: 'افزودن' }).click();
  await expect(page.locator('.shirazeh-pm__item-name', { hasText: attrNameFa })).toBeVisible({ timeout: 15_000 });

  const schemaPanel = page.locator('.shirazeh-pm__schema-panel');
  await schemaPanel.locator('select').first().selectOption({ label: attrNameFa });
  await schemaPanel.getByRole('button', { name: 'اتصال به نوع کالا' }).click();
  await expect(schemaPanel.locator('.shirazeh-pm__table').getByText(attrNameFa)).toBeVisible({ timeout: 15_000 });

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

  // ---- Duplicate block: same Type + normalized-equal identity value (6.0) must be REJECTED, not silently created ----
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
  await expect(dialog2.locator('.vitrin-form__error')).toContainText('قبلاً', { timeout: 15_000 });
  await dialog2.getByRole('button', { name: 'انصراف' }).click();
  await expect(dialog2).toBeHidden();

  // No second row for this Product Type must have been created despite the digit-variant attempt.
  await expect(page.locator('tr.vitrin-table__row', { hasText: typeName })).toHaveCount(1);

  // ---- Lifecycle: deactivate the created Product; row must show inactive status, not disappear ----
  await productRow.getByRole('button', { name: 'غیرفعال کردن' }).click();
  await expect(productRow).toHaveClass(/is-inactive/, { timeout: 15_000 });
  await expect(productRow.getByText('غیرفعال')).toBeVisible();
});
