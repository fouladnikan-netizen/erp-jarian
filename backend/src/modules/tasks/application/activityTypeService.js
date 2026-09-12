/**
 * Activity Type Registry use-cases (Gap 1 — Shirazeh CRUD, real backend-persisted).
 * Deactivation only — no hard delete. Historical Activities that already used a
 * key remain valid/readable even after that key is deactivated (see
 * activityService.assertActivityType, which only enforces on CREATE/type-change).
 */
import { z } from 'zod';
import { appError, fromZodError } from '../../../lib/errors.js';
import * as activityTypeRepo from '../infrastructure/activityTypeRepository.js';

const keySchema = z.string().trim().min(1).max(40).regex(/^[a-z0-9_-]+$/, {
  message: 'کلید نوع فعالیت باید حروف کوچک لاتین، عدد، خط تیره یا زیرخط باشد.',
});

const createSchema = z.object({
  key: keySchema,
  labelFa: z.string().trim().min(1),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional().default(true),
});

const updateSchema = z.object({
  labelFa: z.string().trim().min(1).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'empty patch' });

export async function listActivityTypes({ includeInactive = true } = {}) {
  return activityTypeRepo.list({ includeInactive });
}

export async function getActivityType(key) {
  const row = await activityTypeRepo.findByKey(key);
  if (!row) throw appError('ACTIVITY_TYPE_NOT_FOUND', 'نوع فعالیت یافت نشد.', 404);
  return row;
}

export async function createActivityType(body, actorUserId) {
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های نوع فعالیت نامعتبر است.');

  const existing = await activityTypeRepo.findByKey(parsed.data.key);
  if (existing) {
    throw appError('ACTIVITY_TYPE_DUPLICATE', 'این کلید قبلاً ثبت شده است.', 409, { key: parsed.data.key });
  }

  let sortOrder = parsed.data.sortOrder;
  if (sortOrder == null) {
    const all = await activityTypeRepo.list({ includeInactive: true });
    sortOrder = all.length ? Math.max(...all.map((r) => r.sortOrder)) + 10 : 10;
  }

  return activityTypeRepo.create({
    key: parsed.data.key,
    labelFa: parsed.data.labelFa,
    sortOrder,
    isActive: parsed.data.isActive,
    actorUserId,
  });
}

export async function updateActivityType(key, body, actorUserId) {
  await getActivityType(key);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های نوع فعالیت نامعتبر است.');
  return activityTypeRepo.update(key, parsed.data, actorUserId);
}

export async function deactivateActivityType(key, actorUserId) {
  return updateActivityType(key, { isActive: false }, actorUserId);
}

export async function activateActivityType(key, actorUserId) {
  return updateActivityType(key, { isActive: true }, actorUserId);
}

/**
 * Enforce that a NEW or CHANGED `activityType` value on an Activity refers to
 * an active registry key. Does not fail existing rows that keep their
 * (possibly now-inactive) type unchanged.
 */
export async function assertActiveActivityType(activityType) {
  if (!activityType) return;
  const row = await activityTypeRepo.findByKey(activityType);
  if (!row || !row.isActive) {
    throw appError(
      'INVALID_ACTIVITY_TYPE',
      'نوع فعالیت نامعتبر یا غیرفعال است.',
      400,
      { activityType },
    );
  }
}

export default {
  listActivityTypes,
  getActivityType,
  createActivityType,
  updateActivityType,
  deactivateActivityType,
  activateActivityType,
  assertActiveActivityType,
};
