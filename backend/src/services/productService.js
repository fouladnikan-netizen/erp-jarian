/**
 * Product / SKU use-cases (Vitrin, DDL-24). Backend-authoritative: SKU
 * generation, canonical identity/duplicate blocking, schema validation,
 * generated name, lifecycle integrity all enforced here — never solely on
 * the frontend (jarian-security.mdc / product contract "API/SERVICE
 * BOUNDARIES").
 */
import { z } from 'zod';
import { appError, fromZodError, notFoundError, validationError } from '../lib/errors.js';
import { withTransaction } from '../db/pool.js';
import { newEntityId, writeAudit } from '../lib/ids.js';
import { normalizeAttributeValue, tokenOverlapSimilarity, buildCanonicalIdentityKey } from '../domain/productMaster/normalize.js';
import { buildGeneratedName } from '../domain/productMaster/nameGenerator.js';
import { allocateSku } from '../domain/productMaster/skuGenerator.js';
import { validateWeightProfile } from '../domain/productMaster/weightProfile.js';
import * as productRepo from '../repositories/productRepository.js';
import * as typeRepo from '../repositories/productTypeRepository.js';
import * as categoryRepo from '../repositories/productCategoryRepository.js';
import * as groupRepo from '../repositories/productGroupRepository.js';
import * as brandRepo from '../repositories/brandRepository.js';
import * as uomRepo from '../repositories/uomRepository.js';
import * as attrRepo from '../repositories/attributeDefinitionRepository.js';
import * as attributeDefinitionService from './attributeDefinitionService.js';

const PROBABLE_DUPLICATE_THRESHOLD = 0.82;

const createSchema = z.object({
  productTypeId: z.string().min(1),
  brandId: z.string().nullable().optional(),
  displayNameOverride: z.string().trim().max(200).nullable().optional(),
  attributeValues: z.record(z.string(), z.any()).optional().default({}),
  baseUomId: z.string().nullable().optional(),
  salesUomId: z.string().nullable().optional(),
  purchaseUomId: z.string().nullable().optional(),
  weightProfileType: z.enum(['FIXED', 'PER_LENGTH', 'DIMENSIONAL', 'MANUAL_ACTUAL']).optional().default('MANUAL_ACTUAL'),
  weightProfileCoefficients: z.record(z.string(), z.any()).optional().default({}),
  confirmDuplicate: z.boolean().optional().default(false),
});

const updateSchema = z.object({
  brandId: z.string().nullable().optional(),
  displayNameOverride: z.string().trim().max(200).nullable().optional(),
  attributeValues: z.record(z.string(), z.any()).optional(),
  baseUomId: z.string().nullable().optional(),
  salesUomId: z.string().nullable().optional(),
  purchaseUomId: z.string().nullable().optional(),
  weightProfileType: z.enum(['FIXED', 'PER_LENGTH', 'DIMENSIONAL', 'MANUAL_ACTUAL']).optional(),
  weightProfileCoefficients: z.record(z.string(), z.any()).optional(),
  confirmDuplicate: z.boolean().optional().default(false),
}).refine((d) => Object.keys(d).length > 0, { message: 'empty patch' });

// SKU is immutable once issued (GGCCTTVV, DDL-24b) — an explicit attempt to
// send `sku` in a PATCH must be REJECTED (400 + stable error code), not
// silently stripped by Zod's default unknown-key handling. Applies to every
// caller/role — this check runs before any RBAC-specific branching, so
// there is no admin bypass (jarian-security.mdc: backend is the boundary).
const IMMUTABLE_FIELDS_ON_UPDATE = ['sku'];

function assertNoImmutableFieldMutation(body) {
  const attempted = IMMUTABLE_FIELDS_ON_UPDATE.filter(
    (field) => body && Object.prototype.hasOwnProperty.call(body, field),
  );
  if (attempted.length) {
    throw appError(
      'SKU_IMMUTABLE',
      'شناسه کالای SKU پس از صدور غیرقابل تغییر است و در درخواست ویرایش نمی‌تواند ارسال شود.',
      400,
      { field: attempted[0], immutableFields: attempted },
    );
  }
}

/**
 * Validate raw attribute values against a Product Type's Attribute Schema
 * (product contract "PRODUCT TYPE + ATTRIBUTE SCHEMA"). Rejects unknown
 * attributes, missing required ones, out-of-range/out-of-enum values, and
 * TRANSACTION_ONLY attributes supplied at the master level (they must never
 * generate/alter a Product — DDL-24d).
 */
async function validateAttributeValues(productTypeId, rawValues) {
  const schema = await attributeDefinitionService.getEffectiveSchema(productTypeId);
  const schemaByDefId = new Map(schema.map((e) => [e.definition.id, e]));

  for (const key of Object.keys(rawValues || {})) {
    if (!schemaByDefId.has(key)) {
      throw appError('UNKNOWN_ATTRIBUTE', `ویژگی «${key}» برای این نوع کالا تعریف نشده است.`, 400, { attributeDefinitionId: key });
    }
  }

  const entries = [];
  for (const { binding, definition } of schema) {
    if (binding.attributeRole === 'TRANSACTION_ONLY' && rawValues?.[definition.id] !== undefined) {
      throw appError(
        'TRANSACTION_ONLY_ATTRIBUTE_ON_MASTER',
        `ویژگی «${definition.nameFa}» صرفاً تراکنشی است و نباید در محصول مرجع ثبت شود (طبق قرارداد آینده نبض).`,
        400,
        { attributeDefinitionId: definition.id },
      );
    }

    const hasValue = rawValues?.[definition.id] !== undefined && rawValues?.[definition.id] !== null && rawValues?.[definition.id] !== '';
    if (!hasValue) {
      const fallback = binding.overrideDefaultValue ?? definition.defaultValue;
      if (fallback !== undefined && fallback !== null && fallback !== '') {
        rawValues = { ...rawValues, [definition.id]: fallback };
      } else if (binding.isRequired && binding.attributeRole !== 'TRANSACTION_ONLY') {
        throw appError('ATTRIBUTE_REQUIRED', `ویژگی «${definition.nameFa}» برای این نوع کالا الزامی است.`, 400, { attributeDefinitionId: definition.id });
      } else {
        continue;
      }
    }

    const raw = rawValues[definition.id];
    if (definition.dataType === 'ENUM') {
      const allowed = (definition.allowedValues || []).map((v) => v.value);
      if (!allowed.includes(String(raw))) {
        throw appError('ATTRIBUTE_ENUM_INVALID', `مقدار ویژگی «${definition.nameFa}» باید یکی از مقادیر مجاز باشد.`, 400, { attributeDefinitionId: definition.id, allowed });
      }
    }

    const { normalized, storage } = normalizeAttributeValue(definition.dataType, raw);
    if ((definition.dataType === 'DECIMAL' || definition.dataType === 'INTEGER') && normalized === null) {
      throw appError('ATTRIBUTE_TYPE_MISMATCH', `مقدار ویژگی «${definition.nameFa}» باید عددی باشد.`, 400, { attributeDefinitionId: definition.id });
    }
    if (definition.dataType === 'INTEGER' && normalized !== null && !Number.isInteger(Number(normalized))) {
      throw appError('ATTRIBUTE_TYPE_MISMATCH', `مقدار ویژگی «${definition.nameFa}» باید عدد صحیح باشد.`, 400, { attributeDefinitionId: definition.id });
    }

    const min = binding.overrideMin ?? definition.minValue;
    const max = binding.overrideMax ?? definition.maxValue;
    if (normalized !== null && (definition.dataType === 'DECIMAL' || definition.dataType === 'INTEGER')) {
      const num = Number(normalized);
      if (min !== null && min !== undefined && num < min) {
        throw appError('ATTRIBUTE_OUT_OF_RANGE', `مقدار ویژگی «${definition.nameFa}» کمتر از حداقل مجاز (${min}) است.`, 400, { attributeDefinitionId: definition.id });
      }
      if (max !== null && max !== undefined && num > max) {
        throw appError('ATTRIBUTE_OUT_OF_RANGE', `مقدار ویژگی «${definition.nameFa}» بیشتر از حداکثر مجاز (${max}) است.`, 400, { attributeDefinitionId: definition.id });
      }
    }

    entries.push({
      attributeDefinitionId: definition.id,
      code: definition.code,
      nameFa: definition.nameFa,
      dataType: definition.dataType,
      rawValue: raw,
      normalized,
      storage,
      isIdentityRelevant: binding.isIdentityRelevant,
      isDisplayRelevant: binding.isDisplayRelevant,
      sortOrder: binding.sortOrder,
      unitLabel: null,
    });
  }
  return entries;
}

async function resolveTaxonomyChain(productType) {
  const category = await categoryRepo.findById(productType.categoryId);
  if (!category) throw appError('PRODUCT_CATEGORY_NOT_FOUND', 'دسته کالای این نوع کالا یافت نشد.', 500);
  const group = await groupRepo.findById(category.groupId);
  if (!group) throw appError('PRODUCT_GROUP_NOT_FOUND', 'گروه کالای این دسته یافت نشد.', 500);
  return { category, group };
}

async function assertUomsExist({ baseUomId, salesUomId, purchaseUomId }) {
  for (const id of [baseUomId, salesUomId, purchaseUomId].filter(Boolean)) {
    const uom = await uomRepo.findById(id);
    if (!uom) throw appError('UOM_NOT_FOUND', 'واحد اندازه‌گیری انتخاب‌شده یافت نشد.', 400, { uomId: id });
  }
}

/** Probable-duplicate heuristic within the same Product Type (warn-only, not DB-enforced). */
async function checkProbableDuplicate(productTypeId, generatedName, excludeProductId = null) {
  const siblings = await productRepo.search({ productTypeId, includeInactive: true, limit: 200 });
  const matches = siblings
    .filter((p) => p.id !== excludeProductId)
    .map((p) => ({ product: p, score: tokenOverlapSimilarity(generatedName, p.generatedName) }))
    .filter((r) => r.score >= PROBABLE_DUPLICATE_THRESHOLD)
    .sort((a, b) => b.score - a.score);
  return matches;
}

/**
 * All pre-write validation for Product creation (schema, taxonomy/brand/UOM
 * existence, weight profile shape, Attribute Engine rules, canonical
 * identity + exact/probable duplicate lookups) with NO database write.
 * Reused by createProduct AND by the Bulk Import DRY_RUN/APPLY pipeline —
 * DRY_RUN must run the exact same backend-authoritative checks a real create
 * would run so its preview is trustworthy, not a lighter-weight approximation
 * (jarian-security.mdc: backend must reject, not just the UI/preview).
 */
export async function prepareProductCreate(body) {
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های محصول نامعتبر است.');
  const data = parsed.data;

  const productType = await typeRepo.findById(data.productTypeId);
  if (!productType) throw appError('PRODUCT_TYPE_NOT_FOUND', 'نوع کالا یافت نشد.', 400);
  if (!productType.isActive) throw appError('PRODUCT_TYPE_INACTIVE', 'نمی‌توان برای نوع کالای غیرفعال، محصول جدید ساخت.', 409);

  if (data.brandId) {
    const brand = await brandRepo.findById(data.brandId);
    if (!brand) throw appError('BRAND_NOT_FOUND', 'برند انتخاب‌شده یافت نشد.', 400);
  }
  await assertUomsExist(data);
  validateWeightProfile(data.weightProfileType, data.weightProfileCoefficients);

  const attributeEntries = await validateAttributeValues(data.productTypeId, data.attributeValues);
  const canonicalIdentityKey = buildCanonicalIdentityKey(
    data.productTypeId,
    attributeEntries.filter((e) => e.isIdentityRelevant),
  );

  const exactDuplicate = await productRepo.findByCanonicalIdentityKey(canonicalIdentityKey);

  const generatedName = buildGeneratedName(
    productType.name,
    attributeEntries.filter((e) => e.isDisplayRelevant).map((e) => ({
      nameFa: e.nameFa, sortOrder: e.sortOrder, displayValue: e.rawValue, unitLabel: e.unitLabel,
    })),
  );

  const probable = exactDuplicate ? [] : await checkProbableDuplicate(data.productTypeId, generatedName);

  return { data, productType, attributeEntries, canonicalIdentityKey, generatedName, exactDuplicate, probable };
}

export async function createProduct(body, actorUserId) {
  const { data, productType, attributeEntries, canonicalIdentityKey, generatedName, exactDuplicate, probable } = await prepareProductCreate(body);

  if (exactDuplicate) {
    throw appError('PRODUCT_DUPLICATE_EXACT', 'محصولی با همین نوع کالا و مقادیر ویژگی‌های شناسایی‌کننده قبلاً ثبت شده است.', 409, {
      existingProductId: exactDuplicate.id,
      existingSku: exactDuplicate.sku,
    });
  }
  if (probable.length && !data.confirmDuplicate) {
    throw appError('PRODUCT_PROBABLE_DUPLICATE', 'محصولات مشابهی در همین نوع کالا یافت شد — در صورت تایید تمایز واقعی، دوباره با confirmDuplicate=true ارسال کنید.', 409, {
      probable: probable.slice(0, 5).map((r) => ({ id: r.product.id, sku: r.product.sku, generatedName: r.product.generatedName, score: r.score })),
    });
  }

  const { category, group } = await resolveTaxonomyChain(productType);

  try {
    return await withTransaction(async (client) => {
      const { sku } = await allocateSku(client, {
        groupCode: group.code, categoryCode: category.code, typeCode: productType.code, productTypeId: productType.id,
      });
      const id = newEntityId('prod');
      const row = await productRepo.create({
        id, sku, productTypeId: data.productTypeId, brandId: data.brandId || null,
        generatedName, displayNameOverride: data.displayNameOverride || null, canonicalIdentityKey,
        baseUomId: data.baseUomId || null, salesUomId: data.salesUomId || null, purchaseUomId: data.purchaseUomId || null,
        weightProfileType: data.weightProfileType, weightProfileCoefficients: data.weightProfileCoefficients,
        actorUserId,
      }, client);

      for (const entry of attributeEntries) {
        await productRepo.insertAttributeValue({
          id: newEntityId('pav'), productId: id, attributeDefinitionId: entry.attributeDefinitionId,
          valueText: entry.storage.valueText, valueNumber: entry.storage.valueNumber, valueBoolean: entry.storage.valueBoolean,
          normalizedValue: entry.normalized,
        }, client);
      }

      await writeAudit({
        actorUserId, action: 'product.create', entityType: 'product', entityId: id,
        detail: { sku, generatedName, duplicateOverride: probable.length > 0 },
      }, client);

      return { ...row, attributeValues: await productRepo.listAttributeValues(id, client) };
    });
  } catch (err) {
    if (err?.code === '23505' && String(err?.constraint || '').includes('canonical_identity')) {
      throw appError('PRODUCT_DUPLICATE_EXACT', 'محصولی با همین شناسه یکتای ساختاری هم‌زمان ثبت شد (رقابت همزمانی).', 409);
    }
    throw err;
  }
}

export async function getProduct(id) {
  const row = await productRepo.findById(id);
  if (!row) throw notFoundError('محصول یافت نشد.');
  const attributeValues = await productRepo.listAttributeValues(id);
  return { ...row, attributeValues };
}

/**
 * Resolve raw { code, value } attribute filter pairs into the repository's
 * { attributeDefinitionId, normalizedValue } shape — same normalization used
 * for identity/duplicate comparison, so a search for thickness=2 also
 * matches products stored as "2.0" / "۲" (product contract "PRODUCT SEARCH").
 * Unknown attribute codes are ignored (never thrown) — a stale/typo'd filter
 * degrades to "no match for that clause", not a 500/400.
 */
async function resolveAttributeFilters(rawPairs) {
  if (!rawPairs.length) return [];
  const codes = [...new Set(rawPairs.map((p) => p.code).filter(Boolean))];
  const allDefs = await attrRepo.list({ includeInactive: true });
  const defByCode = new Map(allDefs.map((d) => [d.code, d]));
  const resolved = [];
  for (const { code, value } of rawPairs) {
    const def = defByCode.get(code);
    if (!def || value === undefined || value === null || value === '') continue;
    const { normalized } = normalizeAttributeValue(def.dataType, value);
    if (normalized === null) continue;
    resolved.push({ attributeDefinitionId: def.id, normalizedValue: normalized });
  }
  return resolved;
}

export async function searchProducts(query = {}) {
  const filters = { ...query };
  const rawPairs = [];
  if (query.attributeCode && query.attributeValue !== undefined) {
    rawPairs.push({ code: query.attributeCode, value: query.attributeValue });
  }
  if (Array.isArray(query.attributeFilters)) {
    for (const f of query.attributeFilters) {
      if (f && f.code) rawPairs.push({ code: f.code, value: f.value });
    }
  }
  filters.attributeFilters = await resolveAttributeFilters(rawPairs);
  delete filters.attributeCode;
  delete filters.attributeValue;
  return productRepo.search(filters);
}

export async function updateProduct(id, body, actorUserId) {
  const existing = await getProduct(id);
  assertNoImmutableFieldMutation(body);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های ویرایش محصول نامعتبر است.');
  const data = parsed.data;

  if (data.brandId) {
    const brand = await brandRepo.findById(data.brandId);
    if (!brand) throw appError('BRAND_NOT_FOUND', 'برند انتخاب‌شده یافت نشد.', 400);
  }
  await assertUomsExist({ baseUomId: data.baseUomId, salesUomId: data.salesUomId, purchaseUomId: data.purchaseUomId });
  if (data.weightProfileType) {
    validateWeightProfile(data.weightProfileType, data.weightProfileCoefficients ?? existing.weightProfileCoefficients);
  }

  let canonicalIdentityKey = existing.canonicalIdentityKey;
  let generatedName = existing.generatedName;
  let attributeEntries = null;

  if (data.attributeValues) {
    const currentValues = Object.fromEntries(existing.attributeValues.map((v) => [
      v.attributeDefinitionId,
      v.dataType === 'BOOLEAN' ? v.valueBoolean : (v.valueNumber ?? v.valueText),
    ]));
    attributeEntries = await validateAttributeValues(existing.productTypeId, { ...currentValues, ...data.attributeValues });

    canonicalIdentityKey = buildCanonicalIdentityKey(existing.productTypeId, attributeEntries.filter((e) => e.isIdentityRelevant));
    if (canonicalIdentityKey !== existing.canonicalIdentityKey) {
      const clash = await productRepo.findByCanonicalIdentityKey(canonicalIdentityKey);
      if (clash && clash.id !== id) {
        throw appError('PRODUCT_DUPLICATE_EXACT', 'این تغییر باعث می‌شود محصول با محصول دیگری در ویژگی‌های شناسایی‌کننده یکسان شود.', 409, { existingProductId: clash.id });
      }
    }

    const productType = await typeRepo.findById(existing.productTypeId);
    generatedName = buildGeneratedName(
      productType.name,
      attributeEntries.filter((e) => e.isDisplayRelevant).map((e) => ({ nameFa: e.nameFa, sortOrder: e.sortOrder, displayValue: e.rawValue, unitLabel: e.unitLabel })),
    );

    if (generatedName !== existing.generatedName) {
      const probable = await checkProbableDuplicate(existing.productTypeId, generatedName, id);
      if (probable.length && !data.confirmDuplicate) {
        throw appError('PRODUCT_PROBABLE_DUPLICATE', 'این تغییر محصول را مشابه محصول دیگری می‌کند — برای تایید صریح confirmDuplicate=true ارسال کنید.', 409, {
          probable: probable.slice(0, 5).map((r) => ({ id: r.product.id, sku: r.product.sku, generatedName: r.product.generatedName, score: r.score })),
        });
      }
    }
  }

  return withTransaction(async (client) => {
    // Only forward keys the caller actually sent (including explicit null,
    // e.g. { brandId: null } to un-assign a Brand) — spreading a literal
    // object with all keys would turn "not provided" into "provided as
    // undefined" and lose that distinction before it reaches the repository.
    const patch = {};
    for (const key of ['brandId', 'displayNameOverride', 'baseUomId', 'salesUomId', 'purchaseUomId', 'weightProfileType', 'weightProfileCoefficients']) {
      if (Object.prototype.hasOwnProperty.call(data, key)) patch[key] = data[key];
    }
    const row = await productRepo.update(id, patch, actorUserId, client);

    if (canonicalIdentityKey !== existing.canonicalIdentityKey || generatedName !== existing.generatedName) {
      await client.query(
        `UPDATE products SET canonical_identity_key = $2, generated_name = $3 WHERE id = $1`,
        [id, canonicalIdentityKey, generatedName],
      );
    }

    if (attributeEntries) {
      for (const entry of attributeEntries) {
        await productRepo.insertAttributeValue({
          id: newEntityId('pav'), productId: id, attributeDefinitionId: entry.attributeDefinitionId,
          valueText: entry.storage.valueText, valueNumber: entry.storage.valueNumber, valueBoolean: entry.storage.valueBoolean,
          normalizedValue: entry.normalized,
        }, client);
      }
    }

    await writeAudit({ actorUserId, action: 'product.update', entityType: 'product', entityId: id, detail: { before: existing, patch: data } }, client);
    // Re-read within the SAME transaction/client — reading via the default
    // pool here would race the not-yet-committed UPDATE above.
    const fresh = await productRepo.findById(id, client);
    return { ...fresh, attributeValues: await productRepo.listAttributeValues(id, client) };
  });
}

export async function setLifecycle(id, status, actorUserId) {
  await getProduct(id);
  if (!['ACTIVE', 'INACTIVE'].includes(status)) throw validationError('وضعیت چرخه عمر نامعتبر است.');
  const row = await productRepo.setLifecycle(id, status, actorUserId);
  await writeAudit({ actorUserId, action: status === 'INACTIVE' ? 'product.deactivate' : 'product.activate', entityType: 'product', entityId: id, detail: { status } });
  return row;
}

export default { prepareProductCreate, createProduct, getProduct, searchProducts, updateProduct, setLifecycle };
