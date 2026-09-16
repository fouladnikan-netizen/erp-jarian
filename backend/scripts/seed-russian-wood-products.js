#!/usr/bin/env node
/**
 * Idempotent catalog load: چوب روسی Products.
 * Footboard identity is thickness_cm × width_cm × length_m (4|6).
 * Plywood identity is thickness_mm only; 1220×2440 stay TRANSACTION defaults.
 * Offer units come from RUSSIAN_WOOD_OFFER_UNITS — not STEEL_TYPE_OFFER_UNITS.
 *
 *   node backend/scripts/seed-russian-wood-products.js
 */
import {
  BOARD_LENGTH_M_CODE,
  BOARD_THICKNESS_CM_CODE,
  BOARD_WIDTH_CM_CODE,
  CM_UOM,
  FOOTBOARD_DEACTIVATE_CODES,
  FOOTBOARD_TYPE_NAME,
  PLYWOOD_DEACTIVATE_CODES,
  PLYWOOD_HEIGHT_MM_CODE,
  PLYWOOD_THICKNESS_MM_CODE,
  PLYWOOD_WIDTH_MM_CODE,
  RUSSIAN_WOOD_ATTRIBUTE_SPECS,
  RUSSIAN_WOOD_GROUP_NAME,
  RUSSIAN_WOOD_OFFER_UNITS,
  RUSSIAN_WOOD_TYPE_NAMES,
  footboardDisplayNameRule,
  isFootboardType,
  plywoodDisplayNameRule,
  russianWoodBindingPlan,
  russianWoodIdentityRows,
} from '../src/domain/productMaster/russianWoodCatalog.js';

const BASE = process.env.API_BASE || 'http://localhost:3100/api/v1';

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

function sameName(a, b) {
  const n = (v) =>
    String(v || '')
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/[\u200c\u200d]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  return n(a) === n(b);
}

function bindingOf(schema, code) {
  return (schema || []).find((entry) => entry.definition?.code === code) || null;
}

function hasStoredValue(product, definitionId) {
  if (!definitionId) return false;
  const attrs = Array.isArray(product?.attributeValues) ? product.attributeValues : [];
  return attrs.some((item) => item.attributeDefinitionId === definitionId);
}

function storedNumber(product, definitionId) {
  const attrs = Array.isArray(product?.attributeValues) ? product.attributeValues : [];
  const row = attrs.find((item) => item.attributeDefinitionId === definitionId);
  if (!row) return Number.NaN;
  return Number(row.valueNumber ?? row.normalizedValue ?? row.value);
}

function catalogKey(row, codes) {
  return codes.map((code) => Number(row[code])).join('@');
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

async function ensureCmUom(token, uoms) {
  const existing = uoms.find((row) => row.code === CM_UOM.code)
    || uoms.find((row) => row.nameFa === CM_UOM.nameFa);
  if (existing) return existing;
  const created = (await req('POST', '/uom', token, { ...CM_UOM })).uom;
  console.log('created-uom', created.code, created.nameFa);
  uoms.push(created);
  return created;
}

function findUom(uoms, specCode) {
  if (specCode === 'CM') {
    return uoms.find((row) => row.code === 'CM') || uoms.find((row) => row.nameFa === 'سانت');
  }
  if (specCode === 'MM') {
    return uoms.find((row) => row.code === 'MM' && row.category === 'LENGTH')
      || uoms.find((row) => row.code === 'MM');
  }
  if (specCode === 'M') {
    return uoms.find((row) => row.code === 'M' && row.category === 'LENGTH')
      || uoms.find((row) => row.code === 'M')
      || uoms.find((row) => row.code === 'METER')
      || uoms.find((row) => row.nameFa === 'متر' && row.category === 'LENGTH')
      || uoms.find((row) => row.nameFa === 'متر');
  }
  return uoms.find((row) => row.code === specCode);
}

async function ensureDefinitions(token, uoms) {
  const listed = (await req('GET', '/attribute-definitions?includeInactive=true', token)).items || [];
  const byCode = new Map(listed.map((row) => [row.code, row]));
  for (const spec of RUSSIAN_WOOD_ATTRIBUTE_SPECS) {
    const uom = findUom(uoms, spec.uomCode);
    const existing = byCode.get(spec.code);
    const bodyCore = {
      nameFa: spec.nameFa,
      isActive: true,
    };
    if (spec.minValue != null) bodyCore.minValue = spec.minValue;
    if (spec.maxValue != null) bodyCore.maxValue = spec.maxValue;
    if (uom?.id) bodyCore.uomId = uom.id;
    if (existing) {
      const patch = { ...bodyCore };
      const needsPatch = existing.nameFa !== spec.nameFa
        || existing.minValue !== spec.minValue
        || existing.maxValue !== spec.maxValue
        || (uom?.id && existing.uomId !== uom.id)
        || existing.isActive === false;
      if (needsPatch) {
        const updated = (await req('PATCH', `/attribute-definitions/${existing.id}`, token, patch))
          .attributeDefinition;
        byCode.set(spec.code, updated);
      }
      continue;
    }
    const created = (await req('POST', '/attribute-definitions', token, {
      code: spec.code,
      skuCode: spec.skuCode,
      dataType: spec.dataType,
      ...bodyCore,
    })).attributeDefinition;
    byCode.set(spec.code, created);
    console.log('created-attr', spec.code);
  }
  return byCode;
}

async function seedType(token, type, defs, unitsByType) {
  const plan = russianWoodBindingPlan(type.name);
  for (const row of plan) {
    const def = defs.get(row.code) || null;
    if (!def?.id) throw new Error(`${type.name} missing definition ${row.code}`);
    const patch = {
      isRequired: row.isRequired,
      valueScope: row.valueScope,
      sortOrder: row.sortOrder,
    };
    if (row.overrideDefaultValue != null) patch.overrideDefaultValue = row.overrideDefaultValue;
    await ensureBinding(token, type.id, def.id, patch);
  }

  let schema = (await req(
    'GET',
    `/attribute-definitions/schema/${type.id}?includeInactive=true`,
    token,
  )).schema || [];
  const leftoverCodes = isFootboardType(type.name)
    ? FOOTBOARD_DEACTIVATE_CODES
    : PLYWOOD_DEACTIVATE_CODES;
  for (const code of leftoverCodes) {
    const entry = bindingOf(schema, code);
    if (entry?.binding?.id && entry.binding.isActive !== false) {
      await req('PATCH', `/attribute-definitions/bindings/${entry.binding.id}`, token, {
        isActive: false,
        isRequired: false,
        valueScope: 'TRANSACTION',
      });
      console.log('deactivate', code, type.name);
    }
  }

  const units = unitsByType.get(type.name) || {};
  const offerPatch = { customLengthAllowed: false };
  if (units.countId && !type.defaultCountUnitId) offerPatch.defaultCountUnitId = units.countId;
  if (units.salesId && !type.defaultSalesUnitId) offerPatch.defaultSalesUnitId = units.salesId;

  schema = (await req(
    'GET',
    `/attribute-definitions/schema/${type.id}?includeInactive=true`,
    token,
  )).schema || [];
  if (isFootboardType(type.name)) {
    const thickness = bindingOf(schema, BOARD_THICKNESS_CM_CODE);
    const width = bindingOf(schema, BOARD_WIDTH_CM_CODE);
    const length = bindingOf(schema, BOARD_LENGTH_M_CODE);
    if (!thickness?.binding?.isRequired || thickness.binding.valueScope !== 'PRODUCT') {
      throw new Error(`${type.name} board_thickness_cm must stay required PRODUCT identity`);
    }
    if (!width?.binding?.isRequired || width.binding.valueScope !== 'PRODUCT') {
      throw new Error(`${type.name} board_width_cm must stay required PRODUCT identity`);
    }
    if (!length?.binding?.isRequired || length.binding.valueScope !== 'PRODUCT') {
      throw new Error(`${type.name} ${BOARD_LENGTH_M_CODE} must stay required PRODUCT identity — not mill TRANSACTION cut`);
    }
    offerPatch.displayNameRule = footboardDisplayNameRule({
      thicknessId: thickness.definition.id,
      widthId: width.definition.id,
      lengthId: length.definition.id,
    });
  } else {
    const thickness = bindingOf(schema, PLYWOOD_THICKNESS_MM_CODE);
    const width = bindingOf(schema, PLYWOOD_WIDTH_MM_CODE);
    const height = bindingOf(schema, PLYWOOD_HEIGHT_MM_CODE);
    if (!thickness?.binding?.isRequired || thickness.binding.valueScope !== 'PRODUCT') {
      throw new Error(`${type.name} ${PLYWOOD_THICKNESS_MM_CODE} must stay required PRODUCT identity`);
    }
    if (!width?.binding || width.binding.valueScope !== 'TRANSACTION' || width.binding.isRequired) {
      throw new Error(`${type.name} ${PLYWOOD_WIDTH_MM_CODE} must stay Offer Variant (TRANSACTION not required)`);
    }
    if (!height?.binding || height.binding.valueScope !== 'TRANSACTION' || height.binding.isRequired) {
      throw new Error(`${type.name} ${PLYWOOD_HEIGHT_MM_CODE} must stay Offer Variant (TRANSACTION not required)`);
    }
    offerPatch.displayNameRule = plywoodDisplayNameRule({
      thicknessId: thickness.definition.id,
      widthId: width.definition.id,
      heightId: height.definition.id,
    });
  }
  await req('PATCH', `/product-taxonomy/types/${type.id}`, token, offerPatch);

  schema = (await req(
    'GET',
    `/attribute-definitions/schema/${type.id}?includeInactive=true`,
    token,
  )).schema || [];

  const identityCodes = isFootboardType(type.name)
    ? [BOARD_THICKNESS_CM_CODE, BOARD_WIDTH_CM_CODE, BOARD_LENGTH_M_CODE]
    : [PLYWOOD_THICKNESS_MM_CODE];
  const identityIds = identityCodes.map((code) => {
    const id = bindingOf(schema, code)?.definition?.id;
    if (!id) throw new Error(`${type.name} missing identity ${code}`);
    return id;
  });
  const leakCodes = isFootboardType(type.name)
    ? [...FOOTBOARD_DEACTIVATE_CODES]
    : [...new Set([PLYWOOD_WIDTH_MM_CODE, PLYWOOD_HEIGHT_MM_CODE, ...PLYWOOD_DEACTIVATE_CODES])];
  const leakIds = leakCodes
    .map((code) => bindingOf(schema, code)?.definition?.id)
    .filter(Boolean);

  const rows = russianWoodIdentityRows(type.name);
  const catalogKeys = new Set(rows.map((row) => catalogKey(row, identityCodes)));
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
    const attributeValues = {};
    identityCodes.forEach((code, index) => {
      attributeValues[identityIds[index]] = row[code];
    });
    const result = await req('POST', '/products', token, {
      productTypeId: type.id,
      attributeValues,
      confirmDuplicate: true,
    });
    const product = result.product;
    for (const definitionId of leakIds) {
      if (hasStoredValue(product, definitionId)) {
        throw new Error(`TRANSACTION attr leaked onto Product ${product.generatedName}`);
      }
    }
    const known = existingSkus.has(product.sku);
    if (known) reused += 1;
    else {
      created += 1;
      existingSkus.add(product.sku);
    }
    if (samples.length < 2 || rows.indexOf(row) === rows.length - 1) {
      samples.push(product.generatedName);
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
    const key = identityIds.map((id) => storedNumber(product, id)).join('@');
    if (!catalogKeys.has(key)) extras.push(product.generatedName || product.sku);
  }

  return {
    type: type.name,
    total: rows.length,
    created,
    reused,
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
  await ensureCmUom(token, uoms);
  const defs = await ensureDefinitions(token, uoms);

  const unitsByType = new Map();
  for (const row of RUSSIAN_WOOD_OFFER_UNITS) {
    const count = uoms.find((item) => item.nameFa === row.countUnitFa);
    const sales = uoms.find((item) => item.nameFa === row.salesUnitFa);
    if (!count) throw new Error(`UOM ${row.countUnitFa} not found`);
    if (!sales) throw new Error(`UOM ${row.salesUnitFa} not found`);
    unitsByType.set(row.typeName, { countId: count.id, salesId: sales.id });
  }

  const types = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const summaries = [];
  for (const name of RUSSIAN_WOOD_TYPE_NAMES) {
    const type = types.find((row) => sameName(row.name, name));
    if (!type) throw new Error(`product type ${name} not found — run seed-russian-wood-taxonomy.js first`);
    const summary = await seedType(token, type, defs, unitsByType);
    summaries.push(summary);
    console.log('done-type', summary);
  }

  const totals = summaries.reduce((acc, row) => {
    acc.total += row.total;
    acc.created += row.created;
    acc.reused += row.reused;
    return acc;
  }, { group: RUSSIAN_WOOD_GROUP_NAME, total: 0, created: 0, reused: 0 });
  console.log('done', { types: summaries.length, ...totals, summaries });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
