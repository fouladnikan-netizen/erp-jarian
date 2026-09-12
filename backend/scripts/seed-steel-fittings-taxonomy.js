#!/usr/bin/env node
/**
 * Idempotent seed: categories + product types under the Steel Fittings group.
 * Uses the Product Taxonomy API (backend allocates sku_code).
 */
import { FLANGE_TYPE_LATIN_BY_NAME, FLANGE_TYPE_NAME_ALIASES } from '../src/domain/productMaster/flangeCatalog.js';

const BASE = process.env.API_BASE || 'http://localhost:3100/api/v1';

const CATALOG = {
  groupName: 'اتصالات فولادی',
  groupNameLatin: 'Steel Fittings',
  fallbackGroupNames: ['اتصالات'],
  categories: [
    {
      name: 'اتصالات جوشی درزدار',
      nameLatin: 'Welded Fittings - Seamed',
      types: [
        { name: 'زانو ۹۰ درجه درزدار', nameLatin: 'Welded Elbow 90° (Seamed)' },
        { name: 'زانو ۴۵ درجه درزدار', nameLatin: 'Welded Elbow 45° (Seamed)' },
        { name: 'سه راهی مساوی درزدار', nameLatin: 'Welded Equal Tee (Seamed)' },
        { name: 'سه راهی تبدیلی درزدار', nameLatin: 'Welded Reducing Tee (Seamed)' },
        { name: 'تبدیل هم‌مرکز درزدار', nameLatin: 'Welded Concentric Reducer (Seamed)' },
        { name: 'تبدیل غیرهم‌مرکز درزدار', nameLatin: 'Welded Eccentric Reducer (Seamed)' },
        { name: 'کپ درزدار (درپوش)', nameLatin: 'Welded Cap (Seamed)' },
      ],
    },
    {
      name: 'اتصالات جوشی مانیسمان',
      nameLatin: 'Welded Fittings - Seamless',
      types: [
        { name: 'زانو ۹۰ درجه مانیسمان', nameLatin: 'Welded Elbow 90° (Seamless)' },
        { name: 'زانو ۴۵ درجه مانیسمان', nameLatin: 'Welded Elbow 45° (Seamless)' },
        { name: 'زانو ۱۸۰ درجه مانیسمان (U-Bend)', nameLatin: 'Welded Return Bend 180° (Seamless)' },
        { name: 'سه راهی مساوی مانیسمان', nameLatin: 'Welded Equal Tee (Seamless)' },
        { name: 'سه راهی تبدیلی مانیسمان', nameLatin: 'Welded Reducing Tee (Seamless)' },
        { name: 'تبدیل هم‌مرکز مانیسمان', nameLatin: 'Welded Concentric Reducer (Seamless)' },
        { name: 'تبدیل غیرهم‌مرکز مانیسمان', nameLatin: 'Welded Eccentric Reducer (Seamless)' },
        { name: 'کپ مانیسمان (درپوش)', nameLatin: 'Welded Cap (Seamless)' },
        { name: 'تبدیل لبه‌دار (استب اند)', nameLatin: 'Stub End (Seamless)' },
      ],
    },
    {
      name: 'اتصالات فشار قوی و فورج',
      nameLatin: 'Forged High-Pressure Fittings',
      types: [
        { name: 'زانو ساکت‌ولد', nameLatin: 'Socket-Weld Elbow' },
        { name: 'سه راهی مساوی ساکت‌ولد', nameLatin: 'Socket-Weld Equal Tee' },
        { name: 'سه راهی تبدیلی ساکت‌ولد', nameLatin: 'Socket-Weld Reducing Tee' },
        { name: 'کاپلینگ ساکت‌ولد (بوشن)', nameLatin: 'Socket-Weld Coupling' },
        { name: 'نیم‌بوشن ساکت‌ولد', nameLatin: 'Socket-Weld Half Coupling' },
        { name: 'مهره ماسوره ساکت‌ولد', nameLatin: 'Socket-Weld Union' },
        { name: 'کپ ساکت‌ولد', nameLatin: 'Socket-Weld Cap' },
        { name: 'تردوولت / ساکوولت (اتصالات انشعابی)', nameLatin: 'Threadolet / Sockolet' },
        { name: 'زانو دنده‌ای فشار قوی', nameLatin: 'Forged Threaded Elbow' },
        { name: 'سه راهی دنده‌ای فشار قوی', nameLatin: 'Forged Threaded Tee' },
        { name: 'مغزی فشار قوی', nameLatin: 'Forged Hex Nipple' },
      ],
    },
    {
      name: 'اتصالات دنده‌ای',
      nameLatin: 'Threaded / Screwed Fittings',
      types: [
        { name: 'زانو دنده‌ای', nameLatin: 'Threaded Elbow' },
        { name: 'سه راهی مساوی دنده‌ای', nameLatin: 'Threaded Equal Tee' },
        { name: 'سه راهی تبدیلی دنده‌ای', nameLatin: 'Threaded Reducing Tee' },
        { name: 'چپقی دنده‌ای (زانو مغزی)', nameLatin: 'Threaded Street Elbow' },
        { name: 'مغزی دنده‌ای', nameLatin: 'Hex Nipple' },
        { name: 'بوشن دنده‌ای', nameLatin: 'Threaded Coupling / Socket' },
        { name: 'تبدیل دنده‌ای (روپیچ توپیچ)', nameLatin: 'Threaded Bushing' },
        { name: 'مهره ماسوره دنده‌ای', nameLatin: 'Threaded Union' },
        { name: 'درپوش دنده‌ای (چهارگوش/شش‌گوش)', nameLatin: 'Threaded Plug / Cap' },
      ],
    },
    {
      name: 'فلنج‌ها',
      nameLatin: 'Industrial Flanges',
      types: [
        { name: 'فلنج گلودار جوشی', nameLatin: FLANGE_TYPE_LATIN_BY_NAME['فلنج گلودار جوشی'] },
        { name: 'فلنج اسلیپون (روکار)', nameLatin: FLANGE_TYPE_LATIN_BY_NAME['فلنج اسلیپون (روکار)'] },
        { name: 'فلنج کور', nameLatin: FLANGE_TYPE_LATIN_BY_NAME['فلنج کور'] },
        { name: 'فلنج ساکت‌ولد', nameLatin: FLANGE_TYPE_LATIN_BY_NAME['فلنج ساکت‌ولد'] },
        { name: 'فلنج دنده‌ای', nameLatin: FLANGE_TYPE_LATIN_BY_NAME['فلنج دنده‌ای'] },
        { name: 'فلنج لبه‌دار', nameLatin: FLANGE_TYPE_LATIN_BY_NAME['فلنج لبه‌دار'] },
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
  } else if (!sameName(group.name, CATALOG.groupName) || group.nameLatin !== CATALOG.groupNameLatin) {
    const patched = await json('PATCH', `/product-taxonomy/groups/${group.id}`, token, {
      name: CATALOG.groupName,
      nameLatin: CATALOG.groupNameLatin,
    });
    if (patched.status !== 200) {
      throw new Error(`Rename group failed (${patched.status}): ${JSON.stringify(patched.data)}`);
    }
    group = patched.data.group;
    console.log('updated group', group.name, group.id);
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
      const found = existingTypes.find((t) => sameName(t.name, typeSpec.name))
        || existingTypes.find((t) => sameName(FLANGE_TYPE_NAME_ALIASES[t.name], typeSpec.name));
      if (found) {
        if (found.name !== typeSpec.name || found.nameLatin !== typeSpec.nameLatin) {
          const patched = await json('PATCH', `/product-taxonomy/types/${found.id}`, token, {
            name: typeSpec.name,
            nameLatin: typeSpec.nameLatin,
          });
          if (patched.status !== 200) {
            console.warn('type patch skipped', typeSpec.name, patched.status, patched.data);
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
