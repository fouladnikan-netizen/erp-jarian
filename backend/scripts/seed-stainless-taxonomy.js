#!/usr/bin/env node
/**
 * Idempotent seed: categories + product types under Stainless Steel.
 * Uses the Product Taxonomy API (backend allocates sku_code).
 */
const BASE = process.env.API_BASE || 'http://localhost:3100/api/v1';

const CATALOG = {
  groupName: 'استنلس استیل',
  groupNameLatin: 'Stainless Steel',
  fallbackGroupNames: [],
  categories: [
    {
      name: 'ورق استیل',
      nameLatin: 'Stainless Steel Sheets',
      types: [
        { name: 'ورق استیل ۳۰۴L', nameLatin: 'Stainless Steel 304L Sheets' },
        { name: 'ورق استیل ۳۱۶L', nameLatin: 'Stainless Steel 316L Sheets' },
        { name: 'ورق استیل دابلکس ۲۲۰۵', nameLatin: 'Duplex 2205 Stainless Steel Sheets' },
        { name: 'ورق استیل سوپر دابلکس ۲۵۰۷', nameLatin: 'Super Duplex 2507 Stainless Steel Sheets' },
        { name: 'ورق استیل ۴۳۰', nameLatin: 'Stainless Steel 430 Sheets' },
        { name: 'ورق استیل ۳۲۱', nameLatin: 'Stainless Steel 321 Sheets' },
        { name: 'ورق استیل ۳۱۰', nameLatin: 'Stainless Steel 310 Sheets' },
      ],
    },
    {
      name: 'لوله استیل',
      nameLatin: 'Stainless Steel Pipes & Tubes',
      types: [
        { name: 'لوله استیل ۳۰۴L', nameLatin: 'Stainless Steel 304L Pipes & Tubes' },
        { name: 'لوله استیل ۳۱۶L', nameLatin: 'Stainless Steel 316L Pipes & Tubes' },
        { name: 'لوله استیل دابلکس ۲۲۰۵', nameLatin: 'Duplex 2205 Stainless Steel Pipes & Tubes' },
        { name: 'لوله استیل سوپر دابلکس ۲۵۰۷', nameLatin: 'Super Duplex 2507 Stainless Steel Pipes & Tubes' },
        { name: 'لوله استیل ۴۳۰', nameLatin: 'Stainless Steel 430 Pipes & Tubes' },
      ],
    },
    {
      name: 'میلگرد استیل',
      nameLatin: 'Stainless Steel Round Bars',
      types: [
        { name: 'میلگرد استیل ۳۰۴', nameLatin: 'Stainless Steel 304 Round Bars' },
        { name: 'میلگرد استیل ۳۱۶', nameLatin: 'Stainless Steel 316 Round Bars' },
        { name: 'میلگرد استیل ۳۲۱', nameLatin: 'Stainless Steel 321 Round Bars' },
        { name: 'میلگرد استیل ۴۲۰', nameLatin: 'Stainless Steel 420 Round Bars' },
      ],
    },
    {
      name: 'پروفیل استیل',
      nameLatin: 'Stainless Steel Profiles',
      types: [
        { name: 'پروفیل استیل ۳۰۴', nameLatin: 'Stainless Steel 304 Profiles' },
        { name: 'پروفیل استیل ۳۱۶', nameLatin: 'Stainless Steel 316 Profiles' },
      ],
    },
    {
      name: 'نبشی استیل',
      nameLatin: 'Stainless Steel Angles',
      types: [
        { name: 'نبشی استیل ۳۰۴', nameLatin: 'Stainless Steel 304 Angles' },
        { name: 'نبشی استیل ۳۱۶', nameLatin: 'Stainless Steel 316 Angles' },
      ],
    },
  ],
};

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
    username: 'admin',
    password: 'Admin123!',
  });
  if (login.status !== 200) {
    throw new Error(`Login failed (${login.status}): ${JSON.stringify(login.data)}`);
  }
  const token = login.data.accessToken || login.data.token;
  const groupsRes = await json('GET', '/product-taxonomy/groups?includeInactive=true', token);
  const groups = groupsRes.data?.items || [];
  let group =
    groups.find((g) => sameName(g.name, CATALOG.groupName)) ||
    groups.find((g) => CATALOG.fallbackGroupNames.some((n) => sameName(g.name, n)));

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
  } else {
    console.log('using group', group.name, group.id);
  }

  const catsRes = await json(
    'GET',
    `/product-taxonomy/categories?groupId=${encodeURIComponent(group.id)}&includeInactive=true`,
    token,
  );
  const existingCats = catsRes.data?.items || [];
  const summary = { categoriesCreated: 0, typesCreated: 0, skipped: 0 };

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
      summary.categoriesCreated += 1;
      console.log('created category', category.name);
    } else {
      if (category.nameLatin !== catSpec.nameLatin) {
        const patched = await json('PATCH', `/product-taxonomy/categories/${category.id}`, token, {
          nameLatin: catSpec.nameLatin,
        });
        if (patched.status === 200) category = patched.data.category;
      }
      console.log('using category', category.name);
    }

    const typesRes = await json(
      'GET',
      `/product-taxonomy/types?categoryId=${encodeURIComponent(category.id)}&includeInactive=true`,
      token,
    );
    const existingTypes = typesRes.data?.items || [];
    for (const typeSpec of catSpec.types) {
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
        summary.skipped += 1;
        continue;
      }
      const created = await json('POST', '/product-taxonomy/types', token, {
        categoryId: category.id,
        name: typeSpec.name,
        nameLatin: typeSpec.nameLatin,
      });
      if (created.status !== 201 && created.status !== 200) {
        throw new Error(`Create type "${typeSpec.name}" failed (${created.status}): ${JSON.stringify(created.data)}`);
      }
      summary.typesCreated += 1;
      console.log('  created type', created.data.productType?.name);
    }
  }

  console.log('done', JSON.stringify(summary));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
