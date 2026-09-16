#!/usr/bin/env node
/**
 * One-shot live Product Master audit. Writes MD + CSV under Docs/review-package.
 * Source of truth is the running API, not seed files.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.API_BASE || 'http://localhost:3100/api/v1';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = join(ROOT, 'Docs', 'review-package');
const LOGIN_USER = process.env.JARIAN_SEED_USER || 'admin';

const SCOPED_GROUPS = Object.freeze([
  'استنلس استیل',
  'اتصالات فولادی',
  'پیچ و مهره',
  'چوب روسی',
]);

const FITTING_STORED_CODES = Object.freeze([
  'size', 'length', 'sch', 'size_pipe', 'size_run', 'size_branch',
  'size_large', 'size_small', 'forged_class', 'flange_class', 'threaded_class',
  'class', 'kind', 'supply_form', 'elbow_angle', 'flange_facing', 'olet_style',
]);
const FASTENER_STORED_CODES = Object.freeze([
  'size', 'length', 'fastener_size', 'fastener_length', 'length_mm', 'coating',
  'head_style', 'kind', 'supply_form', 'sheet_length',
]);
const SELF_DRILL_HINT = 'سرمته';

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
  const n = (v) =>
    String(v || '')
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/[\u200c\u200d]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  return n(a) === n(b);
}

function isScopedGroup(name) {
  return SCOPED_GROUPS.some((g) => sameName(g, name));
}

function csvEscape(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function roleOf(binding) {
  if (!binding) return '';
  const scope = binding.valueScope || 'PRODUCT';
  const required = Boolean(binding.isRequired);
  if (scope === 'PRODUCT' && required) return 'Identity';
  if (scope === 'TRANSACTION' && required) return 'Order-required';
  if (scope === 'TRANSACTION' && !required) return 'Offer-variant';
  if (scope === 'PRODUCT' && !required) return 'optional PRODUCT';
  return '';
}

function rawStored(attr) {
  if (!attr) return '';
  if (attr.valueNumber != null && attr.valueNumber !== '') return String(attr.valueNumber);
  if (attr.valueBoolean != null) return String(attr.valueBoolean);
  if (attr.valueText != null && attr.valueText !== '') return String(attr.valueText);
  if (attr.normalizedValue != null && attr.normalizedValue !== '') return String(attr.normalizedValue);
  return '';
}

function displayStored(attr, definition) {
  const raw = rawStored(attr);
  if (!raw) return '';
  if (definition?.dataType === 'ENUM') {
    const opts = definition.effectiveAllowedValues || definition.allowedValues || [];
    const hit = opts.find((item) => String(item.value) === raw);
    if (hit?.labelFa) return hit.labelFa;
  }
  return raw;
}

function dash(value) {
  const s = value == null ? '' : String(value).trim();
  return s ? s : '—';
}

async function fetchProducts(token, typeId) {
  const limit = 500;
  const data = await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(typeId)}&includeInactive=true&limit=${limit}`,
    token,
  );
  const items = data.items || [];
  return { items, truncated: items.length >= limit };
}

function uomName(uoms, id) {
  if (!id) return '';
  return uoms.find((row) => row.id === id)?.nameFa || id;
}

async function main() {
  const login = await req('POST', '/auth/login', null, {
    username: LOGIN_USER,
    password: process.env.JARIAN_SEED_PASSWORD || 'Admin123!',
  });
  const token = login.accessToken || login.token;
  if (!token) throw new Error('login returned no token');

  const endpoints = {
    login: 'POST /auth/login',
    tree: 'GET /product-taxonomy/tree?includeInactive=true',
    types: 'GET /product-taxonomy/types?includeInactive=true',
    schema: 'GET /attribute-definitions/schema/:typeId?includeInactive=true',
    products: 'GET /products?productTypeId=&includeInactive=true&limit=500',
    uom: 'GET /uom?includeInactive=true',
  };

  const tree = (await req('GET', '/product-taxonomy/tree?includeInactive=true', token)).tree || [];
  const typesList = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const uoms = (await req('GET', '/uom?includeInactive=true', token)).items || [];
  const typeById = new Map(typesList.map((row) => [row.id, row]));

  const typeRecords = [];
  for (const group of tree) {
    for (const category of group.categories || []) {
      for (const type of category.types || []) {
        const live = typeById.get(type.id) || type;
        typeRecords.push({
          groupId: group.id,
          groupName: group.name,
          groupLatin: group.nameLatin || '',
          categoryId: category.id,
          categoryName: category.name,
          categoryLatin: category.nameLatin || '',
          typeId: type.id,
          typeName: type.name,
          typeLatin: live.nameLatin || type.nameLatin || '',
          typeActive: live.isActive !== false,
          scoped: isScopedGroup(group.name),
        });
      }
    }
  }

  const schemaByType = new Map();
  for (const rec of typeRecords) {
    const schema = (await req(
      'GET',
      `/attribute-definitions/schema/${rec.typeId}?includeInactive=true`,
      token,
    )).schema || [];
    schemaByType.set(rec.typeId, schema);
  }

  const csvRows = [];
  const scopedProducts = [];
  const otherProducts = [];
  const truncatedTypes = [];
  const emptyTypes = [];
  const txLeaks = [];
  const fittingStored = [];
  const fastenerStored = [];
  const requiredString = [];
  const headStyleSelfDrill = [];
  const emptyNameSku = [];
  const samples = [];

  const countByGroup = new Map();
  const countByCategory = new Map();
  const countByType = new Map();

  function bump(map, key) {
    map.set(key, (map.get(key) || 0) + 1);
  }

  for (const rec of typeRecords) {
    const { items, truncated } = await fetchProducts(token, rec.typeId);
    if (truncated) truncatedTypes.push(`${rec.groupName} > ${rec.categoryName} > ${rec.typeName}`);
    rec.productCount = items.length;
    if (items.length === 0) {
      emptyTypes.push({
        group: rec.groupName,
        category: rec.categoryName,
        type: rec.typeName,
        typeLatin: rec.typeLatin,
        scoped: rec.scoped,
        active: rec.typeActive,
      });
    }

    const schema = schemaByType.get(rec.typeId) || [];
    const activeSchema = schema.filter((entry) => entry.binding?.isActive !== false);
    for (const entry of activeSchema) {
      if (entry.definition?.dataType === 'STRING' && entry.binding?.isRequired) {
        requiredString.push({
          group: rec.groupName,
          category: rec.categoryName,
          type: rec.typeName,
          code: entry.definition.code,
          nameFa: entry.definition.nameFa,
        });
      }
      if (
        rec.typeName.includes(SELF_DRILL_HINT)
        && entry.definition?.code === 'head_style'
      ) {
        headStyleSelfDrill.push({
          type: rec.typeName,
          active: entry.binding?.isActive !== false,
          required: Boolean(entry.binding?.isRequired),
          scope: entry.binding?.valueScope,
        });
      }
    }

    for (const product of items) {
      const bucket = rec.scoped ? scopedProducts : otherProducts;
      bucket.push({ rec, product });
      if (!rec.scoped) continue;

      bump(countByGroup, rec.groupName);
      bump(countByCategory, `${rec.groupName} > ${rec.categoryName}`);
      bump(countByType, `${rec.groupName} > ${rec.categoryName} > ${rec.typeName}`);

      if (!String(product.generatedName || '').trim() || !String(product.sku || '').trim()) {
        emptyNameSku.push({
          id: product.id,
          sku: product.sku,
          generatedName: product.generatedName,
          path: `${rec.groupName} > ${rec.categoryName} > ${rec.typeName}`,
        });
      }

      const stored = Array.isArray(product.attributeValues) ? product.attributeValues : [];
      const storedByDef = new Map(stored.map((row) => [row.attributeDefinitionId, row]));
      const seenDefs = new Set();

      const emit = (entry, attr) => {
        const def = entry?.definition || {
          code: attr?.attributeCode || '',
          nameFa: attr?.attributeNameFa || '',
          dataType: attr?.dataType,
          id: attr?.attributeDefinitionId,
        };
        const binding = entry?.binding || null;
        const scope = binding?.valueScope || '';
        const required = binding ? Boolean(binding.isRequired) : '';
        const storedVal = rawStored(attr);
        const displayVal = displayStored(attr, {
          ...def,
          allowedValues: entry?.definition?.allowedValues,
          effectiveAllowedValues: binding?.effectiveAllowedValues,
        });
        if (binding?.valueScope === 'TRANSACTION' && storedVal) {
          txLeaks.push({
            displayName: product.generatedName,
            sku: product.sku,
            type: rec.typeName,
            code: def.code,
            storedValue: storedVal,
          });
        }
        if (rec.groupName === 'اتصالات فولادی' && FITTING_STORED_CODES.includes(def.code) && storedVal) {
          fittingStored.push({
            displayName: product.generatedName,
            type: rec.typeName,
            code: def.code,
            storedValue: storedVal,
            scope,
          });
        }
        if (rec.groupName === 'پیچ و مهره' && FASTENER_STORED_CODES.includes(def.code) && storedVal) {
          fastenerStored.push({
            displayName: product.generatedName,
            type: rec.typeName,
            code: def.code,
            storedValue: storedVal,
            scope,
          });
        }
        csvRows.push({
          group: rec.groupName,
          category: rec.categoryName,
          type: rec.typeName,
          typeLatin: rec.typeLatin,
          productId: product.id,
          sku: product.sku || '',
          canonicalIdentityKey: product.canonicalIdentityKey || '',
          status: product.lifecycleStatus || '',
          displayName: product.generatedName || '',
          attrCode: def.code || '',
          attrNameFa: def.nameFa || '',
          valueScope: scope,
          isRequired: required === '' ? '' : required,
          role: roleOf(binding),
          storedValue: storedVal,
          displayValue: displayVal,
        });
      };

      for (const entry of activeSchema) {
        const id = entry.definition?.id;
        seenDefs.add(id);
        emit(entry, storedByDef.get(id) || null);
      }
      for (const attr of stored) {
        if (seenDefs.has(attr.attributeDefinitionId)) continue;
        const entry = schema.find((row) => row.definition?.id === attr.attributeDefinitionId) || null;
        emit(entry, attr);
      }
      if (activeSchema.length === 0 && stored.length === 0) {
        csvRows.push({
          group: rec.groupName,
          category: rec.categoryName,
          type: rec.typeName,
          typeLatin: rec.typeLatin,
          productId: product.id,
          sku: product.sku || '',
          canonicalIdentityKey: product.canonicalIdentityKey || '',
          status: product.lifecycleStatus || '',
          displayName: product.generatedName || '',
          attrCode: '',
          attrNameFa: '',
          valueScope: '',
          isRequired: '',
          role: '',
          storedValue: '',
          displayValue: '',
        });
      }

      if (samples.length < 10) {
        samples.push({
          displayName: product.generatedName,
          path: `${rec.groupName} > ${rec.categoryName} > ${rec.typeName}`,
          sku: product.sku,
          offer: {
            count: uomName(uoms, product.baseUomId || product.countUnitId),
            sales: uomName(uoms, product.salesUomId || product.salesUnitId),
            unitWeight: product.unitWeight,
            customLengthAllowed: product.customLengthAllowed,
          },
        });
      }
    }
  }

  const seamedEmpty = emptyTypes.filter((row) => (
    row.group === 'اتصالات فولادی' && String(row.category).includes('درزدار')
  ));
  const scopedEmpty = emptyTypes.filter((row) => row.scoped);
  const otherEmpty = emptyTypes.filter((row) => !row.scoped);

  const header = [
    'group', 'category', 'type', 'typeLatin', 'productId', 'sku',
    'canonicalIdentityKey', 'status', 'displayName', 'attrCode', 'attrNameFa',
    'valueScope', 'isRequired', 'role', 'storedValue', 'displayValue',
  ];
  const csv = [
    header.join(','),
    ...csvRows.map((row) => header.map((key) => {
      let value = row[key];
      if (key === 'storedValue' || key === 'displayValue') value = value === '' ? '—' : value;
      if (key === 'isRequired' && value !== '') value = value ? 'true' : 'false';
      if ((key === 'valueScope' || key === 'role' || key === 'attrCode' || key === 'attrNameFa') && value === '') {
        value = '—';
      }
      return csvEscape(value);
    }).join(',')),
  ].join('\n');

  function mdTable(rows, cols) {
    if (!rows.length) return '_هیچ موردی._\n';
    const lines = [
      `| ${cols.map((c) => c.label).join(' | ')} |`,
      `| ${cols.map(() => '---').join(' | ')} |`,
    ];
    for (const row of rows) {
      lines.push(`| ${cols.map((c) => dash(row[c.key]).replace(/\|/g, '\\|')).join(' | ')} |`);
    }
    return `${lines.join('\n')}\n`;
  }

  const groupLines = [...countByGroup.entries()].map(([name, n]) => `- **${name}:** ${n}`);
  const catLines = [...countByCategory.entries()].map(([name, n]) => `- ${name}: ${n}`);
  const typeLines = [...countByType.entries()].map(([name, n]) => `- ${name}: ${n}`);

  const otherByGroup = new Map();
  for (const { rec } of otherProducts) bump(otherByGroup, rec.groupName);

  const sampleBlock = samples.map((row, i) => (
    `${i + 1}. **${row.displayName}** — ${row.path} — SKU \`${row.sku}\` — عرضه ${dash(row.offer.count)} / فروش ${dash(row.offer.sales)}`
  )).join('\n');

  const md = `# ممیزی کاتالوگ Product Master (زنده)

**تاریخ برداشت:** 2026-09-12  
**منبع حقیقت:** PostgreSQL از طریق API زنده — نه فایل‌های seed.

## منبع داده

Base: \`${BASE}\`  
ورود: \`${endpoints.login}\` (کاربر \`${LOGIN_USER}\`)

| Endpoint | کاربرد |
|---|---|
| \`${endpoints.tree}\` | گروه‌ها / دسته‌ها / انواع |
| \`${endpoints.types}\` | nameLatin و تنظیمات عرضهٔ Type |
| \`${endpoints.schema}\` | اتصال ویژگی‌ها (valueScope / isRequired) |
| \`${endpoints.products}\` | کالاها به‌ازای هر Type (سقف ۵۰۰؛ در صورت پر شدن در یافته‌ها آمده) |
| \`${endpoints.uom}\` | نام واحدهای عرضه روی Product |

## محدوده

گروه‌های در محدوده (کار اخیر):

- استنلس استیل (ورق / لوله / میلگرد / نبشی / پروفیل)
- اتصالات فولادی (درزدار، مانیسمان، فورج، دنده‌ای، فلنج)
- پیچ و مهره (هر ۵ دسته)
- چوب روسی (تخته زیرپایی + تخته چندلایه)

سایر کالاها در بخش «سایر» فقط شمارش شده‌اند و در CSV نیستند.

CSV کامل محدوده: [\`PRODUCT_CATALOG_AUDIT.csv\`](./PRODUCT_CATALOG_AUDIT.csv)

## خلاصه اجرایی

- **تعداد کالا در محدوده:** ${scopedProducts.length}
- **تعداد کالا خارج از محدوده (سایر):** ${otherProducts.length}
- **نشت TRANSACTION (مقدار ذخیره‌شده روی Product):** ${txLeaks.length} ${txLeaks.length === 0 ? '(باید ۰ باشد)' : '— فهرست در یافته‌ها'}
- **Typeهای محدوده با ۰ کالا:** ${scopedEmpty.length}
- **Typeهای درزدار خالی:** ${seamedEmpty.length}
- **generatedName یا SKU خالی:** ${emptyNameSku.length}
- **STRING الزامی فعال:** ${requiredString.length}
- **head_style روی پیچ سرمته:** ${headStyleSelfDrill.length}
- **size/length/sch ذخیره‌شده روی اتصالات:** ${fittingStored.length}
- **size/length ذخیره‌شده روی پیچ و مهره:** ${fastenerStored.length}

### شمارش به‌ازای گروه

${groupLines.join('\n') || '_خالی_'}

### شمارش به‌ازای دسته

${catLines.join('\n') || '_خالی_'}

### شمارش به‌ازای نوع

${typeLines.join('\n') || '_خالی_'}

## سایر

فیلتر صریح: هر Product که \`groupName\` آن یکی از چهار گروه محدوده نباشد.

${[...otherByGroup.entries()].map(([name, n]) => `- ${name}: ${n}`).join('\n') || '_کالایی خارج از محدوده نیست._'}

Typeهای خارج از محدوده با ۰ کالا: ${otherEmpty.length} (نمونه در صورت زیاد بودن در CSV نیست؛ فهرست کوتاه زیر).

${mdTable(otherEmpty.slice(0, 30), [
  { key: 'group', label: 'گروه' },
  { key: 'category', label: 'دسته' },
  { key: 'type', label: 'نوع' },
])}

## یافته‌ها (ناهنجاری‌ها)

نشت TRANSACTION روی Product (باید ۰):

${mdTable(txLeaks.slice(0, 40), [
  { key: 'type', label: 'نوع' },
  { key: 'displayName', label: 'نام نمایشی' },
  { key: 'code', label: 'ویژگی' },
  { key: 'storedValue', label: 'مقدار' },
])}

ناسازگاری DDL-51 — size/length/sch روی اتصالات:

${mdTable(fittingStored.slice(0, 40), [
  { key: 'type', label: 'نوع' },
  { key: 'displayName', label: 'نام نمایشی' },
  { key: 'code', label: 'ویژگی' },
  { key: 'scope', label: 'scope' },
  { key: 'storedValue', label: 'مقدار' },
])}

ناسازگاری DDL-51 — size/length روی پیچ و مهره:

${mdTable(fastenerStored.slice(0, 40), [
  { key: 'type', label: 'نوع' },
  { key: 'displayName', label: 'نام نمایشی' },
  { key: 'code', label: 'ویژگی' },
  { key: 'scope', label: 'scope' },
  { key: 'storedValue', label: 'مقدار' },
])}

STRING الزامی (خلاف DDL-50):

${mdTable(requiredString, [
  { key: 'type', label: 'نوع' },
  { key: 'code', label: 'کد' },
  { key: 'nameFa', label: 'نام' },
])}

\`head_style\` روی پیچ سرمته (نباید Identity باشد؛ شکل در نام Type است):

${mdTable(headStyleSelfDrill, [
  { key: 'type', label: 'نوع' },
  { key: 'scope', label: 'scope' },
  { key: 'required', label: 'required' },
  { key: 'active', label: 'active' },
])}

اتصالات جوشی درزدار بدون کالا:

${mdTable(seamedEmpty, [
  { key: 'category', label: 'دسته' },
  { key: 'type', label: 'نوع' },
  { key: 'typeLatin', label: 'Latin' },
])}

Typeهای محدوده با ۰ کالا:

${mdTable(scopedEmpty, [
  { key: 'group', label: 'گروه' },
  { key: 'category', label: 'دسته' },
  { key: 'type', label: 'نوع' },
  { key: 'typeLatin', label: 'Latin' },
])}

generatedName / SKU خالی:

${mdTable(emptyNameSku, [
  { key: 'path', label: 'مسیر' },
  { key: 'sku', label: 'SKU' },
  { key: 'generatedName', label: 'نام' },
  { key: 'id', label: 'id' },
])}

Typeهایی که پاسخ محصول به سقف ۵۰۰ رسید (ممکن است ناقص باشد):

${truncatedTypes.length ? truncatedTypes.map((row) => `- ${row}`).join('\n') : '_هیچ._'}

## نمونه نام‌های نمایشی

${sampleBlock || '_ندارد._'}

## قرارداد نقش ویژگی

| valueScope | isRequired | نقش در گزارش |
|---|---|---|
| PRODUCT | true | Identity |
| TRANSACTION | true | Order-required |
| TRANSACTION | false | Offer-variant |
| PRODUCT | false | optional PRODUCT (هویت نیست؛ DDL-51) |

TRANSACTION در CSV باید \`storedValue=—\` باشد. مقدار پیش‌فرض Type (DDL-55) روی Product ذخیره نمی‌شود.

## فایل‌ها

- \`Docs/review-package/PRODUCT_CATALOG_AUDIT.md\` — همین خلاصه
- \`Docs/review-package/PRODUCT_CATALOG_AUDIT.csv\` — یک ردیف به‌ازای هر ویژگی کالای محدوده (${csvRows.length} ردیف داده)
`;

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(join(OUT_DIR, 'PRODUCT_CATALOG_AUDIT.csv'), `${csv}\n`, 'utf8');
  await writeFile(join(OUT_DIR, 'PRODUCT_CATALOG_AUDIT.md'), md, 'utf8');

  console.log(JSON.stringify({
    scopedProducts: scopedProducts.length,
    otherProducts: otherProducts.length,
    csvRows: csvRows.length,
    txLeaks: txLeaks.length,
    scopedEmptyTypes: scopedEmpty.length,
    seamedEmpty: seamedEmpty.length,
    samples: samples.map((row) => row.displayName),
    outDir: OUT_DIR,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
