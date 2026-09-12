#!/usr/bin/env node
/**
 * Insert missing spiral-pipe mills into Brand registry and bind them on
 * لوله اسپیرال. Does not reuse SPIRAL / PARDIS / AGS / ATIYEH.
 *
 *   node backend/scripts/seed-spiral-pipe-brands.js
 */
import {
  SPIRAL_PIPE_MILLS,
  STEEL_BRANDS,
} from '../src/domain/productMaster/steelBrandCatalog.js';
import { SPIRAL_PIPE_TYPE_NAME } from '../src/domain/productMaster/spiralPipeCatalog.js';
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
  const type = types.find((row) => row.name === SPIRAL_PIPE_TYPE_NAME);
  if (!type) throw new Error('product type لوله اسپیرال not found');

  const duplicates = [];
  const created = [];
  const boundIds = [];

  for (const mill of SPIRAL_PIPE_MILLS) {
    const existing = bySku.get(skuCodeKey(mill.skuCode));
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
    created.push({
      marketName: mill.marketName,
      brandName: brand.brandName,
      skuCode: brand.skuCode,
    });
    boundIds.push(brand.id);
  }

  const uniqueIds = [...new Set(boundIds)];
  await req('PATCH', `/product-taxonomy/types/${type.id}`, token, {
    allowedBrandIds: uniqueIds,
  });

  console.log('duplicates', JSON.stringify(duplicates, null, 2));
  console.log('created', JSON.stringify(created, null, 2));
  console.log('bound', { type: type.name, count: uniqueIds.length });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
