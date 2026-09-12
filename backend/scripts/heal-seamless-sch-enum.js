#!/usr/bin/env node
/**
 * Convert رده (`sch`) to ENUM on لوله مانیسمان. Does not delete Products.
 *
 *   node backend/scripts/heal-seamless-sch-enum.js
 */
import { pool, query } from '../src/db/pool.js';
import { config } from '../src/config.js';
import { healSeamlessSchEnum } from '../src/db/healSeamlessSchEnum.js';

async function main() {
  if (config.nodeEnv === 'production') {
    console.error('[heal-seamless-sch-enum] BLOCKED: refuse when NODE_ENV=production');
    process.exit(1);
  }
  const admin = await query(`SELECT id FROM users WHERE username = 'admin' LIMIT 1`);
  const actorUserId = admin.rows[0]?.id;
  if (!actorUserId) {
    console.error('[heal-seamless-sch-enum] admin user missing — run npm run seed first');
    process.exit(1);
  }
  const result = await healSeamlessSchEnum(actorUserId);
  console.log('[heal-seamless-sch-enum]', JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error('[heal-seamless-sch-enum] FAILED', err);
    process.exit(1);
  })
  .finally(() => pool.end());
