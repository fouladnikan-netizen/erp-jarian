/**
 * Product Type display-name rule (DDL-52 / DDL-53 / DDL-54 / DDL-67). FE mirror of
 * backend/src/domain/productMaster/displayNameRule.js — Postgres is SoR.
 * Do not generate Product names in JSX; this module is preview + persist shape only.
 * The joined commercial string is Persian-digit-only (DDL-67).
 */

import { bindingDefaultValue, effectiveEnumOptions, isProductScope, liveAttributeValuesByCode, resolveBindingDefault } from './allowedAttributeValues';
import { applyNpsInchSizeDisplay } from './npsInchDisplay';
import { applySheetLengthDisplay, isSheetLengthApplicable, isSheetLengthAttribute } from './sheetMillLength';
import { formatProductDisplayText } from './productDisplayText';

export const DISPLAY_NAME_SOURCE_TYPES = Object.freeze(['group', 'category', 'type', 'attribute', 'literal']);

export const DISPLAY_NAME_SOURCE_TITLES = Object.freeze({
  group: 'گروه',
  category: 'دسته',
  type: 'نوع',
});

export const DISPLAY_NAME_SEPARATORS = Object.freeze([
  Object.freeze({ id: 'space', value: ' ', label: 'فاصله' }),
  Object.freeze({ id: 'dash', value: '-', label: '-' }),
  Object.freeze({ id: 'slash', value: '/', label: '/' }),
  Object.freeze({ id: 'dot', value: '·', label: '·' }),
]);

export const DISPLAY_NAME_LITERALS = Object.freeze([
  Object.freeze({ id: 'branch', text: 'شاخه', role: 'prefix' }),
  Object.freeze({ id: 'sheet', text: 'برگ', role: 'prefix' }),
  Object.freeze({ id: 'dims', text: 'ابعاد', role: 'prefix' }),
  Object.freeze({ id: 'times', text: '×', role: 'join' }),
  Object.freeze({ id: 'star', text: '*', role: 'join' }),
]);

export const DEFAULT_DISPLAY_NAME_SEPARATOR = ' ';

const SOURCE_SET = new Set(DISPLAY_NAME_SOURCE_TYPES);
const SEPARATOR_SET = new Set(DISPLAY_NAME_SEPARATORS.map((item) => item.value));
const LITERAL_BY_ID = new Map(DISPLAY_NAME_LITERALS.map((item) => [item.id, item]));

export function displayNameLiteral(id) {
  return LITERAL_BY_ID.get(String(id || '')) || null;
}

export function tokenKey(token) {
  if (!token) return '';
  if (token.sourceType === 'attribute') return `attribute:${token.attributeId || ''}`;
  if (token.sourceType === 'literal') return `literal:${token.literalId || ''}`;
  return String(token.sourceType || '');
}

export function tokenInstanceKey(token) {
  if (!token) return '';
  if (token.sourceType === 'literal') return `literal:${token.literalId || ''}:${token.order ?? 0}`;
  return tokenKey(token);
}

export function isBlankDisplayValue(value) {
  if (value === undefined || value === null) return true;
  return String(value).trim() === '';
}

export function hasDisplayNameRule(rule) {
  return Boolean(rule && Array.isArray(rule.tokens) && rule.tokens.length > 0);
}

export function bindingKindBadge(binding = {}) {
  const scope = binding.valueScope === 'TRANSACTION' ? 'TRANSACTION' : 'PRODUCT';
  if (scope === 'TRANSACTION' && binding.isRequired) {
    return { id: 'transaction', label: 'کنشی' };
  }
  if (binding.isRequired) {
    return { id: 'required', label: 'الزامی' };
  }
  return { id: 'optional', label: 'اختیاری' };
}

export function normalizeDisplayNameRule(input) {
  if (input == null || input === '') return null;
  const separator = SEPARATOR_SET.has(input.separator) ? input.separator : DEFAULT_DISPLAY_NAME_SEPARATOR;
  const raw = Array.isArray(input.tokens) ? input.tokens : [];
  const seen = new Set();
  const tokens = [];
  for (const item of raw) {
    const sourceType = String(item?.sourceType || '');
    if (!SOURCE_SET.has(sourceType)) continue;
    if (sourceType === 'literal') {
      const literalId = String(item.literalId || '').trim();
      if (!LITERAL_BY_ID.has(literalId)) continue;
      tokens.push({ sourceType: 'literal', literalId, order: tokens.length });
      if (tokens.length >= 40) break;
      continue;
    }
    const attributeId = sourceType === 'attribute' ? String(item.attributeId || '').trim() : undefined;
    if (sourceType === 'attribute' && !attributeId) continue;
    const key = tokenKey({ sourceType, attributeId });
    if (seen.has(key)) continue;
    seen.add(key);
    tokens.push(sourceType === 'attribute'
      ? {
        sourceType,
        attributeId,
        includeLabel: Boolean(item.includeLabel),
        includeUnit: item.includeUnit !== false,
        order: tokens.length,
      }
      : { sourceType, includeLabel: Boolean(item.includeLabel), order: tokens.length });
    if (tokens.length >= 40) break;
  }
  if (!tokens.length) return null;
  return { separator, tokens };
}

export function replaceDisplayNameAttributeToken(rule, fromAttributeId, toAttributeId) {
  const normalized = normalizeDisplayNameRule(rule);
  if (!normalized || !fromAttributeId || !toAttributeId || fromAttributeId === toAttributeId) {
    return normalized;
  }
  const hasTarget = normalized.tokens.some(
    (token) => token.sourceType === 'attribute' && token.attributeId === String(toAttributeId),
  );
  const tokens = normalized.tokens.flatMap((token) => {
    if (token.sourceType !== 'attribute' || token.attributeId !== String(fromAttributeId)) {
      return [token];
    }
    if (hasTarget) return [];
    return [{ ...token, attributeId: String(toAttributeId) }];
  });
  return normalizeDisplayNameRule({ separator: normalized.separator, tokens });
}

export function ensureDisplayNameAttributeToken(rule, attributeId, { afterAttributeId } = {}) {
  const id = String(attributeId || '');
  if (!id) return normalizeDisplayNameRule(rule);
  const normalized = normalizeDisplayNameRule(rule);
  if (!normalized) return null;
  if (normalized.tokens.some((token) => token.sourceType === 'attribute' && token.attributeId === id)) {
    return normalized;
  }
  const tokens = [...normalized.tokens];
  const insertAt = afterAttributeId
    ? tokens.findIndex((token) => token.sourceType === 'attribute' && token.attributeId === String(afterAttributeId))
    : -1;
  const next = { sourceType: 'attribute', attributeId: id, includeUnit: true, includeLabel: false };
  if (insertAt >= 0) tokens.splice(insertAt + 1, 0, next);
  else tokens.push(next);
  return normalizeDisplayNameRule({ separator: normalized.separator, tokens });
}

function formatTaxonomySegment(sourceType, value, includeLabel) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (!includeLabel) return text;
  const title = DISPLAY_NAME_SOURCE_TITLES[sourceType];
  return title ? `${title} ${text}` : text;
}

function formatAttributeSegment(attr = {}, { placeholder = false, emptyAsPlaceholder = false, includeLabel = false, includeUnit = true } = {}) {
  const nameFa = String(attr.nameFa || '').trim() || 'ویژگی';
  const unit = includeUnit ? String(attr.unitLabel || '').trim() : '';
  const value = isBlankDisplayValue(attr.displayValue) ? '' : String(attr.displayValue).trim();
  if (placeholder || (emptyAsPlaceholder && !value)) {
    const slot = `{${nameFa}}`;
    const core = unit ? `${slot} ${unit}` : slot;
    return includeLabel ? `${nameFa} ${core}` : core;
  }
  if (!value) return '';
  const parts = includeLabel ? [nameFa, value, unit] : [value, unit];
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

export function resolveTokenSegment(token, {
  sources = {},
  attributes = {},
  placeholder = false,
  emptyAsPlaceholder = false,
} = {}) {
  if (!token) return { text: '', invalid: false, role: 'value' };
  if (token.sourceType === 'literal') {
    const lit = displayNameLiteral(token.literalId);
    if (!lit) return { text: '', invalid: true, role: 'value' };
    return { text: lit.text, invalid: false, role: lit.role };
  }
  if (token.sourceType === 'group' || token.sourceType === 'category' || token.sourceType === 'type') {
    return {
      text: formatTaxonomySegment(token.sourceType, sources[token.sourceType], Boolean(token.includeLabel)),
      invalid: false,
      role: 'value',
    };
  }
  if (token.sourceType !== 'attribute') return { text: '', invalid: true, role: 'value' };
  const attr = attributes[token.attributeId];
  if (!attr) return { text: '', invalid: true, role: 'value' };
  return {
    text: formatAttributeSegment(attr, {
      placeholder,
      emptyAsPlaceholder,
      includeLabel: Boolean(token.includeLabel),
      includeUnit: token.includeUnit !== false,
    }),
    invalid: false,
    role: 'value',
  };
}

function neighboringValue(resolved, index, direction) {
  for (let i = index + direction; i >= 0 && i < resolved.length; i += direction) {
    if (resolved[i].token.sourceType === 'literal') continue;
    return resolved[i];
  }
  return null;
}

function applyLiteralOmit(resolved) {
  return resolved.map((item, index) => {
    if (item.role === 'prefix') {
      const next = neighboringValue(resolved, index, 1);
      if (!next || !String(next.text || '').trim()) return { ...item, text: '' };
    }
    if (item.role === 'join') {
      const prev = neighboringValue(resolved, index, -1);
      const next = neighboringValue(resolved, index, 1);
      if (!prev || !next || !String(prev.text || '').trim() || !String(next.text || '').trim()) {
        return { ...item, text: '' };
      }
    }
    return item;
  });
}

function joinResolved(resolved, separator) {
  const filled = resolved.filter((item) => String(item.text || '').trim());
  if (!filled.length) return '';
  const sep = SEPARATOR_SET.has(separator) ? separator : DEFAULT_DISPLAY_NAME_SEPARATOR;
  let out = filled[0].text;
  for (let i = 1; i < filled.length; i += 1) {
    const prev = filled[i - 1];
    const cur = filled[i];
    if (prev.role === 'join' || cur.role === 'join') {
      out += cur.text;
      continue;
    }
    out += sep === ' ' ? ` ${cur.text}` : ` ${sep} ${cur.text}`;
  }
  return formatProductDisplayText(out.replace(/[^\S\n]+/g, ' ').trim());
}

export function buildDisplayNameFromRule(rule, context = {}) {
  const normalized = normalizeDisplayNameRule(rule);
  if (!normalized) return '';
  const placeholder = Boolean(context.placeholder);
  const emptyAsPlaceholder = Boolean(context.emptyAsPlaceholder);
  let resolved = normalized.tokens.map((token) => {
    const segment = resolveTokenSegment(token, {
      sources: context.sources,
      attributes: context.attributes,
      placeholder,
      emptyAsPlaceholder,
    });
    return { token, text: segment.text, role: segment.role, invalid: segment.invalid };
  });
  if (!placeholder && !emptyAsPlaceholder) resolved = applyLiteralOmit(resolved);
  return joinResolved(resolved, normalized.separator);
}

function enumFormDisplayValue(definition, binding, raw) {
  const value = String(raw);
  if (!value || value === 'plain' || value === 'معمولی') return '';
  const opt = effectiveEnumOptions(definition, binding).find((item) => String(item.value) === value);
  const label = opt?.labelFa;
  if (label && label !== '—') return label;
  return value;
}

function formAttributeDisplayValue(definition, binding, raw) {
  if (raw === undefined || raw === null || raw === '') return '';
  if (definition?.dataType === 'BOOLEAN') return raw ? 'بله' : '';
  if (definition?.dataType === 'ENUM') return enumFormDisplayValue(definition, binding, raw);
  return String(raw).trim();
}

/**
 * Live Product-create preview. Uses the Type displayNameRule (same as
 * backend generated_name). Types without a rule keep the legacy Type | attrs
 * formatter so the preview still matches what the API will persist.
 */
export function previewCreatedProductName({
  type,
  group,
  category,
  schema = [],
  attributeValues = {},
  uoms = [],
  emptyAsPlaceholder = false,
} = {}) {
  if (!type) return '';
  const mergedValues = { ...attributeValues };
  for (const entry of schema) {
    const definition = entry?.definition;
    const binding = entry?.binding || {};
    if (!definition?.id || binding.isActive === false) continue;
    const entered = mergedValues[definition.id];
    if (entered !== undefined && entered !== null && entered !== '') continue;
    if (!isProductScope(binding)) continue;
    const fallback = bindingDefaultValue(definition, binding);
    if (fallback) mergedValues[definition.id] = fallback;
  }
  const liveByCode = liveAttributeValuesByCode(schema, mergedValues);
  const attributes = {};
  const legacyEntries = [];
  for (const entry of schema) {
    const definition = entry?.definition;
    const binding = entry?.binding || {};
    if (!definition?.id || binding.isActive === false) continue;
    const uom = (uoms || []).find((item) => item.id === definition.uomId);
    const entered = mergedValues[definition.id];
    const applicable = !isSheetLengthAttribute(definition) || isSheetLengthApplicable(liveByCode);
    const raw = !applicable
      ? ''
      : (entered !== undefined && entered !== null && entered !== '')
        ? entered
        : resolveBindingDefault(definition, binding, { liveByCode });
    const nps = applyNpsInchSizeDisplay({
      typeName: type.name,
      code: definition.code,
      displayValue: formAttributeDisplayValue(
        definition,
        binding,
        raw === '' ? undefined : raw,
      ),
      unitLabel: uom?.nameFa || null,
    });
    const named = applySheetLengthDisplay({
      code: definition.code,
      displayValue: nps.displayValue,
      unitLabel: nps.unitLabel,
    });
    attributes[definition.id] = {
      nameFa: definition.nameFa,
      unitLabel: named.unitLabel,
      displayValue: named.displayValue,
      omitName: definition.code === 'kind' || definition.code === 'ral',
    };
    legacyEntries.push({
      nameFa: definition.nameFa,
      sortOrder: binding.sortOrder ?? 0,
      displayValue: named.displayValue,
      unitLabel: named.unitLabel,
      omitName: definition.code === 'kind' || definition.code === 'ral',
    });
  }
  if (hasDisplayNameRule(type.displayNameRule)) {
    return formatProductDisplayText(
      buildDisplayNameFromRule(type.displayNameRule, {
        sources: {
          group: group?.name || '',
          category: category?.name || '',
          type: type.name || '',
        },
        attributes,
        emptyAsPlaceholder,
      }) || type.name || '',
    );
  }
  const attrPart = [...legacyEntries]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((item) => item.displayValue)
    .map((item) => {
      if (item.omitName) return String(item.displayValue);
      return item.unitLabel
        ? `${item.nameFa}: ${item.displayValue} ${item.unitLabel}`
        : `${item.nameFa}: ${item.displayValue}`;
    })
    .join(' | ');
  return formatProductDisplayText(attrPart ? `${type.name} | ${attrPart}` : (type.name || ''));
}

export function previewDisplayName(rule, context = {}) {
  return buildDisplayNameFromRule(rule, { ...context, placeholder: true });
}

export function annotateDisplayNameTokens(rule, { schema = [] } = {}) {
  const normalized = normalizeDisplayNameRule(rule);
  if (!normalized) return [];
  const byId = new Map(
    schema
      .filter((entry) => entry?.definition?.id && entry?.binding?.isActive !== false)
      .map((entry) => [entry.definition.id, entry]),
  );
  return normalized.tokens.map((token) => {
    if (token.sourceType === 'literal') {
      const lit = displayNameLiteral(token.literalId);
      return {
        ...token,
        invalid: !lit,
        definition: null,
        binding: null,
        badge: { id: 'literal', label: 'نمایش' },
        literalText: lit?.text || '',
      };
    }
    if (token.sourceType !== 'attribute') {
      return { ...token, invalid: false, definition: null, binding: null, badge: null };
    }
    const entry = byId.get(token.attributeId);
    if (!entry) {
      return { ...token, invalid: true, definition: null, binding: null, badge: { id: 'missing', label: 'نامعتبر' } };
    }
    return {
      ...token,
      invalid: false,
      definition: entry.definition,
      binding: entry.binding,
      badge: bindingKindBadge(entry.binding),
    };
  });
}

export function tokenHasUnit(token) {
  return token?.sourceType === 'attribute' && Boolean(token.definition?.uomId);
}

export function paletteItems({ group, category, type, schema = [] } = {}) {
  const items = [
    { sourceType: 'group', label: 'گروه', detail: group?.name || '' },
    { sourceType: 'category', label: 'دسته', detail: category?.name || '' },
    { sourceType: 'type', label: 'نوع', detail: type?.name || '' },
  ];
  for (const lit of DISPLAY_NAME_LITERALS) {
    items.push({
      sourceType: 'literal',
      literalId: lit.id,
      label: lit.text,
      repeatable: true,
      badge: { id: 'literal', label: 'نمایش' },
    });
  }
  for (const entry of schema) {
    if (entry?.binding?.isActive === false || !entry?.definition?.id) continue;
    items.push({
      sourceType: 'attribute',
      attributeId: entry.definition.id,
      label: entry.definition.nameFa,
      hasUnit: Boolean(entry.definition.uomId),
      badge: bindingKindBadge(entry.binding),
    });
  }
  return items;
}
