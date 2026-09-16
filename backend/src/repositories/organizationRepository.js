/**
 * Organization structure adapter (DDL-37).
 */
import { query } from '../db/pool.js';
import { mapAssignmentRow, mapPositionRow, mapUnitRow } from '../domain/organization/tree.js';

function runner(client) {
  return client ? client.query.bind(client) : query;
}

export async function listUnits(client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT id, parent_id, code, name, sort_order, is_active, created_at, updated_at
     FROM organization_units
     ORDER BY sort_order, code`,
  );
  return res.rows.map(mapUnitRow);
}

export async function findUnit(id, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT id, parent_id, code, name, sort_order, is_active, created_at, updated_at
     FROM organization_units WHERE id = $1`,
    [id],
  );
  return res.rows[0] ? mapUnitRow(res.rows[0]) : null;
}

export async function upsertUnit(unit, client = null) {
  const run = runner(client);
  await run(
    `INSERT INTO organization_units (id, parent_id, code, name, sort_order, is_active, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (id) DO UPDATE SET
       parent_id = EXCLUDED.parent_id,
       code = EXCLUDED.code,
       name = EXCLUDED.name,
       sort_order = EXCLUDED.sort_order,
       is_active = EXCLUDED.is_active,
       updated_at = NOW()`,
    [unit.id, unit.parentId, unit.code, unit.name, unit.sortOrder ?? 0, unit.isActive !== false],
  );
  return findUnit(unit.id, client);
}

export async function deactivateUnitsNotIn(ids, client = null) {
  const run = runner(client);
  const keep = Array.isArray(ids) && ids.length ? ids : ['ou_root'];
  await run(
    `UPDATE organization_units
     SET is_active = FALSE, updated_at = NOW()
     WHERE id <> ALL($1::text[]) AND id <> 'ou_root'`,
    [keep],
  );
}

export async function listPositions(unitId = null, client = null) {
  const run = runner(client);
  const res = unitId
    ? await run(
      `SELECT id, unit_id, code, title, sort_order, is_active, created_at, updated_at
       FROM organization_positions WHERE unit_id = $1 ORDER BY sort_order, title`,
      [unitId],
    )
    : await run(
      `SELECT id, unit_id, code, title, sort_order, is_active, created_at, updated_at
       FROM organization_positions ORDER BY unit_id, sort_order, title`,
    );
  return res.rows.map(mapPositionRow);
}

export async function findPosition(id, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT id, unit_id, code, title, sort_order, is_active, created_at, updated_at
     FROM organization_positions WHERE id = $1`,
    [id],
  );
  return res.rows[0] ? mapPositionRow(res.rows[0]) : null;
}

export async function findPositionByTitle(unitId, title, client = null) {
  const run = runner(client);
  const res = await run(
    `SELECT id, unit_id, code, title, sort_order, is_active, created_at, updated_at
     FROM organization_positions
     WHERE unit_id = $1 AND title = $2 AND is_active = TRUE
     LIMIT 1`,
    [unitId, title],
  );
  return res.rows[0] ? mapPositionRow(res.rows[0]) : null;
}

export async function insertPosition(position, client = null) {
  const run = runner(client);
  await run(
    `INSERT INTO organization_positions (id, unit_id, code, title, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       code = EXCLUDED.code,
       sort_order = EXCLUDED.sort_order,
       is_active = TRUE,
       updated_at = NOW()`,
    [position.id, position.unitId, position.code || null, position.title, position.sortOrder ?? 0],
  );
  return findPosition(position.id, client);
}

export async function updatePosition(id, patch, client = null) {
  const existing = await findPosition(id, client);
  if (!existing) return null;
  const run = runner(client);
  await run(
    `UPDATE organization_positions
     SET title = $2, code = $3, sort_order = $4, is_active = $5, updated_at = NOW()
     WHERE id = $1`,
    [
      id,
      patch.title || existing.title,
      patch.code === undefined ? existing.code : patch.code,
      patch.sortOrder ?? existing.sortOrder,
      patch.isActive === undefined ? existing.isActive : patch.isActive,
    ],
  );
  return findPosition(id, client);
}

const ASSIGNMENT_SELECT = `
  SELECT
    a.user_id,
    a.unit_id,
    a.position_id,
    a.is_manager,
    a.is_primary,
    a.created_at,
    a.updated_at,
    u.display_name,
    u.username,
    u.mobile,
    u.is_active AS user_is_active,
    ou.name AS unit_name,
    op.title AS position_title
  FROM user_organization_assignments a
  INNER JOIN users u ON u.id = a.user_id
  INNER JOIN organization_units ou ON ou.id = a.unit_id
  LEFT JOIN organization_positions op ON op.id = a.position_id
`;

export async function listAssignments(client = null) {
  const run = runner(client);
  const res = await run(`${ASSIGNMENT_SELECT} ORDER BY ou.name, u.display_name`);
  return res.rows.map(mapAssignmentRow);
}

export async function findAssignment(userId, client = null) {
  const run = runner(client);
  const res = await run(`${ASSIGNMENT_SELECT} WHERE a.user_id = $1`, [userId]);
  return res.rows[0] ? mapAssignmentRow(res.rows[0]) : null;
}

export async function clearManagerOnUnit(unitId, exceptUserId, client = null) {
  const run = runner(client);
  await run(
    `UPDATE user_organization_assignments
     SET is_manager = FALSE, updated_at = NOW()
     WHERE unit_id = $1 AND user_id <> $2 AND is_manager = TRUE`,
    [unitId, exceptUserId],
  );
}

export async function upsertAssignment(row, client = null) {
  const run = runner(client);
  await run(
    `INSERT INTO user_organization_assignments
       (user_id, unit_id, position_id, is_manager, is_primary, updated_at)
     VALUES ($1, $2, $3, $4, TRUE, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       unit_id = EXCLUDED.unit_id,
       position_id = EXCLUDED.position_id,
       is_manager = EXCLUDED.is_manager,
       is_primary = TRUE,
       updated_at = NOW()`,
    [row.userId, row.unitId, row.positionId || null, row.isManager === true],
  );
  return findAssignment(row.userId, client);
}

export async function deleteAssignment(userId, client = null) {
  const run = runner(client);
  await run(`DELETE FROM user_organization_assignments WHERE user_id = $1`, [userId]);
}

export async function deleteAssignmentsNotIn(userIds, client = null) {
  const run = runner(client);
  if (!userIds.length) {
    await run(`DELETE FROM user_organization_assignments`);
    return;
  }
  await run(
    `DELETE FROM user_organization_assignments WHERE user_id <> ALL($1::text[])`,
    [userIds],
  );
}
