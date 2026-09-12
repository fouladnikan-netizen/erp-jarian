#!/usr/bin/env node
/**
 * Idempotent: bind carbon-پروفیل mill schema on stainless profile Types and
 * load width×height×thickness Products. Grade stays in the Type name. Length
 * stays TRANSACTION (optional default 6 m) and is not stored on Product.
 * Sides are canonical smaller-first. Does not rewrite Type sku_code.
 *
 *   node backend/scripts/seed-stainless-profile-products.js
 */
import {
  STAINLESS_PROFILE_DEFAULT_LENGTH_M,
  STAINLESS_PROFILE_TYPE_NAMES,
  matchStainlessProfileTypeName,
  stainlessProfileCatalogKey,
  stainlessProfileDisplayNameRule,
  stainlessProfileIdentityRows,
} from '../src/domain/productMaster/stainlessProfileCatalog.js';

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

async function fetchSchema(token, typeId) {
  return (await req(
    'GET',
    `/attribute-definitions/schema/${typeId}?includeInactive=true`,
    token,
  )).schema || [];
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
  const schema = await fetchSchema(token, typeId);
  const entry = (schema || []).find((row) => row.definition?.id === definitionId);
  if (!entry?.binding?.id) throw new Error(`binding missing for ${definitionId} on ${typeId}`);
  await req('PATCH', `/attribute-definitions/bindings/${entry.binding.id}`, token, {
    isActive: true,
    ...patch,
  });
}

async function seedType(token, type, defs, units) {
  const widthDef = defs.find((row) => row.code === 'width_profile');
  const heightDef = defs.find((row) => row.code === 'length_profile');
  const thicknessDef = defs.find((row) => row.code === 'thickness');
  const lengthDef = defs.find((row) => row.code === 'length');
  const gradeDef = defs.find((row) => row.code === 'grade');
  const dimensionsDef = defs.find((row) => row.code === 'dimensions');
  if (!widthDef?.id || !heightDef?.id || !thicknessDef?.id) {
    throw new Error('width_profile/length_profile/thickness definitions missing');
  }
  if (!lengthDef?.id) throw new Error('length definition missing');

  await ensureBinding(token, type.id, widthDef.id, {
    isRequired: true,
    valueScope: 'PRODUCT',
    sortOrder: 10,
  });
  await ensureBinding(token, type.id, heightDef.id, {
    isRequired: true,
    valueScope: 'PRODUCT',
    sortOrder: 20,
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
    overrideDefaultValue: STAINLESS_PROFILE_DEFAULT_LENGTH_M,
  });

  let schema = await fetchSchema(token, type.id);
  if (gradeDef?.id) {
    const grade = bindingOf(schema, 'grade');
    if (grade?.binding?.id) {
      await req('DELETE', `/attribute-definitions/bindings/${grade.binding.id}`, token);
    }
  }
  if (dimensionsDef?.id) {
    schema = await fetchSchema(token, type.id);
    const dimensions = bindingOf(schema, 'dimensions');
    if (dimensions?.binding?.id && dimensions.binding.isActive) {
      await req('PATCH', `/attribute-definitions/bindings/${dimensions.binding.id}`, token, {
        isActive: false,
        isRequired: false,
      });
    }
  }

  const offerPatch = {};
  if (units.countId && !type.defaultCountUnitId) offerPatch.defaultCountUnitId = units.countId;
  if (units.salesId && !type.defaultSalesUnitId) offerPatch.defaultSalesUnitId = units.salesId;

  schema = await fetchSchema(token, type.id);
  const width = bindingOf(schema, 'width_profile');
  const height = bindingOf(schema, 'length_profile');
  const thickness = bindingOf(schema, 'thickness');
  const length = bindingOf(schema, 'length');
  const liveType = (await req('GET', `/product-taxonomy/types/${type.id}`, token)).productType || type;
  if (
    hasOnlyTypeToken(liveType.displayNameRule)
    && width?.definition?.id
    && height?.definition?.id
    && thickness?.definition?.id
  ) {
    offerPatch.displayNameRule = stainlessProfileDisplayNameRule({
      widthId: width.definition.id,
      heightId: height.definition.id,
      thicknessId: thickness.definition.id,
      lengthId: length?.definition?.id,
    });
  }
  if (Object.keys(offerPatch).length) {
    await req('PATCH', `/product-taxonomy/types/${type.id}`, token, offerPatch);
  }

  schema = await fetchSchema(token, type.id);
  const widthId = bindingOf(schema, 'width_profile')?.definition?.id;
  const heightId = bindingOf(schema, 'length_profile')?.definition?.id;
  const thicknessId = bindingOf(schema, 'thickness')?.definition?.id;
  const lengthEntry = bindingOf(schema, 'length');
  const lengthId = lengthEntry?.definition?.id;
  const lengthBinding = lengthEntry?.binding;
  const gradeId = bindingOf(schema, 'grade')?.definition?.id;
  const dimensionsId = bindingOf(schema, 'dimensions')?.definition?.id;
  if (!widthId || !heightId || !thicknessId) {
    throw new Error(`${type.name} is missing width_profile/length_profile/thickness bindings`);
  }
  for (const entry of [bindingOf(schema, 'width_profile'), bindingOf(schema, 'length_profile'), bindingOf(schema, 'thickness')]) {
    if (!entry?.binding?.isRequired || entry.binding.valueScope !== 'PRODUCT') {
      throw new Error(`${type.name} ${entry?.definition?.code} must stay required PRODUCT identity`);
    }
  }
  if (lengthBinding && lengthBinding.valueScope !== 'TRANSACTION') {
    throw new Error(`${type.name} length binding must stay TRANSACTION before creating Products`);
  }
  if (lengthBinding && lengthBinding.isRequired) {
    throw new Error(`${type.name} length must stay optional TRANSACTION`);
  }
  if (lengthBinding && String(lengthBinding.overrideDefaultValue) !== STAINLESS_PROFILE_DEFAULT_LENGTH_M) {
    throw new Error(`${type.name} length default must stay ${STAINLESS_PROFILE_DEFAULT_LENGTH_M}`);
  }

  const rows = stainlessProfileIdentityRows(type.name);
  const catalogKeys = new Set(rows.map((item) => stainlessProfileCatalogKey(item.width, item.height, item.thickness)));
  const listed = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=500`,
    token,
  )).items || [];
  const existingSkus = new Set(listed.map((item) => item.sku));
  let created = 0;
  let reused = 0;
  const samples = [];
  const wanted = [
    { width: 20, height: 20, thickness: 1 },
    { width: 20, height: 40, thickness: 2 },
  ];
  for (const row of rows) {
    if (row.width > row.height) {
      throw new Error(`non-canonical sides leaked into catalog ${row.width}×${row.height}`);
    }
    const result = await req('POST', '/products', token, {
      productTypeId: type.id,
      attributeValues: {
        [widthId]: row.width,
        [heightId]: row.height,
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
    if (hasStoredValue(product, dimensionsId)) {
      throw new Error(`dimensions leaked onto Product ${product.generatedName}`);
    }
    const storedWidth = storedNumber(product, widthId);
    const storedHeight = storedNumber(product, heightId);
    if (storedWidth > storedHeight) {
      throw new Error(`non-canonical SKU persisted ${product.generatedName}`);
    }
    const known = existingSkus.has(product.sku);
    if (known) reused += 1;
    else {
      created += 1;
      existingSkus.add(product.sku);
    }
    const isWanted = wanted.some((item) => (
      item.width === row.width && item.height === row.height && item.thickness === row.thickness
    ));
    if (isWanted || samples.length < 1 || rows.indexOf(row) === rows.length - 1) {
      samples.push({
        sku: product.sku,
        generatedName: product.generatedName,
        width: row.width,
        height: row.height,
        thickness: row.thickness,
      });
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
    const key = stainlessProfileCatalogKey(
      storedNumber(product, widthId),
      storedNumber(product, heightId),
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
    afterCount: after.length,
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
  for (const name of STAINLESS_PROFILE_TYPE_NAMES) {
    const type = types.find((row) => matchStainlessProfileTypeName(row.name, name));
    if (!type) throw new Error(`product type ${name} not found`);
    if (type.name !== name) {
      const patched = await req('PATCH', `/product-taxonomy/types/${type.id}`, token, { name });
      const next = patched.productType || type;
      if (next.skuCode && type.skuCode && next.skuCode !== type.skuCode) {
        throw new Error(`sku_code rewritten for ${name}: ${type.skuCode} → ${next.skuCode}`);
      }
      type.name = next.name || name;
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
