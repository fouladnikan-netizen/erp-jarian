/**
 * Identity decision audit — DDL-25.7 (not every keystroke; create/override/link decisions).
 */
import { query } from '../db/pool.js';

function runner(client) {
  return client ? client.query.bind(client) : query;
}

export async function recordDecision(row, client = null) {
  const run = runner(client);
  const res = await run(
    `INSERT INTO identity_decisions (
      actor_user_id, entity_type, action, input_signals,
      match_classification, match_reasons, candidate_ids, decision, detail
    ) VALUES ($1,$2,$3,$4::jsonb,$5,$6::jsonb,$7::jsonb,$8,$9::jsonb)
    RETURNING id, created_at`,
    [
      row.actorUserId || null,
      row.entityType,
      row.action,
      JSON.stringify(row.inputSignals || {}),
      row.matchClassification || null,
      JSON.stringify(row.matchReasons || []),
      JSON.stringify(row.candidateIds || []),
      row.decision || null,
      JSON.stringify(row.detail || {}),
    ],
  );
  return res.rows[0];
}

export async function listRecent({ entityType, limit = 50 } = {}, client = null) {
  const run = runner(client);
  const params = [];
  let where = 'TRUE';
  if (entityType) {
    params.push(entityType);
    where = `entity_type = $${params.length}`;
  }
  params.push(Math.min(Number(limit) || 50, 200));
  const res = await run(
    `SELECT * FROM identity_decisions WHERE ${where}
     ORDER BY created_at DESC LIMIT $${params.length}`,
    params,
  );
  return res.rows;
}

export default { recordDecision, listRecent };
