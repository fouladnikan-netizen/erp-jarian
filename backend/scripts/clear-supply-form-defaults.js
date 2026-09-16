#!/usr/bin/env node
/**
 * Clear implicit «شیت برش خورده» when حالت عرضه is not selected.
 * - Drops Attribute Definition defaultValue on supply_form
 * - Clears Type-binding پیش‌فرض on every supply_form binding
 * - Removes supply_form tokens from Product display-name rules
 * Does not rewrite identity/SKU. TRANSACTION supply_form stays unbound on Product.
 *
 *   node backend/scripts/clear-supply-form-defaults.js
 */
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

function withoutSupplyFormTokens(rule, definitionId) {
  const tokens = Array.isArray(rule?.tokens) ? rule.tokens : [];
  const next = tokens.filter((token) => token?.attributeId !== definitionId);
  if (next.length === tokens.length) return null;
  return {
    separator: rule?.separator || ' ',
    tokens: next.map((token, order) => ({ ...token, order })),
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
  const supplyForm = defs.find((row) => row.code === 'supply_form');
  if (!supplyForm?.id) throw new Error('supply_form definition not found');

  if (supplyForm.defaultValue) {
    await req('PATCH', `/attribute-definitions/${supplyForm.id}`, token, { defaultValue: null });
    console.log('cleared definition default', supplyForm.defaultValue);
  } else {
    console.log('definition default already empty');
  }

  const types = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const results = [];
  for (const type of types) {
    const schema = (await req(
      'GET',
      `/attribute-definitions/schema/${type.id}?includeInactive=true`,
      token,
    )).schema || [];
    const entry = schema.find((row) => row.definition?.code === 'supply_form');
    if (!entry?.binding?.id) continue;

    const beforeDefault = entry.binding.overrideDefaultValue ?? null;
    if (beforeDefault) {
      await req('PATCH', `/attribute-definitions/bindings/${entry.binding.id}`, token, {
        overrideDefaultValue: null,
      });
    }

    const nextRule = withoutSupplyFormTokens(type.displayNameRule, entry.definition.id);
    if (nextRule) {
      await req('PATCH', `/product-taxonomy/types/${type.id}`, token, { displayNameRule: nextRule });
    }

    results.push({
      type: type.name,
      clearedBindingDefault: beforeDefault,
      strippedDisplayToken: Boolean(nextRule),
    });
    console.log(type.name, beforeDefault || '—', nextRule ? 'rule' : 'rule-ok');
  }

  console.log('done', {
    definitionId: supplyForm.id,
    types: results.length,
    results,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
