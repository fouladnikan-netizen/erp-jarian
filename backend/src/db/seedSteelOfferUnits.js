/**
 * Idempotent carbon-steel offer-unit seed. Ensures حلقه exists, then sets
 * Product Type defaultCountUnitId / defaultSalesUnitId from the operator table.
 * Changing Type defaults does not rewrite existing Products (DDL-47).
 */
import {
  RING_UOM,
  STEEL_TYPE_OFFER_UNITS,
  resolveTypeName,
  resolveUomName,
} from '../domain/productMaster/steelOfferUnits.js';
import * as uomService from '../services/uomService.js';
import * as taxonomyService from '../services/productTaxonomyService.js';

export async function seedSteelOfferUnits(actorUserId) {
  let uoms = await uomService.listUoms({ includeInactive: true });
  let ring = uoms.find((u) => u.code === RING_UOM.code || u.nameFa === RING_UOM.nameFa);
  let ringCreated = false;
  if (!ring) {
    ring = await uomService.createUom({ ...RING_UOM }, actorUserId);
    ringCreated = true;
    uoms = await uomService.listUoms({ includeInactive: true });
  }

  const uomByFa = new Map(uoms.map((u) => [u.nameFa, u]));
  for (const [alias, canonical] of Object.entries({ مترمربع: 'متر مربع' })) {
    if (uomByFa.get(canonical)) uomByFa.set(alias, uomByFa.get(canonical));
  }

  function requireUom(nameFa) {
    const resolved = resolveUomName(nameFa);
    const row = uomByFa.get(resolved);
    if (!row) throw new Error(`[seed-steel-offer-units] uom missing: ${resolved}`);
    return row;
  }

  const types = await taxonomyService.listTypes({ includeInactive: true });
  const typeByName = new Map(types.map((t) => [t.name, t]));
  const updated = [];
  const missingTypes = [];

  for (const row of STEEL_TYPE_OFFER_UNITS) {
    const typeName = resolveTypeName(row.typeName);
    const type = typeByName.get(typeName);
    if (!type) {
      missingTypes.push(typeName);
      continue;
    }
    if (type.defaultCountUnitId && type.defaultSalesUnitId) continue;
    const count = requireUom(row.countUnitFa);
    const sales = requireUom(row.salesUnitFa);
    await taxonomyService.updateType(
      type.id,
      { defaultCountUnitId: count.id, defaultSalesUnitId: sales.id },
      actorUserId,
    );
    updated.push({
      typeName,
      countUnitFa: count.nameFa,
      salesUnitFa: sales.nameFa,
    });
  }

  return {
    ringCreated,
    updated: updated.length,
    rows: updated,
    missingTypes,
  };
}

export default { seedSteelOfferUnits };
