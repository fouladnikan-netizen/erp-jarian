/**
 * Personal Lead Pipeline — SQL only.
 */
import { query } from '../db/pool.js';

function runner(client) {
  return client ? client.query.bind(client) : query;
}

export function mapPipelineRow(row) {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function mapStageRow(row) {
  return {
    id: row.id,
    pipelineId: row.pipeline_id,
    name: row.name,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function findActiveByOwner(ownerUserId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT * FROM lead_pipelines
     WHERE owner_user_id = $1 AND deleted_at IS NULL
     LIMIT 1`,
    [ownerUserId],
  );
  return res.rows[0] ? mapPipelineRow(res.rows[0]) : null;
}

export async function insertPipeline(row, client = null) {
  const run = runner(client);
  await run(
    `INSERT INTO lead_pipelines (id, owner_user_id, name)
     VALUES ($1, $2, $3)`,
    [row.id, row.ownerUserId, row.name || 'پایپ‌لاین شخصی'],
  );
}

export async function listStages(pipelineId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT * FROM lead_pipeline_stages
     WHERE pipeline_id = $1 AND deleted_at IS NULL
     ORDER BY position ASC, created_at ASC`,
    [pipelineId],
  );
  return res.rows.map(mapStageRow);
}

export async function findStageById(stageId, { includeDeleted = false } = {}, client = null) {
  const run = runner(client);
  const clause = includeDeleted ? '' : ' AND deleted_at IS NULL';
  const res = await run(
    `SELECT * FROM lead_pipeline_stages WHERE id = $1${clause}`,
    [stageId],
  );
  return res.rows[0] ? mapStageRow(res.rows[0]) : null;
}

export async function insertStage(row, client = null) {
  const run = runner(client);
  await run(
    `INSERT INTO lead_pipeline_stages (id, pipeline_id, name, position)
     VALUES ($1, $2, $3, $4)`,
    [row.id, row.pipelineId, row.name, row.position],
  );
}

export async function updateStageName(stageId, name, client = null) {
  const run = runner(client);
  await run(
    `UPDATE lead_pipeline_stages SET name = $2, updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL`,
    [stageId, name],
  );
}

export async function updateStagePosition(stageId, position, client = null) {
  const run = runner(client);
  await run(
    `UPDATE lead_pipeline_stages SET position = $2, updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL`,
    [stageId, position],
  );
}

export async function softDeleteStage(stageId, actorUserId, client = null) {
  const run = runner(client);
  await run(
    `UPDATE lead_pipeline_stages
     SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL`,
    [stageId, actorUserId],
  );
}

export async function countActiveStages(pipelineId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT COUNT(*)::int AS n FROM lead_pipeline_stages
     WHERE pipeline_id = $1 AND deleted_at IS NULL`,
    [pipelineId],
  );
  return res.rows[0]?.n || 0;
}

export async function countLeadsInStage(stageId, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT COUNT(*)::int AS n FROM raw_leads
     WHERE pipeline_stage_id = $1 AND deleted_at IS NULL
       AND status IN ('NEW', 'QUALIFYING')`,
    [stageId],
  );
  return res.rows[0]?.n || 0;
}

export async function moveLeadsBetweenStages(fromStageId, toStageId, actorUserId, client = null) {
  const run = runner(client);
  await run(
    `UPDATE raw_leads SET
      pipeline_stage_id = $2,
      updated_by = $3,
      updated_at = NOW()
     WHERE pipeline_stage_id = $1 AND deleted_at IS NULL`,
    [fromStageId, toStageId, actorUserId],
  );
}

export async function findStageNameCollision(pipelineId, name, { excludeStageId = null } = {}, client = null) {
  const run = runner(client);
  const params = [pipelineId, name.trim().toLowerCase()];
  let sql = `SELECT id FROM lead_pipeline_stages
    WHERE pipeline_id = $1 AND deleted_at IS NULL
      AND lower(trim(name)) = $2`;
  if (excludeStageId) {
    params.push(excludeStageId);
    sql += ` AND id <> $3`;
  }
  sql += ' LIMIT 1';
  const res = await run(sql, params);
  return res.rows[0]?.id || null;
}

export async function touchPipeline(pipelineId, client = null) {
  const run = runner(client);
  await run(
    `UPDATE lead_pipelines SET updated_at = NOW() WHERE id = $1`,
    [pipelineId],
  );
}

export default {
  findActiveByOwner,
  insertPipeline,
  listStages,
  findStageById,
  insertStage,
  updateStageName,
  updateStagePosition,
  softDeleteStage,
  countActiveStages,
  countLeadsInStage,
  moveLeadsBetweenStages,
  findStageNameCollision,
  touchPipeline,
};
