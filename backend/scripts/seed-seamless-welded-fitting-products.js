#!/usr/bin/env node
/**
 * Idempotent catalog load: اتصالات جوشی مانیسمان Products keyed by
 * fitting_material only. Size/sch stay TRANSACTION and are never stored
 * on the Product. Does not create Types or rewrite SKUs.
 *
 *   node backend/scripts/seed-seamless-welded-fitting-products.js
 */
import {
  FITTING_MATERIAL_CODE,
  FITTING_SCH_CODE,
  WELDED_FITTING_ATTRIBUTE_SPECS,
  WELDED_FITTING_FORBIDDEN_MASTER_CODES,
  WELDED_FITTING_SIZE_ATTRIBUTES,
  weldedFittingDisplayNameRule,
} from '../src/domain/productMaster/weldedFittingCatalog.js';
import {
  SEAMLESS_WELDED_FITTING_CATEGORY_NAME,
  SEAMLESS_WELDED_FITTING_TYPE_NAMES,
  seamlessWeldedFittingBindingPlan,
  seamlessWeldedFittingIdentityRows,
} from '../src/domain/productMaster/seamlessWeldedFittingCatalog.js';

const BASE = process.env.API_BASE || 'http://localhost:3100/api/v1';

const FORBIDDEN_STORED_CODES = Object.freeze([
  ...WELDED_FITTING_FORBIDDEN_MASTER_CODES,
  'size_pipe',
  'sch',
  'size_run',
  'size_branch',
  'size_large',
  'size_small',
  'elbow_radius',
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

function storedMaterial(product, definitionId) {
  const attrs = Array.isArray(product?.attributeValues) ? product.attributeValues : [];
  const row = attrs.find((item) => item.attributeDefinitionId === definitionId);
  return row?.valueText ?? row?.normalizedValue ?? row?.value ?? null;
}

function hasOnlyTypeToken(rule) {
  const tokens = rule?.tokens || [];
  return tokens.length === 0 || (tokens.length === 1 && tokens[0]?.sourceType === 'type');
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

async function ensureDefinitions(token, inchId) {
  const listed = (await req('GET', '/attribute-definitions?includeInactive=true', token)).items || [];
  const byCode = new Map(listed.map((row) => [row.code, row]));
  for (const spec of WELDED_FITTING_ATTRIBUTE_SPECS) {
    const existing = byCode.get(spec.code);
    const isSize = WELDED_FITTING_SIZE_ATTRIBUTES.some((row) => row.code === spec.code);
    if (existing) {
      const patch = { isActive: true, nameFa: spec.nameFa };
      if (spec.dataType === 'ENUM' && spec.allowedValues && !sameOptionValues(existing.allowedValues, spec.allowedValues)) {
        patch.allowedValues = spec.allowedValues;
      }
      if (isSize) {
        if (inchId && existing.uomId !== inchId) patch.uomId = inchId;
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
    if (isSize && inchId) body.uomId = inchId;
    const created = (await req('POST', '/attribute-definitions', token, body)).attributeDefinition;
    byCode.set(spec.code, created);
    console.log('created-attr', spec.code);
  }
  return byCode;
}

async function seedType(token, type, defs, units) {
  const plan = seamlessWeldedFittingBindingPlan(type.name);
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
    if (row.overrideDefaultValue != null) patch.overrideDefaultValue = row.overrideDefaultValue;
    if (row.overrideAllowedValues) patch.overrideAllowedValues = [...row.overrideAllowedValues];
    await ensureBinding(token, type.id, def.id, patch);
  }

  let schema = (await req(
    'GET',
    `/attribute-definitions/schema/${type.id}?includeInactive=true`,
    token,
  )).schema || [];
  for (const code of WELDED_FITTING_FORBIDDEN_MASTER_CODES) {
    const entry = bindingOf(schema, code);
    if (entry?.binding?.id && entry.binding.isActive !== false) {
      await req('PATCH', `/attribute-definitions/bindings/${entry.binding.id}`, token, {
        isActive: false,
        isRequired: false,
      });
    }
  }

  const offerPatch = {};
  if (units.countId && !type.defaultCountUnitId) offerPatch.defaultCountUnitId = units.countId;
  if (units.salesId && !type.defaultSalesUnitId) offerPatch.defaultSalesUnitId = units.salesId;

  schema = (await req(
    'GET',
    `/attribute-definitions/schema/${type.id}?includeInactive=true`,
    token,
  )).schema || [];
  const material = bindingOf(schema, FITTING_MATERIAL_CODE);
  if (!material?.definition?.id) {
    throw new Error(`${type.name} is missing fitting_material binding`);
  }
  if (!material.binding?.isRequired || material.binding.valueScope !== 'PRODUCT') {
    throw new Error(`${type.name} fitting_material must stay required PRODUCT identity`);
  }
  const liveType = (await req('GET', `/product-taxonomy/types/${type.id}`, token)).productType || type;
  if (hasOnlyTypeToken(liveType.displayNameRule) && material.definition.id) {
    offerPatch.displayNameRule = weldedFittingDisplayNameRule({
      materialId: material.definition.id,
    });
  }
  if (Object.keys(offerPatch).length) {
    await req('PATCH', `/product-taxonomy/types/${type.id}`, token, offerPatch);
  }

  schema = (await req(
    'GET',
    `/attribute-definitions/schema/${type.id}?includeInactive=true`,
    token,
  )).schema || [];
  const materialId = bindingOf(schema, FITTING_MATERIAL_CODE)?.definition?.id;
  const forbiddenIds = FORBIDDEN_STORED_CODES
    .map((code) => bindingOf(schema, code)?.definition?.id)
    .filter(Boolean);
  const schBinding = bindingOf(schema, FITTING_SCH_CODE)?.binding;
  if (schBinding && schBinding.valueScope !== 'TRANSACTION') {
    throw new Error(`${type.name} sch binding must stay TRANSACTION before creating Products`);
  }

  const rows = seamlessWeldedFittingIdentityRows(type.name);
  const catalogKeys = new Set(rows.map((item) => item.fitting_material));
  const listed = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=500`,
    token,
  )).items || [];
  const existingSkus = new Set(listed.map((item) => item.sku));
  let created = 0;
  let reused = 0;
  const samples = [];
  for (const row of rows) {
    const result = await req('POST', '/products', token, {
      productTypeId: type.id,
      attributeValues: {
        [materialId]: row.fitting_material,
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
    const key = storedMaterial(product, materialId);
    if (!catalogKeys.has(key)) extras.push(product.generatedName || product.sku);
  }

  return {
    type: type.name,
    total: rows.length,
    created,
    reused,
    skipped: extras.length,
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
  const inch = uoms.find((row) => row.code === 'INCH' || row.nameFa === 'اینچ');
  const count = uoms.find((row) => row.code === 'NUMBER' || row.nameFa === 'عدد');
  if (!count) throw new Error('UOM NUMBER / عدد not found');

  const sizePipe = ((await req('GET', '/attribute-definitions?includeInactive=true', token)).items || [])
    .find((row) => row.code === 'size_pipe');
  const inchId = inch?.id || sizePipe?.uomId || null;
  const defs = await ensureDefinitions(token, inchId);
  const sizePipeDef = ((await req('GET', '/attribute-definitions?includeInactive=true', token)).items || [])
    .find((row) => row.code === 'size_pipe');
  const schDef = ((await req('GET', '/attribute-definitions?includeInactive=true', token)).items || [])
    .find((row) => row.code === 'sch');
  if (!sizePipeDef?.id) throw new Error('size_pipe definition missing');
  if (!schDef?.id) throw new Error('sch definition missing');
  defs.set('size_pipe', sizePipeDef);
  defs.set('sch', schDef);

  const types = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const summaries = [];
  for (const name of SEAMLESS_WELDED_FITTING_TYPE_NAMES) {
    const type = types.find((row) => (
      row.name === name
      && (row.categoryName === SEAMLESS_WELDED_FITTING_CATEGORY_NAME || !row.categoryName)
    )) || types.find((row) => row.name === name);
    if (!type) throw new Error(`product type ${name} not found`);
    const summary = await seedType(token, type, defs, {
      countId: count.id,
      salesId: count.id,
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
  console.log('done', { types: summaries.length, ...totals });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
