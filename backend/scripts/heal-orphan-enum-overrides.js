#!/usr/bin/env node
/**
 * Remap stale latin Type ENUM subsets (pressed/mill, hardness_400, …)
 * onto the current Persian catalog. Idempotent.
 *
 *   node backend/scripts/heal-orphan-enum-overrides.js
 */
import { pool, query } from '../src/db/pool.js';
import { config } from '../src/config.js';
import { seedEnumOverrideHeal } from '../src/db/seedEnumOverrideHeal.js';

async function main() {
  if (config.nodeEnv === 'production') {
    console.error('[heal-orphan-enum-overrides] BLOCKED: refuse when NODE_ENV=production');
    process.exit(1);
  }
  const admin = await query(`SELECT id FROM users WHERE username = 'admin' LIMIT 1`);
  const actorUserId = admin.rows[0]?.id;
  if (!actorUserId) {
    console.error('[heal-orphan-enum-overrides] admin user missing — run npm run seed first');
    process.exit(1);
  }
  const result = await seedEnumOverrideHeal(actorUserId);
  console.log('[heal-orphan-enum-overrides]', JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error('[heal-orphan-enum-overrides] FAILED', err);
    process.exit(1);
  })
  .finally(() => pool.end());
