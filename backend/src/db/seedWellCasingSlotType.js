/**
 * Idempotent: ensure نوع شیار ENUM exists and bind it to لوله جدار چاه
 * as Offer Variant (TRANSACTION, not required). Does not rewrite Products
 * or Display Name rules.
 */
import {
  SLOT_TYPE_ATTRIBUTE,
  SLOT_TYPE_BINDING,
  WELL_CASING_TYPE_NAME,
} from '../domain/productMaster/wellCasingSlotType.js';
import * as attrService from '../services/attributeDefinitionService.js';
import * as taxonomyService from '../services/productTaxonomyService.js';

export async function seedWellCasingSlotType(actorUserId) {
  const defs = await attrService.listDefinitions({ includeInactive: true });
  let definition = defs.find((row) => row.code === SLOT_TYPE_ATTRIBUTE.code);
  let created = false;
  if (!definition) {
    definition = await attrService.createDefinition({ ...SLOT_TYPE_ATTRIBUTE }, actorUserId);
    created = true;
  } else {
    definition = await attrService.updateDefinition(definition.id, {
      nameFa: SLOT_TYPE_ATTRIBUTE.nameFa,
      allowedValues: [...SLOT_TYPE_ATTRIBUTE.allowedValues],
      isActive: true,
    }, actorUserId);
  }

  const types = await taxonomyService.listTypes({ includeInactive: true });
  const type = types.find((row) => row.name === WELL_CASING_TYPE_NAME);
  if (!type) {
    return { created, bound: false, missingType: WELL_CASING_TYPE_NAME, definitionId: definition.id };
  }

  const schema = await attrService.getEffectiveSchema(type.id, { includeInactive: true });
  const existing = schema.find((entry) => entry.definition.id === definition.id);
  if (existing?.binding) {
    await attrService.updateBinding(existing.binding.id, {
      isActive: true,
      ...SLOT_TYPE_BINDING,
    }, actorUserId);
  } else {
    await attrService.bindAttributeToType({
      productTypeId: type.id,
      attributeDefinitionId: definition.id,
      ...SLOT_TYPE_BINDING,
    }, actorUserId);
  }

  return { created, bound: true, typeId: type.id, definitionId: definition.id };
}

export default { seedWellCasingSlotType };
