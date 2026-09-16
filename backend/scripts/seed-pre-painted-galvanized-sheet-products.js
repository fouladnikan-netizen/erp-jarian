#!/usr/bin/env node
/**
 * Idempotent catalog load: ورق گالوانیزه رنگی thickness×width Products via the API.
 * Does not rewrite Type identity/required/scope.
 * RAL is optional and not identity — not stored on mill catalog Products.
 * Length, supply_form, and forming stay TRANSACTION.
 *
 *   node backend/scripts/seed-pre-painted-galvanized-sheet-products.js
 */
import {
  PRE_PAINTED_GALVANIZED_SHEET_TYPE_NAME,
  prePaintedGalvanizedSheetIdentityRows,
} from '../src/domain/productMaster/prePaintedGalvanizedSheetCatalog.js';

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

async function main() {
  const login = await req('POST', '/auth/login', null, {
    username: process.env.JARIAN_SEED_USER || 'admin',
    password: process.env.JARIAN_SEED_PASSWORD || 'Admin123!',
  });
  const token = login.accessToken || login.token;
  if (!token) throw new Error('login returned no token');

  const types = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const type = types.find((row) => row.name === PRE_PAINTED_GALVANIZED_SHEET_TYPE_NAME);
  if (!type) throw new Error('product type ورق گالوانیزه رنگی not found');

  const schema = (await req(
    'GET',
    `/attribute-definitions/schema/${type.id}?includeInactive=true`,
    token,
  )).schema || [];
  const thickness = bindingOf(schema, 'thickness');
  const width = bindingOf(schema, 'width');
  const ral = bindingOf(schema, 'ral');
  const length = bindingOf(schema, 'length');
  const supplyForm = bindingOf(schema, 'supply_form');
  const forming = bindingOf(schema, 'forming');
  if (!thickness?.definition?.id || !width?.definition?.id) {
    throw new Error('ورق گالوانیزه رنگی is missing thickness/width bindings');
  }
  for (const entry of [thickness, width]) {
    if (!entry.binding?.isRequired || entry.binding.valueScope !== 'PRODUCT' || !entry.binding.isIdentityRelevant) {
      throw new Error(`ورق گالوانیزه رنگی ${entry.definition.code} must stay required PRODUCT identity — not rewriting schema`);
    }
  }
  if (ral?.binding) {
    if (ral.binding.isRequired || ral.binding.isIdentityRelevant) {
      throw new Error('ورق گالوانیزه رنگی ral must stay optional and not identity — not rewriting schema');
    }
    if (ral.binding.overrideDefaultValue) {
      await req('PATCH', `/attribute-definitions/bindings/${ral.binding.id}`, token, {
        overrideDefaultValue: null,
      });
    }
  }
  for (const entry of [length, supplyForm, forming]) {
    if (entry?.binding && entry.binding.valueScope !== 'TRANSACTION') {
      throw new Error(`${entry.definition.code} binding must stay TRANSACTION — not rewriting schema`);
    }
  }

  const listed = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=200`,
    token,
  )).items || [];
  const existingSkus = new Set(listed.map((item) => item.sku));
  const beforeCount = listed.length;
  const rows = prePaintedGalvanizedSheetIdentityRows();
  const catalogKeys = new Set(rows.map((item) => catalogKey(item.width, item.thickness)));
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
    if (hasStoredValue(product, ral?.definition?.id)) {
      throw new Error(`ral leaked onto Product ${product.generatedName}`);
    }
    if (hasStoredValue(product, length?.definition?.id)) {
      throw new Error(`length leaked onto Product ${product.generatedName}`);
    }
    if (hasStoredValue(product, supplyForm?.definition?.id)) {
      throw new Error(`supply_form leaked onto Product ${product.generatedName}`);
    }
    if (hasStoredValue(product, forming?.definition?.id)) {
      throw new Error(`forming leaked onto Product ${product.generatedName}`);
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
    console.log(known ? 'reuse' : 'create', product.generatedName, product.sku);
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
    if (!catalogKeys.has(key) || hasStoredValue(product, ral?.definition?.id)) {
      extras.push(product.generatedName || product.sku);
    }
  }

  console.log('done', {
    type: type.name,
    beforeCount,
    afterCount: after.length,
    total: rows.length,
    created,
    reused,
    extrasLeft: extras,
    samples,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
