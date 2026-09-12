/**
 * Schema-binding policy (DDL-46 / DDL-49 / DDL-50).
 * Required PRODUCT attributes must be DECIMAL/INTEGER or ENUM (not free text).
 * Identity is backend-derived: PRODUCT numeric attributes, plus required
 * PRODUCT ENUM. TRANSACTION can be required (order-time) but never identity.
 * Client isIdentityRelevant is ignored.
 */
import { appError } from '../../lib/errors.js';

export const VALUE_SCOPES = ['PRODUCT', 'TRANSACTION'];

export function isTransactionScope(binding = {}) {
  if (binding.valueScope) return binding.valueScope === 'TRANSACTION';
  return binding.attributeRole === 'TRANSACTION_ONLY';
}

export function isProductScope(binding = {}) {
  return !isTransactionScope(binding);
}

/** Optional PRODUCT / TRANSACTION defaults are display-only (DDL-55). */
export function shouldPersistMissingBindingValue(binding = {}) {
  if (isTransactionScope(binding)) return false;
  return Boolean(binding.isRequired);
}

/**
 * Effective ENUM options for a Product Type binding (DDL-46).
 * Null/empty override inherits the definition catalog. Catalog order is kept.
 */
export function resolveTypeAllowedValues(catalog, overrideValues) {
  const items = Array.isArray(catalog) ? catalog : [];
  if (!Array.isArray(overrideValues) || overrideValues.length === 0) return items;
  const allowed = new Set(overrideValues.map((v) => String(v)));
  return items.filter((item) => allowed.has(item.value));
}

/**
 * Latin leftovers after a catalog was rewritten in Persian without going
 * through enum-option rename (kind: mill/pressed, hardness_400, …).
 * Only applied when the source is absent from this definition's catalog
 * and the alias is present — so supply_form `mill` stays `mill`.
 */
export const ENUM_STORED_VALUE_ALIASES = Object.freeze({
  pressed: 'پرسی',
  mill: 'فابریک',
  roll: 'رول',
  cut: 'شیت برش خورده',
  light: 'سبک',
  heavy: 'سنگین',
  hardness_400: 'سختی ۴۰۰',
  hardness_450: 'سختی ۴۵۰',
  hardness_500: 'سختی ۵۰۰',
});

function catalogValues(definition) {
  return (definition?.allowedValues || []).map((item) => String(item.value));
}

export function remapOrphanEnumValue(definition, raw) {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  const catalog = catalogValues(definition);
  if (catalog.includes(value)) return value;
  const alias = ENUM_STORED_VALUE_ALIASES[value];
  if (alias && catalog.includes(alias)) return alias;
  return null;
}

export function overrideListKey(values) {
  if (!Array.isArray(values) || values.length === 0) return '';
  return [...new Set(values.map((value) => String(value)))].sort().join('\0');
}

/**
 * Heal a stored Type subset that no longer intersects the catalog.
 * Remap known latin leftovers; if nothing remains, inherit the catalog (null).
 * Full-catalog subsets also persist as null.
 */
export function reconcileOverrideAllowedValues(definition, overrideValues) {
  if (!Array.isArray(overrideValues) || overrideValues.length === 0) return null;
  const catalog = catalogValues(definition);
  const wanted = new Set();
  for (const raw of overrideValues) {
    const next = remapOrphanEnumValue(definition, raw);
    if (next) wanted.add(next);
  }
  if (!wanted.size) return null;
  const ordered = catalog.filter((value) => wanted.has(value));
  if (!ordered.length) return null;
  if (ordered.length === catalog.length) return null;
  return ordered;
}

export function resolveValueScope(input = {}, existing = {}) {
  if (input.valueScope === 'PRODUCT' || input.valueScope === 'TRANSACTION') {
    return input.valueScope;
  }
  if (input.attributeRole === 'TRANSACTION_ONLY') return 'TRANSACTION';
  if (input.attributeRole === 'MASTER_ONLY' || input.attributeRole === 'TRANSACTION_OVERRIDE_ALLOWED') {
    return 'PRODUCT';
  }
  if (existing.valueScope === 'PRODUCT' || existing.valueScope === 'TRANSACTION') {
    return existing.valueScope;
  }
  if (existing.attributeRole === 'TRANSACTION_ONLY') return 'TRANSACTION';
  return 'PRODUCT';
}

/**
 * Persist null (inherit catalog) when the operator selected nothing or everything.
 * Rejects values that are not on the definition catalog.
 */
export function normalizeOverrideAllowedValues(definition, overrideValues) {
  if (overrideValues === undefined) return undefined;
  if (overrideValues === null || (Array.isArray(overrideValues) && overrideValues.length === 0)) {
    return null;
  }
  if (!Array.isArray(overrideValues)) {
    throw appError('ATTRIBUTE_OVERRIDE_INVALID', 'گزینه‌های مجاز باید فهرست باشند.', 400);
  }
  if (definition?.dataType !== 'ENUM') {
    throw appError('ATTRIBUTE_OVERRIDE_NOT_ENUM', 'گزینه‌های مجاز فقط برای ویژگی فهرستی قابل تنظیم است.', 400);
  }
  const catalog = catalogValues(definition);
  const catalogSet = new Set(catalog);
  const unique = [];
  const seen = new Set();
  for (const raw of overrideValues) {
    const value = remapOrphanEnumValue(definition, raw) || String(raw ?? '').trim();
    if (!value || seen.has(value)) continue;
    if (!catalogSet.has(value)) {
      throw appError(
        'ATTRIBUTE_ENUM_INVALID',
        'گزینه انتخاب‌شده در فهرست سراسری این ویژگی نیست.',
        400,
        { allowed: catalog },
      );
    }
    seen.add(value);
    unique.push(value);
  }
  if (unique.length === 0) return null;
  if (unique.length === catalog.length && catalog.every((value) => seen.has(value))) return null;
  return unique;
}

/** Empty / missing tick → null. ENUM must be in the type's allowed list. */
export function normalizeOverrideDefaultValue(definition, raw, overrideAllowedValues) {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  const value = String(raw).trim();
  if (!value) return null;
  const type = String(definition?.dataType || '').toUpperCase();
  if (type === 'ENUM') {
    const allowed = resolveTypeAllowedValues(definition?.allowedValues, overrideAllowedValues);
    if (!allowed.some((item) => String(item.value) === value)) {
      throw appError(
        'ATTRIBUTE_DEFAULT_INVALID',
        'مقدار پیش‌فرض باید یکی از گزینه‌های مجاز همین نوع کالا باشد.',
        400,
        { allowed: allowed.map((item) => item.value) },
      );
    }
  }
  if ((type === 'DECIMAL' || type === 'INTEGER') && Number.isNaN(Number(value))) {
    throw appError('ATTRIBUTE_DEFAULT_INVALID', 'مقدار پیش‌فرض باید عددی باشد.', 400);
  }
  return value;
}

/**
 * When the Type ENUM subset changes, drop a leftover default that is no longer
 * in the catalog (e.g. latin light/heavy on a Persian kind list). A real catalog
 * value outside the new subset still fails — the operator must pick again.
 */
export function reconcileOverrideDefaultValue(definition, raw, overrideAllowedValues) {
  if (raw === undefined) return undefined;
  const type = String(definition?.dataType || '').toUpperCase();
  const healedOverride = type === 'ENUM' && Array.isArray(overrideAllowedValues)
    ? reconcileOverrideAllowedValues(definition, overrideAllowedValues)
    : overrideAllowedValues;
  const candidate = type === 'ENUM'
    ? (remapOrphanEnumValue(definition, raw) ?? raw)
    : raw;
  try {
    return normalizeOverrideDefaultValue(definition, candidate, healedOverride);
  } catch (err) {
    if (err?.code !== 'ATTRIBUTE_DEFAULT_INVALID') throw err;
    if (type !== 'ENUM') throw err;
    const value = String(raw ?? '').trim();
    if (!value || !catalogValues(definition).includes(value)) return null;
    throw err;
  }
}

const REQUIRED_IDENTITY_TYPES = new Set(['DECIMAL', 'INTEGER', 'ENUM']);
const FORBIDDEN_REQUIRED_TYPES = new Set(['STRING', 'BOOLEAN', 'DATE', 'REFERENCE']);

/** PRODUCT numeric values, and required PRODUCT ENUM, distinguish variants. */
export function isIdentityAttributeType(dataType, { isRequired = false, valueScope } = {}) {
  if (valueScope === 'TRANSACTION') return false;
  if (!isRequired) return false;
  const type = String(dataType || '').toUpperCase();
  if (type === 'DECIMAL' || type === 'INTEGER') return true;
  return type === 'ENUM';
}

export function assertRequiredAttributeType(dataType, { isRequired, isActive = true, valueScope } = {}) {
  if (!isRequired || isActive === false || valueScope === 'TRANSACTION') return;
  const type = String(dataType || '').toUpperCase();
  if (FORBIDDEN_REQUIRED_TYPES.has(type) || !REQUIRED_IDENTITY_TYPES.has(type)) {
    throw appError(
      'ATTRIBUTE_REQUIRED_TYPE_INVALID',
      'ویژگی الزامی باید عدد یا فهرست انتخاب باشد، نه متن آزاد.',
      400,
      { dataType: type },
    );
  }
}

export function applyAttributeBindingPolicy(input = {}, existing = {}) {
  const valueScope = resolveValueScope(input, existing);
  const isRequired = Boolean(input.isRequired ?? existing.isRequired ?? false);
  const dataType = input.dataType || existing.dataType;
  const isActive = input.isActive ?? existing.isActive ?? true;
  assertRequiredAttributeType(dataType, { isRequired, isActive, valueScope });
  const isIdentityRelevant = isIdentityAttributeType(dataType, { isRequired, valueScope });
  const attributeRole = valueScope === 'TRANSACTION' ? 'TRANSACTION_ONLY' : 'MASTER_ONLY';
  const {
    dataType: _dataType,
    isIdentityRelevant: _ignoredIdentity,
    ...rest
  } = input;

  return {
    ...rest,
    valueScope,
    attributeRole,
    isRequired,
    isIdentityRelevant,
    isDisplayRelevant: true,
  };
}
