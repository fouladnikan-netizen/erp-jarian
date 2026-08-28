/**
 * Attribute Definition + Product Type schema-binding use-cases (Shirazeh,
 * DDL-24). Controlled schema model — not EAV chaos.
 */
import { z } from 'zod';
import { appError, fromZodError, notFoundError } from '../lib/errors.js';
import { newEntityId, writeAudit } from '../lib/ids.js';
import * as attrRepo from '../repositories/attributeDefinitionRepository.js';
import * as bindingRepo from '../repositories/productTypeAttributeRepository.js';
import * as typeRepo from '../repositories/productTypeRepository.js';

const DATA_TYPES = ['STRING', 'DECIMAL', 'INTEGER', 'BOOLEAN', 'ENUM', 'DATE', 'REFERENCE'];

const createSchema = z.object({
  code: z.string().trim().min(1).max(60).regex(/^[a-z][a-z0-9_]*$/, { message: 'کد ویژگی باید حروف کوچک لاتین/عدد/زیرخط باشد.' }),
  nameFa: z.string().trim().min(1),
  description: z.string().optional(),
  dataType: z.enum(DATA_TYPES),
  uomId: z.string().optional(),
  allowedValues: z.array(z.object({ value: z.string(), labelFa: z.string() })).optional(),
  defaultValue: z.string().optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  precision: z.number().int().optional(),
  isSearchable: z.boolean().optional(),
  isFilterable: z.boolean().optional(),
  isReportable: z.boolean().optional(),
  isSortable: z.boolean().optional(),
}).refine((d) => (d.dataType !== 'ENUM' || (d.allowedValues && d.allowedValues.length > 0)), {
  message: 'ویژگی از نوع ENUM باید حداقل یک مقدار مجاز داشته باشد.',
});

const patchSchema = z.object({
  nameFa: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  uomId: z.string().optional(),
  allowedValues: z.array(z.object({ value: z.string(), labelFa: z.string() })).optional(),
  defaultValue: z.string().optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  precision: z.number().int().optional(),
  isSearchable: z.boolean().optional(),
  isFilterable: z.boolean().optional(),
  isReportable: z.boolean().optional(),
  isSortable: z.boolean().optional(),
  isActive: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'empty patch' });

const bindSchema = z.object({
  productTypeId: z.string().min(1),
  attributeDefinitionId: z.string().min(1),
  isRequired: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isIdentityRelevant: z.boolean().optional(),
  isDisplayRelevant: z.boolean().optional(),
  attributeRole: z.enum(['MASTER_ONLY', 'TRANSACTION_OVERRIDE_ALLOWED', 'TRANSACTION_ONLY']).optional(),
  overrideDefaultValue: z.string().optional(),
  overrideMin: z.number().optional(),
  overrideMax: z.number().optional(),
});

const patchBindingSchema = z.object({
  isRequired: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isIdentityRelevant: z.boolean().optional(),
  isDisplayRelevant: z.boolean().optional(),
  attributeRole: z.enum(['MASTER_ONLY', 'TRANSACTION_OVERRIDE_ALLOWED', 'TRANSACTION_ONLY']).optional(),
  overrideDefaultValue: z.string().optional(),
  overrideMin: z.number().optional(),
  overrideMax: z.number().optional(),
  isActive: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'empty patch' });

export async function listDefinitions({ includeInactive = true } = {}) {
  return attrRepo.list({ includeInactive });
}

export async function getDefinition(id) {
  const row = await attrRepo.findById(id);
  if (!row) throw notFoundError('تعریف ویژگی یافت نشد.');
  return row;
}

export async function createDefinition(body, actorUserId) {
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های تعریف ویژگی نامعتبر است.');
  const existing = await attrRepo.findByCode(parsed.data.code);
  if (existing) throw appError('ATTRIBUTE_DEFINITION_DUPLICATE', 'این کد ویژگی قبلاً ثبت شده است.', 409, { existingId: existing.id });
  const row = await attrRepo.create({ id: newEntityId('attr'), ...parsed.data, actorUserId });
  await writeAudit({ actorUserId, action: 'attribute_definition.create', entityType: 'attribute_definition', entityId: row.id, detail: { code: row.code, dataType: row.dataType } });
  return row;
}

export async function updateDefinition(id, body, actorUserId) {
  await getDefinition(id);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های تعریف ویژگی نامعتبر است.');
  const row = await attrRepo.update(id, parsed.data, actorUserId);
  await writeAudit({ actorUserId, action: 'attribute_definition.update', entityType: 'attribute_definition', entityId: id, detail: parsed.data });
  return row;
}

// ---- Product Type <-> Attribute schema binding ----

export async function getEffectiveSchema(productTypeId, { includeInactive = false } = {}) {
  const bindings = await bindingRepo.listByProductType(productTypeId, { includeInactive });
  const defs = await attrRepo.findByIds(bindings.map((b) => b.attributeDefinitionId));
  const defsById = new Map(defs.map((d) => [d.id, d]));
  return bindings
    .map((binding) => ({ binding, definition: defsById.get(binding.attributeDefinitionId) }))
    .filter((e) => e.definition)
    .sort((a, b) => a.binding.sortOrder - b.binding.sortOrder);
}

function assertTransactionOnlyNotIdentity(data) {
  // Contract P0: a TRANSACTION_ONLY attribute must never become part of
  // Product identity / SKU generation (DDL-24h).
  if (data.attributeRole === 'TRANSACTION_ONLY' && data.isIdentityRelevant) {
    throw appError(
      'ATTRIBUTE_TRANSACTION_ONLY_CANNOT_BE_IDENTITY',
      'ویژگی از نوع TRANSACTION_ONLY نمی‌تواند بخشی از هویت کالا (identityRelevant) باشد.',
      400,
    );
  }
}

export async function bindAttributeToType(body, actorUserId) {
  const parsed = bindSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های اتصال ویژگی به نوع کالا نامعتبر است.');
  assertTransactionOnlyNotIdentity(parsed.data);

  const [type, def] = await Promise.all([
    typeRepo.findById(parsed.data.productTypeId),
    attrRepo.findById(parsed.data.attributeDefinitionId),
  ]);
  if (!type) throw appError('PRODUCT_TYPE_NOT_FOUND', 'نوع کالا یافت نشد.', 400);
  if (!def) throw appError('ATTRIBUTE_DEFINITION_NOT_FOUND', 'تعریف ویژگی یافت نشد.', 400);

  const existing = await bindingRepo.findBinding(parsed.data.productTypeId, parsed.data.attributeDefinitionId);
  if (existing) throw appError('ATTRIBUTE_BINDING_DUPLICATE', 'این ویژگی قبلاً به این نوع کالا متصل شده است.', 409);

  const row = await bindingRepo.create({ id: newEntityId('pta'), ...parsed.data, actorUserId });
  await writeAudit({ actorUserId, action: 'product_type_attribute.create', entityType: 'product_type_attribute', entityId: row.id, detail: parsed.data });
  return row;
}

export async function updateBinding(id, body, actorUserId) {
  const existing = await bindingRepo.findById(id);
  if (!existing) throw notFoundError('اتصال ویژگی یافت نشد.');
  const parsed = patchBindingSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های ویرایش اتصال ویژگی نامعتبر است.');
  assertTransactionOnlyNotIdentity({
    attributeRole: parsed.data.attributeRole ?? existing.attributeRole,
    isIdentityRelevant: parsed.data.isIdentityRelevant ?? existing.isIdentityRelevant,
  });
  const row = await bindingRepo.update(id, parsed.data, actorUserId);
  await writeAudit({ actorUserId, action: 'product_type_attribute.update', entityType: 'product_type_attribute', entityId: id, detail: parsed.data });
  return row;
}

export default {
  listDefinitions, getDefinition, createDefinition, updateDefinition,
  getEffectiveSchema, bindAttributeToType, updateBinding,
};
