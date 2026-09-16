#!/usr/bin/env node
/**
 * Idempotent catalog load: اتصالات دنده‌ای Products keyed by
 * fitting_material only. Size is TRANSACTION; threaded_class is Offer Variant.
 * Does not bind onto forged high-pressure threaded Types.
 *
 *   node backend/scripts/seed-threaded-fitting-products.js
 */
import {
  FITTING_MATERIAL_ATTRIBUTE,
  FITTING_MATERIAL_CODE,
  WELDED_FITTING_FORBIDDEN_MASTER_CODES,
  WELDED_FITTING_SIZE_ATTRIBUTES,
  weldedFittingDisplayNameRule,
} from '../src/domain/productMaster/weldedFittingCatalog.js';
import {
  THREADED_FITTING_ATTRIBUTE_SPECS,
  THREADED_FITTING_CATEGORY_NAME,
  THREADED_FITTING_EXCLUDED_TYPE_NAMES,
  THREADED_FITTING_FORBIDDEN_STORED_CODES,
  THREADED_FITTING_TYPE_NAMES,
  threadedFittingBindingPlan,
  threadedFittingIdentityRows,
} from '../src/domain/productMaster/threadedFittingCatalog.js';
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
    ...THREADED_FITTING_ATTRIBUTE_SPECS,
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

  const types = await findTypesInCategory(
    token,
    THREADED_FITTING_CATEGORY_NAME,
    THREADED_FITTING_TYPE_NAMES,
  );
  for (const type of types) {
    if (THREADED_FITTING_EXCLUDED_TYPE_NAMES.includes(type.name)) {
      throw new Error(`refusing to seed forged high-pressure type ${type.name} as general threaded`);
    }
  }
  const summaries = [];
  for (const type of types) {
    const summary = await seedFittingType(token, {
      type,
      defs: byCode,
      bindingPlan: threadedFittingBindingPlan(type.name),
      identityRows: threadedFittingIdentityRows,
      forbiddenStoredCodes: THREADED_FITTING_FORBIDDEN_STORED_CODES,
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
    family: 'threaded',
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
