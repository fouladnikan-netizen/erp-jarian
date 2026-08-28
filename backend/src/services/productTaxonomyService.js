/**
 * Product Group / Category / Product Type taxonomy use-cases (Shirazeh,
 * DDL-24). Deactivation only — no hard delete; historical Products keep
 * referencing a deactivated node (no FK-breaking, no cascade).
 */
import { z } from 'zod';
import { appError, fromZodError, notFoundError } from '../lib/errors.js';
import { withTransaction } from '../db/pool.js';
import { writeAudit, newEntityId } from '../lib/ids.js';
import { normalizeTextValue } from '../domain/productMaster/normalize.js';
import { allocateTaxonomyCode } from '../domain/productMaster/taxonomyCode.js';
import * as groupRepo from '../repositories/productGroupRepository.js';
import * as categoryRepo from '../repositories/productCategoryRepository.js';
import * as typeRepo from '../repositories/productTypeRepository.js';

const nameSchema = z.string().trim().min(1).max(120);
const createGroupSchema = z.object({ name: nameSchema, sortOrder: z.number().int().optional() });
const createCategorySchema = z.object({ groupId: z.string().min(1), name: nameSchema, sortOrder: z.number().int().optional() });
const createTypeSchema = z.object({
  categoryId: z.string().min(1),
  name: nameSchema,
  sortOrder: z.number().int().optional(),
  allowedBrandIds: z.array(z.string()).optional(),
});
const patchSchema = z.object({
  name: nameSchema.optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  allowedBrandIds: z.array(z.string()).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'empty patch' });

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
    const code = await allocateTaxonomyCode(client, 'GROUP');
    const id = newEntityId('pg');
    const row = await groupRepo.create({
      id, name: parsed.data.name, normalizedName, code, sortOrder: parsed.data.sortOrder, actorUserId,
    }, client);
    await writeAudit({ actorUserId, action: 'product_group.create', entityType: 'product_group', entityId: id, detail: { name: row.name, code } }, client);
    return row;
  });
}

export async function updateGroup(id, body, actorUserId) {
  await getGroup(id);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های گروه کالا نامعتبر است.');
  const patch = { ...parsed.data };
  if (patch.name) patch.normalizedName = normalizeTextValue(patch.name);
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
    const code = await allocateTaxonomyCode(client, `CATEGORY:${parsed.data.groupId}`);
    const id = newEntityId('pc');
    const row = await categoryRepo.create({
      id, groupId: parsed.data.groupId, name: parsed.data.name, normalizedName, code,
      sortOrder: parsed.data.sortOrder, actorUserId,
    }, client);
    await writeAudit({ actorUserId, action: 'product_category.create', entityType: 'product_category', entityId: id, detail: { name: row.name, groupId: row.groupId } }, client);
    return row;
  });
}

export async function updateCategory(id, body, actorUserId) {
  await getCategory(id);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های دسته کالا نامعتبر است.');
  const patch = { ...parsed.data };
  if (patch.name) patch.normalizedName = normalizeTextValue(patch.name);
  return withTransaction(async (client) => {
    const before = await categoryRepo.findById(id, client);
    const row = await categoryRepo.update(id, patch, actorUserId, client);
    await writeAudit({ actorUserId, action: 'product_category.update', entityType: 'product_category', entityId: id, detail: { before, after: row } }, client);
    return row;
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

  return withTransaction(async (client) => {
    const code = await allocateTaxonomyCode(client, `TYPE:${parsed.data.categoryId}`);
    const id = newEntityId('pt');
    const row = await typeRepo.create({
      id, categoryId: parsed.data.categoryId, name: parsed.data.name, normalizedName, code,
      sortOrder: parsed.data.sortOrder, allowedBrandIds: parsed.data.allowedBrandIds, actorUserId,
    }, client);
    await writeAudit({ actorUserId, action: 'product_type.create', entityType: 'product_type', entityId: id, detail: { name: row.name, categoryId: row.categoryId } }, client);
    return row;
  });
}

export async function updateType(id, body, actorUserId) {
  await getType(id);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های نوع کالا نامعتبر است.');
  const patch = { ...parsed.data };
  if (patch.name) patch.normalizedName = normalizeTextValue(patch.name);
  return withTransaction(async (client) => {
    const before = await typeRepo.findById(id, client);
    const row = await typeRepo.update(id, patch, actorUserId, client);
    await writeAudit({ actorUserId, action: 'product_type.update', entityType: 'product_type', entityId: id, detail: { before, after: row } }, client);
    return row;
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
  listGroups, getGroup, createGroup, updateGroup,
  listCategories, getCategory, createCategory, updateCategory,
  listTypes, getType, createType, updateType,
  getTaxonomyTree,
};
