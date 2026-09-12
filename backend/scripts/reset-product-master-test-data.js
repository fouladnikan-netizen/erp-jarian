/**
 * DANGER — wipes the ENTIRE Product Master catalog (operator rows included).
 * This is not a test after-hook. Do not run against a live operator database.
 *
 * Integration tests must delete the ids they created
 * (`productMasterFixtures.js`), not this script.
 *
 * Does NOT touch: users, roles, companies, orders, leads, activities, tasks,
 * correspondence, attribute definitions, brands, or UOM.
 *
 * Requires JARIAN_WIPE_PRODUCT_MASTER=YES. Blocked when NODE_ENV=production.
 *
 *   JARIAN_WIPE_PRODUCT_MASTER=YES node backend/scripts/reset-product-master-test-data.js
 */
import { pool } from '../src/db/pool.js';
import { config } from '../src/config.js';

async function main() {
  if (config.nodeEnv === 'production') {
    console.error('[reset] BLOCKED: refuse to wipe Product Master when NODE_ENV=production');
    process.exit(1);
  }
  if (process.env.JARIAN_WIPE_PRODUCT_MASTER !== 'YES') {
    console.error('[reset] BLOCKED: set JARIAN_WIPE_PRODUCT_MASTER=YES to wipe the operator catalog');
    process.exit(1);
  }
  await pool.query('BEGIN');
  try {
    await pool.query('DELETE FROM product_attribute_values');
    await pool.query('DELETE FROM product_allowed_attribute_values');
    await pool.query('DELETE FROM products');
    await pool.query('DELETE FROM product_sku_counters');
    await pool.query('DELETE FROM product_type_attributes');
    await pool.query('DELETE FROM product_types');
    await pool.query('DELETE FROM product_categories');
    await pool.query('DELETE FROM product_groups');
    await pool.query('DELETE FROM product_taxonomy_code_counters');
    await pool.query('DELETE FROM product_bulk_import_batches');
    await pool.query('COMMIT');
    console.log('[reset] Product Master catalog cleared; taxonomy code counters reset.');
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[reset] FAILED', err);
  process.exit(1);
});
