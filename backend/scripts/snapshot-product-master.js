#!/usr/bin/env node
/**
 * Capture the live PostgreSQL Product Master catalog into the git-versioned
 * snapshot (DDL-60). Run after operator structure edits, before GitHub push.
 *
 *   node backend/scripts/snapshot-product-master.js
 */
import { pool, query } from '../src/db/pool.js';
import { snapshotProductMasterCatalog } from '../src/db/productMasterCatalog.js';

async function main() {
  const result = await snapshotProductMasterCatalog(query);
  console.log('[snapshot-product-master]', JSON.stringify({
    path: result.path,
    counts: result.counts,
  }, null, 2));
}

main()
  .catch((err) => {
    console.error('[snapshot-product-master] FAILED', err);
    process.exit(1);
  })
  .finally(() => pool.end());
