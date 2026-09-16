#!/usr/bin/env node
/**
 * Idempotent seed: fastener Group / Categories / Types under پیچ و مهره.
 * Does not recreate Types that already exist and does not bind schema.
 * Product identity (fastener_grade) + TRANSACTION size/length live in
 * `seed-fastener-products.js` (DDL-64). Do not re-bind mill size/grade as
 * required PRODUCT identity here.
 */
const BASE = process.env.API_BASE || 'http://localhost:3100/api/v1';

const CATALOG = {
  groupName: 'پیچ و مهره',
  groupNameLatin: 'Fasteners',
  fallbackGroupNames: [],
  categories: [
    {
      name: 'پیچ',
      nameLatin: 'Industrial Bolts',
      types: [
        { name: 'پیچ شش‌گوش آچاری', nameLatin: 'Hex Bolt' },
        { name: 'پیچ آلن با سر (استوانه‌ای)', nameLatin: 'Hex Socket Head Cap Screw' },
        { name: 'پیچ آلن سرتخت (خزینه)', nameLatin: 'Countersunk Socket Screw' },
        { name: 'پیچ آلن مغزی', nameLatin: 'Socket Set Screw' },
        { name: 'پیچ متری', nameLatin: 'Threaded Rod' },
        { name: 'استاد بولت (پیچ دو سر دنده)', nameLatin: 'Stud Bolt' },
        { name: 'پیچ اطاقی', nameLatin: 'Carriage Bolt' },
      ],
    },
    {
      name: 'مهره',
      nameLatin: 'Industrial Nuts',
      types: [
        { name: 'مهره شش‌گوش معمولی', nameLatin: 'Hex Nut' },
        { name: 'مهره شش‌گوش سنگین (صنعتی)', nameLatin: 'Heavy Hex Nut' },
        { name: 'مهره قفلی (کاسه نمدی)', nameLatin: 'Nylon Insert Lock Nut' },
        { name: 'مهره واشردار', nameLatin: 'Hex Flange Nut' },
        { name: 'مهره کاسه‌دار (گنبدی)', nameLatin: 'Hex Cap / Acorn Nut' },
        { name: 'مهره پروانه‌ای (خروسکی)', nameLatin: 'Wing Nut' },
        { name: 'مهره باریک (شش‌گوش نیم‌ارتفاع)', nameLatin: 'Hex Jam Nut' },
      ],
    },
    {
      name: 'واشر',
      nameLatin: 'Washers',
      types: [
        { name: 'واشر تخت معمولی', nameLatin: 'Plain / Flat Washer' },
        { name: 'واشر تخت پهن', nameLatin: 'Fender Washer' },
        { name: 'واشر فنری', nameLatin: 'Spring Split Lock Washer' },
        { name: 'واشر ستاره‌ای (خورشیدی)', nameLatin: 'Internal / External Tooth Lock Washer' },
        { name: 'واشر چهارگوش (مخصوص نبشی/تیرآهن)', nameLatin: 'Square Washer' },
      ],
    },
    {
      name: 'انکر بولت و رول بولت',
      nameLatin: 'Anchor Bolts & Expansion Bolts',
      types: [
        { name: 'رول بولت غلافی معمولی', nameLatin: 'Sleeve Anchor' },
        { name: 'رول بولت پروانه‌ای (مخصوص کناف)', nameLatin: 'Toggle Bolt / Hollow Wall Anchor' },
        { name: 'انکر بولت ال‌شکل (کاشت بتن)', nameLatin: 'L-Shape Anchor Bolt' },
        { name: 'انکر بولت ضربه‌ای (تکه‌ای)', nameLatin: 'Drop-In Anchor' },
        { name: 'رول بولت HSA / غلافی سنگین', nameLatin: 'Heavy Duty Shield Anchor' },
      ],
    },
    {
      name: 'پیچ سرمته',
      nameLatin: 'Self-Drilling Screws',
      types: [
        { name: 'پیچ سرمته‌ای واشردار (شیروانی)', nameLatin: 'Hex Washer Head Self-Drilling Screw' },
        { name: 'پیچ سرمته‌ای سرتخت (خزینه)', nameLatin: 'Flat Head Self-Drilling Screw' },
        { name: 'پیچ سرمته‌ای سرگرد (پانچی)', nameLatin: 'Pan Head Self-Drilling Screw' },
        { name: 'پیچ سازه به سازه (نوک مته‌ای)', nameLatin: 'Framing Self-Drilling Screw' },
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
      summary.categoriesCreated += 1;
      console.log('created category', category.name);
    } else {
      if (catSpec.nameLatin && category.nameLatin !== catSpec.nameLatin) {
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

    for (const [typeIndex, typeSpec] of catSpec.types.entries()) {
      let type = existingTypes.find((t) => sameName(t.name, typeSpec.name));
      if (!type) {
        const created = await json('POST', '/product-taxonomy/types', token, {
          categoryId: category.id,
          name: typeSpec.name,
          nameLatin: typeSpec.nameLatin,
          sortOrder: typeIndex + 1,
        });
        if (created.status !== 201 && created.status !== 200) {
          throw new Error(`Create type "${typeSpec.name}" failed (${created.status}): ${JSON.stringify(created.data)}`);
        }
        type = created.data.productType;
        summary.typesCreated += 1;
        console.log('  created type', type.name);
      } else {
        if (type.nameLatin !== typeSpec.nameLatin) {
          await json('PATCH', `/product-taxonomy/types/${type.id}`, token, { nameLatin: typeSpec.nameLatin });
        }
        summary.typesSkipped += 1;
      }
    }
  }

  console.log('done', JSON.stringify(summary));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
