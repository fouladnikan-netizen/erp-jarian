/**
 * Attribute Definition + Product Type schema-binding use-cases (Shirazeh,
 * DDL-24). Controlled schema model — not EAV chaos.
 */
import { z } from 'zod';
import { appError, fromZodError, notFoundError } from '../../../lib/errors.js';
import { withTransaction } from '../../../db/pool.js';
import { newEntityId, writeAudit } from '../../../lib/ids.js';
import { pickSkuCode, skuCodeKey, buildProductIdentityKey } from '../domain/productMaster/productIdentityPolicy.js';
import {
  normalizeAttributeValue,
  prepareAttributeDefinitionInput,
  prepareAttributeDefinitionPatch,
} from '../domain/productMaster/normalize.js';
import {
  mapEnumOptionRenames,
  mappingHasRenames,
  remapEnumStoredValue,
} from '../domain/productMaster/enumOptionRename.js';
import {
  applyAttributeBindingPolicy,
  isTransactionScope,
  normalizeOverrideAllowedValues,
  normalizeOverrideDefaultValue,
  overrideListKey,
  reconcileOverrideAllowedValues,
  reconcileOverrideDefaultValue,
  remapOrphanEnumValue,
  resolveTypeAllowedValues,
} from '../domain/productMaster/attributeBindingPolicy.js';
import { assertUnused } from '../domain/productMaster/deleteGuard.js';
import * as attrRepo from '../infrastructure/attributeDefinitionRepository.js';
import * as bindingRepo from '../infrastructure/productTypeAttributeRepository.js';
import * as typeRepo from '../infrastructure/productTypeRepository.js';
import * as productRepo from '../infrastructure/productRepository.js';
import * as uomRepo from '../infrastructure/uomRepository.js';

const DATA_TYPES = ['STRING', 'DECIMAL', 'INTEGER', 'BOOLEAN', 'ENUM', 'DATE', 'REFERENCE'];
// INTEGER is accepted as an alias of DECIMAL (DDL-24o) and coerced in prepareAttributeDefinitionInput.

function isNumericAttributeType(dataType) {
  return dataType === 'DECIMAL' || dataType === 'INTEGER';
}

async function assertKnownUom(uomId) {
  if (!uomId) return;
  const uom = await uomRepo.findById(uomId);
  if (!uom) throw appError('UOM_NOT_FOUND', 'واحد اندازه‌گیری انتخاب‌شده یافت نشد.', 400, { uomId });
}

const createSchema = z.object({
  code: z.string().trim().min(1, 'کد لاتین ویژگی را وارد کنید (مثلاً size).').max(60).regex(/^[a-z][a-z0-9_]*$/, { message: 'کد ویژگی باید حروف کوچک لاتین، عدد یا زیرخط باشد (مثلاً size).' }),
  skuCode: z.string().trim().max(16).optional(),
  nameFa: z.string().trim().min(1, 'نام فارسی ویژگی را وارد کنید.'),
  description: z.string().optional(),
  dataType: z.enum(DATA_TYPES),
  uomId: z.string().min(1).nullable().optional(),
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
  message: 'برای ویژگی چندگزینه‌ای باید حداقل یک گزینه وارد کنید (مثلاً ST37، ST52).',
});

const patchSchema = z.object({
  code: z.string().trim().min(1, 'کد لاتین ویژگی را وارد کنید (مثلاً size).').max(60).regex(/^[a-z][a-z0-9_]*$/, { message: 'کد ویژگی باید حروف کوچک لاتین، عدد یا زیرخط باشد (مثلاً size).' }).optional(),
  skuCode: z.string().trim().max(16).optional(),
  nameFa: z.string().trim().min(1, 'نام فارسی ویژگی را وارد کنید.').optional(),
  description: z.string().optional(),
  dataType: z.enum(DATA_TYPES).optional(),
  uomId: z.string().min(1).nullable().optional(),
  allowedValues: z.array(z.object({ value: z.string(), labelFa: z.string() })).nullable().optional(),
  defaultValue: z.string().nullable().optional(),
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
  valueScope: z.enum(['PRODUCT', 'TRANSACTION']).optional(),
  attributeRole: z.enum(['MASTER_ONLY', 'TRANSACTION_OVERRIDE_ALLOWED', 'TRANSACTION_ONLY']).optional(),
  overrideDefaultValue: z.string().nullable().optional(),
  overrideMin: z.number().nullable().optional(),
  overrideMax: z.number().nullable().optional(),
  overrideAllowedValues: z.array(z.string()).nullable().optional(),
});

const patchBindingSchema = z.object({
  isRequired: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isIdentityRelevant: z.boolean().optional(),
  isDisplayRelevant: z.boolean().optional(),
  valueScope: z.enum(['PRODUCT', 'TRANSACTION']).optional(),
  attributeRole: z.enum(['MASTER_ONLY', 'TRANSACTION_OVERRIDE_ALLOWED', 'TRANSACTION_ONLY']).optional(),
  overrideDefaultValue: z.string().nullable().optional(),
  overrideMin: z.number().nullable().optional(),
  overrideMax: z.number().nullable().optional(),
  overrideAllowedValues: z.array(z.string()).nullable().optional(),
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
  const parsed = createSchema.safeParse(prepareAttributeDefinitionInput(body));
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const first = Object.values(flat.fieldErrors || {}).flat().find(Boolean)
      || (flat.formErrors || []).find(Boolean);
    throw fromZodError(parsed, first || 'داده‌های تعریف ویژگی نامعتبر است.');
  }
  const existing = await attrRepo.findByCode(parsed.data.code);
  if (existing) throw appError('ATTRIBUTE_DEFINITION_DUPLICATE', 'این کد ویژگی قبلاً ثبت شده است.', 409, { existingId: existing.id });
  const skuCode = pickSkuCode({
    latinName: parsed.data.code.replace(/_/g, ' '),
    explicit: parsed.data.skuCode,
    takenKeys: new Set((await attrRepo.listSkuCodes()).map((r) => skuCodeKey(r.skuCode))),
  });
  if (!isNumericAttributeType(parsed.data.dataType)) parsed.data.uomId = null;
  await assertKnownUom(parsed.data.uomId);
  const row = await attrRepo.create({ id: newEntityId('attr'), ...parsed.data, skuCode, actorUserId });
  await writeAudit({ actorUserId, action: 'attribute_definition.create', entityType: 'attribute_definition', entityId: row.id, detail: { code: row.code, skuCode, dataType: row.dataType } });
  return row;
}

function catalogValueSet(options) {
  return new Set((options || []).map((item) => String(item?.value ?? '').trim()).filter(Boolean));
}

async function planEnumOptionRename(definitionId, oldOptions, newOptions) {
  const mapping = mapEnumOptionRenames(oldOptions, newOptions);
  const newValues = catalogValueSet(newOptions);
  const stored = await productRepo.listTextValuesForDefinition(definitionId);
  const allowed = await productRepo.listAllowedValuesForDefinition(definitionId);
  const orphanIds = new Set();
  for (const row of stored) {
    if (remapEnumStoredValue(row.valueText, mapping, newValues) == null) orphanIds.add(row.productId);
  }
  for (const row of allowed) {
    if (remapEnumStoredValue(row.value, mapping, newValues) == null) orphanIds.add(row.productId);
  }
  if (orphanIds.size) {
    const products = await productRepo.listByAttributeDefinition(definitionId);
    assertUnused({
      code: 'ATTRIBUTE_ENUM_VALUE_IN_USE',
      entityLabel: 'گزینه فهرست',
      dependencyLabel: 'کالا',
      items: products.filter((item) => orphanIds.has(item.id)),
    });
  }
  return { mapping, newValues, stored, allowed };
}

async function persistEnumOptionRenames(definitionId, plan, actorUserId, client) {
  const remappedProductIds = new Set();
  for (const row of plan.stored) {
    const next = remapEnumStoredValue(row.valueText, plan.mapping, plan.newValues);
    if (!next || next === row.valueText) continue;
    const { normalized, storage } = normalizeAttributeValue('ENUM', next);
    await productRepo.insertAttributeValue({
      id: newEntityId('pav'),
      productId: row.productId,
      attributeDefinitionId: definitionId,
      valueText: storage.valueText,
      valueNumber: storage.valueNumber,
      valueBoolean: storage.valueBoolean,
      normalizedValue: normalized,
    }, client);
    remappedProductIds.add(row.productId);
  }

  const allowedByProduct = new Map();
  for (const row of plan.allowed) {
    const list = allowedByProduct.get(row.productId) || [];
    list.push(row.value);
    allowedByProduct.set(row.productId, list);
  }
  for (const [productId, values] of allowedByProduct) {
    const next = [...new Set(values
      .map((value) => remapEnumStoredValue(value, plan.mapping, plan.newValues))
      .filter(Boolean))];
    if (next.join('\0') === [...new Set(values)].join('\0')) continue;
    await productRepo.replaceAllowedAttributeValues(productId, definitionId, next, client);
    remappedProductIds.add(productId);
  }

  const bindings = await bindingRepo.listByAttributeDefinition(definitionId, client);
  for (const binding of bindings) {
    const patch = {};
    if (Array.isArray(binding.overrideAllowedValues) && binding.overrideAllowedValues.length) {
      const remapped = [...new Set(
        binding.overrideAllowedValues
          .map((value) => remapEnumStoredValue(value, plan.mapping, plan.newValues))
          .filter(Boolean),
      )];
      if (remapped.join('\0') !== binding.overrideAllowedValues.join('\0')) {
        patch.overrideAllowedValues = remapped.length ? remapped : null;
      }
    }
    if (binding.overrideDefaultValue) {
      const nextDefault = remapEnumStoredValue(binding.overrideDefaultValue, plan.mapping, plan.newValues);
      if (nextDefault !== binding.overrideDefaultValue) patch.overrideDefaultValue = nextDefault;
    }
    if (Object.keys(patch).length) {
      await bindingRepo.update(binding.id, patch, actorUserId, client);
    }
  }
  return [...remappedProductIds];
}

async function rebuildIdentityAfterEnumRename(productIds, actorUserId) {
  const typeIds = new Set();
  for (const productId of productIds) {
    const product = await productRepo.findById(productId);
    if (!product) continue;
    typeIds.add(product.productTypeId);
    const schema = await getEffectiveSchema(product.productTypeId);
    const values = await productRepo.listAttributeValues(productId);
    const byDef = new Map(values.map((row) => [row.attributeDefinitionId, row]));
    const identity = schema
      .filter((entry) => entry.binding?.isIdentityRelevant)
      .map((entry) => ({
        code: entry.definition.code,
        normalized: byDef.get(entry.definition.id)?.normalizedValue || '',
      }));
    const key = buildProductIdentityKey(product.productTypeId, identity);
    if (key === product.canonicalIdentityKey) continue;
    const clash = await productRepo.findByCanonicalIdentityKey(key);
    if (clash && clash.id !== product.id) {
      throw appError(
        'PRODUCT_DUPLICATE_EXACT',
        'تغییر گزینه‌های فهرست باعث یکی‌شدن هویت دو کالا می‌شود.',
        409,
        { existingProductId: clash.id },
      );
    }
    await productRepo.setCanonicalIdentityKey(product.id, key);
  }
  const { refreshGeneratedNamesForType } = await import('./productService.js');
  for (const typeId of typeIds) {
    await refreshGeneratedNamesForType(typeId, actorUserId);
  }
}

export async function updateDefinition(id, body, actorUserId) {
  const existing = await getDefinition(id);
  const parsed = patchSchema.safeParse(prepareAttributeDefinitionPatch(body));
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const first = Object.values(flat.fieldErrors || {}).flat().find(Boolean)
      || (flat.formErrors || []).find(Boolean);
    throw fromZodError(parsed, first || 'داده‌های تعریف ویژگی نامعتبر است.');
  }
  const patch = { ...parsed.data };
  if (Object.prototype.hasOwnProperty.call(patch, 'defaultValue') && !patch.defaultValue) {
    patch.defaultValue = null;
  }

  const nextType = patch.dataType ?? existing.dataType;
  if (!isNumericAttributeType(nextType) && patch.uomId === undefined) {
    patch.uomId = null;
  }
  await assertKnownUom(patch.uomId);
  if (nextType === 'ENUM') {
    const options = patch.allowedValues !== undefined ? patch.allowedValues : existing.allowedValues;
    if (!options?.length) {
      throw appError('ATTRIBUTE_ENUM_VALUES_REQUIRED', 'برای ویژگی چندگزینه‌ای باید حداقل یک گزینه وارد کنید (مثلاً ST37، ST52).', 400);
    }
  } else if (patch.dataType && patch.dataType !== 'ENUM' && existing.dataType === 'ENUM' && patch.allowedValues === undefined) {
    patch.allowedValues = null;
  }

  if (patch.code && patch.code !== existing.code) {
    const duplicate = await attrRepo.findByCode(patch.code);
    if (duplicate) throw appError('ATTRIBUTE_DEFINITION_DUPLICATE', 'این کد ویژگی قبلاً ثبت شده است.', 409, { existingId: duplicate.id });
  }

  const dataTypeChanging = Boolean(patch.dataType && patch.dataType !== existing.dataType);
  if (dataTypeChanging) {
    const usedProducts = await productRepo.listByAttributeDefinition(id);
    if (usedProducts.length) {
      throw appError(
        'ATTRIBUTE_DEFINITION_IN_USE',
        'این ویژگی در کالای ثبت‌شده استفاده شده است؛ نوع داده قابل تغییر نیست.',
        409,
        { count: usedProducts.length, items: usedProducts.slice(0, 20) },
      );
    }
  }

  const codeChanging = Boolean(patch.code && patch.code !== existing.code);
  const nameChanging = Boolean(patch.nameFa && patch.nameFa !== existing.nameFa);

  if (patch.skuCode) {
    patch.skuCode = pickSkuCode({
      explicit: patch.skuCode,
      takenKeys: new Set(
        (await attrRepo.listSkuCodes()).filter((r) => r.id !== id).map((r) => skuCodeKey(r.skuCode)),
      ),
    });
  }

  let enumRenamePlan = null;
  if (Array.isArray(patch.allowedValues) && (existing.dataType === 'ENUM' || nextType === 'ENUM')) {
    enumRenamePlan = await planEnumOptionRename(id, existing.allowedValues || [], patch.allowedValues);
    if (existing.defaultValue && !Object.prototype.hasOwnProperty.call(patch, 'defaultValue')) {
      const nextDefault = remapEnumStoredValue(existing.defaultValue, enumRenamePlan.mapping, enumRenamePlan.newValues);
      if (nextDefault && nextDefault !== existing.defaultValue) patch.defaultValue = nextDefault;
    }
  }

  const row = await withTransaction(async (client) => {
    const updated = await attrRepo.update(id, patch, actorUserId, client);
    if (enumRenamePlan && mappingHasRenames(enumRenamePlan.mapping)) {
      await persistEnumOptionRenames(id, enumRenamePlan, actorUserId, client);
    }
    await writeAudit({
      actorUserId, action: 'attribute_definition.update', entityType: 'attribute_definition', entityId: id,
      detail: parsed.data,
    }, client);
    return updated;
  });

  if (enumRenamePlan) {
    const remappedIds = (enumRenamePlan.stored || [])
      .filter((item) => {
        const next = remapEnumStoredValue(item.valueText, enumRenamePlan.mapping, enumRenamePlan.newValues);
        return next && next !== item.valueText;
      })
      .map((item) => item.productId);
    if (remappedIds.length) await rebuildIdentityAfterEnumRename([...new Set(remappedIds)], actorUserId);
  }
  if (codeChanging) {
    const used = await productRepo.listByAttributeDefinition(id);
    if (used.length) await rebuildIdentityAfterEnumRename(used.map((item) => item.id), actorUserId);
  }
  if (enumRenamePlan || codeChanging || nameChanging) {
    const { refreshGeneratedNamesForType } = await import('./productService.js');
    const boundTypes = await bindingRepo.listTypesByAttributeDefinition(id);
    for (const type of boundTypes) {
      await refreshGeneratedNamesForType(type.id, actorUserId);
    }
  }
  return row;
}

export async function deleteDefinition(id, actorUserId) {
  await getDefinition(id);
  await bindingRepo.removeInactiveByAttributeDefinition(id);
  const boundTypes = await bindingRepo.listTypesByAttributeDefinition(id);
  assertUnused({
    code: 'ATTRIBUTE_DEFINITION_IN_USE',
    entityLabel: 'ویژگی',
    dependencyLabel: 'نوع کالا',
    items: boundTypes,
  });
  const usedProducts = await productRepo.listByAttributeDefinition(id);
  assertUnused({
    code: 'ATTRIBUTE_DEFINITION_IN_USE',
    entityLabel: 'ویژگی',
    dependencyLabel: 'کالا',
    verb: 'استفاده',
    items: usedProducts,
  });
  return withTransaction(async (client) => {
    await writeAudit({
      actorUserId, action: 'attribute_definition.delete', entityType: 'attribute_definition', entityId: id,
      detail: { id },
    }, client);
    await attrRepo.remove(id, client);
    return { ok: true };
  });
}

// ---- Product Type <-> Attribute schema binding ----

function withEffectiveAllowedValues(binding, definition) {
  if (definition.dataType !== 'ENUM') return binding;
  const overrideAllowedValues = reconcileOverrideAllowedValues(
    definition,
    binding.overrideAllowedValues,
  );
  let overrideDefaultValue = binding.overrideDefaultValue;
  if (binding.overrideDefaultValue) {
    try {
      overrideDefaultValue = reconcileOverrideDefaultValue(
        definition,
        binding.overrideDefaultValue,
        overrideAllowedValues,
      );
    } catch {
      overrideDefaultValue = null;
    }
  }
  return {
    ...binding,
    overrideAllowedValues,
    overrideDefaultValue,
    effectiveAllowedValues: resolveTypeAllowedValues(definition.allowedValues, overrideAllowedValues),
  };
}

function enumOverrideHealPatch(definition, binding) {
  if (definition?.dataType !== 'ENUM') return null;
  const patch = {};
  const nextOverride = reconcileOverrideAllowedValues(definition, binding.overrideAllowedValues);
  if (overrideListKey(nextOverride) !== overrideListKey(binding.overrideAllowedValues)) {
    patch.overrideAllowedValues = nextOverride;
  }
  const allowed = Object.prototype.hasOwnProperty.call(patch, 'overrideAllowedValues')
    ? patch.overrideAllowedValues
    : binding.overrideAllowedValues;
  const nextDefault = reconcileOverrideDefaultValue(definition, binding.overrideDefaultValue, allowed);
  if (nextDefault !== undefined && nextDefault !== binding.overrideDefaultValue) {
    patch.overrideDefaultValue = nextDefault;
  }
  return Object.keys(patch).length ? patch : null;
}

export async function getEffectiveSchema(productTypeId, { includeInactive = false } = {}) {
  const bindings = await bindingRepo.listByProductType(productTypeId, { includeInactive });
  const defs = await attrRepo.findByIds(bindings.map((b) => b.attributeDefinitionId));
  const defsById = new Map(defs.map((d) => [d.id, d]));
  return bindings
    .map((binding) => {
      const definition = defsById.get(binding.attributeDefinitionId);
      if (!definition) return null;
      return { binding: withEffectiveAllowedValues(binding, definition), definition };
    })
    .filter(Boolean)
    .sort((a, b) => a.binding.sortOrder - b.binding.sortOrder);
}

export async function bindAttributeToType(body, actorUserId) {
  const parsed = bindSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های اتصال ویژگی به نوع کالا نامعتبر است.');

  const [type, def] = await Promise.all([
    typeRepo.findById(parsed.data.productTypeId),
    attrRepo.findById(parsed.data.attributeDefinitionId),
  ]);
  if (!type) throw appError('PRODUCT_TYPE_NOT_FOUND', 'نوع کالا یافت نشد.', 400);
  if (!def) throw appError('ATTRIBUTE_DEFINITION_NOT_FOUND', 'تعریف ویژگی یافت نشد.', 400);

  const existing = await bindingRepo.findBinding(parsed.data.productTypeId, parsed.data.attributeDefinitionId);
  const policy = applyAttributeBindingPolicy({ ...parsed.data, dataType: def.dataType });
  if (Object.prototype.hasOwnProperty.call(parsed.data, 'overrideAllowedValues')) {
    policy.overrideAllowedValues = normalizeOverrideAllowedValues(def, parsed.data.overrideAllowedValues);
  }
  if (Object.prototype.hasOwnProperty.call(parsed.data, 'overrideDefaultValue')) {
    policy.overrideDefaultValue = normalizeOverrideDefaultValue(
      def,
      parsed.data.overrideDefaultValue,
      policy.overrideAllowedValues !== undefined ? policy.overrideAllowedValues : parsed.data.overrideAllowedValues,
    );
  }
  if (existing) {
    if (existing.isActive) {
      throw appError('ATTRIBUTE_BINDING_DUPLICATE', 'این ویژگی قبلاً به این نوع کالا متصل شده است.', 409);
    }
    const row = await bindingRepo.update(existing.id, { ...policy, isActive: true }, actorUserId);
    await writeAudit({ actorUserId, action: 'product_type_attribute.update', entityType: 'product_type_attribute', entityId: row.id, detail: { ...policy, reactivated: true } });
    return row;
  }

  const row = await bindingRepo.create({ id: newEntityId('pta'), ...policy, actorUserId });
  await writeAudit({ actorUserId, action: 'product_type_attribute.create', entityType: 'product_type_attribute', entityId: row.id, detail: policy });
  return row;
}

export async function updateBinding(id, body, actorUserId) {
  const existing = await bindingRepo.findById(id);
  if (!existing) throw notFoundError('اتصال ویژگی یافت نشد.');
  const parsed = patchBindingSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های ویرایش اتصال ویژگی نامعتبر است.');
  const def = await attrRepo.findById(existing.attributeDefinitionId);
  const policy = applyAttributeBindingPolicy({ ...parsed.data, dataType: def?.dataType }, existing);
  const allowedChanged = Object.prototype.hasOwnProperty.call(parsed.data, 'overrideAllowedValues');
  const defaultChanged = Object.prototype.hasOwnProperty.call(parsed.data, 'overrideDefaultValue');
  if (allowedChanged) {
    policy.overrideAllowedValues = normalizeOverrideAllowedValues(def, parsed.data.overrideAllowedValues);
  } else {
    const heal = enumOverrideHealPatch(def, existing);
    if (heal?.overrideAllowedValues !== undefined) {
      policy.overrideAllowedValues = heal.overrideAllowedValues;
    }
  }
  const allowedOverride = policy.overrideAllowedValues !== undefined
    ? policy.overrideAllowedValues
    : existing.overrideAllowedValues;
  if (defaultChanged) {
    policy.overrideDefaultValue = reconcileOverrideDefaultValue(
      def,
      parsed.data.overrideDefaultValue,
      allowedOverride,
    );
  } else {
    const kept = reconcileOverrideDefaultValue(def, existing.overrideDefaultValue, allowedOverride);
    if (kept !== existing.overrideDefaultValue) policy.overrideDefaultValue = kept;
  }
  const row = await bindingRepo.update(id, policy, actorUserId);
  await writeAudit({ actorUserId, action: 'product_type_attribute.update', entityType: 'product_type_attribute', entityId: id, detail: policy });
  const defaultCleared = defaultChanged
    && (policy.overrideDefaultValue == null || policy.overrideDefaultValue === '')
    && Boolean(existing.overrideDefaultValue);
  const optionalProduct = def
    && !isTransactionScope({ ...existing, ...policy })
    && !(policy.isRequired ?? existing.isRequired)
    && !(policy.isIdentityRelevant ?? existing.isIdentityRelevant);
  if (defaultCleared && optionalProduct) {
    const { stripStoredOptionalDefault } = await import('./productService.js');
    await stripStoredOptionalDefault({
      productTypeId: existing.productTypeId,
      attributeDefinitionId: existing.attributeDefinitionId,
      previousValue: existing.overrideDefaultValue,
      actorUserId,
    });
  } else if (Object.prototype.hasOwnProperty.call(policy, 'overrideDefaultValue')) {
    const { refreshGeneratedNamesForType } = await import('./productService.js');
    await refreshGeneratedNamesForType(existing.productTypeId, actorUserId);
  }
  return row;
}

export async function deleteBinding(id, actorUserId) {
  const existing = await bindingRepo.findById(id);
  if (!existing) throw notFoundError('اتصال ویژگی یافت نشد.');
  const usedProducts = await productRepo.listByTypeAndAttributeDefinition(
    existing.productTypeId,
    existing.attributeDefinitionId,
  );
  assertUnused({
    code: 'ATTRIBUTE_BINDING_IN_USE',
    entityLabel: 'اتصال ویژگی',
    dependencyLabel: 'کالا',
    verb: 'استفاده',
    items: usedProducts,
  });
  return withTransaction(async (client) => {
    await writeAudit({
      actorUserId,
      action: 'product_type_attribute.delete',
      entityType: 'product_type_attribute',
      entityId: id,
      detail: {
        id,
        productTypeId: existing.productTypeId,
        attributeDefinitionId: existing.attributeDefinitionId,
      },
    }, client);
    await bindingRepo.remove(id, client);
    return { ok: true };
  });
}

/**
 * Persist remapped Type ENUM subsets/defaults left behind when a catalog
 * was rewritten in Persian without enum-option rename. Idempotent.
 */
export async function healOrphanEnumBindingOverrides(actorUserId) {
  const defs = await attrRepo.list({ includeInactive: true });
  const healed = [];
  const remappedProductIds = new Set();
  for (const def of defs) {
    if (def.dataType !== 'ENUM') continue;
    const bindings = await bindingRepo.listByAttributeDefinition(def.id);
    for (const binding of bindings) {
      const patch = enumOverrideHealPatch(def, binding);
      if (!patch) continue;
      await bindingRepo.update(binding.id, patch, actorUserId);
      await writeAudit({
        actorUserId,
        action: 'product_type_attribute.update',
        entityType: 'product_type_attribute',
        entityId: binding.id,
        detail: { ...patch, healedOrphanEnum: true },
      });
      healed.push({
        bindingId: binding.id,
        productTypeId: binding.productTypeId,
        code: def.code,
        ...patch,
      });
    }

    const stored = await productRepo.listTextValuesForDefinition(def.id);
    for (const row of stored) {
      const next = remapOrphanEnumValue(def, row.valueText);
      if (!next || next === row.valueText) continue;
      const { normalized, storage } = normalizeAttributeValue('ENUM', next);
      await productRepo.insertAttributeValue({
        id: newEntityId('pav'),
        productId: row.productId,
        attributeDefinitionId: def.id,
        valueText: storage.valueText,
        valueNumber: storage.valueNumber,
        valueBoolean: storage.valueBoolean,
        normalizedValue: normalized,
      });
      remappedProductIds.add(row.productId);
    }

    const allowed = await productRepo.listAllowedValuesForDefinition(def.id);
    const allowedByProduct = new Map();
    for (const row of allowed) {
      const list = allowedByProduct.get(row.productId) || [];
      list.push(row.value);
      allowedByProduct.set(row.productId, list);
    }
    for (const [productId, values] of allowedByProduct) {
      const next = [...new Set(values
        .map((value) => remapOrphanEnumValue(def, value))
        .filter(Boolean))];
      if (next.join('\0') === [...new Set(values)].join('\0')) continue;
      await productRepo.replaceAllowedAttributeValues(productId, def.id, next);
      remappedProductIds.add(productId);
    }
  }
  if (remappedProductIds.size) {
    await rebuildIdentityAfterEnumRename([...remappedProductIds], actorUserId);
  }
  const typeIds = [...new Set(healed.map((item) => item.productTypeId))];
  if (typeIds.length) {
    const { refreshGeneratedNamesForType } = await import('./productService.js');
    for (const typeId of typeIds) {
      await refreshGeneratedNamesForType(typeId, actorUserId);
    }
  }
  return { healed: healed.length, remappedProducts: remappedProductIds.size, items: healed };
}

export default {
  listDefinitions, getDefinition, createDefinition, updateDefinition, deleteDefinition,
  getEffectiveSchema, bindAttributeToType, updateBinding, deleteBinding,
  healOrphanEnumBindingOverrides,
};
