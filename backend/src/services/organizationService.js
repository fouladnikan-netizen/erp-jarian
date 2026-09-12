/**
 * Organization structure use-cases (DDL-37).
 * Position ≠ Role. Assignments never write user_roles.
 */
import { z } from 'zod';
import { withTransaction } from '../db/pool.js';
import { appError, fromZodError, validationError } from '../lib/errors.js';
import { newEntityId, writeAudit } from '../lib/ids.js';
import * as orgRepo from '../repositories/organizationRepository.js';
import * as userRepo from '../repositories/userRepository.js';
import {
  ROOT_UNIT_ID,
  buildOrganizationTree,
  flattenTreeAssignments,
  flattenTreeUnits,
} from '../domain/organization/tree.js';

const ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/;

const unitSchema = z.object({
  id: z.string().trim().regex(ID_RE).optional(),
  parentId: z.string().trim().nullable().optional(),
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().max(48).optional().default(''),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional().default(true),
});

const positionSchema = z.object({
  unitId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(120),
  code: z.string().trim().max(48).nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional().default(true),
});

const assignmentSchema = z.object({
  userId: z.string().trim().min(1),
  unitId: z.string().trim().min(1),
  positionId: z.string().trim().nullable().optional(),
  positionTitle: z.string().trim().max(120).optional().default(''),
  isManager: z.boolean().optional().default(false),
  isPrimary: z.boolean().optional().default(true),
});

const treeSchema = z.object({
  tree: z.any().optional(),
  units: z.array(unitSchema).optional(),
  assignments: z.array(assignmentSchema).optional(),
});

function codeFrom(id, fallback) {
  const raw = String(fallback || id || '').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 40);
  return raw || newEntityId('uc');
}

async function ensurePosition(unitId, { positionId, positionTitle }, client) {
  const title = String(positionTitle || '').trim();
  if (positionId) {
    const existing = await orgRepo.findPosition(positionId, client);
    if (existing && existing.unitId === unitId) return existing;
  }
  if (!title) return null;
  const found = await orgRepo.findPositionByTitle(unitId, title, client);
  if (found) return found;
  return orgRepo.insertPosition({
    id: newEntityId('op'),
    unitId,
    title,
    code: null,
    sortOrder: 0,
  }, client);
}

export async function getSnapshot() {
  const [units, positions, assignments] = await Promise.all([
    orgRepo.listUnits(),
    orgRepo.listPositions(),
    orgRepo.listAssignments(),
  ]);
  const tree = buildOrganizationTree(units, assignments);
  return { tree, units, positions, assignments };
}

export async function listUnits() {
  return orgRepo.listUnits();
}

export async function listPositions(unitId) {
  return orgRepo.listPositions(unitId || null);
}

export async function listAssignments() {
  return orgRepo.listAssignments();
}

export async function createUnit(body, actorUserId) {
  const parsed = unitSchema.safeParse(body || {});
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های واحد نامعتبر است.');
  const parentId = parsed.data.parentId || ROOT_UNIT_ID;
  if (parentId) {
    const parent = await orgRepo.findUnit(parentId);
    if (!parent) throw appError('UNIT_NOT_FOUND', 'واحد والد یافت نشد.', 404);
  }
  const id = parsed.data.id || newEntityId('ou');
  const unit = await withTransaction(async (client) => {
    const created = await orgRepo.upsertUnit({
      id,
      parentId: parentId === id ? null : parentId,
      code: parsed.data.code || codeFrom(id),
      name: parsed.data.name,
      sortOrder: parsed.data.sortOrder ?? 0,
      isActive: true,
    }, client);
    await writeAudit({
      actorUserId,
      action: 'organization.unit.create',
      entityType: 'organization_unit',
      entityId: created.id,
      detail: { name: created.name },
    }, client);
    return created;
  });
  return unit;
}

export async function updateUnit(id, body, actorUserId) {
  const existing = await orgRepo.findUnit(id);
  if (!existing) throw appError('UNIT_NOT_FOUND', 'واحد یافت نشد.', 404);
  if (id === ROOT_UNIT_ID && body?.isActive === false) {
    throw validationError('واحد ریشه قابل غیرفعال‌سازی نیست.');
  }
  const parsed = unitSchema.partial().safeParse(body || {});
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های واحد نامعتبر است.');
  const patch = parsed.data;
  const unit = await withTransaction(async (client) => {
    const updated = await orgRepo.upsertUnit({
      id,
      parentId: patch.parentId === undefined ? existing.parentId : patch.parentId,
      code: patch.code || existing.code,
      name: patch.name || existing.name,
      sortOrder: patch.sortOrder ?? existing.sortOrder,
      isActive: patch.isActive === undefined ? existing.isActive : patch.isActive,
    }, client);
    await writeAudit({
      actorUserId,
      action: 'organization.unit.update',
      entityType: 'organization_unit',
      entityId: id,
    }, client);
    return updated;
  });
  return unit;
}

export async function createPosition(body, actorUserId) {
  const parsed = positionSchema.safeParse(body || {});
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های سمت نامعتبر است.');
  const unit = await orgRepo.findUnit(parsed.data.unitId);
  if (!unit || !unit.isActive) throw appError('UNIT_NOT_FOUND', 'واحد یافت نشد.', 404);
  const existing = await orgRepo.findPositionByTitle(unit.id, parsed.data.title);
  if (existing) return existing;
  const position = await withTransaction(async (client) => {
    const created = await orgRepo.insertPosition({
      id: newEntityId('op'),
      unitId: unit.id,
      title: parsed.data.title,
      code: parsed.data.code || null,
      sortOrder: parsed.data.sortOrder ?? 0,
    }, client);
    await writeAudit({
      actorUserId,
      action: 'organization.position.create',
      entityType: 'organization_position',
      entityId: created.id,
      detail: { unitId: unit.id, title: created.title },
    }, client);
    return created;
  });
  return position;
}

export async function updatePosition(id, body, actorUserId) {
  const existing = await orgRepo.findPosition(id);
  if (!existing) throw appError('POSITION_NOT_FOUND', 'سمت یافت نشد.', 404);
  const parsed = positionSchema.partial().safeParse(body || {});
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های سمت نامعتبر است.');
  const position = await withTransaction(async (client) => {
    const updated = await orgRepo.updatePosition(id, {
      title: parsed.data.title,
      code: parsed.data.code,
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
    }, client);
    await writeAudit({
      actorUserId,
      action: 'organization.position.update',
      entityType: 'organization_position',
      entityId: id,
    }, client);
    return updated;
  });
  return position;
}

export async function upsertAssignment(body, actorUserId) {
  const parsed = assignmentSchema.safeParse(body || {});
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های انتساب نامعتبر است.');
  const user = await userRepo.findById(parsed.data.userId);
  if (!user) throw appError('USER_NOT_FOUND', 'کاربر یافت نشد.', 404);
  if (!user.isActive) throw validationError('کاربر غیرفعال قابل انتساب نیست.');
  const unit = await orgRepo.findUnit(parsed.data.unitId);
  if (!unit || !unit.isActive) throw appError('UNIT_NOT_FOUND', 'واحد یافت نشد.', 404);

  const assignment = await withTransaction(async (client) => {
    const position = await ensurePosition(unit.id, parsed.data, client);
    if (parsed.data.isManager) {
      await orgRepo.clearManagerOnUnit(unit.id, user.id, client);
    }
    const saved = await orgRepo.upsertAssignment({
      userId: user.id,
      unitId: unit.id,
      positionId: position?.id || null,
      isManager: parsed.data.isManager === true,
    }, client);
    await writeAudit({
      actorUserId,
      action: 'organization.assignment.upsert',
      entityType: 'user_organization_assignment',
      entityId: user.id,
      detail: { unitId: unit.id, positionId: position?.id || null, isManager: parsed.data.isManager === true },
    }, client);
    return saved;
  });
  return assignment;
}

export async function removeAssignment(userId, actorUserId) {
  const existing = await orgRepo.findAssignment(userId);
  if (!existing) throw appError('ASSIGNMENT_NOT_FOUND', 'انتساب سازمانی یافت نشد.', 404);
  await withTransaction(async (client) => {
    await orgRepo.deleteAssignment(userId, client);
    await writeAudit({
      actorUserId,
      action: 'organization.assignment.delete',
      entityType: 'user_organization_assignment',
      entityId: userId,
      detail: { unitId: existing.unitId },
    }, client);
  });
  return { ok: true, userId };
}

export async function replaceTree(body, actorUserId) {
  const parsed = treeSchema.safeParse(body || {});
  if (!parsed.success) throw fromZodError(parsed, 'ساختار سازمانی نامعتبر است.');

  let units = parsed.data.units;
  let assignments = parsed.data.assignments;
  if (parsed.data.tree) {
    units = flattenTreeUnits(parsed.data.tree);
    assignments = flattenTreeAssignments(parsed.data.tree);
  }
  if (!Array.isArray(units) || !units.length) {
    throw validationError('حداقل یک واحد (ریشه) لازم است.');
  }

  const unitIds = new Set(units.map((u) => u.id).filter(Boolean));
  units.forEach((u) => {
    if (u.parentId && !unitIds.has(u.parentId) && u.id !== ROOT_UNIT_ID) {
      throw validationError('والد واحد در درخت نیست.', { unitId: u.id, parentId: u.parentId });
    }
  });

  await withTransaction(async (client) => {
    const sorted = [...units].sort((a, b) => {
      if (a.id === ROOT_UNIT_ID) return -1;
      if (b.id === ROOT_UNIT_ID) return 1;
      if (!a.parentId) return -1;
      if (!b.parentId) return 1;
      return 0;
    });

    for (const unit of sorted) {
      const id = unit.id || newEntityId('ou');
      await orgRepo.upsertUnit({
        id,
        parentId: id === ROOT_UNIT_ID ? null : (unit.parentId || ROOT_UNIT_ID),
        code: unit.code || codeFrom(id),
        name: unit.name,
        sortOrder: unit.sortOrder ?? 0,
        isActive: true,
      }, client);
    }

    const keepUnitIds = sorted.map((u) => u.id).filter(Boolean);
    const keepUserIds = [];

    for (const row of assignments || []) {
      const user = await userRepo.findById(row.userId, client);
      if (!user) throw appError('USER_NOT_FOUND', 'کاربر یافت نشد.', 404, { userId: row.userId });
      const unitId = row.unitId;
      if (!keepUnitIds.includes(unitId)) {
        throw validationError('واحد انتساب در درخت نیست.', { userId: row.userId, unitId });
      }
      const position = await ensurePosition(unitId, row, client);
      if (row.isManager) {
        await orgRepo.clearManagerOnUnit(unitId, user.id, client);
      }
      await orgRepo.upsertAssignment({
        userId: user.id,
        unitId,
        positionId: position?.id || null,
        isManager: row.isManager === true,
      }, client);
      keepUserIds.push(user.id);
    }

    await orgRepo.deleteAssignmentsNotIn(keepUserIds, client);
    await orgRepo.deactivateUnitsNotIn(keepUnitIds, client);
    await writeAudit({
      actorUserId,
      action: 'organization.tree.replace',
      entityType: 'organization_unit',
      entityId: ROOT_UNIT_ID,
      detail: { units: keepUnitIds.length, assignments: keepUserIds.length },
    }, client);
  });

  return getSnapshot();
}
