/**
 * Convert shared `sch` (رده) from DECIMAL to ENUM without deleting Products.
 * Stored 20/40/80 stay the same labels; SKU and identity keys stay put.
 */
import {
  SEAMLESS_PIPE_SCH_OPTIONS,
  SEAMLESS_PIPE_SCH_VALUES,
} from '../domain/productMaster/seamlessPipeCatalog.js';
import { normalizeAttributeValue, normalizeNumericValue } from '../domain/productMaster/normalize.js';
import { writeAudit } from '../lib/ids.js';
import { withTransaction } from './pool.js';
import * as attrRepo from '../repositories/attributeDefinitionRepository.js';

const SCH_CODE = 'sch';

function catalogValueFromStored(row) {
  const raw = row.value_number ?? row.value_text ?? row.normalized_value;
  const numeric = normalizeNumericValue(raw);
  if (numeric != null && SEAMLESS_PIPE_SCH_VALUES.includes(numeric)) return numeric;
  const text = String(raw ?? '').trim();
  if (SEAMLESS_PIPE_SCH_VALUES.includes(text)) return text;
  const upper = text.toUpperCase();
  if (SEAMLESS_PIPE_SCH_VALUES.includes(upper)) return upper;
  return null;
}

function sameOptions(current) {
  const have = (current || []).map((item) => item.value);
  return have.length === SEAMLESS_PIPE_SCH_VALUES.length
    && have.every((value, index) => value === SEAMLESS_PIPE_SCH_VALUES[index]);
}

export async function healSeamlessSchEnum(actorUserId) {
  const definition = await attrRepo.findByCode(SCH_CODE);
  if (!definition) {
    throw new Error('attribute definition sch / رده is missing — do not create a second attribute');
  }

  const alreadyEnum = definition.dataType === 'ENUM' && sameOptions(definition.allowedValues);
  const stored = await withTransaction(async (client) => {
    const res = await client.query(
      `SELECT id, product_id, value_number, value_text, normalized_value
       FROM product_attribute_values
       WHERE attribute_definition_id = $1`,
      [definition.id],
    );
    const unknown = [];
    let migrated = 0;
    for (const row of res.rows) {
      const next = catalogValueFromStored(row);
      if (!next) {
        unknown.push({ productId: row.product_id, value: row.value_number ?? row.value_text });
        continue;
      }
      const { normalized, storage } = normalizeAttributeValue('ENUM', next);
      const already = row.value_text === storage.valueText
        && row.value_number == null
        && row.normalized_value === normalized;
      if (already) continue;
      await client.query(
        `UPDATE product_attribute_values
         SET value_text = $2, value_number = NULL, value_boolean = NULL,
             normalized_value = $3, updated_at = NOW()
         WHERE id = $1`,
        [row.id, storage.valueText, normalized],
      );
      migrated += 1;
    }
    if (unknown.length) {
      throw new Error(`sch values are not in the ENUM catalog: ${JSON.stringify(unknown.slice(0, 10))}`);
    }

    if (alreadyEnum && migrated === 0) {
      return { migrated: 0, alreadyOk: true, productCount: res.rows.length };
    }

    await attrRepo.update(definition.id, {
      dataType: 'ENUM',
      allowedValues: [...SEAMLESS_PIPE_SCH_OPTIONS],
      uomId: null,
    }, actorUserId, client);
    await writeAudit({
      actorUserId,
      action: 'attribute_definition.update',
      entityType: 'attribute_definition',
      entityId: definition.id,
      detail: {
        code: SCH_CODE,
        dataType: 'ENUM',
        allowedValues: SEAMLESS_PIPE_SCH_VALUES,
        convertedFrom: definition.dataType,
        productsUnchanged: true,
      },
    }, client);
    return { migrated, alreadyOk: false, productCount: res.rows.length };
  });

  return {
    definitionId: definition.id,
    dataType: 'ENUM',
    options: SEAMLESS_PIPE_SCH_VALUES.length,
    ...stored,
  };
}

export default { healSeamlessSchEnum };
