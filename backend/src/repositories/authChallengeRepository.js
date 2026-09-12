/**
 * Auth challenge adapter (DDL-41). Secrets are stored hashed.
 */

import { query } from '../db/pool.js';

function runner(client) {
  return client ? client.query.bind(client) : query;
}

export async function insertChallenge(row, client = null) {
  const run = runner(client);
  await run(
    `INSERT INTO auth_challenges (
       id, user_id, purpose, secret_hash, expires_at, created_by
     ) VALUES ($1, $2, $3, $4, $5, $6)`,
    [row.id, row.userId, row.purpose, row.secretHash, row.expiresAt, row.createdBy || null],
  );
}

export async function consumeOpenByPurpose(userId, purpose, client = null) {
  const run = runner(client);
  await run(
    `UPDATE auth_challenges
        SET consumed_at = NOW()
      WHERE user_id = $1
        AND purpose = $2
        AND consumed_at IS NULL`,
    [userId, purpose],
  );
}

export async function findOpenByHash(purpose, secretHash, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT id, user_id, purpose, secret_hash, expires_at, consumed_at, attempt_count, created_at
       FROM auth_challenges
      WHERE purpose = $1
        AND secret_hash = $2
        AND consumed_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1`,
    [purpose, secretHash],
  );
  return res.rows[0] || null;
}

export async function findLatestOpen(userId, purpose, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT id, user_id, purpose, secret_hash, expires_at, consumed_at, attempt_count, created_at
       FROM auth_challenges
      WHERE user_id = $1
        AND purpose = $2
        AND consumed_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId, purpose],
  );
  return res.rows[0] || null;
}

export async function findLatest(userId, purpose, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT id, user_id, purpose, secret_hash, expires_at, consumed_at, attempt_count, created_at
       FROM auth_challenges
      WHERE user_id = $1
        AND purpose = $2
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId, purpose],
  );
  return res.rows[0] || null;
}

export async function countCreatedSince(userId, purpose, since, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT COUNT(*)::int AS n
       FROM auth_challenges
      WHERE user_id = $1
        AND purpose = $2
        AND created_at >= $3`,
    [userId, purpose, since],
  );
  return res.rows[0]?.n || 0;
}

export async function consumeById(id, client = null) {
  const run = runner(client);
  await run(
    `UPDATE auth_challenges SET consumed_at = NOW() WHERE id = $1 AND consumed_at IS NULL`,
    [id],
  );
}

export async function incrementAttempts(id, client = null) {
  const run = runner(client);
  const res = await run(
    `UPDATE auth_challenges
        SET attempt_count = attempt_count + 1
      WHERE id = $1
      RETURNING attempt_count`,
    [id],
  );
  return res.rows[0]?.attempt_count || 0;
}
