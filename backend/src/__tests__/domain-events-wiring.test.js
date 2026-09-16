import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRODUCT_SKU_FORMULA, PRODUCT_SKU_POLICY } from '../modules/catalog/domain/productMaster/productIdentityPolicy.js';
import { gregorianToJalali } from '../modules/crm/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '..');

function readSrc(rel) {
  return readFileSync(join(srcRoot, rel), 'utf8');
}

describe('Phase 4 event wiring (no Nest/TS, public URLs unchanged)', () => {
  it('keeps product identity SSOT unchanged', () => {
    assert.equal(PRODUCT_SKU_POLICY, 'DDL-24m');
    assert.equal(PRODUCT_SKU_FORMULA, '{groupSku}-{categorySku}-{typeSku}-{identityValue…}');
  });

  it('keeps sales creating orders without calling CRM application', () => {
    const src = readSrc('modules/sales/application/orderService.js');
    assert.match(src, /shared\/events\/index\.js/);
    assert.match(src, /crm\/public\/orderParty\.js/);
    assert.match(src, /crm\/public\/subjectReferences\.js/);
    assert.doesNotMatch(src, /customerLifecycle\.js|customerLifecycleService\.js/);
    assert.doesNotMatch(src, /companyRepository\.js/);
    assert.doesNotMatch(src, /crm\/domain\/rawLeadGate/);
    assert.match(src, /EVENT\.SALES_ORDER_COMMITTED/);
  });

  it('keeps tasks completing activities without importing CRM lifecycle', () => {
    const src = readSrc('modules/tasks/application/activityService.js');
    assert.match(src, /shared\/events\/index\.js/);
    assert.match(src, /crm\/public\/subjectReferences\.js/);
    assert.doesNotMatch(src, /customerLifecycleService\.js/);
    assert.doesNotMatch(src, /companyRepository\.js|leadRepository\.js/);
    assert.match(src, /EVENT\.TASKS_ACTIVITY_COMPLETED/);
  });

  it('keeps catalog delete guard off sales order JSON', () => {
    const productApp = readSrc('modules/catalog/application/productService.js');
    assert.match(productApp, /productOrderUsageQuery\.js/);
    assert.doesNotMatch(productApp, /orderProductReferences\.js|orderRepository\.js/);
    const queryApp = readSrc('modules/catalog/application/productOrderUsageQuery.js');
    assert.match(queryApp, /productOrderUsageRepository\.js/);
    assert.match(queryApp, /orderProductReferences\.js/);
  });

  it('keeps order codes on the CRM calendar public port', () => {
    const src = readSrc('modules/sales/domain/order/jarianOrderCode.js');
    assert.match(src, /crm\/public\/calendar\.js/);
    assert.doesNotMatch(src, /linkaDisplayFormat\.js/);
    assert.equal(typeof gregorianToJalali, 'function');
  });

  it('does not introduce Nest or a TypeScript backend rewrite', () => {
    const layout = readSrc('modules/shared/events/index.js');
    assert.doesNotMatch(layout, /@nestjs|nestjs/);
    const pkg = readFileSync(join(srcRoot, '../package.json'), 'utf8');
    assert.doesNotMatch(pkg, /@nestjs/);
  });
});
