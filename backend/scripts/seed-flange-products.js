#!/usr/bin/env node
/**
 * Idempotent catalog load: فلنج‌ها Products keyed by fitting_material only.
 * size_pipe + flange_class stay TRANSACTION. Facing is Offer Variant.
 * Does not bind pipe sch. Does not create Types or rewrite SKUs.
 *
 *   node backend/scripts/seed-flange-products.js
 */
import {
  FITTING_MATERIAL_ATTRIBUTE,
  FITTING_MATERIAL_CODE,
  WELDED_FITTING_FORBIDDEN_MASTER_CODES,
  WELDED_FITTING_SIZE_ATTRIBUTES,
  weldedFittingDisplayNameRule,
} from '../src/domain/productMaster/weldedFittingCatalog.js';
import {
  FLANGE_ATTRIBUTE_SPECS,
  FLANGE_CATEGORY_NAME,
  FLANGE_FORBIDDEN_STORED_CODES,
  FLANGE_TYPE_NAMES,
  flangeBindingPlan,
  flangeIdentityRows,
} from '../src/domain/productMaster/flangeCatalog.js';
import {
  ensureDefinitions,
  findTypesInCategory,
  login,
  req,
  seedFittingType,
} from './lib/seedFittingFamily.js';

async function main() {
  const token = await login();
  const uoms = (await req('GET', '/uom?includeInactive=true', token)).items || [];
  const inch = uoms.find((row) => row.code === 'INCH' || row.nameFa === 'اینچ');
  const count = uoms.find((row) => row.code === 'NUMBER' || row.nameFa === 'عدد');
  if (!count) throw new Error('UOM NUMBER / عدد not found');

  const listed = (await req('GET', '/attribute-definitions?includeInactive=true', token)).items || [];
  const sizePipe = listed.find((row) => row.code === 'size_pipe');
  if (!sizePipe?.id) throw new Error('size_pipe definition missing');
  const inchId = inch?.id || sizePipe.uomId || null;
  const materialExisted = listed.some((row) => row.code === FITTING_MATERIAL_CODE);

  const specs = [
    FITTING_MATERIAL_ATTRIBUTE,
    ...WELDED_FITTING_SIZE_ATTRIBUTES,
    ...FLANGE_ATTRIBUTE_SPECS,
  ];
  const { byCode, createdCodes } = await ensureDefinitions(token, specs, {
    inchId,
    sizeCodes: WELDED_FITTING_SIZE_ATTRIBUTES.map((row) => row.code),
  });
  byCode.set('size_pipe', sizePipe);
  const materialStatus = (materialExisted || !createdCodes.includes(FITTING_MATERIAL_CODE))
    ? 'reused'
    : 'created';
  console.log('fitting_material', materialStatus);

  const types = await findTypesInCategory(token, FLANGE_CATEGORY_NAME, FLANGE_TYPE_NAMES);
  const summaries = [];
  for (const type of types) {
    const summary = await seedFittingType(token, {
      type,
      defs: byCode,
      bindingPlan: flangeBindingPlan(type.name),
      identityRows: flangeIdentityRows,
      forbiddenStoredCodes: FLANGE_FORBIDDEN_STORED_CODES,
      deactivateCodes: [...WELDED_FITTING_FORBIDDEN_MASTER_CODES, 'sch'],
      displayNameRule: weldedFittingDisplayNameRule,
      units: { countId: count.id, salesId: count.id },
      materialCode: FITTING_MATERIAL_CODE,
    });
    summaries.push(summary);
    console.log('done-type', summary);
  }
  const totals = summaries.reduce((acc, row) => ({
    total: acc.total + row.total,
    created: acc.created + row.created,
    reused: acc.reused + row.reused,
    skipped: acc.skipped + row.skipped,
  }), { total: 0, created: 0, reused: 0, skipped: 0 });
  console.log('done', {
    family: 'flange',
    fitting_material: materialStatus,
    types: summaries.length,
    ...totals,
    samples: summaries.flatMap((row) => row.samples),
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
