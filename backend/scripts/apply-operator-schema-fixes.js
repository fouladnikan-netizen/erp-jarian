#!/usr/bin/env node
/**
 * Operator schema fixes (DDL-50):
 * - Unbind all attributes on پیچ و مهره types
 * - Convert mill grade to ENUM with type subsets
 * - Bed width ENUM; profile dimensions → width + height DECIMAL
 * - Alloy rebar size is TRANSACTION required
 * - Rebar size required; sheet thickness required
 *
 * Run: node backend/scripts/apply-operator-schema-fixes.js
 */
import { SEAMLESS_PIPE_GRADE_OPTIONS } from '../src/domain/productMaster/seamlessPipeCatalog.js';

const BASE = process.env.API_BASE || 'http://localhost:3100/api/v1';

const GRADE_CATALOG = [
  ...[
    'A1', 'A2', 'A3', 'A4',
    '3SP',
    'RST34-2', 'RST37-2',
    'SAE1006', 'SAE1008',
    'Ck15', 'Ck45', 'Ck60', 'Ck75',
    'Mo40', 'ST52-3', 'ST37-2',
    'VCN150', 'VCN200',
    '1.5714', '1.7131', '1.2510', '1.251', '1.2344',
  ].map((value) => ({ value, labelFa: value === '1.251' ? '1.2510 / O1' : value })),
  ...SEAMLESS_PIPE_GRADE_OPTIONS,
];

const GRADE_SUBSETS = {
  'میلگرد آجدار': ['A2', 'A3', 'A4'],
  'میلگرد کلاف': ['3SP', 'A1', 'A2', 'A3', 'RST34-2', 'RST37-2', 'SAE1006', 'SAE1008'],
  'میلگرد حرارتی': ['A1', 'A2', 'A3'],
  'میلگرد آلیاژی': [
    '1.5714', '1.7131', 'Ck15', 'Ck45', 'Ck60', 'Ck75', 'Mo40',
    'ST52-3', 'VCN150', 'VCN200', '1.251', 'ST37-2', '1.2344',
  ],
};

const PROFILE_TYPES = ['پروفیل', 'پروفیل مبلی', 'پروفیل صنعتی', 'پروفیل گالوانیزه', 'پروفیل زد'];
const REBAR_TYPES = ['میلگرد آجدار', 'میلگرد آلیاژی', 'میلگرد حرارتی', 'میلگرد کلاف', 'میلگرد ساده', 'میلگرد بستر'];
const SHEET_HINTS = ['ورق'];

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

function byName(items, name) {
  return items.find((item) => item.name === name) || null;
}

function defByCode(defs, code) {
  return defs.find((d) => d.code === code) || null;
}

function bindingOf(schema, code) {
  return (schema || []).find((e) => e.definition?.code === code) || null;
}

async function unbindAttribute(token, entry) {
  if (!entry?.binding?.id) return;
  await req('DELETE', `/attribute-definitions/bindings/${entry.binding.id}`, token);
}

async function ensureBound(token, typeId, defId, patch) {
  const schema = (await req('GET', `/attribute-definitions/schema/${typeId}?includeInactive=true`, token)).schema || [];
  const existing = schema.find((e) => e.definition.id === defId);
  if (existing?.binding) {
    await req('PATCH', `/attribute-definitions/bindings/${existing.binding.id}`, token, {
      isActive: true,
      ...patch,
    });
    return;
  }
  await req('POST', '/attribute-definitions/bindings', token, {
    productTypeId: typeId,
    attributeDefinitionId: defId,
    ...patch,
  });
}

async function main() {
  const login = await req('POST', '/auth/login', null, { username: 'admin', password: 'Admin123!' });
  const token = login.accessToken || login.token;
  const groups = (await req('GET', '/product-taxonomy/groups', token)).items;
  const categories = (await req('GET', '/product-taxonomy/categories', token)).items;
  const types = (await req('GET', '/product-taxonomy/types', token)).items;
  let defs = (await req('GET', '/attribute-definitions', token)).items;
  const catsById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const groupsById = Object.fromEntries(groups.map((g) => [g.id, g]));

  const typesWithGroup = types.map((t) => {
    const cat = catsById[t.categoryId];
    const group = cat ? groupsById[cat.groupId] : null;
    return { ...t, categoryName: cat?.name, groupName: group?.name };
  });

  // 1. Unbind every attribute on پیچ و مهره
  let fastenerUnbound = 0;
  for (const type of typesWithGroup.filter((t) => t.groupName === 'پیچ و مهره')) {
    const schema = (await req('GET', `/attribute-definitions/schema/${type.id}?includeInactive=true`, token)).schema || [];
    for (const entry of schema) {
      if (entry.binding?.isActive) {
        await unbindAttribute(token, entry);
        fastenerUnbound += 1;
      }
    }
    console.log('unbound fasteners', type.name);
  }
  console.log('fastener bindings deactivated', fastenerUnbound);

  // 2. grade → ENUM + type subsets
  const grade = defByCode(defs, 'grade');
  if (!grade) throw new Error('grade definition missing');
  await req('PATCH', `/attribute-definitions/${grade.id}`, token, {
    dataType: 'ENUM',
    allowedValues: GRADE_CATALOG,
  });
  for (const [typeName, subset] of Object.entries(GRADE_SUBSETS)) {
    const type = typesWithGroup.find((t) => t.name === typeName && t.groupName === 'مقاطع فولادی');
    if (!type) throw new Error(`type missing ${typeName}`);
    await ensureBound(token, type.id, grade.id, {
      isRequired: true,
      valueScope: 'PRODUCT',
      overrideAllowedValues: subset,
      sortOrder: 10,
    });
    console.log('grade ENUM', typeName, subset.join(','));
  }
  const plain = typesWithGroup.find((t) => t.name === 'میلگرد ساده');
  if (plain) {
    await ensureBound(token, plain.id, grade.id, {
      isRequired: false,
      valueScope: 'PRODUCT',
      overrideAllowedValues: ['A1'],
      sortOrder: 20,
    });
  }

  // 3. میلگرد بستر: عرض بستر ENUM (سه سایز انتخابی). Shared DECIMAL width stays off this Type.
  defs = (await req('GET', '/attribute-definitions', token)).items;
  let bedWidth = defByCode(defs, 'bed_width');
  if (!bedWidth) {
    const created = await req('POST', '/attribute-definitions', token, {
      code: 'bed_width',
      nameFa: 'عرض بستر',
      dataType: 'ENUM',
      allowedValues: [
        { value: '5.5', labelFa: '۵٫۵ سانتی‌متر' },
        { value: '11', labelFa: '۱۱ سانتی‌متر' },
        { value: '15', labelFa: '۱۵ سانتی‌متر' },
      ],
    });
    bedWidth = created.attributeDefinition;
  }
  const bed = typesWithGroup.find((t) => t.name === 'میلگرد بستر');
  if (bed) {
    const schema = (await req('GET', `/attribute-definitions/schema/${bed.id}?includeInactive=true`, token)).schema || [];
    await unbindAttribute(token, bindingOf(schema, 'dimensions'));
    await ensureBound(token, bed.id, bedWidth.id, {
      isRequired: true,
      valueScope: 'PRODUCT',
      sortOrder: 10,
    });
    console.log('bed_width bound on میلگرد بستر');
  }

  // 4. profile width + height DECIMAL; unbind dimensions
  defs = (await req('GET', '/attribute-definitions', token)).items;
  let width = defByCode(defs, 'width');
  if (!width) {
    const created = await req('POST', '/attribute-definitions', token, {
      code: 'width',
      nameFa: 'عرض',
      dataType: 'DECIMAL',
    });
    width = created.attributeDefinition;
  }
  const height = defByCode(defs, 'height');
  if (!height) throw new Error('height definition missing');
  for (const typeName of PROFILE_TYPES) {
    const type = typesWithGroup.find((t) => t.name === typeName && t.groupName === 'مقاطع فولادی');
    if (!type) {
      console.log('skip missing profile type', typeName);
      continue;
    }
    const schema = (await req('GET', `/attribute-definitions/schema/${type.id}?includeInactive=true`, token)).schema || [];
    await unbindAttribute(token, bindingOf(schema, 'dimensions'));
    await ensureBound(token, type.id, width.id, { isRequired: true, valueScope: 'PRODUCT', sortOrder: 10 });
    await ensureBound(token, type.id, height.id, { isRequired: true, valueScope: 'PRODUCT', sortOrder: 20 });
    console.log('profile width/height', typeName);
  }

  // 5. mill rebar size is PRODUCT required, except alloy (grade-only identity)
  const size = defByCode(defs, 'size');
  for (const typeName of REBAR_TYPES) {
    const type = typesWithGroup.find((t) => t.name === typeName && t.groupName === 'مقاطع فولادی');
    if (!type || !size) continue;
    if (typeName === 'میلگرد آلیاژی') {
      await ensureBound(token, type.id, size.id, {
        isRequired: false,
        valueScope: 'PRODUCT',
        sortOrder: 0,
      });
      console.log('size', typeName, 'PRODUCT optional (not identity)');
      continue;
    }
    await ensureBound(token, type.id, size.id, {
      isRequired: true,
      valueScope: 'PRODUCT',
      sortOrder: typeName === 'میلگرد بستر' ? 20 : 20,
    });
    console.log('size', typeName, 'PRODUCT');
  }

  // 6. sheet thickness required
  const thickness = defByCode(defs, 'thickness');
  for (const type of typesWithGroup) {
    if (type.groupName !== 'مقاطع فولادی') continue;
    if (!SHEET_HINTS.some((h) => (type.categoryName || '').includes(h) || type.name.includes(h))) continue;
    if (!thickness) continue;
    await ensureBound(token, type.id, thickness.id, {
      isRequired: true,
      valueScope: 'PRODUCT',
      sortOrder: 10,
    });
    console.log('thickness required', type.name);
  }

  console.log('done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
