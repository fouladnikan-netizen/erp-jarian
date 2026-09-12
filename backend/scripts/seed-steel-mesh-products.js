#!/usr/bin/env node
/**
 * Idempotent: ensure the four mill mesh Types, bind چشمه+سایز as PRODUCT
 * identity, set display names / m² offer units, and load catalog Products.
 * Renames empty توری فولادی → توری جوشی. Does not rewrite issued SKUs.
 *
 *   node backend/scripts/seed-steel-mesh-products.js
 */
import {
  STEEL_MESH_CATEGORY_NAME,
  STEEL_MESH_GROUP_NAME,
  STEEL_MESH_TYPES,
  steelMeshDisplayNameRule,
  steelMeshIdentityRows,
} from '../src/domain/productMaster/steelMeshCatalog.js';

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
  const n = (v) => String(v || '')
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

function hasOnlyTypeToken(rule) {
  const tokens = rule?.tokens || [];
  return tokens.length === 1 && tokens[0]?.sourceType === 'type';
}

async function ensureBinding(token, typeId, definitionId, sortOrder) {
  try {
    await req('POST', '/attribute-definitions/bindings', token, {
      productTypeId: typeId,
      attributeDefinitionId: definitionId,
      isRequired: true,
      valueScope: 'PRODUCT',
      sortOrder,
    });
  } catch (err) {
    if (!String(err.message || '').includes('409')) throw err;
  }
}

async function main() {
  const login = await req('POST', '/auth/login', null, {
    username: process.env.JARIAN_SEED_USER || 'admin',
    password: process.env.JARIAN_SEED_PASSWORD || 'Admin123!',
  });
  const token = login.accessToken || login.token;
  if (!token) throw new Error('login returned no token');

  const defs = (await req('GET', '/attribute-definitions?includeInactive=true', token)).items || [];
  const meshSize = defs.find((row) => row.code === 'mesh_size');
  const size = defs.find((row) => row.code === 'size');
  if (!meshSize?.id || !size?.id) throw new Error('mesh_size / size definitions missing');

  const types = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const donor = types.find((row) => STEEL_MESH_TYPES.some((spec) => (
    sameName(row.name, spec.name) || spec.legacyNames.some((name) => sameName(row.name, name))
  )));
  const countUnitId = donor?.defaultCountUnitId || null;
  const salesUnitId = donor?.defaultSalesUnitId || null;

  const groups = (await req('GET', '/product-taxonomy/groups?includeInactive=true', token)).items || [];
  const group = groups.find((row) => sameName(row.name, STEEL_MESH_GROUP_NAME));
  if (!group) throw new Error(`group ${STEEL_MESH_GROUP_NAME} not found`);
  const categories = (await req(
    'GET',
    `/product-taxonomy/categories?groupId=${encodeURIComponent(group.id)}&includeInactive=true`,
    token,
  )).items || [];
  const category = categories.find((row) => sameName(row.name, STEEL_MESH_CATEGORY_NAME));
  if (!category) throw new Error(`category ${STEEL_MESH_CATEGORY_NAME} not found`);

  const summary = [];
  for (const spec of STEEL_MESH_TYPES) {
    let type = types.find((row) => sameName(row.name, spec.name))
      || types.find((row) => spec.legacyNames.some((name) => sameName(row.name, name)));
    if (!type) {
      const created = await req('POST', '/product-taxonomy/types', token, {
        categoryId: category.id,
        name: spec.name,
        nameLatin: spec.nameLatin,
        skuCode: spec.skuCode,
        defaultCountUnitId: countUnitId,
        defaultSalesUnitId: salesUnitId,
      });
      type = created.productType;
      types.push(type);
      console.log('created type', type.name, type.skuCode);
    } else {
      const patch = {};
      if (!sameName(type.name, spec.name)) patch.name = spec.name;
      if (type.nameLatin !== spec.nameLatin) patch.nameLatin = spec.nameLatin;
      if (spec.skuCode && type.skuCode !== spec.skuCode) patch.skuCode = spec.skuCode;
      if (countUnitId && !type.defaultCountUnitId) patch.defaultCountUnitId = countUnitId;
      if (salesUnitId && !type.defaultSalesUnitId) patch.defaultSalesUnitId = salesUnitId;
      if (Object.keys(patch).length) {
        type = (await req('PATCH', `/product-taxonomy/types/${type.id}`, token, patch)).productType;
        console.log('updated type', type.name, type.skuCode);
      } else {
        console.log('using type', type.name, type.skuCode);
      }
    }

    await ensureBinding(token, type.id, meshSize.id, 10);
    await ensureBinding(token, type.id, size.id, 20);

    let schema = (await req(
      'GET',
      `/attribute-definitions/schema/${type.id}?includeInactive=true`,
      token,
    )).schema || [];
    const meshBinding = bindingOf(schema, 'mesh_size');
    const sizeBinding = bindingOf(schema, 'size');
    if (!meshBinding?.binding?.id || !sizeBinding?.binding?.id) {
      throw new Error(`${type.name} missing mesh_size/size bindings`);
    }
    for (const entry of [meshBinding, sizeBinding]) {
      if (entry.binding.isRequired && entry.binding.valueScope === 'PRODUCT' && entry.binding.isActive !== false) {
        continue;
      }
      await req('PATCH', `/attribute-definitions/bindings/${entry.binding.id}`, token, {
        isActive: true,
        isRequired: true,
        valueScope: 'PRODUCT',
      });
    }

    const liveType = (await req('GET', `/product-taxonomy/types/${type.id}`, token)).productType || type;
    if (!liveType.displayNameRule || hasOnlyTypeToken(liveType.displayNameRule)) {
      await req('PATCH', `/product-taxonomy/types/${type.id}`, token, {
        displayNameRule: steelMeshDisplayNameRule({
          meshSizeId: meshBinding.definition.id,
          sizeId: sizeBinding.definition.id,
        }),
      });
    }

    schema = (await req('GET', `/attribute-definitions/schema/${type.id}`, token)).schema || [];
    const meshId = bindingOf(schema, 'mesh_size')?.definition?.id;
    const sizeId = bindingOf(schema, 'size')?.definition?.id;
    const listed = (await req(
      'GET',
      `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=200`,
      token,
    )).items || [];
    const existingSkus = new Set(listed.map((item) => item.sku));
    const rows = steelMeshIdentityRows(spec);
    let created = 0;
    let reused = 0;
    for (const row of rows) {
      const result = await req('POST', '/products', token, {
        productTypeId: type.id,
        attributeValues: {
          [meshId]: row.meshSize,
          [sizeId]: row.size,
        },
        confirmDuplicate: true,
      });
      const product = result.product;
      const known = existingSkus.has(product.sku);
      if (known) reused += 1;
      else {
        created += 1;
        existingSkus.add(product.sku);
      }
      console.log(known ? 'reuse' : 'create', product.generatedName, product.sku);
    }
    summary.push({ type: spec.name, total: rows.length, created, reused });
  }

  console.log('done', summary);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
