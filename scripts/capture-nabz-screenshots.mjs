import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'http://localhost:3000';
const OUT = path.resolve('screenshots');

async function waitForApp(page) {
  await page.waitForSelector('[data-module="nabz"], .order-profile-view', { timeout: 15000 });
  await page.waitForTimeout(600);
}

async function shot(page, name, fullPage = true) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage });
  console.log(`saved:${file}`);
  return file;
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const saved = [];

  // 1. Success orders list with profile buttons
  await page.goto(`${BASE}/nabz`, { waitUntil: 'networkidle' });
  await waitForApp(page);
  await page.getByRole('button', { name: 'موفق' }).click();
  await page.waitForTimeout(500);
  saved.push(await shot(page, '01-nabz-success-orders-list.png'));

  // 2. Order profile — gateway tab, stage 5 (تصمیم) with stepper
  await page.goto(`${BASE}/nabz/order/JR050108005`, { waitUntil: 'networkidle' });
  await waitForApp(page);
  await page.getByRole('tab', { name: 'گذرگاه' }).click().catch(() => {});
  await page.waitForTimeout(500);
  saved.push(await shot(page, '02-order-profile-gateway-stepper-stage5.png'));

  // 3. Success order — operations tab (phase 2)
  await page.goto(`${BASE}/nabz/order/JR050107006`, { waitUntil: 'networkidle' });
  await waitForApp(page);
  const opsTab = page.getByRole('tab', { name: 'عملیات و تحقق' });
  if (await opsTab.count()) {
    await opsTab.click();
    await page.waitForTimeout(500);
    saved.push(await shot(page, '03-order-profile-operations-phase2.png'));
  } else {
    console.log('skip:operations-tab-not-visible');
  }

  await browser.close();
  console.log('done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
