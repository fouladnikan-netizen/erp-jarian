#!/usr/bin/env node
/**
 * میلگرد بستر uses ENUM `bed_width` (عرض بستر): three selectable sizes
 * 5.5 / 11 / 15. Shared DECIMAL `width` (عرض) is not bound on this Type.
 * Copies stored mill widths, then drops the width binding. Does not rewrite SKUs.
 *
 *   node backend/scripts/heal-bed-rebar-width.js
 */
import { pool, query } from '../src/db/pool.js';
import { config } from '../src/config.js';
import { newEntityId } from '../src/lib/ids.js';
import { buildCanonicalIdentityKey, normalizeAttributeValue, normalizeNumericValue } from '../src/domain/productMaster/normalize.js';
import {
  BED_REBAR_TYPE_NAME,
  BED_REBAR_WIDTH_OPTIONS,
  BED_REBAR_WIDTH_VALUES,
} from '../src/domain/productMaster/bedRebarCatalog.js';
import * as taxonomyService from '../src/services/productTaxonomyService.js';
import * as attrService from '../src/services/attributeDefinitionService.js';
import * as productService from '../src/services/productService.js';
import * as productRepo from '../src/repositories/productRepository.js';

const WIDTH_CODE = 'width';
const BED_WIDTH_CODE = 'bed_width';

function schemaEntry(schema, code) {
  return (schema || []).find((entry) => entry.definition?.code === code) || null;
}

function catalogWidthFromStored(row) {
  const raw = row.value_number ?? row.value_text ?? row.normalized_value;
  const numeric = normalizeNumericValue(raw);
  if (numeric != null && BED_REBAR_WIDTH_VALUES.includes(numeric)) return numeric;
  const text = String(raw ?? '').trim();
  if (BED_REBAR_WIDTH_VALUES.includes(text)) return text;
  return null;
}

function rewriteDisplayNameRule(rule, fromId, toId) {
  if (!rule || !fromId || !toId || fromId === toId) return { rule, changed: false };
  const tokens = Array.isArray(rule.tokens) ? rule.tokens : [];
  let changed = false;
  const next = tokens.map((token) => {
    if (token?.attributeId !== fromId) return token;
    changed = true;
    return { ...token, attributeId: toId };
  });
  return { rule: { ...rule, tokens: next }, changed };
}

function sameOptions(current) {
  const have = (current || []).map((item) => item.value);
  return have.length === BED_REBAR_WIDTH_VALUES.length
    && have.every((value, index) => value === BED_REBAR_WIDTH_VALUES[index]);
}

async function ensureBedWidthDefinition(actorUserId) {
  const defs = await attrService.listDefinitions({ includeInactive: true });
  const existing = defs.find((row) => row.code === BED_WIDTH_CODE);
  if (!existing) {
    return attrService.createDefinition({
      code: BED_WIDTH_CODE,
      nameFa: 'عرض بستر',
      dataType: 'ENUM',
      allowedValues: [...BED_REBAR_WIDTH_OPTIONS],
    }, actorUserId);
  }
  if (existing.dataType !== 'ENUM' || !sameOptions(existing.allowedValues) || existing.isActive === false) {
    return attrService.updateDefinition(existing.id, {
      dataType: 'ENUM',
      nameFa: 'عرض بستر',
      allowedValues: [...BED_REBAR_WIDTH_OPTIONS],
      uomId: null,
      isActive: true,
    }, actorUserId);
  }
  return existing;
}

async function ensureBedWidthBound(type, bedWidthDef, widthEntry, actorUserId) {
  const schema = await attrService.getEffectiveSchema(type.id, { includeInactive: true });
  const existing = schemaEntry(schema, BED_WIDTH_CODE);
  const sortOrder = widthEntry?.binding?.sortOrder ?? existing?.binding?.sortOrder ?? 10;
  const alreadyOk = existing?.binding?.id
    && existing.binding.isActive !== false
    && existing.binding.isRequired
    && existing.binding.valueScope === 'PRODUCT';
  if (alreadyOk) {
    await attrService.updateBinding(existing.binding.id, {
      overrideAllowedValues: [...BED_REBAR_WIDTH_VALUES],
    }, actorUserId);
    return existing.binding;
  }
  if (existing?.binding?.id) {
    return attrService.updateBinding(existing.binding.id, {
      isActive: true,
      isRequired: true,
      valueScope: 'PRODUCT',
      sortOrder,
      overrideAllowedValues: [...BED_REBAR_WIDTH_VALUES],
    }, actorUserId);
  }
  return attrService.bindAttributeToType({
    productTypeId: type.id,
    attributeDefinitionId: bedWidthDef.id,
    isRequired: true,
    valueScope: 'PRODUCT',
    sortOrder,
    overrideAllowedValues: [...BED_REBAR_WIDTH_VALUES],
  }, actorUserId);
}

async function copyWidthValues(typeId, widthDefId, bedWidthDefId) {
  const { rows } = await query(
    `SELECT pav.product_id, pav.value_text, pav.value_number, pav.normalized_value
     FROM product_attribute_values pav
     JOIN products p ON p.id = pav.product_id
     WHERE p.product_type_id = $1
       AND pav.attribute_definition_id = $2`,
    [typeId, widthDefId],
  );
  let copied = 0;
  const unknown = [];
  for (const row of rows) {
    const catalog = catalogWidthFromStored(row);
    if (!catalog) {
      unknown.push({ productId: row.product_id, value: row.value_number ?? row.value_text });
      continue;
    }
    const { normalized, storage } = normalizeAttributeValue('ENUM', catalog);
    await productRepo.insertAttributeValue({
      id: newEntityId('pav'),
      productId: row.product_id,
      attributeDefinitionId: bedWidthDefId,
      valueText: storage.valueText,
      valueNumber: storage.valueNumber,
      valueBoolean: storage.valueBoolean,
      normalizedValue: normalized,
    });
    copied += 1;
  }
  if (unknown.length) {
    throw new Error(`bed rebar width values are not in the ENUM catalog: ${JSON.stringify(unknown.slice(0, 10))}`);
  }
  return copied;
}

async function deleteWidthValues(typeId, widthDefId) {
  const pav = await query(
    `DELETE FROM product_attribute_values pav
     USING products p
     WHERE pav.product_id = p.id
       AND p.product_type_id = $1
       AND pav.attribute_definition_id = $2
     RETURNING pav.id`,
    [typeId, widthDefId],
  );
  const allowed = await query(
    `DELETE FROM product_allowed_attribute_values paav
     USING products p
     WHERE paav.product_id = p.id
       AND p.product_type_id = $1
       AND paav.attribute_definition_id = $2
     RETURNING paav.product_id`,
    [typeId, widthDefId],
  );
  return { deleted: pav.rowCount, allowedDeleted: allowed.rowCount };
}

async function refreshIdentityAndNames(type, actorUserId) {
  const schema = await attrService.getEffectiveSchema(type.id);
  const products = await productRepo.search({
    productTypeId: type.id,
    includeInactive: true,
    limit: 500,
  });
  const values = await productRepo.listAttributeValuesForProducts(products.map((row) => row.id));
  const byProduct = new Map();
  for (const row of values) {
    const list = byProduct.get(row.productId) || [];
    list.push(row);
    byProduct.set(row.productId, list);
  }
  let keysUpdated = 0;
  for (const product of products) {
    const attrs = byProduct.get(product.id) || [];
    const identityEntries = [];
    for (const { binding, definition } of schema) {
      if (!binding?.isIdentityRelevant) continue;
      const stored = attrs.find((item) => item.attributeDefinitionId === definition.id);
      const raw = stored?.valueNumber ?? stored?.valueText;
      if (raw == null || raw === '') continue;
      const { normalized } = normalizeAttributeValue(definition.dataType, raw);
      if (normalized == null || normalized === '') continue;
      identityEntries.push({ code: definition.code, normalized });
    }
    const key = buildCanonicalIdentityKey(type.id, identityEntries);
    if (key !== product.canonicalIdentityKey) {
      await productRepo.setCanonicalIdentityKey(product.id, key);
      keysUpdated += 1;
    }
  }
  const names = await productService.refreshGeneratedNamesForType(type.id, actorUserId);
  return { keysUpdated, namesUpdated: names.updated };
}

async function main() {
  if (config.nodeEnv === 'production') {
    console.error('[heal-bed-rebar-width] BLOCKED: refuse when NODE_ENV=production');
    process.exit(1);
  }
  const admin = await query(`SELECT id FROM users WHERE username = 'admin' LIMIT 1`);
  const actorUserId = admin.rows[0]?.id;
  if (!actorUserId) {
    throw new Error('admin user missing — run npm run seed first');
  }

  const types = await taxonomyService.listTypes({ includeInactive: true });
  const type = types.find((row) => row.name === BED_REBAR_TYPE_NAME);
  if (!type) throw new Error('product type میلگرد بستر not found');

  const bedWidthDef = await ensureBedWidthDefinition(actorUserId);
  const schema = await attrService.getEffectiveSchema(type.id, { includeInactive: true });
  const widthEntry = schemaEntry(schema, WIDTH_CODE);

  await ensureBedWidthBound(type, bedWidthDef, widthEntry, actorUserId);

  let copied = 0;
  if (widthEntry?.definition?.id) {
    copied = await copyWidthValues(type.id, widthEntry.definition.id, bedWidthDef.id);
  }

  const freshType = await taxonomyService.getType(type.id);
  const rewritten = rewriteDisplayNameRule(
    freshType.displayNameRule,
    widthEntry?.definition?.id,
    bedWidthDef.id,
  );
  if (rewritten.changed) {
    await taxonomyService.updateType(type.id, { displayNameRule: rewritten.rule }, actorUserId);
  }

  let widthUnbound = false;
  let deleted = { deleted: 0, allowedDeleted: 0 };
  const afterCopy = await attrService.getEffectiveSchema(type.id, { includeInactive: true });
  const leftoverWidth = schemaEntry(afterCopy, WIDTH_CODE);
  if (leftoverWidth?.binding?.id) {
    if (leftoverWidth.binding.isRequired) {
      await attrService.updateBinding(leftoverWidth.binding.id, { isRequired: false }, actorUserId);
    }
    deleted = await deleteWidthValues(type.id, leftoverWidth.definition.id);
    await attrService.deleteBinding(leftoverWidth.binding.id, actorUserId);
    widthUnbound = true;
  }

  const refreshed = await refreshIdentityAndNames(freshType, actorUserId);
  const finalSchema = await attrService.getEffectiveSchema(type.id);
  const finalBed = schemaEntry(finalSchema, BED_WIDTH_CODE);
  const finalWidth = schemaEntry(finalSchema, WIDTH_CODE);
  const products = await productRepo.search({
    productTypeId: type.id,
    includeInactive: true,
    limit: 200,
  });

  console.log(JSON.stringify({
    type: type.name,
    copied,
    displayRuleRewritten: rewritten.changed,
    widthUnbound,
    deleted: deleted.deleted,
    ...refreshed,
    productCount: products.length,
    skus: products.map((row) => row.sku),
    bedWidthRequired: Boolean(finalBed?.binding?.isRequired && finalBed.binding.valueScope === 'PRODUCT'),
    bedWidthEnum: finalBed?.definition?.dataType === 'ENUM',
    options: (finalBed?.definition?.allowedValues || []).map((item) => item.value),
    widthStillBound: Boolean(finalWidth?.binding?.id),
  }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
