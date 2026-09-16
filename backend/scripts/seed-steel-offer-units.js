/**
 * Dev-only: upsert carbon-steel Product Type count/sales units.
 *
 *   node scripts/seed-steel-offer-units.js
 */
import { pool, query } from '../src/db/pool.js';
import { config } from '../src/config.js';
import { seedSteelOfferUnits } from '../src/db/seedSteelOfferUnits.js';

async function main() {
  if (config.nodeEnv === 'production') {
    console.error('[seed-steel-offer-units] BLOCKED: refuse to seed when NODE_ENV=production');
    process.exit(1);
  }
  const admin = await query(`SELECT id FROM users WHERE username = 'admin' LIMIT 1`);
  const actorUserId = admin.rows[0]?.id;
  if (!actorUserId) {
    console.error('[seed-steel-offer-units] admin user missing — run npm run seed first');
    process.exit(1);
  }
  const result = await seedSteelOfferUnits(actorUserId);
  if (result.ringCreated) console.log('[seed-steel-offer-units] created uom حلقه');
  console.log('[seed-steel-offer-units] types updated', result.updated);
  for (const row of result.rows) {
    console.log(`[seed-steel-offer-units] ${row.typeName}\t${row.countUnitFa}\t${row.salesUnitFa}`);
  }
  if (result.missingTypes.length) {
    console.warn('[seed-steel-offer-units] types not found:', result.missingTypes.join(', '));
  }
}

main()
  .catch((err) => {
    console.error('[seed-steel-offer-units] FAILED', err);
    process.exit(1);
  })
  .finally(() => pool.end());
