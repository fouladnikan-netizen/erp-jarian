/**
 * Dev-only: upsert the carbon-steel Brand catalog and bind Product Type
 * allow-lists. Safe to re-run (insert-missing brands; replace allow-lists
 * on matching types).
 *
 *   node scripts/seed-steel-brands.js
 */
import { pool, query } from '../src/db/pool.js';
import { config } from '../src/config.js';
import { seedSteelBrands } from '../src/db/seedSteelBrands.js';

async function main() {
  if (config.nodeEnv === 'production') {
    console.error('[seed-steel-brands] BLOCKED: refuse to seed when NODE_ENV=production');
    process.exit(1);
  }
  const admin = await query(`SELECT id FROM users WHERE username = 'admin' LIMIT 1`);
  const actorUserId = admin.rows[0]?.id;
  if (!actorUserId) {
    console.error('[seed-steel-brands] admin user missing — run npm run seed first');
    process.exit(1);
  }
  const result = await seedSteelBrands(actorUserId);
  console.log('[seed-steel-brands] brands created', result.created, 'reused', result.reused, 'total', result.total);
  for (const row of result.boundTypes) {
    console.log(`[seed-steel-brands] bound ${row.typeName}: ${row.count} brands`);
  }
  if (result.missingTypes.length) {
    console.warn('[seed-steel-brands] types not found:', result.missingTypes.join(', '));
  }
}

main()
  .catch((err) => {
    console.error('[seed-steel-brands] FAILED', err);
    process.exit(1);
  })
  .finally(() => pool.end());
