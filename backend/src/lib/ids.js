import { query } from '../db/pool.js';

/**
 * @param {object} entry
 * @param {import('pg').PoolClient} [client] optional — use inside withTransaction
 */
export async function writeAudit(entry, client = null) {
  const { actorUserId, action, entityType, entityId, detail = {} } = entry;
  const sql = `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, detail)
     VALUES ($1, $2, $3, $4, $5::jsonb)`;
  const params = [actorUserId || null, action, entityType, entityId || null, JSON.stringify(detail)];
  if (client) {
    await client.query(sql, params);
  } else {
    await query(sql, params);
  }
}

export function newEntityId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
