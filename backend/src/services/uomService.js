/**
 * UOM Engine use-cases (Shirazeh, DDL-24). Base/Alternative/Sales/Purchase
 * UOM + conversion rules with exact/approximate metadata.
 */
import { z } from 'zod';
import { appError, fromZodError, notFoundError } from '../lib/errors.js';
import { newEntityId, writeAudit } from '../lib/ids.js';
import * as uomRepo from '../repositories/uomRepository.js';

const createUomSchema = z.object({
  code: z.string().trim().min(1).max(20).regex(/^[A-Z0-9_]+$/, { message: 'کد واحد باید حروف بزرگ لاتین/عدد باشد.' }),
  nameFa: z.string().trim().min(1),
  category: z.enum(['WEIGHT', 'LENGTH', 'COUNT', 'AREA', 'VOLUME', 'GENERIC']).optional(),
});
const patchUomSchema = z.object({
  nameFa: z.string().trim().min(1).optional(),
  category: z.enum(['WEIGHT', 'LENGTH', 'COUNT', 'AREA', 'VOLUME', 'GENERIC']).optional(),
  isActive: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'empty patch' });

const createConversionSchema = z.object({
  fromUomId: z.string().min(1),
  toUomId: z.string().min(1),
  numerator: z.number().positive(),
  denominator: z.number().positive().optional().default(1),
  isExact: z.boolean().optional().default(true),
  notes: z.string().optional(),
});

export async function listUoms({ includeInactive = true } = {}) {
  return uomRepo.list({ includeInactive });
}

export async function getUom(id) {
  const row = await uomRepo.findById(id);
  if (!row) throw notFoundError('واحد اندازه‌گیری یافت نشد.');
  return row;
}

export async function createUom(body, actorUserId) {
  const parsed = createUomSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های واحد اندازه‌گیری نامعتبر است.');
  const existing = await uomRepo.findByCode(parsed.data.code);
  if (existing) throw appError('UOM_DUPLICATE', 'این کد واحد قبلاً ثبت شده است.', 409, { existingId: existing.id });
  const row = await uomRepo.create({ id: newEntityId('uom'), ...parsed.data, actorUserId });
  await writeAudit({ actorUserId, action: 'uom.create', entityType: 'uom', entityId: row.id, detail: { code: row.code } });
  return row;
}

export async function updateUom(id, body, actorUserId) {
  await getUom(id);
  const parsed = patchUomSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های واحد اندازه‌گیری نامعتبر است.');
  const row = await uomRepo.update(id, parsed.data, actorUserId);
  await writeAudit({ actorUserId, action: 'uom.update', entityType: 'uom', entityId: id, detail: parsed.data });
  return row;
}

export async function listConversions({ fromUomId = null } = {}) {
  return uomRepo.listConversions({ fromUomId });
}

export async function createConversion(body, actorUserId) {
  const parsed = createConversionSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های تبدیل واحد نامعتبر است.');
  if (parsed.data.fromUomId === parsed.data.toUomId) {
    throw appError('UOM_CONVERSION_SELF', 'واحد مبدأ و مقصد نمی‌توانند یکسان باشند.', 400);
  }
  const [fromUom, toUom] = await Promise.all([uomRepo.findById(parsed.data.fromUomId), uomRepo.findById(parsed.data.toUomId)]);
  if (!fromUom || !toUom) throw appError('UOM_NOT_FOUND', 'واحد مبدأ یا مقصد یافت نشد.', 400);
  const existing = await uomRepo.findConversion(parsed.data.fromUomId, parsed.data.toUomId);
  if (existing) throw appError('UOM_CONVERSION_DUPLICATE', 'قانون تبدیل بین این دو واحد قبلاً ثبت شده است.', 409);

  const row = await uomRepo.createConversion({ id: newEntityId('uomc'), ...parsed.data, actorUserId });
  await writeAudit({ actorUserId, action: 'uom_conversion.create', entityType: 'uom_conversion', entityId: row.id, detail: parsed.data });
  return row;
}

/** Resolve a deterministic conversion factor between two UOMs (exact or approximate). */
export async function resolveConversionFactor(fromUomId, toUomId) {
  if (fromUomId === toUomId) return { factor: 1, isExact: true };
  const direct = await uomRepo.findConversion(fromUomId, toUomId);
  if (direct) return { factor: direct.numerator / direct.denominator, isExact: direct.isExact };
  const inverse = await uomRepo.findConversion(toUomId, fromUomId);
  if (inverse) return { factor: inverse.denominator / inverse.numerator, isExact: inverse.isExact };
  return null;
}

export default { listUoms, getUom, createUom, updateUom, listConversions, createConversion, resolveConversionFactor };
