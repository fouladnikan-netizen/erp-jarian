/**
 * Task use-cases — Zod, subject integrity, lifecycle, audit (DDL-16).
 */
import { z } from 'zod';
import { withTransaction } from '../db/pool.js';
import { appError, fromZodError } from '../lib/errors.js';
import { newEntityId, writeAudit } from '../lib/ids.js';
import { assertOwnerOrElevated } from '../domain/access/ownershipGate.js';
import * as taskRepo from '../repositories/taskRepository.js';
import * as companyRepo from '../repositories/companyRepository.js';
import * as leadRepo from '../repositories/leadRepository.js';

/** See activityService.toActorAuth — same permissive normalization. */
function toActorAuth(actorUserIdOrAuth) {
  if (actorUserIdOrAuth && typeof actorUserIdOrAuth === 'object') {
    return { userId: actorUserIdOrAuth.userId, roles: actorUserIdOrAuth.roles || [] };
  }
  return { userId: actorUserIdOrAuth, roles: [] };
}

export const TASK_STATUSES = Object.freeze({
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

export const TASK_PRIORITIES = Object.freeze({
  low: 'low',
  normal: 'normal',
  high: 'high',
  urgent: 'urgent',
});

export const SUBJECT_TYPES = Object.freeze({
  COMPANY: 'COMPANY',
  RAW_LEAD: 'RAW_LEAD',
});

const STATUS_TRANSITIONS = Object.freeze({
  OPEN: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
});

const subjectTypeSchema = z.enum(['COMPANY', 'RAW_LEAD']);
const statusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
const prioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

const createSchema = z.object({
  subjectType: subjectTypeSchema,
  subjectId: z.union([z.string(), z.number()]).transform((v) => String(v).trim()).pipe(z.string().min(1)),
  title: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  priority: prioritySchema.optional().default('normal'),
  assignedTo: z.string().trim().optional().nullable(),
  assigneeName: z.string().trim().optional().nullable(),
  dueAt: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  payload: z.record(z.string(), z.any()).optional(),
});

const updateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().optional().nullable(),
  priority: prioritySchema.optional(),
  assignedTo: z.string().trim().optional().nullable(),
  assigneeName: z.string().trim().optional().nullable(),
  dueAt: z.string().optional().nullable(),
  payload: z.record(z.string(), z.any()).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'empty patch' });

const changeStatusSchema = z.object({
  status: statusSchema,
});

async function assertSubjectReference(subjectType, subjectId) {
  if (subjectType === SUBJECT_TYPES.COMPANY) {
    const company = await companyRepo.findById(subjectId);
    if (!company) {
      throw appError('INVALID_ENTITY_REFERENCE', 'مرجع شرکت نامعتبر یا آرشیو شده است.', 400, {
        subjectType, subjectId,
      });
    }
    return { subjectType, subjectId: String(subjectId) };
  }
  if (subjectType === SUBJECT_TYPES.RAW_LEAD) {
    const lead = await leadRepo.findById(subjectId);
    if (!lead) {
      throw appError('INVALID_ENTITY_REFERENCE', 'مرجع سرنخ نامعتبر یا آرشیو شده است.', 400, {
        subjectType, subjectId,
      });
    }
    return { subjectType, subjectId: String(subjectId) };
  }
  throw appError('INVALID_ENTITY_REFERENCE', 'نوع مرجع موجودیت نامعتبر است.', 400, {
    subjectType, subjectId,
  });
}

async function assertAssignee(userId) {
  if (userId == null || userId === '') return null;
  const user = await taskRepo.findUserById(userId);
  if (!user || user.is_active === false) {
    throw appError('INVALID_ASSIGNEE', 'کاربر مسئول نامعتبر است.', 400, { assignedTo: userId });
  }
  return user;
}

function assertStatusTransition(from, to) {
  const allowed = STATUS_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw appError('INVALID_TASK_STATUS', 'تغییر وضعیت وظیفه مجاز نیست.', 400, { from, to });
  }
}

function auditDetail(task, actorUserId, extra = {}) {
  return {
    taskId: task.id,
    subjectType: task.subjectType,
    subjectId: task.subjectId,
    assignedTo: task.assignedTo || null,
    actorId: actorUserId,
    ...extra,
  };
}

export async function listTasks(filters = {}) {
  if (filters.subjectType && !['COMPANY', 'RAW_LEAD'].includes(filters.subjectType)) {
    throw appError('INVALID_ENTITY_REFERENCE', 'نوع مرجع موجودیت نامعتبر است.', 400);
  }
  return taskRepo.list({
    subjectType: filters.subjectType,
    subjectId: filters.subjectId,
    assignedTo: filters.assignedTo,
    status: filters.status,
    limit: filters.limit,
    offset: filters.offset,
  });
}

export async function getTask(id) {
  const row = await taskRepo.findById(id);
  if (!row) throw appError('TASK_NOT_FOUND', 'وظیفه یافت نشد.', 404);
  return row;
}

export async function createTask(body, actorUserId) {
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های وظیفه نامعتبر است.');

  const data = parsed.data;
  await assertSubjectReference(data.subjectType, data.subjectId);
  const user = await assertAssignee(data.assignedTo);

  const id = newEntityId('ptask');
  const dueAt = data.dueAt ?? data.dueDate ?? null;
  const payload = {
    ...(data.payload || {}),
    assigneeName: data.assigneeName || user?.display_name || null,
  };

  await withTransaction(async (client) => {
    await taskRepo.create({
      id,
      subjectType: data.subjectType,
      subjectId: data.subjectId,
      title: data.title,
      description: data.description ?? null,
      status: TASK_STATUSES.OPEN,
      priority: data.priority || 'normal',
      assignedTo: data.assignedTo || null,
      dueAt,
      payload,
      actorUserId,
    }, client);
    await writeAudit({
      actorUserId,
      action: 'task.create',
      entityType: 'task',
      entityId: id,
      detail: {
        taskId: id,
        subjectType: data.subjectType,
        subjectId: data.subjectId,
        assignedTo: data.assignedTo || null,
        actorId: actorUserId,
      },
    }, client);
  });

  return getTask(id);
}

export async function updateTask(id, body, actorUserId) {
  const existing = await getTask(id);
  const auth = toActorAuth(actorUserId);
  assertOwnerOrElevated(existing, auth, { entityType: 'task', entityId: id });
  actorUserId = auth.userId;

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های وظیفه نامعتبر است.');

  const patch = { ...parsed.data };
  if (patch.assignedTo !== undefined && patch.assignedTo) {
    const user = await assertAssignee(patch.assignedTo);
    patch.payload = {
      ...(existing.payload || {}),
      ...(patch.payload || {}),
      assigneeName: patch.assigneeName || user?.display_name || existing.payload?.assigneeName,
    };
  }
  delete patch.assigneeName;

  await withTransaction(async (client) => {
    await taskRepo.update(id, patch, actorUserId, client);
    const next = await taskRepo.findById(id, {}, client);
    await writeAudit({
      actorUserId,
      action: 'task.update',
      entityType: 'task',
      entityId: id,
      detail: auditDetail(next || existing, actorUserId),
    }, client);
  });

  return getTask(id);
}

export async function changeTaskStatus(id, body, actorUserId) {
  const existing = await getTask(id);
  const auth = toActorAuth(actorUserId);
  assertOwnerOrElevated(existing, auth, { entityType: 'task', entityId: id });
  actorUserId = auth.userId;

  const parsed = changeStatusSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'وضعیت نامعتبر است.');

  const next = parsed.data.status;
  if (next === TASK_STATUSES.COMPLETED && existing.status === TASK_STATUSES.COMPLETED) {
    throw appError('TASK_ALREADY_COMPLETED', 'این وظیفه قبلاً تکمیل شده است.', 409, { id });
  }
  assertStatusTransition(existing.status, next);

  await withTransaction(async (client) => {
    await taskRepo.changeStatus(id, next, actorUserId, {}, client);
    await writeAudit({
      actorUserId,
      action: 'task.status_change',
      entityType: 'task',
      entityId: id,
      detail: auditDetail(existing, actorUserId, { from: existing.status, to: next }),
    }, client);
  });

  return getTask(id);
}

export async function completeTask(id, actorUserId) {
  const existing = await getTask(id);
  const auth = toActorAuth(actorUserId);
  assertOwnerOrElevated(existing, auth, { entityType: 'task', entityId: id });
  actorUserId = auth.userId;
  if (existing.status === TASK_STATUSES.COMPLETED) {
    throw appError('TASK_ALREADY_COMPLETED', 'این وظیفه قبلاً تکمیل شده است.', 409, { id });
  }
  assertStatusTransition(existing.status, TASK_STATUSES.COMPLETED);

  await withTransaction(async (client) => {
    await taskRepo.complete(id, actorUserId, client);
    await writeAudit({
      actorUserId,
      action: 'task.complete',
      entityType: 'task',
      entityId: id,
      detail: auditDetail(existing, actorUserId),
    }, client);
  });

  return getTask(id);
}

export async function archiveTask(id, actorUserId) {
  const existing = await getTask(id);
  const auth = toActorAuth(actorUserId);
  assertOwnerOrElevated(existing, auth, { entityType: 'task', entityId: id });
  actorUserId = auth.userId;
  await withTransaction(async (client) => {
    await taskRepo.archive(id, actorUserId, client);
    await writeAudit({
      actorUserId,
      action: 'task.archive',
      entityType: 'task',
      entityId: id,
      detail: auditDetail(existing, actorUserId),
    }, client);
  });
  return { id, archived: true };
}

export default {
  listTasks,
  getTask,
  createTask,
  updateTask,
  changeTaskStatus,
  completeTask,
  archiveTask,
  TASK_STATUSES,
  STATUS_TRANSITIONS,
};
