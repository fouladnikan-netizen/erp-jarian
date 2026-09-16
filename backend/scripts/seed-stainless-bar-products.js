#!/usr/bin/env node
/**
 * Idempotent: bind mill-bar schema on stainless round-bar Types and load
 * size-only Products. Grade stays in the Type name. Length stays TRANSACTION
 * (optional default 6 m) and is not stored on Product. Does not rewrite SKUs.
 *
 *   node backend/scripts/seed-stainless-bar-products.js
 */
import {
  STAINLESS_BAR_DEFAULT_LENGTH_M,
  STAINLESS_BAR_TYPE_NAMES,
  stainlessBarDisplayNameRule,
  stainlessBarIdentityRows,
} from '../src/domain/productMaster/stainlessBarCatalog.js';

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

function hasOnlyTypeToken(rule) {
  const tokens = rule?.tokens || [];
  return tokens.length === 0 || (tokens.length === 1 && tokens[0]?.sourceType === 'type');
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

async function seedType(token, type, defs, units) {
  const sizeDef = defs.find((row) => row.code === 'size');
  const sizePipeDef = defs.find((row) => row.code === 'size_pipe');
  const lengthDef = defs.find((row) => row.code === 'length');
  const gradeDef = defs.find((row) => row.code === 'grade');
  if (!sizeDef?.id) throw new Error('size definition missing');
  if (!lengthDef?.id) throw new Error('length definition missing');
  if (sizeDef.id === sizePipeDef?.id) {
    throw new Error('size and size_pipe must stay distinct definitions');
  }

  await ensureBinding(token, type.id, sizeDef.id, {
    isRequired: true,
    valueScope: 'PRODUCT',
    sortOrder: 10,
  });
  await ensureBinding(token, type.id, lengthDef.id, {
    isRequired: false,
    valueScope: 'TRANSACTION',
    sortOrder: 20,
    overrideDefaultValue: STAINLESS_BAR_DEFAULT_LENGTH_M,
  });
  if (sizePipeDef?.id) {
    const schema = (await req(
      'GET',
      `/attribute-definitions/schema/${type.id}?includeInactive=true`,
      token,
    )).schema || [];
    const sizePipe = bindingOf(schema, 'size_pipe');
    if (sizePipe?.binding?.id && sizePipe.binding.isActive !== false) {
      await req('PATCH', `/attribute-definitions/bindings/${sizePipe.binding.id}`, token, {
        isActive: false,
        isRequired: false,
      });
    }
  }
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
  const size = bindingOf(schema, 'size');
  const length = bindingOf(schema, 'length');
  if (size?.definition?.code === 'size_pipe') {
    throw new Error(`${type.name} bound size_pipe instead of millimetre size`);
  }
  const liveType = (await req('GET', `/product-taxonomy/types/${type.id}`, token)).productType || type;
  if (hasOnlyTypeToken(liveType.displayNameRule) && size?.definition?.id) {
    offerPatch.displayNameRule = stainlessBarDisplayNameRule({
      sizeId: size.definition.id,
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
  const sizeId = bindingOf(schema, 'size')?.definition?.id;
  const lengthId = bindingOf(schema, 'length')?.definition?.id;
  const lengthBinding = bindingOf(schema, 'length')?.binding;
  const gradeId = bindingOf(schema, 'grade')?.definition?.id;
  const sizePipeId = bindingOf(schema, 'size_pipe')?.definition?.id;
  if (!sizeId) throw new Error(`${type.name} is missing millimetre size binding`);
  if (lengthBinding && lengthBinding.valueScope !== 'TRANSACTION') {
    throw new Error(`${type.name} length binding must stay TRANSACTION before creating Products`);
  }
  if (lengthBinding && String(lengthBinding.overrideDefaultValue) !== STAINLESS_BAR_DEFAULT_LENGTH_M) {
    throw new Error(`${type.name} length default must stay ${STAINLESS_BAR_DEFAULT_LENGTH_M}`);
  }

  const rows = stainlessBarIdentityRows(type.name);
  const catalogKeys = new Set(rows.map((item) => String(Number(item.size))));
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
        [sizeId]: row.size,
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
    if (hasStoredValue(product, sizePipeId)) {
      throw new Error(`size_pipe leaked onto Product ${product.generatedName}`);
    }
    const known = existingSkus.has(product.sku);
    if (known) reused += 1;
    else {
      created += 1;
      existingSkus.add(product.sku);
    }
    if (samples.length < 2 || rows.indexOf(row) === rows.length - 1) {
      samples.push({ sku: product.sku, generatedName: product.generatedName });
    }
  }

  const after = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=500`,
    token,
  )).items || [];
  const extras = [];
  for (const product of after) {
    const key = String(storedNumber(product, sizeId));
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

  const defs = (await req('GET', '/attribute-definitions?includeInactive=true', token)).items || [];
  const uoms = (await req('GET', '/uom?includeInactive=true', token)).items || [];
  const count = uoms.find((row) => row.nameFa === 'شاخه' && row.category === 'COUNT')
    || uoms.find((row) => row.nameFa === 'شاخه');
  const sales = uoms.find((row) => row.code === 'KG' || row.nameFa === 'کیلوگرم');
  const types = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const summaries = [];
  for (const name of STAINLESS_BAR_TYPE_NAMES) {
    const type = types.find((row) => row.name === name);
    if (!type) throw new Error(`product type ${name} not found`);
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
