/**
 * Activity use-cases — Zod, subject integrity, lifecycle, audit (DDL-15).
 * SQL only via activityRepository.
 */
import { z } from 'zod';
import { withTransaction } from '../../../db/pool.js';
import { appError, fromZodError } from '../../../lib/errors.js';
import { newEntityId, writeAudit } from '../../../lib/ids.js';
import { assertOwnerOrElevated } from '../../../domain/access/ownershipGate.js';
import * as activityRepo from '../infrastructure/activityRepository.js';
import { findCompanyById, findLeadById } from '../../crm/public/subjectReferences.js';
import * as taskRepo from '../infrastructure/taskRepository.js';
import * as activityTypeService from './activityTypeService.js';
import { EVENT, PRODUCER, notifyDomainEvent } from '../../shared/events/index.js';

/**
 * Normalize a legacy plain `actorUserId` string or a full `{ userId, roles }`
 * auth object into the shape `ownershipGate` expects. Kept permissive so
 * internal callers (bridges, tests) that only have a userId still work —
 * they simply won't get the elevated-role bypass.
 */
function toActorAuth(actorUserIdOrAuth) {
  if (actorUserIdOrAuth && typeof actorUserIdOrAuth === 'object') {
    return { userId: actorUserIdOrAuth.userId, roles: actorUserIdOrAuth.roles || [] };
  }
  return { userId: actorUserIdOrAuth, roles: [] };
}

export const ACTIVITY_STATUSES = Object.freeze({
  OPEN: 'OPEN',
  COMPLETED: 'COMPLETED',
});

export const SUBJECT_TYPES = Object.freeze({
  COMPANY: 'COMPANY',
  RAW_LEAD: 'RAW_LEAD',
});

const subjectTypeSchema = z.enum(['COMPANY', 'RAW_LEAD']);

const createSchema = z.object({
  subjectType: subjectTypeSchema,
  subjectId: z.union([z.string(), z.number()]).transform((v) => String(v).trim()).pipe(z.string().min(1)),
  activityType: z.string().trim().min(1).optional().default('note'),
  title: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  note: z.string().trim().optional().nullable(),
  summary: z.string().trim().optional().nullable(),
  type: z.string().trim().optional().nullable(),
  occurredAt: z.string().optional().nullable(),
  dueAt: z.string().optional().nullable(),
  nextFollowUpDate: z.string().optional().nullable(),
  nextFollowUp: z.string().optional().nullable(),
  assignedTo: z.string().trim().optional().nullable(),
  payload: z.record(z.string(), z.any()).optional(),
});

const updateSchema = z.object({
  activityType: z.string().trim().min(1).optional(),
  title: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  note: z.string().trim().optional().nullable(),
  occurredAt: z.string().optional().nullable(),
  dueAt: z.string().optional().nullable(),
  assignedTo: z.string().trim().optional().nullable(),
  payload: z.record(z.string(), z.any()).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'empty patch' });

/**
 * Application-level subject integrity (DDL-15) — no polymorphic FK registry.
 */
async function assertSubjectReference(subjectType, subjectId) {
  if (subjectType === SUBJECT_TYPES.COMPANY) {
    const company = await findCompanyById(subjectId);
    if (!company) {
      throw appError(
        'INVALID_ENTITY_REFERENCE',
        'مرجع شرکت نامعتبر یا آرشیو شده است.',
        400,
        { subjectType, subjectId },
      );
    }
    return { subjectType, subjectId: String(subjectId), company };
  }

  if (subjectType === SUBJECT_TYPES.RAW_LEAD) {
    const lead = await findLeadById(subjectId);
    if (!lead) {
      throw appError(
        'INVALID_ENTITY_REFERENCE',
        'مرجع سرنخ نامعتبر یا آرشیو شده است.',
        400,
        { subjectType, subjectId },
      );
    }
    return { subjectType, subjectId: String(subjectId), lead };
  }

  throw appError(
    'INVALID_ENTITY_REFERENCE',
    'نوع مرجع موجودیت نامعتبر است.',
    400,
    { subjectType, subjectId },
  );
}

/**
 * Gap 2 — follow-up → canonical Task linkage.
 * Runs inside the same DB transaction as the Activity write so both succeed
 * or fail together. Idempotent on `source_activity_id`:
 *   - no linked task yet + future dueAt → create one.
 *   - linked task exists and is OPEN/IN_PROGRESS → update its dueAt/title.
 *   - linked task exists and is COMPLETED/CANCELLED → never resurrect it.
 *   - dueAt cleared (null) + linked task still OPEN/IN_PROGRESS → cancel it
 *     (auto-created follow-up task, not yet completed — safe to retract).
 *   - dueAt cleared + linked task COMPLETED → leave untouched (completed
 *     work must never be silently destroyed).
 */
function followUpTaskTitle(activity) {
  const source = activity.title || activity.description || 'فعالیت';
  const snippet = String(source).trim().slice(0, 60);
  return `پیگیری: ${snippet}`;
}

async function syncFollowUpTask(activity, actorUserId, client) {
  const existingTask = await taskRepo.findBySourceActivityId(activity.id, {}, client);
  const isFuture = activity.dueAt && new Date(activity.dueAt).getTime() > Date.now();

  if (!isFuture) {
    if (existingTask && ['OPEN', 'IN_PROGRESS'].includes(existingTask.status)) {
      await taskRepo.changeStatus(existingTask.id, 'CANCELLED', actorUserId, {}, client);
      await writeAudit({
        actorUserId,
        action: 'task.status_change',
        entityType: 'task',
        entityId: existingTask.id,
        detail: {
          taskId: existingTask.id,
          from: existingTask.status,
          to: 'CANCELLED',
          reason: 'source_activity_followup_cleared',
          sourceActivityId: activity.id,
        },
      }, client);
    }
    return;
  }

  if (existingTask) {
    if (['COMPLETED', 'CANCELLED'].includes(existingTask.status)) {
      return; // never resurrect progressed work
    }
    await taskRepo.update(existingTask.id, {
      title: followUpTaskTitle(activity),
      dueAt: activity.dueAt,
    }, actorUserId, client);
    return;
  }

  const taskId = newEntityId('ptask');
  await taskRepo.create({
    id: taskId,
    subjectType: activity.subjectType,
    subjectId: activity.subjectId,
    title: followUpTaskTitle(activity),
    description: activity.description || null,
    status: 'OPEN',
    priority: 'normal',
    assignedTo: activity.assignedTo || actorUserId || null,
    dueAt: activity.dueAt,
    sourceActivityId: activity.id,
    payload: { assigneeName: null, autoCreatedFrom: 'activity_followup' },
    actorUserId,
  }, client);
  await writeAudit({
    actorUserId,
    action: 'task.create',
    entityType: 'task',
    entityId: taskId,
    detail: {
      taskId,
      subjectType: activity.subjectType,
      subjectId: activity.subjectId,
      assignedTo: activity.assignedTo || actorUserId || null,
      sourceActivityId: activity.id,
      actorId: actorUserId,
    },
  }, client);
}

function normalizeCreateBody(data) {
  const description = data.description ?? data.note ?? data.summary ?? null;
  const activityType = data.activityType || data.type || 'note';
  const dueAt = data.dueAt ?? data.nextFollowUpDate ?? data.nextFollowUp ?? null;
  const title = data.title || null;
  return {
    subjectType: data.subjectType,
    subjectId: data.subjectId,
    activityType,
    title,
    description,
    occurredAt: data.occurredAt || null,
    dueAt,
    assignedTo: data.assignedTo || null,
    payload: data.payload || {},
  };
}

export async function listActivities(filters = {}) {
  if (filters.subjectType && !['COMPANY', 'RAW_LEAD'].includes(filters.subjectType)) {
    throw appError('INVALID_ENTITY_REFERENCE', 'نوع مرجع موجودیت نامعتبر است.', 400);
  }
  return activityRepo.list({
    subjectType: filters.subjectType,
    subjectId: filters.subjectId,
    status: filters.status,
    limit: filters.limit,
    offset: filters.offset,
  });
}

export async function getActivity(id) {
  const row = await activityRepo.findById(id);
  if (!row) {
    throw appError('ACTIVITY_NOT_FOUND', 'فعالیت یافت نشد.', 404);
  }
  return row;
}

export async function createActivity(body, actorUserId) {
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    throw fromZodError(parsed, 'داده‌های فعالیت نامعتبر است.');
  }

  const data = normalizeCreateBody(parsed.data);
  if (!data.description && !data.title) {
    throw appError('VALIDATION', 'متن یا عنوان فعالیت الزامی است.', 400);
  }

  await assertSubjectReference(data.subjectType, data.subjectId);
  await activityTypeService.assertActiveActivityType(data.activityType);

  const auth = toActorAuth(actorUserId);
  const id = newEntityId('act');

  await withTransaction(async (client) => {
    await activityRepo.create({
      ...data,
      id,
      status: ACTIVITY_STATUSES.OPEN,
      actorUserId: auth.userId,
    }, client);
    await writeAudit({
      actorUserId: auth.userId,
      action: 'activity.create',
      entityType: 'activity',
      entityId: id,
      detail: {
        activityId: id,
        subjectType: data.subjectType,
        subjectId: data.subjectId,
        actorId: auth.userId,
      },
    }, client);

    if (data.dueAt) {
      await syncFollowUpTask({ ...data, id }, auth.userId, client);
    }
  });

  const created = await getActivity(id);
  await notifyDomainEvent({
    name: EVENT.TASKS_ACTIVITY_RECORDED,
    producer: PRODUCER.TASKS,
    payload: {
      activityId: created.id,
      subjectType: created.subjectType,
      subjectId: created.subjectId,
      activityType: created.activityType,
      status: created.status,
      actorUserId: auth.userId,
      trigger: 'activity_create',
    },
  });
  return created;
}

export async function updateActivity(id, body, actorUserId) {
  const existing = await activityRepo.findById(id);
  if (!existing) {
    throw appError('ACTIVITY_NOT_FOUND', 'فعالیت یافت نشد.', 404);
  }

  const auth = toActorAuth(actorUserId);
  assertOwnerOrElevated(existing, auth, { entityType: 'activity', entityId: id });

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    throw fromZodError(parsed, 'داده‌های فعالیت نامعتبر است.');
  }

  const patch = { ...parsed.data };
  if (patch.note != null && patch.description == null) {
    patch.description = patch.note;
  }
  delete patch.note;

  if (patch.activityType && patch.activityType !== existing.activityType) {
    await activityTypeService.assertActiveActivityType(patch.activityType);
  }

  const followUpTouched = Object.prototype.hasOwnProperty.call(patch, 'dueAt');

  await withTransaction(async (client) => {
    await activityRepo.update(id, patch, auth.userId, client);
    await writeAudit({
      actorUserId: auth.userId,
      action: 'activity.update',
      entityType: 'activity',
      entityId: id,
      detail: {
        activityId: id,
        subjectType: existing.subjectType,
        subjectId: existing.subjectId,
        actorId: auth.userId,
      },
    }, client);

    if (followUpTouched) {
      const merged = {
        id,
        subjectType: existing.subjectType,
        subjectId: existing.subjectId,
        title: patch.title ?? existing.title,
        description: patch.description ?? existing.description,
        assignedTo: patch.assignedTo ?? existing.assignedTo,
        dueAt: patch.dueAt,
      };
      await syncFollowUpTask(merged, auth.userId, client);
    }
  });

  return getActivity(id);
}

export async function completeActivity(id, actorUserId) {
  const existing = await activityRepo.findById(id);
  if (!existing) {
    throw appError('ACTIVITY_NOT_FOUND', 'فعالیت یافت نشد.', 404);
  }
  const auth = toActorAuth(actorUserId);
  assertOwnerOrElevated(existing, auth, { entityType: 'activity', entityId: id });
  actorUserId = auth.userId;
  if (existing.status === ACTIVITY_STATUSES.COMPLETED) {
    throw appError(
      'ACTIVITY_ALREADY_COMPLETED',
      'این فعالیت قبلاً تکمیل شده است.',
      409,
      { id, status: existing.status },
    );
  }
  if (existing.status !== ACTIVITY_STATUSES.OPEN) {
    throw appError(
      'INVALID_ACTIVITY_STATUS',
      'تغییر وضعیت فعالیت مجاز نیست.',
      400,
      { from: existing.status, to: ACTIVITY_STATUSES.COMPLETED },
    );
  }

  await withTransaction(async (client) => {
    await activityRepo.complete(id, actorUserId, client);
    await writeAudit({
      actorUserId,
      action: 'activity.complete',
      entityType: 'activity',
      entityId: id,
      detail: {
        activityId: id,
        subjectType: existing.subjectType,
        subjectId: existing.subjectId,
        actorId: actorUserId,
      },
    }, client);
  });

  await notifyDomainEvent({
    name: EVENT.TASKS_ACTIVITY_COMPLETED,
    producer: PRODUCER.TASKS,
    payload: {
      activityId: existing.id,
      subjectType: existing.subjectType,
      subjectId: existing.subjectId,
      activityType: existing.activityType,
      status: ACTIVITY_STATUSES.COMPLETED,
      actorUserId,
      trigger: 'activity_complete',
    },
  });

  return getActivity(id);
}

export async function archiveActivity(id, actorUserId) {
  const existing = await activityRepo.findById(id);
  if (!existing) {
    throw appError('ACTIVITY_NOT_FOUND', 'فعالیت یافت نشد.', 404);
  }
  const auth = toActorAuth(actorUserId);
  assertOwnerOrElevated(existing, auth, { entityType: 'activity', entityId: id });
  actorUserId = auth.userId;

  await withTransaction(async (client) => {
    await activityRepo.archive(id, actorUserId, client);
    await writeAudit({
      actorUserId,
      action: 'activity.archive',
      entityType: 'activity',
      entityId: id,
      detail: {
        activityId: id,
        subjectType: existing.subjectType,
        subjectId: existing.subjectId,
        actorId: actorUserId,
      },
    }, client);
  });

  return { id, archived: true };
}

export default {
  listActivities,
  getActivity,
  createActivity,
  updateActivity,
  completeActivity,
  archiveActivity,
  ACTIVITY_STATUSES,
  SUBJECT_TYPES,
};
