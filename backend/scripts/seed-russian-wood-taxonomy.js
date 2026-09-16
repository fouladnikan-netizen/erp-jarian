#!/usr/bin/env node
/**
 * Idempotent seed: rename live group چوب → چوب روسی, add footboard/plywood
 * categories and Types. Leaves empty legacy cats چوب طبیعی / فرآورده‌های چوبی.
 * Does not bind schema or create Products (see seed-russian-wood-products.js).
 *
 *   node backend/scripts/seed-russian-wood-taxonomy.js
 */
import { RUSSIAN_WOOD_TAXONOMY } from '../src/domain/productMaster/russianWoodCatalog.js';

const BASE = process.env.API_BASE || 'http://localhost:3100/api/v1';
const CATALOG = RUSSIAN_WOOD_TAXONOMY;

async function json(method, path, token, body) {
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
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

function sameName(a, b) {
  const n = (v) =>
    String(v || '')
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/[\u200c\u200d]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  return n(a) === n(b);
}

async function main() {
  const login = await json('POST', '/auth/login', null, {
    username: process.env.JARIAN_SEED_USER || 'admin',
    password: process.env.JARIAN_SEED_PASSWORD || 'Admin123!',
  });
  if (login.status !== 200) {
    throw new Error(`Login failed (${login.status}): ${JSON.stringify(login.data)}`);
  }
  const token = login.data.accessToken || login.data.token;

  const groupsRes = await json('GET', '/product-taxonomy/groups?includeInactive=true', token);
  const groups = groupsRes.data?.items || [];
  let group =
    groups.find((g) => sameName(g.name, CATALOG.groupName))
    || groups.find((g) => CATALOG.fallbackGroupNames.some((n) => sameName(g.name, n)));

  if (!group) {
    const created = await json('POST', '/product-taxonomy/groups', token, {
      name: CATALOG.groupName,
      nameLatin: CATALOG.groupNameLatin,
    });
    if (created.status !== 201 && created.status !== 200) {
      throw new Error(`Create group failed (${created.status}): ${JSON.stringify(created.data)}`);
    }
    group = created.data.group;
    console.log('created group', group.name, group.id);
  } else if (!sameName(group.name, CATALOG.groupName) || group.nameLatin !== CATALOG.groupNameLatin) {
    const patched = await json('PATCH', `/product-taxonomy/groups/${group.id}`, token, {
      name: CATALOG.groupName,
      nameLatin: CATALOG.groupNameLatin,
    });
    if (patched.status !== 200) {
      throw new Error(`Rename group failed (${patched.status}): ${JSON.stringify(patched.data)}`);
    }
    group = patched.data.group;
    console.log('renamed group', group.name, group.id);
  } else {
    console.log('using group', group.name, group.id);
  }

  const catsRes = await json(
    'GET',
    `/product-taxonomy/categories?groupId=${encodeURIComponent(group.id)}&includeInactive=true`,
    token,
  );
  const existingCats = catsRes.data?.items || [];
  const summary = { categoriesCreated: 0, typesCreated: 0, typesSkipped: 0 };

  for (const catSpec of CATALOG.categories) {
    let category = existingCats.find((c) => sameName(c.name, catSpec.name));
    if (!category) {
      const created = await json('POST', '/product-taxonomy/categories', token, {
        groupId: group.id,
        name: catSpec.name,
        nameLatin: catSpec.nameLatin,
      });
      if (created.status !== 201 && created.status !== 200) {
        throw new Error(`Create category "${catSpec.name}" failed (${created.status}): ${JSON.stringify(created.data)}`);
      }
      category = created.data.category;
      existingCats.push(category);
      summary.categoriesCreated += 1;
      console.log('created category', category.name);
    } else if (catSpec.nameLatin && category.nameLatin !== catSpec.nameLatin) {
      const patched = await json('PATCH', `/product-taxonomy/categories/${category.id}`, token, {
        nameLatin: catSpec.nameLatin,
      });
      if (patched.status === 200) category = patched.data.category;
      console.log('using category', category.name);
    } else {
      console.log('using category', category.name);
    }

    const typesRes = await json(
      'GET',
      `/product-taxonomy/types?categoryId=${encodeURIComponent(category.id)}&includeInactive=true`,
      token,
    );
    const existingTypes = typesRes.data?.items || [];
    for (const [typeIndex, typeSpec] of catSpec.types.entries()) {
      const found = existingTypes.find((t) => sameName(t.name, typeSpec.name));
      if (found) {
        if (found.nameLatin !== typeSpec.nameLatin) {
          const patched = await json('PATCH', `/product-taxonomy/types/${found.id}`, token, {
            nameLatin: typeSpec.nameLatin,
          });
          if (patched.status !== 200) {
            console.warn('latin patch skipped', typeSpec.name, patched.status, patched.data);
          }
        }
        summary.typesSkipped += 1;
        continue;
      }
      const created = await json('POST', '/product-taxonomy/types', token, {
        categoryId: category.id,
        name: typeSpec.name,
        nameLatin: typeSpec.nameLatin,
        sortOrder: typeIndex + 1,
      });
      if (created.status !== 201 && created.status !== 200) {
        throw new Error(`Create type "${typeSpec.name}" failed (${created.status}): ${JSON.stringify(created.data)}`);
      }
      summary.typesCreated += 1;
      console.log('  created type', created.data.productType?.name);
    }
  }

  console.log('done', JSON.stringify({
    group: group.name,
    groupId: group.id,
    ...summary,
    leftoverEmptyCats: existingCats
      .filter((c) => !CATALOG.categories.some((spec) => sameName(spec.name, c.name)))
      .map((c) => c.name),
  }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
