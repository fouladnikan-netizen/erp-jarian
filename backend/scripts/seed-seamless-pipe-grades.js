#!/usr/bin/env node
/**
 * Append mill grades onto shared `grade` and bind the subset to لوله مانیسمان.
 *
 *   node backend/scripts/seed-seamless-pipe-grades.js
 */
import { pool, query } from '../src/db/pool.js';
import { config } from '../src/config.js';
import { seedSeamlessPipeGrades } from '../src/db/seedSeamlessPipeGrades.js';

async function main() {
  if (config.nodeEnv === 'production') {
    console.error('[seed-seamless-pipe-grades] BLOCKED: refuse when NODE_ENV=production');
    process.exit(1);
  }
  const admin = await query(`SELECT id FROM users WHERE username = 'admin' LIMIT 1`);
  const actorUserId = admin.rows[0]?.id;
  if (!actorUserId) {
    console.error('[seed-seamless-pipe-grades] admin user missing — run npm run seed first');
    process.exit(1);
  }
  const result = await seedSeamlessPipeGrades(actorUserId);
  console.log('[seed-seamless-pipe-grades]', JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error('[seed-seamless-pipe-grades] FAILED', err);
    process.exit(1);
  })
  .finally(() => pool.end());
