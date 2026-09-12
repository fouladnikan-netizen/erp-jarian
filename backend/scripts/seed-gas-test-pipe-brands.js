#!/usr/bin/env node
/**
 * Insert missing gas-test-pipe mills into Brand registry and bind them on
 * لوله تست گاز. Reuses SEPAHAN / SAVEH / SEPANTA — does not create duplicates.
 *
 *   node backend/scripts/seed-gas-test-pipe-brands.js
 */
import {
  GAS_TEST_PIPE_MILLS,
  STEEL_BRANDS,
} from '../src/domain/productMaster/steelBrandCatalog.js';
import { GAS_TEST_PIPE_TYPE_NAME } from '../src/domain/productMaster/gasTestPipeCatalog.js';
import { skuCodeKey } from '../src/domain/productMaster/skuCode.js';

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

function catalogBrand(skuCode) {
  return STEEL_BRANDS.find((row) => row.skuCode === skuCode) || null;
}

function findExisting(mill, brands, bySku) {
  const byCode = bySku.get(skuCodeKey(mill.skuCode));
  if (byCode) return byCode;
  const catalog = catalogBrand(mill.skuCode);
  const names = new Set(
    [mill.existingBrandName, mill.marketName, catalog?.brandName].filter(Boolean),
  );
  return brands.find((row) => names.has(row.brandName)) || null;
}

async function main() {
  const login = await req('POST', '/auth/login', null, {
    username: process.env.JARIAN_SEED_USER || 'admin',
    password: process.env.JARIAN_SEED_PASSWORD || 'Admin123!',
  });
  const token = login.accessToken || login.token;
  if (!token) throw new Error('login returned no token');

  const brands = (await req('GET', '/brands?includeInactive=true', token)).items || [];
  const bySku = new Map(brands.filter((row) => row.skuCode).map((row) => [skuCodeKey(row.skuCode), row]));

  const types = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const type = types.find((row) => row.name === GAS_TEST_PIPE_TYPE_NAME);
  if (!type) throw new Error('product type لوله تست گاز not found');

  const duplicates = [];
  const created = [];
  const boundIds = [];

  for (const mill of GAS_TEST_PIPE_MILLS) {
    const existing = findExisting(mill, brands, bySku);
    if (existing) {
      duplicates.push({
        marketName: mill.marketName,
        existingBrandName: existing.brandName,
        skuCode: existing.skuCode,
      });
      boundIds.push(existing.id);
      continue;
    }
    const catalog = catalogBrand(mill.skuCode);
    if (!catalog) {
      throw new Error(`catalog is missing brand ${mill.skuCode} for ${mill.marketName}`);
    }
    const result = await req('POST', '/brands', token, {
      brandName: catalog.brandName,
      legalName: catalog.legalName,
      nameLatin: catalog.nameLatin || mill.nameLatin,
      skuCode: catalog.skuCode,
      confirmDuplicate: true,
    });
    const brand = result.brand;
    bySku.set(skuCodeKey(brand.skuCode), brand);
    brands.push(brand);
    created.push({
      marketName: mill.marketName,
      brandName: brand.brandName,
      skuCode: brand.skuCode,
    });
    boundIds.push(brand.id);
  }

  const previous = Array.isArray(type.allowedBrandIds) ? type.allowedBrandIds : [];
  const uniqueIds = [...new Set([...previous, ...boundIds])];
  await req('PATCH', `/product-taxonomy/types/${type.id}`, token, {
    allowedBrandIds: uniqueIds,
  });

  console.log('duplicates', JSON.stringify(duplicates, null, 2));
  console.log('created', JSON.stringify(created, null, 2));
  console.log('bound', { type: type.name, count: uniqueIds.length, mergedFrom: previous.length });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
