/**
 * Product Relationship use-cases (Vitrin, DDL-24). Business/product
 * knowledge only — never auto-substituted; self-links and duplicate
 * relation records are rejected.
 */
import { z } from 'zod';
import { appError, fromZodError } from '../lib/errors.js';
import { newEntityId, writeAudit } from '../lib/ids.js';
import * as relRepo from '../repositories/productRelationshipRepository.js';
import * as productRepo from '../repositories/productRepository.js';

const createSchema = z.object({
  sourceProductId: z.string().min(1),
  targetProductId: z.string().min(1),
  relationshipType: z.enum(['ALTERNATIVE', 'SUBSTITUTE', 'SUBSTITUTE_WITH_CONVERSION']),
  conversionNumerator: z.number().positive().optional(),
  conversionDenominator: z.number().positive().optional(),
  notes: z.string().optional(),
}).refine((d) => (d.relationshipType !== 'SUBSTITUTE_WITH_CONVERSION' || (d.conversionNumerator && d.conversionDenominator)), {
  message: 'رابطه جایگزینی با ضریب تبدیل باید صورت و مخرج ضریب تبدیل را داشته باشد.',
});

export async function listForProduct(productId) {
  return relRepo.listForProduct(productId);
}

export async function createRelationship(body, actorUserId) {
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های رابطه محصول نامعتبر است.');
  const { sourceProductId, targetProductId, relationshipType } = parsed.data;

  if (sourceProductId === targetProductId) {
    throw appError('PRODUCT_RELATIONSHIP_SELF', 'یک محصول نمی‌تواند با خودش رابطه داشته باشد.', 400);
  }

  const [source, target] = await Promise.all([productRepo.findById(sourceProductId), productRepo.findById(targetProductId)]);
  if (!source || !target) throw appError('PRODUCT_NOT_FOUND', 'محصول مبدأ یا مقصد یافت نشد.', 400);

  const existing = await relRepo.findExisting(sourceProductId, targetProductId, relationshipType);
  if (existing) throw appError('PRODUCT_RELATIONSHIP_DUPLICATE', 'این رابطه قبلاً بین این دو محصول ثبت شده است.', 409, { existingId: existing.id });

  const row = await relRepo.create({ id: newEntityId('prel'), ...parsed.data, actorUserId });
  await writeAudit({ actorUserId, action: 'product_relationship.create', entityType: 'product_relationship', entityId: row.id, detail: parsed.data });
  return row;
}

export async function deactivateRelationship(id, actorUserId) {
  const row = await relRepo.deactivate(id, actorUserId);
  if (!row) throw appError('PRODUCT_RELATIONSHIP_NOT_FOUND', 'رابطه محصول یافت نشد.', 404);
  await writeAudit({ actorUserId, action: 'product_relationship.deactivate', entityType: 'product_relationship', entityId: id, detail: {} });
  return row;
}

export default { listForProduct, createRelationship, deactivateRelationship };
