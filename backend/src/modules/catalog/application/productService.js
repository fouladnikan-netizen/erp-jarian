/**
 * Product / SKU use-cases (Vitrin, DDL-24). Backend-authoritative: SKU
 * generation, canonical identity/duplicate blocking, schema validation,
 * generated name, lifecycle integrity all enforced here — never solely on
 * the frontend (jarian-security.mdc / product contract "API/SERVICE
 * BOUNDARIES").
 */
import { z } from 'zod';
import { appError, fromZodError, notFoundError, validationError } from '../../../lib/errors.js';
import { withTransaction } from '../../../db/pool.js';
import { newEntityId, writeAudit } from '../../../lib/ids.js';
import { normalizeAttributeValue, tokenOverlapSimilarity, isNumericAttributeType } from '../domain/productMaster/normalize.js';
import { buildGeneratedName, resolveEnumDisplayValue } from '../domain/productMaster/nameGenerator.js';
import {
  buildDisplayNameFromRule,
  hasDisplayNameRule,
} from '../domain/productMaster/displayNameRule.js';
import {
  allocateProductSku,
  assertSkuImmutable,
  buildProductIdentityKey,
} from '../domain/productMaster/productIdentityPolicy.js';
import { validateWeightProfile } from '../domain/productMaster/weightProfile.js';
import { assertUnused } from '../domain/productMaster/deleteGuard.js';
import { isAllowedSubsetEnum, resolveTypeAllowedValues, liveAttributeValuesByCode, resolveBindingDefault } from '../domain/productMaster/allowedAttributeValues.js';
import { applyNpsInchSizeDisplay } from '../domain/productMaster/npsInchDisplay.js';
import { applySheetLengthDisplay, isSheetLengthApplicable, isSheetLengthAttribute } from '../domain/productMaster/sheetMillLength.js';
import { isTransactionScope, shouldPersistMissingBindingValue } from '../domain/productMaster/attributeBindingPolicy.js';
import {
  aliasProductOfferInput, applyTypeOfferDefaults, assertPositiveUnitWeight,
} from '../domain/productMaster/offerSettings.js';
import * as productRepo from '../infrastructure/productRepository.js';
import * as typeRepo from '../infrastructure/productTypeRepository.js';
import * as categoryRepo from '../infrastructure/productCategoryRepository.js';
import * as groupRepo from '../infrastructure/productGroupRepository.js';
import * as brandRepo from '../infrastructure/brandRepository.js';
import * as uomRepo from '../infrastructure/uomRepository.js';
import * as attrRepo from '../infrastructure/attributeDefinitionRepository.js';
import { findOrdersReferencingProduct } from '../../sales/public/orderProductReferences.js';
import * as attributeDefinitionService from './attributeDefinitionService.js';
import {
  attributeValueRecord,
  weightCoefficientRecord,
} from '../../shared/schemas/jsonRecord.js';

const PROBABLE_DUPLICATE_THRESHOLD = 0.82;

async function assertBrandAssignable(productType, brandId) {
  if (!brandId) return;
  const brand = await brandRepo.findById(brandId);
  if (!brand) throw appError('BRAND_NOT_FOUND', 'برند انتخاب‌شده یافت نشد.', 400);
  const allowed = productType.allowedBrandIds || [];
  if (allowed.length && !allowed.includes(brand.id)) {
    throw appError(
      'BRAND_NOT_ALLOWED_FOR_TYPE',
      'این برند برای این نوع کالا مجاز نیست.',
      400,
      { productTypeId: productType.id, brandId: brand.id },
    );
  }
}

const optionalUnitWeight = z.preprocess(
  (v) => (v === '' || v === undefined ? undefined : v === null ? null : Number(v)),
  z.union([z.null(), z.number().positive()]).optional(),
);

const createSchema = z.object({
  productTypeId: z.string().min(1),
  brandId: z.string().nullable().optional(),
  displayNameOverride: z.string().trim().max(200).nullable().optional(),
  attributeValues: attributeValueRecord.optional().default({}),
  allowedAttributeValues: z.record(z.string(), z.array(z.string())).optional().default({}),
  baseUomId: z.string().nullable().optional(),
  salesUomId: z.string().nullable().optional(),
  purchaseUomId: z.string().nullable().optional(),
  countUnitId: z.string().nullable().optional(),
  salesUnitId: z.string().nullable().optional(),
  unitWeight: optionalUnitWeight,
  customLengthAllowed: z.boolean().optional(),
  weightProfileType: z.enum(['FIXED', 'PER_LENGTH', 'DIMENSIONAL', 'MANUAL_ACTUAL']).optional().default('MANUAL_ACTUAL'),
  weightProfileCoefficients: weightCoefficientRecord.optional().default({}),
  confirmDuplicate: z.boolean().optional().default(false),
});

const updateSchema = z.object({
  brandId: z.string().nullable().optional(),
  displayNameOverride: z.string().trim().max(200).nullable().optional(),
  attributeValues: attributeValueRecord.optional(),
  allowedAttributeValues: z.record(z.string(), z.array(z.string())).optional(),
  baseUomId: z.string().nullable().optional(),
  salesUomId: z.string().nullable().optional(),
  purchaseUomId: z.string().nullable().optional(),
  countUnitId: z.string().nullable().optional(),
  salesUnitId: z.string().nullable().optional(),
  unitWeight: optionalUnitWeight,
  customLengthAllowed: z.boolean().optional(),
  weightProfileType: z.enum(['FIXED', 'PER_LENGTH', 'DIMENSIONAL', 'MANUAL_ACTUAL']).optional(),
  weightProfileCoefficients: weightCoefficientRecord.optional(),
  confirmDuplicate: z.boolean().optional().default(false),
}).refine((d) => Object.keys(d).length > 0, { message: 'empty patch' });

// SKU immutability is defined once in productIdentityPolicy (DDL-24m / DDL-24i).

/**
 * Validate raw attribute values against a Product Type's Attribute Schema
 * (product contract "PRODUCT TYPE + ATTRIBUTE SCHEMA"). Rejects unknown
 * attributes, missing required ones, out-of-range/out-of-enum values, and
 * TRANSACTION-scoped attributes supplied at the master level (they must never
 * generate/alter a Product — DDL-24d / DDL-46). Required is enforced only for
 * PRODUCT-scoped bindings.
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
    if (isTransactionScope(binding) && rawValues?.[definition.id] !== undefined) {
      throw appError(
        'TRANSACTION_ONLY_ATTRIBUTE_ON_MASTER',
        `ویژگی «${definition.nameFa}» در سطح تراکنش است و نباید در محصول مرجع ثبت شود.`,
        400,
        { attributeDefinitionId: definition.id },
      );
    }

    const hasValue = rawValues?.[definition.id] !== undefined && rawValues?.[definition.id] !== null && rawValues?.[definition.id] !== '';
    if (!hasValue) {
      if (!shouldPersistMissingBindingValue(binding)) continue;
      const fallback = binding.overrideDefaultValue ?? definition.defaultValue;
      if (fallback !== undefined && fallback !== null && fallback !== '') {
        rawValues = { ...rawValues, [definition.id]: fallback };
      } else {
        throw appError('ATTRIBUTE_REQUIRED', `ویژگی «${definition.nameFa}» برای این نوع کالا الزامی است.`, 400, { attributeDefinitionId: definition.id });
      }
    }

    const raw = rawValues[definition.id];
    let displayValue = raw;
    if (definition.dataType === 'ENUM') {
      const allowedItems = binding.effectiveAllowedValues
        || resolveTypeAllowedValues(definition.allowedValues, binding.overrideAllowedValues);
      const allowed = allowedItems.map((v) => v.value);
      if (!allowed.includes(String(raw))) {
        throw appError('ATTRIBUTE_ENUM_INVALID', `مقدار ویژگی «${definition.nameFa}» باید یکی از مقادیر مجاز همین نوع کالا باشد.`, 400, { attributeDefinitionId: definition.id, allowed });
      }
      displayValue = resolveEnumDisplayValue(allowedItems, raw);
    }

    const { normalized, storage } = normalizeAttributeValue(definition.dataType, raw);
    if (isNumericAttributeType(definition.dataType) && normalized === null) {
      throw appError('ATTRIBUTE_TYPE_MISMATCH', `مقدار ویژگی «${definition.nameFa}» باید عددی باشد.`, 400, { attributeDefinitionId: definition.id });
    }

    const min = binding.overrideMin ?? definition.minValue;
    const max = binding.overrideMax ?? definition.maxValue;
    if (normalized !== null && isNumericAttributeType(definition.dataType)) {
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
      displayValue,
      normalized,
      storage,
      isRequired: Boolean(binding.isRequired),
      isIdentityRelevant: Boolean(binding.isIdentityRelevant),
      isDisplayRelevant: true,
      sortOrder: binding.sortOrder,
      unitLabel: null,
    });
  }
  return entries;
}

function attachAllowedAttributeValues(product, rows) {
  const allowedAttributeValues = {};
  const allowedAttributeGroups = [];
  const groupsById = new Map();
  for (const row of rows) {
    if (!allowedAttributeValues[row.attributeDefinitionId]) {
      allowedAttributeValues[row.attributeDefinitionId] = [];
    }
    allowedAttributeValues[row.attributeDefinitionId].push(row.value);
    if (!groupsById.has(row.attributeDefinitionId)) {
      const group = {
        attributeDefinitionId: row.attributeDefinitionId,
        attributeCode: row.attributeCode,
        attributeNameFa: row.attributeNameFa,
        values: [],
      };
      groupsById.set(row.attributeDefinitionId, group);
      allowedAttributeGroups.push(group);
    }
    groupsById.get(row.attributeDefinitionId).values.push(row.value);
  }
  return { ...product, allowedAttributeValues, allowedAttributeGroups };
}

async function withAllowedAttributeValues(product, client = null) {
  const rows = await productRepo.listAllowedAttributeValues(product.id, client);
  return attachAllowedAttributeValues(product, rows);
}

async function withAllowedAttributeValuesMany(products, client = null) {
  if (!products.length) return products;
  const rows = await productRepo.listAllowedAttributeValuesForProducts(products.map((p) => p.id), client);
  const byProduct = new Map();
  for (const row of rows) {
    if (!byProduct.has(row.productId)) byProduct.set(row.productId, []);
    byProduct.get(row.productId).push(row);
  }
  return products.map((p) => attachAllowedAttributeValues(p, byProduct.get(p.id) || []));
}

async function withAttributeValuesMany(products, client = null) {
  if (!products.length) return products;
  const rows = await productRepo.listAttributeValuesForProducts(products.map((p) => p.id), client);
  const byProduct = new Map();
  for (const row of rows) {
    if (!byProduct.has(row.productId)) byProduct.set(row.productId, []);
    byProduct.get(row.productId).push(row);
  }
  return products.map((p) => ({ ...p, attributeValues: byProduct.get(p.id) || [] }));
}

async function persistAllowedAttributeEntries(productId, allowedEntries, client) {
  for (const entry of allowedEntries) {
    await productRepo.replaceAllowedAttributeValues(productId, entry.attributeDefinitionId, entry.values, client);
  }
}

/**
 * Product-level ENUM subset (DDL-45). Not identity. Not a master value.
 * Required ENUM stays a single product_attribute_values row.
 */
async function validateAllowedAttributeValues(productTypeId, rawMap) {
  const schema = await attributeDefinitionService.getEffectiveSchema(productTypeId);
  const schemaByDefId = new Map(schema.map((e) => [e.definition.id, e]));
  const entries = [];

  for (const key of Object.keys(rawMap || {})) {
    const schemaEntry = schemaByDefId.get(key);
    if (!schemaEntry) {
      throw appError('UNKNOWN_ATTRIBUTE', `ویژگی «${key}» برای این نوع کالا تعریف نشده است.`, 400, { attributeDefinitionId: key });
    }
    const { definition, binding } = schemaEntry;
    if (definition.dataType !== 'ENUM') {
      throw appError(
        'ALLOWED_ATTRIBUTE_NOT_ENUM',
        `فهرست مجاز فقط برای ویژگی‌های فهرستی قابل ثبت است.`,
        400,
        { attributeDefinitionId: key },
      );
    }
    if (!isAllowedSubsetEnum(definition, binding)) {
      throw appError(
        'ALLOWED_ATTRIBUTE_IDENTITY_FORBIDDEN',
        `ویژگی الزامی «${definition.nameFa}» بخشی از هویت کالا است و نمی‌تواند فهرست چندمقداری داشته باشد.`,
        400,
        { attributeDefinitionId: key },
      );
    }
    const catalog = (definition.allowedValues || []).map((v) => v.value);
    const seen = new Set();
    const values = [];
    for (const raw of rawMap[key] || []) {
      const value = String(raw ?? '').trim();
      if (!value || seen.has(value)) continue;
      if (!catalog.includes(value)) {
        throw appError(
          'ATTRIBUTE_ENUM_INVALID',
          `مقدار ویژگی «${definition.nameFa}» باید یکی از مقادیر مجاز باشد.`,
          400,
          { attributeDefinitionId: key, allowed: catalog },
        );
      }
      seen.add(value);
      values.push(value);
    }
    entries.push({ attributeDefinitionId: key, values });
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

function legacyGeneratedName(productTypeName, attributeEntries) {
  return buildGeneratedName(
    productTypeName,
    attributeEntries.map((e) => ({
      nameFa: e.nameFa,
      sortOrder: e.sortOrder,
      displayValue: e.displayValue,
      unitLabel: e.unitLabel,
      omitName: e.code === 'kind' || e.code === 'ral',
    })),
  );
}

function storedDisplayValue(row) {
  if (!row) return '';
  if (row.dataType === 'BOOLEAN') {
    if (row.valueBoolean === true) return 'true';
    if (row.valueBoolean === false) return 'false';
    return '';
  }
  if (row.valueNumber !== undefined && row.valueNumber !== null && row.valueNumber !== '') {
    return String(row.valueNumber);
  }
  return row.valueText ? String(row.valueText) : '';
}

function storedValueMap(attributeValues) {
  const map = new Map();
  for (const row of attributeValues || []) {
    map.set(row.attributeDefinitionId, storedDisplayValue(row));
  }
  return map;
}

function displayValueForBinding(definition, binding, liveValue, liveByCode) {
  if (isSheetLengthAttribute(definition) && !isSheetLengthApplicable(liveByCode)) return '';
  const raw = (liveValue !== undefined && liveValue !== null && liveValue !== '')
    ? liveValue
    : resolveBindingDefault(definition, binding, { liveByCode });
  if (raw === undefined || raw === null || raw === '') return '';
  if (definition.dataType === 'ENUM') {
    const allowedItems = binding.effectiveAllowedValues
      || resolveTypeAllowedValues(definition.allowedValues, binding.overrideAllowedValues);
    return resolveEnumDisplayValue(allowedItems, raw);
  }
  return String(raw);
}

async function loadNameContext(productType) {
  const { group, category } = await resolveTaxonomyChain(productType);
  const schema = await attributeDefinitionService.getEffectiveSchema(productType.id);
  const uomIds = [...new Set(schema.map((entry) => entry.definition.uomId).filter(Boolean))];
  const uoms = await Promise.all(uomIds.map((id) => uomRepo.findById(id)));
  const uomById = new Map(uoms.filter(Boolean).map((uom) => [uom.id, uom]));
  return { type: productType, group, category, schema, uomById };
}

function generatedNameFromContext(ctx, liveByDefinitionId) {
  const liveByCode = liveAttributeValuesByCode(ctx.schema, liveByDefinitionId);
  const attributeEntries = ctx.schema.map(({ definition, binding }) => {
    const uom = definition.uomId ? ctx.uomById.get(definition.uomId) : null;
    const nps = applyNpsInchSizeDisplay({
      typeName: ctx.type.name,
      code: definition.code,
      displayValue: displayValueForBinding(
        definition,
        binding,
        liveByDefinitionId.get(definition.id),
        liveByCode,
      ),
      unitLabel: uom?.nameFa || null,
    });
    const named = applySheetLengthDisplay({
      code: definition.code,
      displayValue: nps.displayValue,
      unitLabel: nps.unitLabel,
    });
    return {
      attributeDefinitionId: definition.id,
      nameFa: definition.nameFa,
      sortOrder: binding.sortOrder,
      displayValue: named.displayValue,
      unitLabel: named.unitLabel,
      code: definition.code,
      omitName: definition.code === 'kind' || definition.code === 'ral',
    };
  });
  if (!hasDisplayNameRule(ctx.type.displayNameRule)) {
    return legacyGeneratedName(ctx.type.name, attributeEntries);
  }
  const attributes = {};
  for (const entry of attributeEntries) {
    attributes[entry.attributeDefinitionId] = {
      nameFa: entry.nameFa,
      displayValue: entry.displayValue,
      unitLabel: entry.unitLabel,
      omitName: entry.omitName,
    };
  }
  return buildDisplayNameFromRule(ctx.type.displayNameRule, {
    sources: { group: ctx.group.name, category: ctx.category.name, type: ctx.type.name },
    attributes,
  }) || ctx.type.name;
}

async function resolveGeneratedName(productType, attributeEntries) {
  const ctx = await loadNameContext(productType);
  const liveByDefinitionId = new Map(
    (attributeEntries || []).map((entry) => [entry.attributeDefinitionId, entry.displayValue]),
  );
  return generatedNameFromContext(ctx, liveByDefinitionId);
}

async function applyLiveGeneratedNames(products) {
  if (!products.length) return products;
  const ctxByType = new Map();
  for (const productTypeId of new Set(products.map((item) => item.productTypeId))) {
    const type = await typeRepo.findById(productTypeId);
    if (!type) continue;
    ctxByType.set(productTypeId, await loadNameContext(type));
  }
  return products.map((product) => {
    const ctx = ctxByType.get(product.productTypeId);
    if (!ctx) return product;
    try {
      const generatedName = generatedNameFromContext(ctx, storedValueMap(product.attributeValues));
      return generatedName ? { ...product, generatedName } : product;
    } catch {
      return product;
    }
  });
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
  const parsed = createSchema.safeParse(aliasProductOfferInput(body));
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های محصول نامعتبر است.');

  const productType = await typeRepo.findById(parsed.data.productTypeId);
  if (!productType) throw appError('PRODUCT_TYPE_NOT_FOUND', 'نوع کالا یافت نشد.', 400);
  if (!productType.isActive) throw appError('PRODUCT_TYPE_INACTIVE', 'نمی‌توان برای نوع کالای غیرفعال، محصول جدید ساخت.', 409);

  const offer = applyTypeOfferDefaults(productType, parsed.data);
  const data = {
    ...parsed.data,
    baseUomId: offer.baseUomId,
    salesUomId: offer.salesUomId,
    unitWeight: assertPositiveUnitWeight(offer.unitWeight),
    customLengthAllowed: offer.customLengthAllowed,
  };

  await assertBrandAssignable(productType, data.brandId);
  await assertUomsExist(data);
  validateWeightProfile(data.weightProfileType, data.weightProfileCoefficients);

  const attributeEntries = await validateAttributeValues(data.productTypeId, data.attributeValues);
  const allowedEntries = await validateAllowedAttributeValues(data.productTypeId, data.allowedAttributeValues);
  const canonicalIdentityKey = buildProductIdentityKey(
    data.productTypeId,
    attributeEntries.filter((e) => e.isIdentityRelevant),
  );

  const exactDuplicate = await productRepo.findByCanonicalIdentityKey(canonicalIdentityKey);

  const generatedName = await resolveGeneratedName(productType, attributeEntries);

  const probable = exactDuplicate ? [] : await checkProbableDuplicate(data.productTypeId, generatedName);

  return { data, productType, attributeEntries, allowedEntries, canonicalIdentityKey, generatedName, exactDuplicate, probable };
}

export async function createProduct(body, actorUserId) {
  const { data, productType, attributeEntries, allowedEntries, canonicalIdentityKey, generatedName, exactDuplicate, probable } = await prepareProductCreate(body);

  if (exactDuplicate) {
    return getProduct(exactDuplicate.id);
  }
  if (probable.length && !data.confirmDuplicate) {
    throw appError('PRODUCT_PROBABLE_DUPLICATE', 'محصولات مشابهی در همین نوع کالا یافت شد — در صورت تایید تمایز واقعی، دوباره با confirmDuplicate=true ارسال کنید.', 409, {
      probable: probable.slice(0, 5).map((r) => ({ id: r.product.id, generatedName: r.product.generatedName, score: r.score })),
    });
  }

  const { category, group } = await resolveTaxonomyChain(productType);

  try {
    return await withTransaction(async (client) => {
      const { sku } = allocateProductSku({
        groupSkuCode: group.skuCode,
        categorySkuCode: category.skuCode,
        typeSkuCode: productType.skuCode,
        identityEntries: attributeEntries,
      });
      const id = newEntityId('prod');
      const row = await productRepo.create({
        id, sku, productTypeId: data.productTypeId, brandId: data.brandId || null,
        generatedName, displayNameOverride: data.displayNameOverride || null, canonicalIdentityKey,
        baseUomId: data.baseUomId || null, salesUomId: data.salesUomId || null, purchaseUomId: data.purchaseUomId || null,
        unitWeight: data.unitWeight, customLengthAllowed: data.customLengthAllowed,
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

      await persistAllowedAttributeEntries(id, allowedEntries, client);

      await writeAudit({
        actorUserId, action: 'product.create', entityType: 'product', entityId: id,
        detail: { sku, generatedName, duplicateOverride: probable.length > 0 },
      }, client);

      const created = { ...row, attributeValues: await productRepo.listAttributeValues(id, client) };
      const [presented] = await applyLiveGeneratedNames([created]);
      return withAllowedAttributeValues(presented, client);
    });
  } catch (err) {
    if (err?.code === '23505' && String(err?.constraint || '').includes('canonical_identity')) {
      throw appError('PRODUCT_DUPLICATE_EXACT', 'محصولی با همین شناسه یکتای ساختاری هم‌زمان ثبت شد (رقابت همزمانی).', 409);
    }
    if (err?.code === '23505' && String(err?.constraint || '').includes('sku')) {
      throw appError('PRODUCT_SKU_DUPLICATE', 'شناسه کالای SKU تکراری است.', 409);
    }
    throw err;
  }
}

export async function getProduct(id) {
  const row = await productRepo.findById(id);
  if (!row) throw notFoundError('محصول یافت نشد.');
  const attributeValues = await productRepo.listAttributeValues(id);
  const [presented] = await applyLiveGeneratedNames([{ ...row, attributeValues }]);
  return withAllowedAttributeValues(presented);
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
  const items = await withAttributeValuesMany(await productRepo.search(filters));
  return withAllowedAttributeValuesMany(await applyLiveGeneratedNames(items));
}

export async function updateProduct(id, body, actorUserId) {
  const existing = await getProduct(id);
  assertSkuImmutable(body);
  const parsed = updateSchema.safeParse(aliasProductOfferInput(body));
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های ویرایش محصول نامعتبر است.');
  const data = parsed.data;
  if (Object.prototype.hasOwnProperty.call(data, 'countUnitId') && !Object.prototype.hasOwnProperty.call(data, 'baseUomId')) {
    data.baseUomId = data.countUnitId;
  }
  if (Object.prototype.hasOwnProperty.call(data, 'salesUnitId') && !Object.prototype.hasOwnProperty.call(data, 'salesUomId')) {
    data.salesUomId = data.salesUnitId;
  }
  if (Object.prototype.hasOwnProperty.call(data, 'unitWeight')) {
    data.unitWeight = assertPositiveUnitWeight(data.unitWeight);
  }

  if (data.brandId) {
    const productType = await typeRepo.findById(existing.productTypeId);
    await assertBrandAssignable(productType, data.brandId);
  }
  await assertUomsExist({ baseUomId: data.baseUomId, salesUomId: data.salesUomId, purchaseUomId: data.purchaseUomId });
  if (data.weightProfileType) {
    validateWeightProfile(data.weightProfileType, data.weightProfileCoefficients ?? existing.weightProfileCoefficients);
  }

  let canonicalIdentityKey = existing.canonicalIdentityKey;
  let generatedName = existing.generatedName;
  let attributeEntries = null;
  let allowedEntries = null;

  if (data.attributeValues) {
    const currentValues = Object.fromEntries(existing.attributeValues.map((v) => [
      v.attributeDefinitionId,
      v.dataType === 'BOOLEAN' ? v.valueBoolean : (v.valueNumber ?? v.valueText),
    ]));
    attributeEntries = await validateAttributeValues(existing.productTypeId, { ...currentValues, ...data.attributeValues });

    canonicalIdentityKey = buildProductIdentityKey(existing.productTypeId, attributeEntries.filter((e) => e.isIdentityRelevant));
    if (canonicalIdentityKey !== existing.canonicalIdentityKey) {
      const clash = await productRepo.findByCanonicalIdentityKey(canonicalIdentityKey);
      if (clash && clash.id !== id) {
        throw appError('PRODUCT_DUPLICATE_EXACT', 'این تغییر باعث می‌شود محصول با محصول دیگری در ویژگی‌های شناسایی‌کننده یکسان شود.', 409, { existingProductId: clash.id });
      }
    }

    const productType = await typeRepo.findById(existing.productTypeId);
    generatedName = await resolveGeneratedName(productType, attributeEntries);

    if (generatedName !== existing.generatedName) {
      const probable = await checkProbableDuplicate(existing.productTypeId, generatedName, id);
      if (probable.length && !data.confirmDuplicate) {
        throw appError('PRODUCT_PROBABLE_DUPLICATE', 'این تغییر محصول را مشابه محصول دیگری می‌کند — برای تایید صریح confirmDuplicate=true ارسال کنید.', 409, {
          probable: probable.slice(0, 5).map((r) => ({ id: r.product.id, generatedName: r.product.generatedName, score: r.score })),
        });
      }
    }
  }

  if (data.allowedAttributeValues) {
    allowedEntries = await validateAllowedAttributeValues(existing.productTypeId, data.allowedAttributeValues);
  }

  return withTransaction(async (client) => {
    // Only forward keys the caller actually sent (including explicit null,
    // e.g. { brandId: null } to un-assign a Brand) — spreading a literal
    // object with all keys would turn "not provided" into "provided as
    // undefined" and lose that distinction before it reaches the repository.
    const patch = {};
    for (const key of ['brandId', 'displayNameOverride', 'baseUomId', 'salesUomId', 'purchaseUomId', 'unitWeight', 'customLengthAllowed', 'weightProfileType', 'weightProfileCoefficients']) {
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

    if (allowedEntries) {
      await persistAllowedAttributeEntries(id, allowedEntries, client);
    }

    await writeAudit({ actorUserId, action: 'product.update', entityType: 'product', entityId: id, detail: { before: existing, patch: data } }, client);
    // Re-read within the SAME transaction/client — reading via the default
    // pool here would race the not-yet-committed UPDATE above.
    const fresh = await productRepo.findById(id, client);
    const withAttrs = { ...fresh, attributeValues: await productRepo.listAttributeValues(id, client) };
    const [presented] = await applyLiveGeneratedNames([withAttrs]);
    return withAllowedAttributeValues(presented, client);
  });
}

export async function setLifecycle(id, status, actorUserId) {
  await getProduct(id);
  if (!['ACTIVE', 'INACTIVE'].includes(status)) throw validationError('وضعیت چرخه عمر نامعتبر است.');
  const row = await productRepo.setLifecycle(id, status, actorUserId);
  await writeAudit({ actorUserId, action: status === 'INACTIVE' ? 'product.deactivate' : 'product.activate', entityType: 'product', entityId: id, detail: { status } });
  return row;
}

export async function deleteProduct(id, actorUserId) {
  const product = await getProduct(id);
  const orders = await findOrdersReferencingProduct({ productId: id, sku: product.sku });
  assertUnused({
    code: 'PRODUCT_IN_USE',
    entityLabel: 'کالا',
    dependencyLabel: 'سفارش',
    verb: 'فراخوانده',
    items: orders,
  });
  return withTransaction(async (client) => {
    await writeAudit({
      actorUserId, action: 'product.delete', entityType: 'product', entityId: id,
      detail: { sku: product.sku },
    }, client);
    await productRepo.remove(id, client);
    return { ok: true };
  });
}

/**
 * Recompute stored generated_name from the Type display-name rule.
 * SKU and canonical identity are not touched (DDL-52).
 */
export async function refreshGeneratedNamesForType(productTypeId, actorUserId, { productType = null, client = null } = {}) {
  const type = productType || await typeRepo.findById(productTypeId, client);
  if (!type) return { updated: 0 };
  const products = await withAttributeValuesMany(
    await productRepo.search({ productTypeId, includeInactive: true, limit: 500 }, client),
    client,
  );
  let updated = 0;
  for (const product of products) {
    const rawValues = Object.fromEntries((product.attributeValues || []).map((row) => [
      row.attributeDefinitionId,
      row.dataType === 'BOOLEAN' ? row.valueBoolean : (row.valueNumber ?? row.valueText),
    ]));
    let entries;
    try {
      entries = await validateAttributeValues(productTypeId, rawValues);
    } catch {
      continue;
    }
    const generatedName = await resolveGeneratedName(type, entries);
    if (!generatedName || generatedName === product.generatedName) continue;
    await productRepo.setGeneratedName(product.id, generatedName, client);
    await writeAudit({
      actorUserId,
      action: 'product.generated_name.refresh',
      entityType: 'product',
      entityId: product.id,
      detail: { before: product.generatedName, after: generatedName, productTypeId },
    }, client);
    updated += 1;
  }
  return { updated };
}

/**
 * Optional PRODUCT defaults are display-only (DDL-55). Clearing the Type
 * tick must drop leftover stored values that were auto-filled from that default.
 */
export async function stripStoredOptionalDefault({
  productTypeId, attributeDefinitionId, previousValue, actorUserId,
}) {
  const value = String(previousValue ?? '').trim();
  if (!productTypeId || !attributeDefinitionId || !value) return { deleted: 0, updated: 0 };
  const deleted = await productRepo.deleteAttributeValuesMatching({
    productTypeId,
    attributeDefinitionId,
    valueText: value,
  });
  const { updated } = await refreshGeneratedNamesForType(productTypeId, actorUserId);
  return { deleted, updated };
}

export default {
  prepareProductCreate, createProduct, getProduct, searchProducts, updateProduct,
  setLifecycle, deleteProduct, refreshGeneratedNamesForType, stripStoredOptionalDefault,
};
