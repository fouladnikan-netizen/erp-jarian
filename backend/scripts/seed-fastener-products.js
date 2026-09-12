#!/usr/bin/env node
/**
 * Idempotent catalog load: پیچ و مهره Products keyed by fastener_grade only.
 * Metric size / length stay TRANSACTION and are never stored on the Product.
 * Coating is Offer Variant. Does not recreate Types or rewrite SKUs.
 *
 *   node backend/scripts/seed-fastener-products.js
 */
import {
  FASTENER_ATTRIBUTE_SPECS,
  FASTENER_COATING_CODE,
  FASTENER_FORBIDDEN_MASTER_CODES,
  FASTENER_GRADE_CODE,
  FASTENER_GROUP_NAME,
  FASTENER_LENGTH_CODE,
  FASTENER_SIZE_CODE,
  FASTENER_TYPE_NAMES,
  fastenerBindingPlan,
  fastenerDisplayNameRule,
  fastenerFamily,
  fastenerIdentityRows,
  sameFastenerName,
} from '../src/domain/productMaster/fastenerCatalog.js';

const BASE = process.env.API_BASE || 'http://localhost:3100/api/v1';

const FORBIDDEN_STORED_CODES = Object.freeze([
  ...FASTENER_FORBIDDEN_MASTER_CODES,
  FASTENER_SIZE_CODE,
  FASTENER_LENGTH_CODE,
  FASTENER_COATING_CODE,
  'tooth_style',
  'head_style',
]);

async function req(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    throw new Error(`${method} ${path} ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

function bindingOf(schema, code) {
  return (schema || []).find((entry) => entry.definition?.code === code) || null;
}

function hasStoredValue(product, definitionId) {
  if (!definitionId) return false;
  const attrs = Array.isArray(product?.attributeValues) ? product.attributeValues : [];
  return attrs.some((item) => item.attributeDefinitionId === definitionId);
}

function storedGrade(product, definitionId) {
  const attrs = Array.isArray(product?.attributeValues) ? product.attributeValues : [];
  const row = attrs.find((item) => item.attributeDefinitionId === definitionId);
  return row?.valueText ?? row?.normalizedValue ?? row?.value ?? null;
}

function sameOptionValues(existing, wanted) {
  const have = new Set((existing || []).map((item) => item.value));
  return wanted.every((item) => have.has(item.value));
}

async function ensureBinding(token, typeId, definitionId, patch) {
  try {
    await req('POST', '/attribute-definitions/bindings', token, {
      productTypeId: typeId,
      attributeDefinitionId: definitionId,
      ...patch,
    });
  } catch (err) {
    if (!String(err.message || '').includes('409')) throw err;
  }
  const schema = (await req(
    'GET',
    `/attribute-definitions/schema/${typeId}?includeInactive=true`,
    token,
  )).schema || [];
  const entry = (schema || []).find((row) => row.definition?.id === definitionId);
  if (!entry?.binding?.id) throw new Error(`binding missing for ${definitionId} on ${typeId}`);
  await req('PATCH', `/attribute-definitions/bindings/${entry.binding.id}`, token, {
    isActive: true,
    ...patch,
  });
}

async function ensureDefinitions(token, mmId) {
  const listed = (await req('GET', '/attribute-definitions?includeInactive=true', token)).items || [];
  const byCode = new Map(listed.map((row) => [row.code, row]));
  for (const spec of FASTENER_ATTRIBUTE_SPECS) {
    const existing = byCode.get(spec.code);
    const isLength = spec.code === FASTENER_LENGTH_CODE;
    if (existing) {
      const patch = { isActive: true, nameFa: spec.nameFa };
      if (spec.dataType === 'ENUM' && spec.allowedValues && !sameOptionValues(existing.allowedValues, spec.allowedValues)) {
        patch.allowedValues = spec.allowedValues;
      }
      if (isLength) {
        if (mmId && existing.uomId !== mmId) patch.uomId = mmId;
        if (existing.minValue !== spec.minValue) patch.minValue = spec.minValue;
        if (existing.maxValue !== spec.maxValue) patch.maxValue = spec.maxValue;
      }
      if (Object.keys(patch).length > 2 || patch.allowedValues || patch.uomId) {
        const updated = (await req('PATCH', `/attribute-definitions/${existing.id}`, token, patch))
          .attributeDefinition;
        byCode.set(spec.code, updated);
      }
      continue;
    }
    const body = { ...spec };
    if (isLength && mmId) body.uomId = mmId;
    const created = (await req('POST', '/attribute-definitions', token, body)).attributeDefinition;
    byCode.set(spec.code, created);
    console.log('created-attr', spec.code);
  }
  return byCode;
}

async function deactivateForbidden(token, typeId, schema) {
  for (const code of FASTENER_FORBIDDEN_MASTER_CODES) {
    const entry = bindingOf(schema, code);
    if (entry?.binding?.id && entry.binding.isActive !== false) {
      await req('PATCH', `/attribute-definitions/bindings/${entry.binding.id}`, token, {
        isActive: false,
        isRequired: false,
      });
      console.log('deactivate', code, typeId);
    }
  }
}

async function deleteUnusedLeftovers(token, products, forbiddenIds, gradeId, catalogKeys) {
  let removed = 0;
  let skippedInUse = 0;
  for (const product of products) {
    const hasForbidden = forbiddenIds.some((id) => hasStoredValue(product, id));
    const grade = storedGrade(product, gradeId);
    const extraIdentity = gradeId && grade && !catalogKeys.has(grade);
    if (!hasForbidden && !extraIdentity) continue;
    try {
      await req('DELETE', `/products/${product.id}`, token);
      removed += 1;
      console.log('remove-sized', product.generatedName, product.sku);
    } catch (err) {
      if (!String(err.message || '').includes('409')) throw err;
      skippedInUse += 1;
      console.log('skip-in-use', product.generatedName, product.sku);
    }
  }
  return { removed, skippedInUse };
}

async function seedType(token, type, defs, units) {
  const family = fastenerFamily(type.name);
  if (!family) throw new Error(`not a fastener type: ${type.name}`);
  const plan = fastenerBindingPlan(type.name);
  for (const row of plan) {
    const def = defs.get(row.code) || null;
    if (!def?.id) throw new Error(`${type.name} missing definition ${row.code}`);
    const patch = {
      isRequired: row.isRequired,
      valueScope: row.valueScope,
      sortOrder: row.sortOrder,
    };
    if (row.overrideMin != null) patch.overrideMin = row.overrideMin;
    if (row.overrideMax != null) patch.overrideMax = row.overrideMax;
    if (Object.prototype.hasOwnProperty.call(row, 'overrideAllowedValues')) {
      patch.overrideAllowedValues = row.overrideAllowedValues == null
        ? null
        : [...row.overrideAllowedValues];
    } else if (row.code === FASTENER_GRADE_CODE) {
      patch.overrideAllowedValues = null;
    }
    await ensureBinding(token, type.id, def.id, patch);
  }

  let schema = (await req(
    'GET',
    `/attribute-definitions/schema/${type.id}?includeInactive=true`,
    token,
  )).schema || [];
  await deactivateForbidden(token, type.id, schema);

  const offerPatch = {};
  if (units.countId && !type.defaultCountUnitId) offerPatch.defaultCountUnitId = units.countId;
  if (units.salesId && !type.defaultSalesUnitId) offerPatch.defaultSalesUnitId = units.salesId;

  schema = (await req(
    'GET',
    `/attribute-definitions/schema/${type.id}?includeInactive=true`,
    token,
  )).schema || [];
  const grade = bindingOf(schema, FASTENER_GRADE_CODE);
  if (!grade?.definition?.id) {
    throw new Error(`${type.name} is missing fastener_grade binding`);
  }
  if (!grade.binding?.isRequired || grade.binding.valueScope !== 'PRODUCT') {
    throw new Error(`${type.name} fastener_grade must stay required PRODUCT identity`);
  }
  offerPatch.displayNameRule = fastenerDisplayNameRule({
    gradeId: grade.definition.id,
  });
  await req('PATCH', `/product-taxonomy/types/${type.id}`, token, offerPatch);

  schema = (await req(
    'GET',
    `/attribute-definitions/schema/${type.id}?includeInactive=true`,
    token,
  )).schema || [];
  const gradeId = bindingOf(schema, FASTENER_GRADE_CODE)?.definition?.id;
  const sizeBinding = bindingOf(schema, FASTENER_SIZE_CODE)?.binding;
  const lengthBinding = bindingOf(schema, FASTENER_LENGTH_CODE)?.binding;
  const coatingBinding = bindingOf(schema, FASTENER_COATING_CODE)?.binding;
  const millSize = bindingOf(schema, 'size')?.binding;
  if (!sizeBinding || sizeBinding.valueScope !== 'TRANSACTION' || !sizeBinding.isRequired) {
    throw new Error(`${type.name} fastener_size must stay TRANSACTION required`);
  }
  if (lengthBinding && (lengthBinding.valueScope !== 'TRANSACTION' || !lengthBinding.isRequired)) {
    throw new Error(`${type.name} ${FASTENER_LENGTH_CODE} must stay TRANSACTION required`);
  }
  if (coatingBinding && (coatingBinding.valueScope !== 'TRANSACTION' || coatingBinding.isRequired)) {
    throw new Error(`${type.name} coating must stay Offer Variant (TRANSACTION not required)`);
  }
  if (millSize?.isActive !== false && millSize?.isRequired) {
    throw new Error(`${type.name} mill size must not stay required identity`);
  }

  const rows = fastenerIdentityRows(type.name);
  const catalogKeys = new Set(rows.map((item) => item.fastener_grade));
  const forbiddenIds = FORBIDDEN_STORED_CODES
    .map((code) => bindingOf(schema, code)?.definition?.id)
    .filter(Boolean);

  const listed = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=500`,
    token,
  )).items || [];
  const leftover = await deleteUnusedLeftovers(token, listed, forbiddenIds, gradeId, catalogKeys);

  const remaining = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=500`,
    token,
  )).items || [];
  const existingSkus = new Set(remaining.map((item) => item.sku));
  let created = 0;
  let reused = 0;
  const samples = [];
  for (const row of rows) {
    const result = await req('POST', '/products', token, {
      productTypeId: type.id,
      attributeValues: {
        [gradeId]: row.fastener_grade,
      },
      confirmDuplicate: true,
    });
    const product = result.product;
    for (const definitionId of forbiddenIds) {
      if (hasStoredValue(product, definitionId)) {
        throw new Error(`transaction/forbidden attr leaked onto Product ${product.generatedName}`);
      }
    }
    const known = existingSkus.has(product.sku);
    if (known) reused += 1;
    else {
      created += 1;
      existingSkus.add(product.sku);
    }
    if (samples.length < 1 || rows.indexOf(row) === rows.length - 1) {
      samples.push({ sku: product.sku, generatedName: product.generatedName });
    }
    console.log(known ? 'reuse' : 'create', product.generatedName, product.sku);
  }

  const after = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=500`,
    token,
  )).items || [];
  const extras = [];
  for (const product of after) {
    const key = storedGrade(product, gradeId);
    if (!catalogKeys.has(key)) extras.push(product.generatedName || product.sku);
  }

  return {
    type: type.name,
    family,
    total: rows.length,
    created,
    reused,
    removed: leftover.removed,
    skippedInUse: leftover.skippedInUse,
    extrasLeft: extras,
    samples,
  };
}

async function main() {
  const login = await req('POST', '/auth/login', null, {
    username: process.env.JARIAN_SEED_USER || 'admin',
    password: process.env.JARIAN_SEED_PASSWORD || 'Admin123!',
  });
  const token = login.accessToken || login.token;
  if (!token) throw new Error('login returned no token');

  const uoms = (await req('GET', '/uom?includeInactive=true', token)).items || [];
  const mm = uoms.find((row) => row.code === 'MM' && row.category === 'LENGTH')
    || uoms.find((row) => row.code === 'MM')
    || uoms.find((row) => row.id === 'uom_mm');
  const count = uoms.find((row) => row.code === 'NUMBER' || row.nameFa === 'عدد');
  if (!count) throw new Error('UOM NUMBER / عدد not found');
  if (!mm?.id) throw new Error('UOM MM not found — length_mm requires millimetre UOM');

  const defs = await ensureDefinitions(token, mm.id);
  if (defs.get(FASTENER_LENGTH_CODE)?.uomId !== mm.id) {
    throw new Error(`${FASTENER_LENGTH_CODE} must use millimetre UOM MM, not meter length or mill-sheet-only guesswork`);
  }

  const types = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const summaries = [];
  for (const name of FASTENER_TYPE_NAMES) {
    const type = types.find((row) => (
      sameFastenerName(row.name, name)
      && (row.groupName === FASTENER_GROUP_NAME || !row.groupName)
    )) || types.find((row) => sameFastenerName(row.name, name));
    if (!type) throw new Error(`product type ${name} not found`);
    const summary = await seedType(token, type, defs, {
      countId: count.id,
      salesId: count.id,
    });
    summaries.push(summary);
    console.log('done-type', summary);
  }

  const totals = summaries.reduce((acc, row) => {
    acc.total += row.total;
    acc.created += row.created;
    acc.reused += row.reused;
    acc.removed += row.removed;
    acc.skippedInUse += row.skippedInUse;
    const fam = acc.byFamily[row.family] || { types: 0, products: 0, created: 0, reused: 0, removed: 0 };
    fam.types += 1;
    fam.products += row.total;
    fam.created += row.created;
    fam.reused += row.reused;
    fam.removed += row.removed;
    acc.byFamily[row.family] = fam;
    return acc;
  }, {
    total: 0,
    created: 0,
    reused: 0,
    removed: 0,
    skippedInUse: 0,
    byFamily: {},
  });
  console.log('done', { types: summaries.length, ...totals });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
