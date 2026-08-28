/**
 * Correspondence Type Registry use-cases (DDL-23d — Shirazeh CRUD, real backend-persisted).
 * Deactivation only — no hard delete. Historical Correspondence rows that
 * already used a key remain valid/readable even after that key is
 * deactivated (see assertActiveCorrespondenceType, enforced only on
 * CREATE/type-change, mirrors activityTypeService.js).
 */
import { z } from 'zod';
import { appError, fromZodError } from '../lib/errors.js';
import * as correspondenceTypeRepo from '../repositories/correspondenceTypeRepository.js';

const keySchema = z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/, {
  message: 'کلید نوع مکاتبه باید حروف لاتین، عدد، خط تیره یا زیرخط باشد.',
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

export async function listCorrespondenceTypes({ includeInactive = true } = {}) {
  return correspondenceTypeRepo.list({ includeInactive });
}

export async function getCorrespondenceType(key) {
  const row = await correspondenceTypeRepo.findByKey(key);
  if (!row) throw appError('CORRESPONDENCE_TYPE_NOT_FOUND', 'نوع مکاتبه یافت نشد.', 404);
  return row;
}

export async function createCorrespondenceType(body, actorUserId) {
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های نوع مکاتبه نامعتبر است.');

  const existing = await correspondenceTypeRepo.findByKey(parsed.data.key);
  if (existing) {
    throw appError('CORRESPONDENCE_TYPE_DUPLICATE', 'این کلید قبلاً ثبت شده است.', 409, { key: parsed.data.key });
  }

  let sortOrder = parsed.data.sortOrder;
  if (sortOrder == null) {
    const all = await correspondenceTypeRepo.list({ includeInactive: true });
    sortOrder = all.length ? Math.max(...all.map((r) => r.sortOrder)) + 10 : 10;
  }

  return correspondenceTypeRepo.create({
    key: parsed.data.key,
    labelFa: parsed.data.labelFa,
    sortOrder,
    isActive: parsed.data.isActive,
    actorUserId,
  });
}

export async function updateCorrespondenceType(key, body, actorUserId) {
  await getCorrespondenceType(key);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های نوع مکاتبه نامعتبر است.');
  return correspondenceTypeRepo.update(key, parsed.data, actorUserId);
}

export async function deactivateCorrespondenceType(key, actorUserId) {
  return updateCorrespondenceType(key, { isActive: false }, actorUserId);
}

export async function activateCorrespondenceType(key, actorUserId) {
  return updateCorrespondenceType(key, { isActive: true }, actorUserId);
}

/**
 * Enforce that a NEW or CHANGED `typeKey` value on a Correspondence refers
 * to an active registry key. Does not fail existing rows that keep their
 * (possibly now-inactive) type unchanged.
 */
export async function assertActiveCorrespondenceType(typeKey) {
  if (!typeKey) return;
  const row = await correspondenceTypeRepo.findByKey(typeKey);
  if (!row || !row.isActive) {
    throw appError(
      'INVALID_CORRESPONDENCE_TYPE',
      'نوع مکاتبه نامعتبر یا غیرفعال است.',
      400,
      { typeKey },
    );
  }
}

export default {
  listCorrespondenceTypes,
  getCorrespondenceType,
  createCorrespondenceType,
  updateCorrespondenceType,
  deactivateCorrespondenceType,
  activateCorrespondenceType,
  assertActiveCorrespondenceType,
};
