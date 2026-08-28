/**
 * Brand Registry use-cases (Shirazeh, DDL-24). Duplicate detection is
 * mandatory: exact normalized-name match BLOCKS create; probable-duplicate
 * (token-overlap similarity) WARNS but allows explicit override.
 */
import { z } from 'zod';
import { appError, fromZodError, notFoundError } from '../lib/errors.js';
import { newEntityId, writeAudit } from '../lib/ids.js';
import { normalizeBrandName, tokenOverlapSimilarity } from '../domain/productMaster/normalize.js';
import * as brandRepo from '../repositories/brandRepository.js';

const SIMILARITY_WARN_THRESHOLD = 0.5;

const createSchema = z.object({
  brandName: z.string().trim().min(1).max(160),
  legalName: z.string().trim().max(200).optional(),
  confirmDuplicate: z.boolean().optional().default(false),
});
const patchSchema = z.object({
  brandName: z.string().trim().min(1).max(160).optional(),
  legalName: z.string().trim().max(200).optional(),
  isActive: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'empty patch' });

export async function listBrands({ includeInactive = true } = {}) {
  return brandRepo.list({ includeInactive });
}

export async function getBrand(id) {
  const row = await brandRepo.findById(id);
  if (!row) throw notFoundError('برند یافت نشد.');
  return row;
}

/** Exact + probable-duplicate check, reusable by create() and a standalone "check" endpoint. */
export async function checkBrandDuplicate(brandName) {
  const normalizedName = normalizeBrandName(brandName);
  const exact = await brandRepo.findByNormalizedName(normalizedName);
  if (exact) return { exact, probable: [] };

  const all = await brandRepo.list({ includeInactive: true });
  const probable = all
    .map((b) => ({ brand: b, score: tokenOverlapSimilarity(brandName, b.brandName) }))
    .filter((r) => r.score >= SIMILARITY_WARN_THRESHOLD)
    .sort((a, b) => b.score - a.score);
  return { exact: null, probable };
}

export async function createBrand(body, actorUserId) {
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های برند نامعتبر است.');

  const { exact, probable } = await checkBrandDuplicate(parsed.data.brandName);
  if (exact) {
    throw appError('BRAND_DUPLICATE', 'برندی با همین نام (پس از نرمال‌سازی) قبلاً ثبت شده است.', 409, { existingId: exact.id });
  }
  if (probable.length && !parsed.data.confirmDuplicate) {
    throw appError('BRAND_PROBABLE_DUPLICATE', 'برندهای مشابهی یافت شد — لطفاً بررسی و در صورت تایید تمایز، دوباره با confirmDuplicate=true ارسال کنید.', 409, {
      probable: probable.slice(0, 5).map((r) => ({ id: r.brand.id, brandName: r.brand.brandName, score: r.score })),
    });
  }

  const normalizedName = normalizeBrandName(parsed.data.brandName);
  const row = await brandRepo.create({
    id: newEntityId('brand'), brandName: parsed.data.brandName, legalName: parsed.data.legalName, normalizedName, actorUserId,
  });
  await writeAudit({
    actorUserId, action: 'brand.create', entityType: 'brand', entityId: row.id,
    detail: { brandName: row.brandName, duplicateOverride: probable.length > 0 },
  });
  return row;
}

export async function updateBrand(id, body, actorUserId) {
  await getBrand(id);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های برند نامعتبر است.');
  const row = await brandRepo.update(id, parsed.data, actorUserId);
  await writeAudit({ actorUserId, action: 'brand.update', entityType: 'brand', entityId: id, detail: parsed.data });
  return row;
}

export default { listBrands, getBrand, checkBrandDuplicate, createBrand, updateBrand };
