/**
 * Dev-only: bind نوع شیار Offer Variant to لوله جدار چاه.
 *
 *   node scripts/seed-well-casing-slot-type.js
 */
import { pool, query } from '../src/db/pool.js';
import { config } from '../src/config.js';
import { seedWellCasingSlotType } from '../src/db/seedWellCasingSlotType.js';

async function main() {
  if (config.nodeEnv === 'production') {
    console.error('[seed-well-casing-slot-type] BLOCKED: refuse to seed when NODE_ENV=production');
    process.exit(1);
  }
  const admin = await query(`SELECT id FROM users WHERE username = 'admin' LIMIT 1`);
  const actorUserId = admin.rows[0]?.id;
  if (!actorUserId) {
    console.error('[seed-well-casing-slot-type] admin user missing — run npm run seed first');
    process.exit(1);
  }
  const result = await seedWellCasingSlotType(actorUserId);
  console.log('[seed-well-casing-slot-type]', result);
}

main()
  .catch((err) => {
    console.error('[seed-well-casing-slot-type] FAILED', err);
    process.exit(1);
  })
  .finally(() => pool.end());
