/**
 * Operator Product Master snapshot metadata (DDL-60) — not a second SoR.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCT_MASTER_SNAPSHOT_PATH,
  PRODUCT_MASTER_TABLES,
} from '../db/productMasterCatalog.js';

describe('productMasterCatalog snapshot', () => {
  it('versions the live Postgres catalog, not test fixtures', () => {
    assert.match(PRODUCT_MASTER_SNAPSHOT_PATH, /product-master\.catalog\.json$/);
    assert.equal(PRODUCT_MASTER_TABLES.includes('products'), true);
    assert.equal(PRODUCT_MASTER_TABLES.includes('product_types'), true);
    assert.equal(PRODUCT_MASTER_TABLES.includes('attribute_definitions'), true);
    assert.equal(PRODUCT_MASTER_TABLES.includes('product_bulk_import_batches'), false);
  });
});
