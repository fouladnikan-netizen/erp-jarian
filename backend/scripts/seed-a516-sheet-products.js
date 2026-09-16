#!/usr/bin/env node
/**
 * Idempotent catalog load: ورق A516 thickness×width Products.
 * Same identity matrix as ورق ST52. Does not rewrite Type identity
 * or PRODUCT required/scope. Length / supply form stay TRANSACTION.
 *
 * Copies display-name rule and mill allow-list from ورق ST52.
 *
 *   node backend/scripts/seed-a516-sheet-products.js
 */
import {
  ST52_SHEET_CLONE_TYPE_NAMES,
  ST52_SHEET_TYPE_NAME,
  st52SheetIdentityRows,
} from '../src/domain/productMaster/st52SheetCatalog.js';

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

function sameJson(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

async function seedType(token, type, sourceType, rows) {
  if (sourceType.displayNameRule && !sameJson(type.displayNameRule, sourceType.displayNameRule)) {
    const updated = await req('PATCH', `/product-taxonomy/types/${type.id}`, token, {
      displayNameRule: sourceType.displayNameRule,
    });
    type = updated.productType || updated;
    console.log('copy-display-name-rule', type.name);
  }
  const sourceBrands = Array.isArray(sourceType.allowedBrandIds) ? [...sourceType.allowedBrandIds] : [];
  const currentBrands = Array.isArray(type.allowedBrandIds) ? [...type.allowedBrandIds] : [];
  if (sourceBrands.length && !sameJson([...sourceBrands].sort(), [...currentBrands].sort())) {
    const updated = await req('PATCH', `/product-taxonomy/types/${type.id}`, token, {
      allowedBrandIds: sourceBrands,
    });
    type = updated.productType || updated;
    console.log('copy-mills', type.name, sourceBrands.length);
  }

  const schema = (await req(
    'GET',
    `/attribute-definitions/schema/${type.id}?includeInactive=true`,
    token,
  )).schema || [];
  const thickness = bindingOf(schema, 'thickness');
  const width = bindingOf(schema, 'width');
  const sheetLength = bindingOf(schema, 'sheet_length');
  const length = bindingOf(schema, 'length');
  const supplyForm = bindingOf(schema, 'supply_form');
  if (!thickness?.definition?.id || !width?.definition?.id) {
    throw new Error(`${type.name} is missing thickness/width bindings`);
  }
  for (const entry of [thickness, width]) {
    if (!entry.binding?.isRequired || entry.binding.valueScope !== 'PRODUCT') {
      throw new Error(`${type.name} ${entry.definition.code} must stay required PRODUCT identity — not rewriting schema`);
    }
  }
  for (const entry of [sheetLength, length, supplyForm]) {
    if (entry?.binding && entry.binding.valueScope !== 'TRANSACTION') {
      throw new Error(`${entry.definition.code} binding must stay TRANSACTION — not rewriting schema`);
    }
  }

  const catalogKeys = new Set(rows.map((item) => catalogKey(item.width, item.thickness)));
  let listed = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=200`,
    token,
  )).items || [];
  let removed = 0;
  for (const product of listed) {
    const key = catalogKey(
      storedNumber(product, width.definition.id),
      storedNumber(product, thickness.definition.id),
    );
    if (catalogKeys.has(key)) continue;
    await req('DELETE', `/products/${product.id}`, token);
    removed += 1;
    console.log('remove-extra', type.name, product.generatedName, product.sku);
  }
  if (removed) {
    listed = (await req(
      'GET',
      `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=200`,
      token,
    )).items || [];
  }
  const existingSkus = new Set(listed.map((item) => item.sku));
  const beforeCount = listed.length;
  let created = 0;
  let reused = 0;
  const samples = [];
  for (const row of rows) {
    const result = await req('POST', '/products', token, {
      productTypeId: type.id,
      attributeValues: {
        [thickness.definition.id]: row.thickness,
        [width.definition.id]: row.width,
      },
      confirmDuplicate: true,
    });
    const product = result.product;
    if (hasStoredValue(product, sheetLength?.definition?.id)) {
      throw new Error(`sheet_length leaked onto Product ${product.generatedName}`);
    }
    if (hasStoredValue(product, length?.definition?.id)) {
      throw new Error(`length leaked onto Product ${product.generatedName}`);
    }
    if (hasStoredValue(product, supplyForm?.definition?.id)) {
      throw new Error(`supply_form leaked onto Product ${product.generatedName}`);
    }
    const known = existingSkus.has(product.sku);
    if (known) reused += 1;
    else {
      created += 1;
      existingSkus.add(product.sku);
    }
    if (samples.length < 3 || rows.indexOf(row) === rows.length - 1) {
      samples.push(product.generatedName);
    }
    console.log(known ? 'reuse' : 'create', type.name, product.generatedName, product.sku);
  }

  const after = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=200`,
    token,
  )).items || [];
  const extras = [];
  for (const product of after) {
    const key = catalogKey(
      storedNumber(product, width.definition.id),
      storedNumber(product, thickness.definition.id),
    );
    if (!catalogKeys.has(key)) extras.push(product.generatedName || product.sku);
  }

  return {
    type: type.name,
    beforeCount,
    afterCount: after.length,
    total: rows.length,
    created,
    reused,
    removed,
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

  const types = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const sourceSummary = types.find((row) => row.name === ST52_SHEET_TYPE_NAME);
  if (!sourceSummary) throw new Error('product type ورق ST52 not found');
  const sourceType = (await req('GET', `/product-taxonomy/types/${sourceSummary.id}`, token)).productType;
  const rows = st52SheetIdentityRows();
  const summaries = [];
  for (const name of ST52_SHEET_CLONE_TYPE_NAMES) {
    const summary = types.find((row) => row.name === name);
    if (!summary) throw new Error(`product type ${name} not found`);
    const type = (await req('GET', `/product-taxonomy/types/${summary.id}`, token)).productType;
    summaries.push(await seedType(token, type, sourceType, rows));
  }
  console.log('done', summaries);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
