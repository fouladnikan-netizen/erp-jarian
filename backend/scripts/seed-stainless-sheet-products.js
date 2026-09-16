#!/usr/bin/env node
/**
 * Idempotent: bind mill-sheet schema on stainless sheet Types and load
 * thickness×width Products. Grade stays in the Type name. Length / عرضه
 * stay TRANSACTION and are not stored on Product. Does not rewrite SKUs.
 *
 *   node backend/scripts/seed-stainless-sheet-products.js
 */
import {
  STAINLESS_SHEET_TYPE_NAMES,
  stainlessSheetDisplayNameRule,
  stainlessSheetIdentityRows,
} from '../src/domain/productMaster/stainlessSheetCatalog.js';

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

function catalogKey(width, thickness) {
  return `${Number(width)}@${Number(thickness)}`;
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
  const thicknessDef = defs.find((row) => row.code === 'thickness');
  const widthDef = defs.find((row) => row.code === 'width');
  const sheetLengthDef = defs.find((row) => row.code === 'sheet_length');
  const supplyFormDef = defs.find((row) => row.code === 'supply_form');
  const lengthDef = defs.find((row) => row.code === 'length');
  const gradeDef = defs.find((row) => row.code === 'grade');
  if (!thicknessDef?.id || !widthDef?.id) {
    throw new Error('thickness/width definitions missing');
  }

  await ensureBinding(token, type.id, thicknessDef.id, {
    isRequired: true,
    valueScope: 'PRODUCT',
    sortOrder: 10,
  });
  await ensureBinding(token, type.id, widthDef.id, {
    isRequired: true,
    valueScope: 'PRODUCT',
    sortOrder: 20,
  });
  if (sheetLengthDef?.id) {
    await ensureBinding(token, type.id, sheetLengthDef.id, {
      isRequired: false,
      valueScope: 'TRANSACTION',
      sortOrder: 30,
    });
  }
  if (supplyFormDef?.id) {
    await ensureBinding(token, type.id, supplyFormDef.id, {
      isRequired: false,
      valueScope: 'TRANSACTION',
      sortOrder: 40,
    });
  }
  if (lengthDef?.id) {
    const schema = (await req(
      'GET',
      `/attribute-definitions/schema/${type.id}?includeInactive=true`,
      token,
    )).schema || [];
    const length = bindingOf(schema, 'length');
    if (length?.binding?.id && length.binding.isActive !== false) {
      await req('PATCH', `/attribute-definitions/bindings/${length.binding.id}`, token, {
        isActive: false,
        valueScope: 'TRANSACTION',
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
  const thickness = bindingOf(schema, 'thickness');
  const width = bindingOf(schema, 'width');
  const sheetLength = bindingOf(schema, 'sheet_length');
  const supplyForm = bindingOf(schema, 'supply_form');
  const liveType = (await req('GET', `/product-taxonomy/types/${type.id}`, token)).productType || type;
  if (hasOnlyTypeToken(liveType.displayNameRule) && thickness?.definition?.id && width?.definition?.id) {
    offerPatch.displayNameRule = stainlessSheetDisplayNameRule({
      thicknessId: thickness.definition.id,
      widthId: width.definition.id,
      sheetLengthId: sheetLength?.definition?.id,
      supplyFormId: supplyForm?.definition?.id,
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
  const thicknessId = bindingOf(schema, 'thickness')?.definition?.id;
  const widthId = bindingOf(schema, 'width')?.definition?.id;
  const sheetLengthId = bindingOf(schema, 'sheet_length')?.definition?.id;
  const lengthId = bindingOf(schema, 'length')?.definition?.id;
  const supplyFormId = bindingOf(schema, 'supply_form')?.definition?.id;
  const gradeId = bindingOf(schema, 'grade')?.definition?.id;

  const rows = stainlessSheetIdentityRows(type.name);
  const catalogKeys = new Set(rows.map((item) => catalogKey(item.width, item.thickness)));
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
        [thicknessId]: row.thickness,
        [widthId]: row.width,
      },
      confirmDuplicate: true,
    });
    const product = result.product;
    if (hasStoredValue(product, sheetLengthId)) {
      throw new Error(`sheet_length leaked onto Product ${product.generatedName}`);
    }
    if (hasStoredValue(product, lengthId)) {
      throw new Error(`length leaked onto Product ${product.generatedName}`);
    }
    if (hasStoredValue(product, supplyFormId)) {
      throw new Error(`supply_form leaked onto Product ${product.generatedName}`);
    }
    if (hasStoredValue(product, gradeId)) {
      throw new Error(`grade leaked onto Product ${product.generatedName}`);
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
  }

  const after = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=500`,
    token,
  )).items || [];
  const extras = [];
  for (const product of after) {
    const key = catalogKey(
      storedNumber(product, widthId),
      storedNumber(product, thicknessId),
    );
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
  const count = uoms.find((row) => row.nameFa === 'برگ');
  const sales = uoms.find((row) => row.code === 'KG' || row.nameFa === 'کیلوگرم');
  const types = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const summaries = [];
  for (const name of STAINLESS_SHEET_TYPE_NAMES) {
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
