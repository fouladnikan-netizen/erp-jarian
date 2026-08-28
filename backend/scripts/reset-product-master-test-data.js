/**
 * Dev-only cleanup: wipes Product Master test/benchmark cruft (Groups,
 * Categories, Types, Products, and their 2-digit taxonomy code counters)
 * accumulated from repeated integration-test / benchmark runs against the
 * LOCAL dev database, then resets the atomic code counters so the
 * 99-per-scope ceiling (Task 3, DDL-24b) has room again.
 *
 * Does NOT touch: users, roles, companies, orders, leads, activities, tasks,
 * correspondence, or any Nabz table — Product Master tables only.
 *
 * Run manually: node scripts/reset-product-master-test-data.js
 */
import { pool } from '../src/db/pool.js';

async function main() {
  await pool.query('BEGIN');
  try {
    await pool.query('DELETE FROM product_relationships');
    await pool.query('DELETE FROM product_attribute_values');
    await pool.query('DELETE FROM products');
    await pool.query('DELETE FROM product_sku_counters');
    await pool.query('DELETE FROM product_type_attributes');
    await pool.query('DELETE FROM product_types');
    await pool.query('DELETE FROM product_categories');
    await pool.query('DELETE FROM product_groups');
    await pool.query('DELETE FROM product_taxonomy_code_counters');
    await pool.query('DELETE FROM product_bulk_import_batches');
    await pool.query('COMMIT');
    console.log('[reset] Product Master test data cleared; taxonomy code counters reset to empty.');
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
