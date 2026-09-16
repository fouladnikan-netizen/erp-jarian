#!/usr/bin/env node
/**
 * Idempotent: bind carbon equal-leg نبشی identity (leg1×leg2×thickness) on
 * نبشی استیل Types and load the closed mill catalog. Grade stays in the
 * Type name. Length stays TRANSACTION (default 6 m) and is not stored.
 * Does not rewrite Type sku_code or wipe unrelated products.
 *
 *   node backend/scripts/seed-stainless-angle-products.js
 */
import {
  STAINLESS_ANGLE_DEFAULT_LENGTH_M,
  STAINLESS_ANGLE_LEG_VALUES,
  STAINLESS_ANGLE_TYPE_NAMES,
  stainlessAngleDisplayNameRule,
  stainlessAngleIdentityRows,
} from '../src/domain/productMaster/stainlessAngleCatalog.js';

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

function toAsciiDigits(value) {
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  return String(value || '').replace(/[۰-۹]/g, (digit) => String(persian.indexOf(digit)));
}

function normalizeTypeName(value) {
  return toAsciiDigits(value)
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200c\u200d]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sameAngleType(liveName, canonical) {
  const live = normalizeTypeName(liveName);
  const want = normalizeTypeName(canonical);
  return live === want || live === `${want}L` || live === `${want}l`;
}

function bindingOf(schema, code) {
  return (schema || []).find((entry) => entry.definition?.code === code) || null;
}

function hasStoredValue(product, definitionId) {
  if (!definitionId) return false;
  const attrs = Array.isArray(product?.attributeValues) ? product.attributeValues : [];
  return attrs.some((item) => item.attributeDefinitionId === definitionId);
}

function storedText(product, definitionId) {
  const attrs = Array.isArray(product?.attributeValues) ? product.attributeValues : [];
  const row = attrs.find((item) => item.attributeDefinitionId === definitionId);
  if (!row) return '';
  return String(row.valueText ?? row.normalizedValue ?? row.valueNumber ?? row.value ?? '');
}

function storedNumber(product, definitionId) {
  const attrs = Array.isArray(product?.attributeValues) ? product.attributeValues : [];
  const row = attrs.find((item) => item.attributeDefinitionId === definitionId);
  if (!row) return Number.NaN;
  return Number(row.valueNumber ?? row.normalizedValue ?? row.value);
}

function catalogKey(height, height2, thickness) {
  return `${String(height)}x${String(height2)}@${Number(thickness)}`;
}

function hasOnlyTypeToken(rule) {
  const tokens = rule?.tokens || [];
  return tokens.length === 0 || (tokens.length === 1 && tokens[0]?.sourceType === 'type');
}

function withInsertedEnumValue(allowedValues, size) {
  const value = String(size);
  const current = Array.isArray(allowedValues) ? allowedValues : [];
  if (current.some((item) => String(item.value) === value)) return null;
  const next = [...current];
  const option = { value, labelFa: value };
  const idx = next.findIndex((item) => Number(item.value) > Number(value));
  if (idx === -1) next.push(option);
  else next.splice(idx, 0, option);
  return next;
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

async function ensureLegEnumSizes(token, defs) {
  for (const code of ['leg1', 'leg2']) {
    const definition = defs.find((row) => row.code === code);
    if (!definition?.id) throw new Error(`${code} definition missing`);
    const live = (await req('GET', `/attribute-definitions/${definition.id}`, token)).attributeDefinition;
    const next = withInsertedEnumValue(live?.allowedValues, '25');
    if (!next) continue;
    await req('PATCH', `/attribute-definitions/${definition.id}`, token, { allowedValues: next });
    console.log('enum-add', code, '25');
  }
}

async function seedType(token, type, defs, units) {
  const heightDef = defs.find((row) => row.code === 'leg1') || defs.find((row) => row.code === 'height');
  const height2Def = defs.find((row) => row.code === 'leg2') || defs.find((row) => row.code === 'height_2');
  const thicknessDef = defs.find((row) => row.code === 'thickness');
  const lengthDef = defs.find((row) => row.code === 'length');
  const gradeDef = defs.find((row) => row.code === 'grade');
  if (!heightDef?.id || !height2Def?.id || !thicknessDef?.id || !lengthDef?.id) {
    throw new Error('leg1/leg2/thickness/length definitions missing');
  }

  await ensureBinding(token, type.id, heightDef.id, {
    isRequired: true,
    valueScope: 'PRODUCT',
    sortOrder: 10,
    overrideAllowedValues: [...STAINLESS_ANGLE_LEG_VALUES],
  });
  await ensureBinding(token, type.id, height2Def.id, {
    isRequired: true,
    valueScope: 'PRODUCT',
    sortOrder: 20,
    overrideAllowedValues: [...STAINLESS_ANGLE_LEG_VALUES],
  });
  await ensureBinding(token, type.id, thicknessDef.id, {
    isRequired: true,
    valueScope: 'PRODUCT',
    sortOrder: 30,
  });
  await ensureBinding(token, type.id, lengthDef.id, {
    isRequired: false,
    valueScope: 'TRANSACTION',
    sortOrder: 40,
    overrideDefaultValue: STAINLESS_ANGLE_DEFAULT_LENGTH_M,
  });
  if (gradeDef?.id) {
    const schema = (await req(
      'GET',
      `/attribute-definitions/schema/${type.id}?includeInactive=true`,
      token,
    )).schema || [];
    const grade = bindingOf(schema, 'grade');
    if (grade?.binding?.id) {
      await req('DELETE', `/attribute-definitions/bindings/${grade.binding.id}`, token);
    }
  }

  const offerPatch = {};
  if (units.countId && !type.defaultCountUnitId) offerPatch.defaultCountUnitId = units.countId;
  if (units.salesId && !type.defaultSalesUnitId) offerPatch.defaultSalesUnitId = units.salesId;

  let schema = (await req(
    'GET',
    `/attribute-definitions/schema/${type.id}?includeInactive=true`,
    token,
  )).schema || [];
  const height = bindingOf(schema, 'leg1') || bindingOf(schema, 'height');
  const height2 = bindingOf(schema, 'leg2') || bindingOf(schema, 'height_2');
  const thickness = bindingOf(schema, 'thickness');
  const length = bindingOf(schema, 'length');
  const liveType = (await req('GET', `/product-taxonomy/types/${type.id}`, token)).productType || type;
  if (
    hasOnlyTypeToken(liveType.displayNameRule)
    && height?.definition?.id
    && height2?.definition?.id
    && thickness?.definition?.id
  ) {
    offerPatch.displayNameRule = stainlessAngleDisplayNameRule({
      heightId: height.definition.id,
      height2Id: height2.definition.id,
      thicknessId: thickness.definition.id,
      lengthId: length?.definition?.id,
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
  const heightEntry = bindingOf(schema, 'leg1') || bindingOf(schema, 'height');
  const height2Entry = bindingOf(schema, 'leg2') || bindingOf(schema, 'height_2');
  const thicknessEntry = bindingOf(schema, 'thickness');
  const lengthEntry = bindingOf(schema, 'length');
  const gradeEntry = bindingOf(schema, 'grade');
  const heightId = heightEntry?.definition?.id;
  const height2Id = height2Entry?.definition?.id;
  const thicknessId = thicknessEntry?.definition?.id;
  const lengthId = lengthEntry?.definition?.id;
  const gradeId = gradeEntry?.definition?.id;
  if (!heightId || !height2Id || !thicknessId) {
    throw new Error(`${type.name} is missing leg1/leg2/thickness bindings`);
  }
  for (const entry of [heightEntry, height2Entry, thicknessEntry]) {
    if (!entry.binding?.isRequired || entry.binding.valueScope !== 'PRODUCT') {
      throw new Error(`${type.name} ${entry.definition.code} must be required PRODUCT identity`);
    }
  }
  if (lengthEntry?.binding && (
    lengthEntry.binding.valueScope !== 'TRANSACTION'
    || lengthEntry.binding.isRequired
    || String(lengthEntry.binding.overrideDefaultValue) !== STAINLESS_ANGLE_DEFAULT_LENGTH_M
  )) {
    throw new Error(`${type.name} length must stay optional TRANSACTION default 6`);
  }

  const rows = stainlessAngleIdentityRows();
  const catalogKeys = new Set(rows.map((item) => catalogKey(item.height, item.height2, item.thickness)));
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
        [heightId]: row.height,
        [height2Id]: row.height2,
        [thicknessId]: row.thickness,
      },
      confirmDuplicate: true,
    });
    const product = result.product;
    if (hasStoredValue(product, lengthId)) {
      throw new Error(`length leaked onto Product ${product.generatedName}`);
    }
    if (hasStoredValue(product, gradeId)) {
      throw new Error(`grade leaked onto Product ${product.generatedName}`);
    }
    if (storedText(product, heightId) !== storedText(product, height2Id)) {
      throw new Error(`unequal legs on Product ${product.generatedName}`);
    }
    const known = existingSkus.has(product.sku);
    if (known) reused += 1;
    else {
      created += 1;
      existingSkus.add(product.sku);
    }
    if (
      samples.length < 2
      || (row.height === '40' && row.thickness === 4)
      || rows.indexOf(row) === rows.length - 1
    ) {
      samples.push({ sku: product.sku, name: product.generatedName });
    }
  }

  const after = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=500`,
    token,
  )).items || [];
  const extras = [];
  for (const product of after) {
    const key = catalogKey(
      storedText(product, heightId),
      storedText(product, height2Id),
      storedNumber(product, thicknessId),
    );
    if (!catalogKeys.has(key)) extras.push(product.generatedName || product.sku);
  }

  return {
    type: type.name,
    skuCode: type.skuCode,
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

  let defs = (await req('GET', '/attribute-definitions?includeInactive=true', token)).items || [];
  await ensureLegEnumSizes(token, defs);
  defs = (await req('GET', '/attribute-definitions?includeInactive=true', token)).items || [];
  const uoms = (await req('GET', '/uom?includeInactive=true', token)).items || [];
  const count = uoms.find((row) => row.nameFa === 'شاخه');
  const sales = uoms.find((row) => row.code === 'KG' || row.nameFa === 'کیلوگرم');
  const types = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const summaries = [];
  for (const name of STAINLESS_ANGLE_TYPE_NAMES) {
    const type = types.find((row) => sameAngleType(row.name, name));
    if (!type) throw new Error(`product type ${name} not found`);
    if (type.name !== name) {
      await req('PATCH', `/product-taxonomy/types/${type.id}`, token, { name });
      type.name = name;
      console.log('restore-type-name', name, type.skuCode);
    }
    const summary = await seedType(token, type, defs, {
      countId: count?.id || null,
      salesId: sales?.id || null,
    });
    summaries.push(summary);
    console.log('done-type', summary);
  }
  console.log('done', summaries);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
