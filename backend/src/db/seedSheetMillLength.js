/**
 * Idempotent: ensure طول ورق (sheet_length, UOM میل) exists and bind it
 * TRANSACTION on mill-sheet Types (count unit برگ). Deactivates meter `length`
 * on those Types and points the display-name token at طول ورق.
 * Does not rewrite Product identity / SKU (DDL-56).
 */
import {
  SHEET_LENGTH_ATTRIBUTE,
  SHEET_LENGTH_BINDING,
  SHEET_LENGTH_CODE,
  SHEET_LENGTH_METER_CODE,
  SHEET_LENGTH_UOM_CODE,
  millSheetTypeNames,
} from '../domain/productMaster/sheetMillLength.js';
import {
  ensureDisplayNameAttributeToken,
  replaceDisplayNameAttributeToken,
} from '../domain/productMaster/displayNameRule.js';
import * as attrService from '../services/attributeDefinitionService.js';
import * as taxonomyService from '../services/productTaxonomyService.js';
import * as uomService from '../services/uomService.js';

function bindingOf(schema, code) {
  return (schema || []).find((entry) => entry.definition?.code === code) || null;
}

export async function seedSheetMillLength(actorUserId) {
  const uoms = await uomService.listUoms({ includeInactive: true });
  const mill = uoms.find((row) => row.code === SHEET_LENGTH_UOM_CODE || row.nameFa === 'میل');
  if (!mill) {
    throw new Error(`[seed-sheet-mill-length] UOM ${SHEET_LENGTH_UOM_CODE} / میل is missing`);
  }

  const defs = await attrService.listDefinitions({ includeInactive: true });
  let definition = defs.find((row) => row.code === SHEET_LENGTH_CODE);
  let created = false;
  if (!definition) {
    definition = await attrService.createDefinition({
      ...SHEET_LENGTH_ATTRIBUTE,
      uomId: mill.id,
    }, actorUserId);
    created = true;
  } else {
    definition = await attrService.updateDefinition(definition.id, {
      nameFa: SHEET_LENGTH_ATTRIBUTE.nameFa,
      uomId: mill.id,
      isActive: true,
    }, actorUserId);
  }

  const types = await taxonomyService.listTypes({ includeInactive: true });
  const typeByName = new Map(types.map((row) => [row.name, row]));
  const bound = [];
  const missingTypes = [];
  const skipped = [];

  for (const typeName of millSheetTypeNames()) {
    const type = typeByName.get(typeName);
    if (!type) {
      missingTypes.push(typeName);
      continue;
    }

    let schema = await attrService.getEffectiveSchema(type.id, { includeInactive: true });
    const width = bindingOf(schema, 'width');
    const thickness = bindingOf(schema, 'thickness');
    const length = bindingOf(schema, SHEET_LENGTH_METER_CODE);
    const existing = bindingOf(schema, SHEET_LENGTH_CODE);
    const identityBroken = [width, thickness].some((entry) => (
      entry?.binding && (entry.binding.valueScope !== 'PRODUCT' || !entry.binding.isRequired)
    ));
    if (identityBroken) {
      skipped.push(typeName);
      continue;
    }
    const sortOrder = existing?.binding?.sortOrder
      ?? length?.binding?.sortOrder
      ?? 30;

    if (existing?.binding) {
      await attrService.updateBinding(existing.binding.id, {
        isActive: true,
        ...SHEET_LENGTH_BINDING,
        sortOrder,
      }, actorUserId);
    } else {
      await attrService.bindAttributeToType({
        productTypeId: type.id,
        attributeDefinitionId: definition.id,
        ...SHEET_LENGTH_BINDING,
        sortOrder,
      }, actorUserId);
    }

    schema = await attrService.getEffectiveSchema(type.id, { includeInactive: true });
    const sheetLength = bindingOf(schema, SHEET_LENGTH_CODE);
    const refreshedType = await taxonomyService.getType(type.id);
    let rule = refreshedType.displayNameRule || null;
    if (length?.definition?.id && sheetLength?.definition?.id) {
      rule = replaceDisplayNameAttributeToken(rule, length.definition.id, sheetLength.definition.id) || rule;
    }
    if (sheetLength?.definition?.id) {
      rule = ensureDisplayNameAttributeToken(rule, sheetLength.definition.id, {
        afterAttributeId: width?.definition?.id,
      }) || rule;
    }
    if (rule && JSON.stringify(rule) !== JSON.stringify(refreshedType.displayNameRule || null)) {
      await taxonomyService.updateType(type.id, { displayNameRule: rule }, actorUserId);
    }

    const lengthAfter = bindingOf(
      await attrService.getEffectiveSchema(type.id, { includeInactive: true }),
      SHEET_LENGTH_METER_CODE,
    );
    if (lengthAfter?.binding?.id && lengthAfter.binding.isActive !== false) {
      await attrService.updateBinding(lengthAfter.binding.id, { isActive: false }, actorUserId);
    }

    bound.push(typeName);
  }

  return {
    created,
    definitionId: definition.id,
    bound: bound.length,
    types: bound,
    missingTypes,
    skipped,
  };
}

export default { seedSheetMillLength };
