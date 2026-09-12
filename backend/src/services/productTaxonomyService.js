/**
 * Product Group / Category / Product Type taxonomy use-cases (Shirazeh,
 * DDL-24, DDL-24m, DDL-24n). Unused empty nodes may be hard-deleted so
 * mnemonic sku_code can be reused. In-use nodes stay historically resolvable
 * via deactivate. sku_code is mnemonic Latin (not the unused-for-SKU numeric
 * GG/CC/TT counters).
 */
import { z } from 'zod';
import { appError, fromZodError, notFoundError } from '../lib/errors.js';
import { withTransaction } from '../db/pool.js';
import { writeAudit, newEntityId } from '../lib/ids.js';
import { normalizeTextValue } from '../domain/productMaster/normalize.js';
import { allocateTaxonomyCode } from '../domain/productMaster/taxonomyCode.js';
import { pickSkuCode, skuCodeKey } from '../domain/productMaster/skuCode.js';
import { throwInUse } from '../domain/productMaster/deleteGuard.js';
import { assertPositiveUnitWeight } from '../domain/productMaster/offerSettings.js';
import { DISPLAY_NAME_LITERALS, normalizeDisplayNameRule } from '../domain/productMaster/displayNameRule.js';
import * as groupRepo from '../repositories/productGroupRepository.js';
import * as categoryRepo from '../repositories/productCategoryRepository.js';
import * as typeRepo from '../repositories/productTypeRepository.js';
import * as bindingRepo from '../repositories/productTypeAttributeRepository.js';
import * as productRepo from '../repositories/productRepository.js';
import * as uomRepo from '../repositories/uomRepository.js';
import * as productService from './productService.js';

const nameSchema = z.string().trim().min(1).max(120);
const latinNameSchema = z.string().trim().max(160);
const skuCodeSchema = z.string().trim().max(16);
const createGroupSchema = z.object({
  name: nameSchema,
  nameLatin: latinNameSchema.optional(),
  skuCode: skuCodeSchema.optional(),
  sortOrder: z.number().int().optional(),
});
const createCategorySchema = z.object({
  groupId: z.string().min(1),
  name: nameSchema,
  nameLatin: latinNameSchema.optional(),
  skuCode: skuCodeSchema.optional(),
  sortOrder: z.number().int().optional(),
});
const optionalUnitId = z.string().min(1).nullable().optional();
const optionalUnitWeight = z.preprocess(
  (v) => (v === '' || v === undefined ? undefined : v === null ? null : Number(v)),
  z.union([z.null(), z.number().positive()]).optional(),
);
const DISPLAY_NAME_LITERAL_IDS = DISPLAY_NAME_LITERALS.map((item) => item.id);
const displayNameTokenSchema = z.object({
  sourceType: z.enum(['group', 'category', 'type', 'attribute', 'literal']),
  attributeId: z.string().min(1).optional(),
  literalId: z.enum(['branch', 'sheet', 'dims', 'times', 'star']).optional(),
  includeLabel: z.boolean().optional().default(false),
  includeUnit: z.boolean().optional(),
  order: z.number().int().nonnegative().optional(),
}).superRefine((token, ctx) => {
  if (token.sourceType === 'attribute' && !token.attributeId) {
    ctx.addIssue({ code: 'custom', message: 'attributeId' });
  }
  if (token.sourceType === 'literal' && !DISPLAY_NAME_LITERAL_IDS.includes(token.literalId)) {
    ctx.addIssue({ code: 'custom', message: 'literalId' });
  }
});
const displayNameRuleSchema = z.object({
  separator: z.enum([' ', '-', '/', '·']).optional(),
  tokens: z.array(displayNameTokenSchema).max(40),
}).nullable();
const offerFields = {
  defaultCountUnitId: optionalUnitId,
  defaultSalesUnitId: optionalUnitId,
  defaultUnitWeight: optionalUnitWeight,
  customLengthAllowed: z.boolean().optional(),
};
const createTypeSchema = z.object({
  categoryId: z.string().min(1),
  name: nameSchema,
  nameLatin: latinNameSchema.optional(),
  skuCode: skuCodeSchema.optional(),
  sortOrder: z.number().int().optional(),
  allowedBrandIds: z.array(z.string()).optional(),
  ...offerFields,
});
const patchSchema = z.object({
  name: nameSchema.optional(),
  nameLatin: latinNameSchema.optional(),
  skuCode: skuCodeSchema.optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  allowedBrandIds: z.array(z.string()).optional(),
  displayNameRule: displayNameRuleSchema.optional(),
  ...offerFields,
}).refine((d) => Object.keys(d).length > 0, { message: 'empty patch' });
const patchGroupSchema = z.object({
  name: nameSchema.optional(),
  nameLatin: latinNameSchema.optional(),
  skuCode: skuCodeSchema.optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'empty patch' });
const patchCategorySchema = z.object({
  name: nameSchema.optional(),
  nameLatin: latinNameSchema.optional(),
  skuCode: skuCodeSchema.optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'empty patch' });

function takenKeys(rows, excludeId = null) {
  return new Set(
    rows.filter((row) => row.id !== excludeId && row.skuCode).map((row) => skuCodeKey(row.skuCode)),
  );
}

function takenCodes(rows) {
  return new Set(rows.map((row) => row.code).filter(Boolean));
}

async function assertTypeOfferUnits(data) {
  for (const id of [data.defaultCountUnitId, data.defaultSalesUnitId].filter(Boolean)) {
    const uom = await uomRepo.findById(id);
    if (!uom) throw appError('UOM_NOT_FOUND', 'واحد اندازه‌گیری انتخاب‌شده یافت نشد.', 400, { uomId: id });
  }
  if (Object.prototype.hasOwnProperty.call(data, 'defaultUnitWeight')) {
    assertPositiveUnitWeight(data.defaultUnitWeight);
  }
}

function pickOrFallback({ latinName, explicit, takenKeys: taken, fallback }) {
  try {
    return pickSkuCode({ latinName, explicit, takenKeys: taken });
  } catch (err) {
    if (err.code === 'SKU_CODE_SOURCE_MISSING' && fallback) {
      return pickSkuCode({ explicit: fallback, takenKeys: taken });
    }
    throw err;
  }
}

// ---- Groups ----

export async function listGroups({ includeInactive = true } = {}) {
  return groupRepo.list({ includeInactive });
}

export async function getGroup(id) {
  const row = await groupRepo.findById(id);
  if (!row) throw notFoundError('گروه کالا یافت نشد.');
  return row;
}

export async function createGroup(body, actorUserId) {
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های گروه کالا نامعتبر است.');
  const normalizedName = normalizeTextValue(parsed.data.name);

  const existing = await groupRepo.findByNormalizedName(normalizedName);
  if (existing) {
    throw appError('PRODUCT_GROUP_DUPLICATE', 'گروه کالایی با این نام قبلاً ثبت شده است.', 409, { existingId: existing.id });
  }

  return withTransaction(async (client) => {
    const siblings = await groupRepo.list({ includeInactive: true }, client);
    const code = await allocateTaxonomyCode(client, 'GROUP', takenCodes(siblings));
    const skuCode = pickOrFallback({
      latinName: parsed.data.nameLatin,
      explicit: parsed.data.skuCode,
      takenKeys: takenKeys(await groupRepo.listSkuCodes(client)),
      fallback: `G${code}`,
    });
    const id = newEntityId('pg');
    const row = await groupRepo.create({
      id,
      name: parsed.data.name,
      nameLatin: parsed.data.nameLatin || null,
      skuCode,
      normalizedName,
      code,
      sortOrder: parsed.data.sortOrder,
      actorUserId,
    }, client);
    await writeAudit({
      actorUserId, action: 'product_group.create', entityType: 'product_group', entityId: id,
      detail: { name: row.name, nameLatin: row.nameLatin, skuCode, code },
    }, client);
    return row;
  });
}

export async function updateGroup(id, body, actorUserId) {
  await getGroup(id);
  const parsed = patchGroupSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های گروه کالا نامعتبر است.');
  const patch = { ...parsed.data };
  if (patch.name) {
    patch.normalizedName = normalizeTextValue(patch.name);
    const existing = await groupRepo.findByNormalizedName(patch.normalizedName);
    if (existing && existing.id !== id) {
      throw appError('PRODUCT_GROUP_DUPLICATE', 'گروه کالایی با این نام قبلاً ثبت شده است.', 409, { existingId: existing.id });
    }
  }
  if (patch.skuCode) {
    patch.skuCode = pickSkuCode({
      explicit: patch.skuCode,
      takenKeys: takenKeys(await groupRepo.listSkuCodes(), id),
    });
  }
  return withTransaction(async (client) => {
    const before = await groupRepo.findById(id, client);
    const row = await groupRepo.update(id, patch, actorUserId, client);
    await writeAudit({
      actorUserId, action: 'product_group.update', entityType: 'product_group', entityId: id,
      detail: { before, after: row },
    }, client);
    return row;
  });
}

export async function deleteGroup(id, actorUserId) {
  await getGroup(id);
  const dependents = await categoryRepo.list({ groupId: id, includeInactive: true });
  if (dependents.length) {
    throwInUse({
      code: 'PRODUCT_GROUP_IN_USE',
      entityLabel: 'گروه',
      dependencyLabel: 'دسته',
      items: dependents.map((row) => ({ id: row.id, name: row.name, skuCode: row.skuCode })),
    });
  }
  return withTransaction(async (client) => {
    await writeAudit({
      actorUserId, action: 'product_group.delete', entityType: 'product_group', entityId: id,
      detail: { id },
    }, client);
    await groupRepo.remove(id, client);
    return { ok: true };
  });
}

// ---- Categories ----

export async function listCategories({ groupId = null, includeInactive = true } = {}) {
  return categoryRepo.list({ groupId, includeInactive });
}

export async function getCategory(id) {
  const row = await categoryRepo.findById(id);
  if (!row) throw notFoundError('دسته کالا یافت نشد.');
  return row;
}

export async function createCategory(body, actorUserId) {
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های دسته کالا نامعتبر است.');

  const group = await groupRepo.findById(parsed.data.groupId);
  if (!group) throw appError('PRODUCT_GROUP_NOT_FOUND', 'گروه کالای والد یافت نشد — دسته باید به گروه معتبری وصل باشد.', 400);
  if (!group.isActive) throw appError('PRODUCT_GROUP_INACTIVE', 'نمی‌توان زیر گروه غیرفعال، دسته جدید ساخت.', 409);

  const normalizedName = normalizeTextValue(parsed.data.name);
  const existing = await categoryRepo.findByNormalizedName(parsed.data.groupId, normalizedName);
  if (existing) {
    throw appError('PRODUCT_CATEGORY_DUPLICATE', 'این دسته کالا در همین گروه قبلاً ثبت شده است.', 409, { existingId: existing.id });
  }

  return withTransaction(async (client) => {
    const siblings = await categoryRepo.list({ groupId: parsed.data.groupId, includeInactive: true }, client);
    const code = await allocateTaxonomyCode(client, `CATEGORY:${parsed.data.groupId}`, takenCodes(siblings));
    const skuCode = pickOrFallback({
      latinName: parsed.data.nameLatin,
      explicit: parsed.data.skuCode,
      takenKeys: takenKeys(await categoryRepo.listSkuCodes(parsed.data.groupId, client)),
      fallback: `C${code}`,
    });
    const id = newEntityId('pc');
    const row = await categoryRepo.create({
      id,
      groupId: parsed.data.groupId,
      name: parsed.data.name,
      nameLatin: parsed.data.nameLatin || null,
      skuCode,
      normalizedName,
      code,
      sortOrder: parsed.data.sortOrder,
      actorUserId,
    }, client);
    await writeAudit({
      actorUserId, action: 'product_category.create', entityType: 'product_category', entityId: id,
      detail: { name: row.name, nameLatin: row.nameLatin, skuCode, groupId: row.groupId },
    }, client);
    return row;
  });
}

export async function updateCategory(id, body, actorUserId) {
  const current = await getCategory(id);
  const parsed = patchCategorySchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های دسته کالا نامعتبر است.');
  const patch = { ...parsed.data };
  if (patch.name) {
    patch.normalizedName = normalizeTextValue(patch.name);
    const existing = await categoryRepo.findByNormalizedName(current.groupId, patch.normalizedName);
    if (existing && existing.id !== id) {
      throw appError('PRODUCT_CATEGORY_DUPLICATE', 'این دسته کالا در همین گروه قبلاً ثبت شده است.', 409, { existingId: existing.id });
    }
  }
  if (patch.skuCode) {
    patch.skuCode = pickSkuCode({
      explicit: patch.skuCode,
      takenKeys: takenKeys(await categoryRepo.listSkuCodes(current.groupId), id),
    });
  }
  return withTransaction(async (client) => {
    const before = await categoryRepo.findById(id, client);
    const row = await categoryRepo.update(id, patch, actorUserId, client);
    await writeAudit({ actorUserId, action: 'product_category.update', entityType: 'product_category', entityId: id, detail: { before, after: row } }, client);
    return row;
  });
}

export async function deleteCategory(id, actorUserId) {
  await getCategory(id);
  const dependents = await typeRepo.list({ categoryId: id, includeInactive: true });
  if (dependents.length) {
    throwInUse({
      code: 'PRODUCT_CATEGORY_IN_USE',
      entityLabel: 'دسته',
      dependencyLabel: 'نوع کالا',
      items: dependents.map((row) => ({ id: row.id, name: row.name, skuCode: row.skuCode })),
    });
  }
  return withTransaction(async (client) => {
    await writeAudit({
      actorUserId, action: 'product_category.delete', entityType: 'product_category', entityId: id,
      detail: { id },
    }, client);
    await categoryRepo.remove(id, client);
    return { ok: true };
  });
}

// ---- Product Types ----

export async function listTypes({ categoryId = null, includeInactive = true } = {}) {
  return typeRepo.list({ categoryId, includeInactive });
}

export async function getType(id) {
  const row = await typeRepo.findById(id);
  if (!row) throw notFoundError('نوع کالا یافت نشد.');
  return row;
}

export async function createType(body, actorUserId) {
  const parsed = createTypeSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های نوع کالا نامعتبر است.');

  const category = await categoryRepo.findById(parsed.data.categoryId);
  if (!category) throw appError('PRODUCT_CATEGORY_NOT_FOUND', 'دسته کالای والد یافت نشد — نوع کالا باید به دسته معتبری وصل باشد.', 400);
  if (!category.isActive) throw appError('PRODUCT_CATEGORY_INACTIVE', 'نمی‌توان زیر دسته غیرفعال، نوع کالای جدید ساخت.', 409);

  const normalizedName = normalizeTextValue(parsed.data.name);
  const existing = await typeRepo.findByNormalizedName(parsed.data.categoryId, normalizedName);
  if (existing) {
    throw appError('PRODUCT_TYPE_DUPLICATE', 'این نوع کالا در همین دسته قبلاً ثبت شده است.', 409, { existingId: existing.id });
  }

  await assertTypeOfferUnits(parsed.data);

  return withTransaction(async (client) => {
    const siblings = await typeRepo.list({ categoryId: parsed.data.categoryId, includeInactive: true }, client);
    const code = await allocateTaxonomyCode(client, `TYPE:${parsed.data.categoryId}`, takenCodes(siblings));
    const skuCode = pickOrFallback({
      latinName: parsed.data.nameLatin,
      explicit: parsed.data.skuCode,
      takenKeys: takenKeys(await typeRepo.listSkuCodes(parsed.data.categoryId, client)),
      fallback: `T${code}`,
    });
    const id = newEntityId('pt');
    const row = await typeRepo.create({
      id,
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      nameLatin: parsed.data.nameLatin || null,
      skuCode,
      normalizedName,
      code,
      sortOrder: parsed.data.sortOrder,
      allowedBrandIds: parsed.data.allowedBrandIds,
      defaultCountUnitId: parsed.data.defaultCountUnitId,
      defaultSalesUnitId: parsed.data.defaultSalesUnitId,
      defaultUnitWeight: parsed.data.defaultUnitWeight ?? null,
      customLengthAllowed: parsed.data.customLengthAllowed,
      actorUserId,
    }, client);
    await writeAudit({
      actorUserId, action: 'product_type.create', entityType: 'product_type', entityId: id,
      detail: { name: row.name, nameLatin: row.nameLatin, skuCode, categoryId: row.categoryId },
    }, client);
    return row;
  });
}

export async function updateType(id, body, actorUserId) {
  const current = await getType(id);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های نوع کالا نامعتبر است.');
  const patch = { ...parsed.data };
  if (patch.name) {
    patch.normalizedName = normalizeTextValue(patch.name);
    const existing = await typeRepo.findByNormalizedName(current.categoryId, patch.normalizedName);
    if (existing && existing.id !== id) {
      throw appError('PRODUCT_TYPE_DUPLICATE', 'این نوع کالا در همین دسته قبلاً ثبت شده است.', 409, { existingId: existing.id });
    }
  }
  if (patch.skuCode) {
    patch.skuCode = pickSkuCode({
      explicit: patch.skuCode,
      takenKeys: takenKeys(await typeRepo.listSkuCodes(current.categoryId), id),
    });
  }
  await assertTypeOfferUnits(patch);
  if (Object.prototype.hasOwnProperty.call(patch, 'displayNameRule')) {
    patch.displayNameRule = normalizeDisplayNameRule(patch.displayNameRule);
  }
  const rewriteNames = Object.prototype.hasOwnProperty.call(parsed.data, 'displayNameRule');
  return withTransaction(async (client) => {
    const before = await typeRepo.findById(id, client);
    const row = await typeRepo.update(id, patch, actorUserId, client);
    if (rewriteNames) {
      await productService.refreshGeneratedNamesForType(id, actorUserId, { productType: row, client });
    }
    await writeAudit({ actorUserId, action: 'product_type.update', entityType: 'product_type', entityId: id, detail: { before, after: row } }, client);
    return row;
  });
}

export async function deleteType(id, actorUserId) {
  await getType(id);
  const dependents = await productRepo.listByProductType(id);
  if (dependents.length) {
    throwInUse({
      code: 'PRODUCT_TYPE_IN_USE',
      entityLabel: 'نوع کالا',
      dependencyLabel: 'کالا',
      items: dependents.map((row) => ({ id: row.id, name: row.name, sku: row.sku })),
    });
  }
  return withTransaction(async (client) => {
    await writeAudit({
      actorUserId, action: 'product_type.delete', entityType: 'product_type', entityId: id,
      detail: { id },
    }, client);
    await bindingRepo.deleteByProductType(id, client);
    await productRepo.deleteSkuCounter(id, client);
    await typeRepo.remove(id, client);
    return { ok: true };
  });
}

/** Full taxonomy tree for master-detail UI navigation. */
export async function getTaxonomyTree({ includeInactive = true } = {}) {
  const [groups, categories, types] = await Promise.all([
    groupRepo.list({ includeInactive }),
    categoryRepo.list({ includeInactive }),
    typeRepo.list({ includeInactive }),
  ]);
  return groups.map((group) => ({
    ...group,
    categories: categories
      .filter((c) => c.groupId === group.id)
      .map((category) => ({
        ...category,
        types: types.filter((t) => t.categoryId === category.id),
      })),
  }));
}

export default {
  listGroups, getGroup, createGroup, updateGroup, deleteGroup,
  listCategories, getCategory, createCategory, updateCategory, deleteCategory,
  listTypes, getType, createType, updateType, deleteType,
  getTaxonomyTree,
};
