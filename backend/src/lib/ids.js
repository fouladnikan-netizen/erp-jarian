import { query } from '../db/pool.js';

export async function writeAudit({ actorUserId, action, entityType, entityId, detail = {} }) {
  await query(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, detail)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [actorUserId || null, action, entityType, entityId || null, JSON.stringify(detail)],
  );
}

export function newEntityId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
