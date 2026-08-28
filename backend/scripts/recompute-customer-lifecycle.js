#!/usr/bin/env node
/**
 * Recompute customer lifecycle for all active customer companies (DDL-26.13).
 *
 * Usage:
 *   node backend/scripts/recompute-customer-lifecycle.js           # dry-run
 *   node backend/scripts/recompute-customer-lifecycle.js --apply
 */
import { pool } from '../src/db/pool.js';
import { recomputeCustomerLifecycle } from '../src/services/customerLifecycleService.js';

const apply = process.argv.includes('--apply');

async function main() {
  const admin = await pool.query(`SELECT id FROM users WHERE username = 'admin' LIMIT 1`);
  const actorUserId = admin.rows[0]?.id || null;

  const res = await pool.query(`
    SELECT id, name, lifecycle_stage, engagement_status
    FROM companies
    WHERE deleted_at IS NULL
      AND entity_type IN ('CUSTOMER', 'BOTH')
    ORDER BY updated_at DESC
  `);

  let changed = 0;
  for (const row of res.rows) {
    if (!apply) {
      console.log(`[dry-run] would recompute company=${row.id} name=${row.name}`);
      continue;
    }
    const result = await recomputeCustomerLifecycle(row.id, {
      actorUserId,
      trigger: 'backfill_script',
    });
    if (result?.changed) {
      changed += 1;
      console.log(`[apply] ${row.id} ${row.lifecycle_stage} → ${result.lifecycle}`);
    }
  }

  console.log(`[recompute-customer-lifecycle] mode=${apply ? 'APPLY' : 'DRY_RUN'} total=${res.rowCount} changed=${changed}`);
  await pool.end();
}

main().catch((err) => {
  console.error('[recompute-customer-lifecycle] failed', err);
  process.exit(1);
});
