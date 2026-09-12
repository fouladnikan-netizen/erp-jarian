import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PRODUCT_SKU_FORMULA,
  PRODUCT_SKU_POLICY,
  SUPERSEDED_PRODUCT_SKU_POLICY,
  allocateProductSku,
  allocateSku,
  assertSkuImmutable,
  buildProductIdentityKey,
  pickSkuCode,
  selectIdentityEntries,
} from '../domain/productMaster/productIdentityPolicy.js';
import { allocateSku as allocateSkuAlias } from '../domain/productMaster/skuGenerator.js';
import { findForbiddenMasterCascades } from '../domain/productMaster/deleteGuard.js';

const here = dirname(fileURLToPath(import.meta.url));

describe('productIdentityPolicy is the SKU / identity SSOT', () => {
  it('chooses DDL-24m and rejects the superseded 8-digit formula', () => {
    assert.equal(PRODUCT_SKU_POLICY, 'DDL-24m');
    assert.equal(SUPERSEDED_PRODUCT_SKU_POLICY, 'DDL-24b');
    assert.equal(PRODUCT_SKU_FORMULA, '{groupSku}-{categorySku}-{typeSku}-{identityValue…}');
    assert.doesNotMatch(PRODUCT_SKU_FORMULA, /GG-CC-TT-VV|GGCCTTVV/);
  });

  it('exports the same allocateSku function the thin skuGenerator alias uses', () => {
    assert.equal(allocateSkuAlias, allocateProductSku);
    assert.equal(allocateSku, allocateProductSku);
  });

  it('selects isIdentityRelevant attributes only — required does not imply identity', () => {
    const selected = selectIdentityEntries([
      { dataType: 'DECIMAL', normalized: '10', isRequired: true, isIdentityRelevant: false, sortOrder: 1 },
      { dataType: 'DECIMAL', normalized: '14', isRequired: false, isIdentityRelevant: true, sortOrder: 2 },
    ]);
    assert.deepEqual(selected.map((e) => e.normalized), ['14']);
  });

  it('allocateProductSku is the only formula create/import may issue', () => {
    const { sku } = allocateProductSku({
      groupSkuCode: 'CS',
      categorySkuCode: 'HR',
      typeSkuCode: 'Black',
      identityEntries: [
        { dataType: 'DECIMAL', normalized: '10', isIdentityRelevant: true, sortOrder: 10 },
        { dataType: 'STRING', normalized: 'note', isRequired: true, isIdentityRelevant: false, sortOrder: 20 },
      ],
    });
    assert.equal(sku, 'CS-HR-Black-10');
  });

  it('does not put brand into the Product SKU', () => {
    const { sku } = allocateProductSku({
      groupSkuCode: 'CS',
      categorySkuCode: 'Re',
      typeSkuCode: 'De',
      identityEntries: [
        { dataType: 'ENUM', normalized: 'A3', isIdentityRelevant: true, sortOrder: 10 },
        { dataType: 'STRING', normalized: 'MOB', isIdentityRelevant: false, sortOrder: 99 },
      ],
    });
    assert.equal(sku, 'CS-Re-De-A3');
    assert.doesNotMatch(sku, /MOB|Brand/i);
  });

  it('builds canonical identity from the same identity set, not from the display name', () => {
    const key = buildProductIdentityKey('pt_sheet', [
      { code: 'thickness', normalized: '10' },
      { code: 'width', normalized: '1250' },
    ]);
    assert.equal(key, 'pt_sheet::thickness=10|width=1250');
  });

  it('rejects PATCH bodies that carry sku (immutability lives in the policy)', () => {
    assert.throws(
      () => assertSkuImmutable({ sku: 'HACKED', brandId: null }),
      (err) => err.code === 'SKU_IMMUTABLE' && err.status === 400,
    );
    assert.doesNotThrow(() => assertSkuImmutable({ brandId: null }));
  });

  it('taxonomy / brand node codes also go through the policy', () => {
    assert.equal(pickSkuCode({ latinName: 'Carbon Steel Products', takenKeys: [] }), 'CS');
  });

  it('create and taxonomy services import the policy, not a second generator', () => {
    const productService = readFileSync(join(here, '../modules/catalog/application/productService.js'), 'utf8');
    const taxonomyService = readFileSync(join(here, '../modules/catalog/application/productTaxonomyService.js'), 'utf8');
    const brandService = readFileSync(join(here, '../modules/catalog/application/brandService.js'), 'utf8');
    const attrService = readFileSync(join(here, '../modules/catalog/application/attributeDefinitionService.js'), 'utf8');
    const skuGenerator = readFileSync(join(here, '../modules/catalog/domain/productMaster/skuGenerator.js'), 'utf8');
    const productShim = readFileSync(join(here, '../services/productService.js'), 'utf8');

    assert.match(productService, /from '\.\.\/domain\/productMaster\/productIdentityPolicy\.js'/);
    assert.doesNotMatch(productService, /from '\.\.\/domain\/productMaster\/skuGenerator\.js'/);
    assert.match(taxonomyService, /from '\.\.\/domain\/productMaster\/productIdentityPolicy\.js'/);
    assert.match(brandService, /from '\.\.\/domain\/productMaster\/productIdentityPolicy\.js'/);
    assert.match(attrService, /from '\.\.\/domain\/productMaster\/productIdentityPolicy\.js'/);
    assert.match(skuGenerator, /from '\.\/productIdentityPolicy\.js'/);
    assert.match(productShim, /modules\/catalog\/application\/productService\.js/);
  });
});

describe('master-data cascade policy (DDL-24n)', () => {
  it('flags ON DELETE CASCADE onto a master parent table', () => {
    assert.deepEqual(
      findForbiddenMasterCascades('group_id TEXT REFERENCES product_groups(id) ON DELETE CASCADE'),
      ['product_groups'],
    );
    assert.deepEqual(
      findForbiddenMasterCascades('product_id TEXT REFERENCES products(id) ON DELETE CASCADE'),
      [],
    );
  });
});
