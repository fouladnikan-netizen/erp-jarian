#!/usr/bin/env node
/**
 * Bind size_pipe (اینچ) on every Product Type in category لوله except
 * لوله داربست. Copy stored millimetre-`size` values, then drop that binding.
 * Stored numbers are already decimal inches (DDL-58); this is UOM/binding only.
 *
 *   node backend/scripts/heal-pipe-size-pipe-binding.js
 */
import { pool, query } from '../src/db/pool.js';
import { config } from '../src/config.js';
import { newEntityId } from '../src/lib/ids.js';
import { buildCanonicalIdentityKey, normalizeAttributeValue } from '../src/domain/productMaster/normalize.js';
import { SCAFFOLD_PIPE_TYPE_NAME } from '../src/domain/productMaster/scaffoldPipeCatalog.js';
import * as taxonomyService from '../src/services/productTaxonomyService.js';
import * as attrService from '../src/services/attributeDefinitionService.js';
import * as productService from '../src/services/productService.js';
import * as productRepo from '../src/repositories/productRepository.js';

const PIPE_CATEGORY_NAME = 'لوله';
const SIZE_CODE = 'size';
const SIZE_PIPE_CODE = 'size_pipe';

function schemaEntry(schema, code) {
  return (schema || []).find((entry) => entry.definition?.code === code) || null;
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

async function ensureSizePipeBound(type, sizePipeDef, sizeEntry, actorUserId) {
  const schema = await attrService.getEffectiveSchema(type.id, { includeInactive: true });
  const existing = schemaEntry(schema, SIZE_PIPE_CODE);
  const sortOrder = sizeEntry?.binding?.sortOrder ?? existing?.binding?.sortOrder ?? 10;
  const alreadyOk = existing?.binding?.id
    && existing.binding.isActive !== false
    && existing.binding.isRequired
    && existing.binding.valueScope === 'PRODUCT';
  if (alreadyOk) return existing.binding;
  if (existing?.binding?.id) {
    return attrService.updateBinding(existing.binding.id, {
      isActive: true,
      isRequired: true,
      valueScope: 'PRODUCT',
      sortOrder,
    }, actorUserId);
  }
  return attrService.bindAttributeToType({
    productTypeId: type.id,
    attributeDefinitionId: sizePipeDef.id,
    isRequired: true,
    valueScope: 'PRODUCT',
    sortOrder,
  }, actorUserId);
}

async function copySizeValues(typeId, sizeDefId, sizePipeDefId) {
  const { rows } = await query(
    `SELECT pav.product_id, pav.value_text, pav.value_number, pav.value_boolean, pav.normalized_value
     FROM product_attribute_values pav
     JOIN products p ON p.id = pav.product_id
     WHERE p.product_type_id = $1
       AND pav.attribute_definition_id = $2
       AND NOT EXISTS (
         SELECT 1 FROM product_attribute_values existing
         WHERE existing.product_id = pav.product_id
           AND existing.attribute_definition_id = $3
       )`,
    [typeId, sizeDefId, sizePipeDefId],
  );
  for (const row of rows) {
    await productRepo.insertAttributeValue({
      id: newEntityId('pav'),
      productId: row.product_id,
      attributeDefinitionId: sizePipeDefId,
      valueText: row.value_text,
      valueNumber: row.value_number,
      valueBoolean: row.value_boolean,
      normalizedValue: row.normalized_value,
    });
  }
  const allowed = await query(
    `INSERT INTO product_allowed_attribute_values (product_id, attribute_definition_id, value)
     SELECT paav.product_id, $3, paav.value
     FROM product_allowed_attribute_values paav
     JOIN products p ON p.id = paav.product_id
     WHERE p.product_type_id = $1
       AND paav.attribute_definition_id = $2
       AND NOT EXISTS (
         SELECT 1 FROM product_allowed_attribute_values existing
         WHERE existing.product_id = paav.product_id
           AND existing.attribute_definition_id = $3
           AND existing.value = paav.value
       )
     RETURNING product_id`,
    [typeId, sizeDefId, sizePipeDefId],
  );
  return { copied: rows.length, allowedCopied: allowed.rowCount };
}

async function deleteSizeValues(typeId, sizeDefId) {
  const pav = await query(
    `DELETE FROM product_attribute_values pav
     USING products p
     WHERE pav.product_id = p.id
       AND p.product_type_id = $1
       AND pav.attribute_definition_id = $2
     RETURNING pav.id`,
    [typeId, sizeDefId],
  );
  const allowed = await query(
    `DELETE FROM product_allowed_attribute_values paav
     USING products p
     WHERE paav.product_id = p.id
       AND p.product_type_id = $1
       AND paav.attribute_definition_id = $2
     RETURNING paav.product_id`,
    [typeId, sizeDefId],
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

async function healType(type, sizeDef, sizePipeDef, actorUserId) {
  const schema = await attrService.getEffectiveSchema(type.id, { includeInactive: true });
  const sizeEntry = schemaEntry(schema, SIZE_CODE);
  const sizePipeEntry = schemaEntry(schema, SIZE_PIPE_CODE);

  await ensureSizePipeBound(type, sizePipeDef, sizeEntry, actorUserId);

  let copied = { copied: 0, allowedCopied: 0 };
  if (sizeEntry?.definition?.id) {
    copied = await copySizeValues(type.id, sizeEntry.definition.id, sizePipeDef.id);
  }

  const freshType = await taxonomyService.getType(type.id);
  const rewritten = rewriteDisplayNameRule(
    freshType.displayNameRule,
    sizeEntry?.definition?.id,
    sizePipeDef.id,
  );
  if (rewritten.changed) {
    await taxonomyService.updateType(type.id, { displayNameRule: rewritten.rule }, actorUserId);
  }

  let sizeUnbound = false;
  let deleted = { deleted: 0, allowedDeleted: 0 };
  const afterCopy = await attrService.getEffectiveSchema(type.id, { includeInactive: true });
  const leftoverSize = schemaEntry(afterCopy, SIZE_CODE);
  if (leftoverSize?.binding?.id) {
    if (leftoverSize.binding.isRequired) {
      await attrService.updateBinding(leftoverSize.binding.id, { isRequired: false }, actorUserId);
    }
    deleted = await deleteSizeValues(type.id, leftoverSize.definition.id);
    await attrService.deleteBinding(leftoverSize.binding.id, actorUserId);
    sizeUnbound = true;
  }

  const refreshed = await refreshIdentityAndNames(freshType, actorUserId);
  const finalSchema = await attrService.getEffectiveSchema(type.id);
  const finalPipe = schemaEntry(finalSchema, SIZE_PIPE_CODE);
  const finalSize = schemaEntry(finalSchema, SIZE_CODE);
  return {
    type: type.name,
    copied: copied.copied,
    allowedCopied: copied.allowedCopied,
    displayRuleRewritten: rewritten.changed,
    sizeUnbound,
    deleted: deleted.deleted,
    allowedDeleted: deleted.allowedDeleted,
    ...refreshed,
    sizePipeRequired: Boolean(finalPipe?.binding?.isRequired && finalPipe.binding.valueScope === 'PRODUCT'),
    sizeStillBound: Boolean(finalSize?.binding?.id),
    alreadyOk: Boolean(sizePipeEntry?.binding?.isRequired && !sizeEntry),
  };
}

async function main() {
  if (config.nodeEnv === 'production') {
    console.error('[heal-pipe-size-pipe-binding] BLOCKED: refuse when NODE_ENV=production');
    process.exit(1);
  }
  const admin = await query(`SELECT id FROM users WHERE username = 'admin' LIMIT 1`);
  const actorUserId = admin.rows[0]?.id;
  if (!actorUserId) {
    console.error('[heal-pipe-size-pipe-binding] admin user missing — run npm run seed first');
    process.exit(1);
  }

  const defs = await attrService.listDefinitions({ includeInactive: true });
  const sizeDef = defs.find((row) => row.code === SIZE_CODE);
  const sizePipeDef = defs.find((row) => row.code === SIZE_PIPE_CODE);
  if (!sizeDef?.id || !sizePipeDef?.id) {
    throw new Error('attribute definitions size / size_pipe are missing');
  }

  const categories = await taxonomyService.listCategories({ includeInactive: true });
  const pipeCategories = categories.filter((row) => row.name === PIPE_CATEGORY_NAME);
  if (!pipeCategories.length) {
    throw new Error('category لوله not found');
  }

  const types = await taxonomyService.listTypes({ includeInactive: true });
  const results = [];
  for (const category of pipeCategories) {
    const inCategory = types.filter((row) => row.categoryId === category.id);
    for (const type of inCategory) {
      if (type.name === SCAFFOLD_PIPE_TYPE_NAME) {
        const schema = await attrService.getEffectiveSchema(type.id, { includeInactive: true });
        results.push({
          type: type.name,
          skipped: 'scaffold keeps thickness-only identity',
          sizeBound: Boolean(schemaEntry(schema, SIZE_CODE)),
          sizePipeBound: Boolean(schemaEntry(schema, SIZE_PIPE_CODE)),
        });
        continue;
      }
      results.push(await healType(type, sizeDef, sizePipeDef, actorUserId));
    }
  }
  console.log('[heal-pipe-size-pipe-binding]', JSON.stringify(results, null, 2));
}

main()
  .catch((err) => {
    console.error('[heal-pipe-size-pipe-binding] FAILED', err);
    process.exit(1);
  })
  .finally(() => pool.end());
