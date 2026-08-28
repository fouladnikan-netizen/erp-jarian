#!/usr/bin/env node
/**
 * Report duplicate active nationalIds in companies (DDL-25 pre-migration safety).
 * Usage: node backend/scripts/report-duplicate-national-ids.js
 */
import { pool } from '../src/db/pool.js';

async function main() {
  const res = await pool.query(`
    SELECT national_id, COUNT(*)::int AS cnt,
           array_agg(id ORDER BY created_at) AS company_ids
    FROM companies
    WHERE deleted_at IS NULL
      AND national_id IS NOT NULL
      AND national_id <> ''
    GROUP BY national_id
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC, national_id
  `);

  if (!res.rows.length) {
    console.log('[duplicate-national-id] No duplicate active nationalIds found.');
  } else {
    console.log(`[duplicate-national-id] Found ${res.rows.length} duplicate group(s):`);
    for (const row of res.rows) {
      console.log(`  nationalId=${row.national_id} count=${row.cnt} ids=${row.company_ids.join(', ')}`);
    }
    process.exitCode = 1;
  }

  await pool.end();
}

main().catch((err) => {
  console.error('[duplicate-national-id] failed', err);
  process.exit(1);
});
