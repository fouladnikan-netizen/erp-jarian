/**
 * Bulk Import / Mass Update for Products (Vitrin, DDL-24g).
 *
 * FLOW: UPLOAD -> PARSE -> NORMALIZE -> VALIDATE -> MATCH -> DUPLICATE CHECK
 * -> PREVIEW (mode=DRY_RUN) -> APPLY (mode=APPLY) -> RESULT REPORT.
 *
 * CSV/XLSX parsing itself happens client-side (hand-rolled CSV split — no
 * new xlsx dependency per jarian-performance-assets.mdc "avoid unnecessary
 * dependencies"); this service receives already-parsed JSON rows and is the
 * single backend-authoritative validation/apply path (never trusts the
 * frontend for duplicate blocking or identity rules — same productService
 * validation is reused, not re-implemented).
 */
import { z } from 'zod';
import { fromZodError } from '../lib/errors.js';
import { newEntityId, writeAudit } from '../lib/ids.js';
import * as groupRepo from '../repositories/productGroupRepository.js';
import * as categoryRepo from '../repositories/productCategoryRepository.js';
import * as typeRepo from '../repositories/productTypeRepository.js';
import * as attrRepo from '../repositories/attributeDefinitionRepository.js';
import * as brandRepo from '../repositories/brandRepository.js';
import * as uomRepo from '../repositories/uomRepository.js';
import * as batchRepo from '../repositories/productBulkImportRepository.js';
import * as attributeDefinitionService from './attributeDefinitionService.js';
import * as productService from './productService.js';
import { normalizeTextValue } from '../domain/productMaster/normalize.js';

const optionalTrimmed = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? undefined : String(v).trim()),
  z.string().min(1).optional(),
);

const optionalUnitWeight = z.preprocess(
  (v) => {
    if (v === '' || v === undefined || v === null) return undefined;
    const n = typeof v === 'number' ? v : Number(String(v).trim().replace(',', '.'));
    return Number.isFinite(n) ? n : v;
  },
  z.number().positive().optional(),
);

const optionalFlag = z.preprocess(
  (v) => {
    if (v === '' || v === undefined || v === null) return undefined;
    if (typeof v === 'boolean') return v;
    const s = String(v).trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'بله'].includes(s)) return true;
    if (['false', '0', 'no', 'n', 'خیر'].includes(s)) return false;
    return v;
  },
  z.boolean().optional(),
);

const rowSchema = z.object({
  groupName: z.string().trim().min(1),
  categoryName: z.string().trim().min(1),
  typeName: z.string().trim().min(1),
  displayNameOverride: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : String(v).trim()),
    z.string().max(200).optional(),
  ),
  brandName: optionalTrimmed,
  baseUomCode: optionalTrimmed,
  salesUomCode: optionalTrimmed,
  purchaseUomCode: optionalTrimmed,
  unitWeight: optionalUnitWeight,
  customLengthAllowed: optionalFlag,
  weightProfileType: z.enum(['FIXED', 'PER_LENGTH', 'DIMENSIONAL', 'MANUAL_ACTUAL']).optional(),
  attributes: z.record(z.string(), z.any()).optional().default({}),
});

const requestSchema = z.object({
  mode: z.enum(['DRY_RUN', 'APPLY']),
  rows: z.array(z.record(z.string(), z.any())).min(1).max(2000),
});

/**
 * Reference/master data needed to resolve rows (Groups, Categories, Product
 * Types, Brands, UOM registry, and per-Product-Type attribute schemas),
 * loaded ONCE per import request and reused for every row via in-memory
 * lookup Maps — fixes the resolveRow N+1 (previously each row re-queried
 * these tables independently, O(rows) DB round-trips). Scope is strictly
 * this single import call: built fresh here, discarded when the request
 * finishes — never a shared/global/stale cache across requests.
 */
async function buildBatchLookupCache() {
  const [groups, categories, types, brands, uoms] = await Promise.all([
    groupRepo.list({ includeInactive: true }),
    categoryRepo.list({ includeInactive: true }),
    typeRepo.list({ includeInactive: true }),
    brandRepo.list({ includeInactive: true }),
    uomRepo.list({ includeInactive: true }),
  ]);

  const groupsByName = new Map(groups.map((g) => [g.normalizedName, g]));
  const categoriesByGroupAndName = new Map(categories.map((c) => [`${c.groupId}::${c.normalizedName}`, c]));
  const typesByCategoryAndName = new Map(types.map((t) => [`${t.categoryId}::${t.normalizedName}`, t]));
  const brandsByName = new Map(brands.map((b) => [b.normalizedName, b]));
  const uomsByCode = new Map(uoms.map((u) => [u.code, u]));
  const schemaByProductTypeId = new Map();

  return {
    findGroup: (name) => groupsByName.get(normalizeTextValue(name)) || null,
    findCategory: (groupId, name) => categoriesByGroupAndName.get(`${groupId}::${normalizeTextValue(name)}`) || null,
    findProductType: (categoryId, name) => typesByCategoryAndName.get(`${categoryId}::${normalizeTextValue(name)}`) || null,
    findBrand: (name) => brandsByName.get(normalizeTextValue(name)) || null,
    findUomByCode: (code) => uomsByCode.get(String(code).toUpperCase()) || null,
    async getSchema(productTypeId) {
      if (!schemaByProductTypeId.has(productTypeId)) {
        schemaByProductTypeId.set(productTypeId, await attributeDefinitionService.getEffectiveSchema(productTypeId));
      }
      return schemaByProductTypeId.get(productTypeId);
    },
  };
}

/**
 * @param {Set<string>} seenIdentityKeys canonical identity keys already
 *   accepted earlier in THIS batch — rows are resolved sequentially (not in
 *   parallel) specifically so this accumulates correctly and a later row can
 *   be recognized as a same-file duplicate of an earlier one before either
 *   is ever written to the database (product contract "BULK IMPORT" —
 *   "duplicate inside same file" is a required test case).
 * @param {ReturnType<typeof buildBatchLookupCache>} cache batch-scoped
 *   reference-data lookup Maps — see buildBatchLookupCache doc above.
 */
async function resolveRow(rawRow, rowIndex, seenIdentityKeys, cache) {
  const parsedRow = rowSchema.safeParse(rawRow);
  if (!parsedRow.success) {
    return { rowIndex, status: 'REJECTED', errors: [{ code: 'ROW_MALFORMED', message: 'ساختار سطر نامعتبر است.', details: parsedRow.error.flatten() }] };
  }
  const row = parsedRow.data;
  const errors = [];

  const group = cache.findGroup(row.groupName);
  if (!group) errors.push({ code: 'GROUP_NOT_FOUND', message: `گروه کالای «${row.groupName}» یافت نشد.` });

  let category = null;
  if (group) {
    category = cache.findCategory(group.id, row.categoryName);
    if (!category) errors.push({ code: 'CATEGORY_NOT_FOUND', message: `دسته کالای «${row.categoryName}» در گروه «${row.groupName}» یافت نشد.` });
  }

  let productType = null;
  if (category) {
    productType = cache.findProductType(category.id, row.typeName);
    if (!productType) errors.push({ code: 'PRODUCT_TYPE_NOT_FOUND', message: `نوع کالای «${row.typeName}» در دسته «${row.categoryName}» یافت نشد.` });
  }

  let brandId = null;
  if (row.brandName) {
    const brand = cache.findBrand(row.brandName);
    if (!brand) errors.push({ code: 'BRAND_NOT_FOUND', message: `برند «${row.brandName}» یافت نشد — ابتدا در رجیستری برند ثبت کنید.` });
    else brandId = brand.id;
  }

  function resolveUom(code, label) {
    if (!code) return null;
    const uom = cache.findUomByCode(code);
    if (!uom) errors.push({ code: 'UOM_NOT_FOUND', message: `واحد «${label}: ${code}» یافت نشد.` });
    return uom?.id || null;
  }
  const baseUomId = resolveUom(row.baseUomCode, 'پایه');
  const salesUomId = resolveUom(row.salesUomCode, 'فروش');
  const purchaseUomId = resolveUom(row.purchaseUomCode, 'خرید');

  let attributeValues = {};
  if (productType) {
    const schema = await cache.getSchema(productType.id);
    const byCode = new Map(schema.map((e) => [e.definition.code, e.definition.id]));
    for (const [code, value] of Object.entries(row.attributes || {})) {
      if (value === undefined || value === null || String(value).trim() === '') continue;
      const defId = byCode.get(code);
      if (!defId) {
        errors.push({ code: 'UNKNOWN_ATTRIBUTE', message: `ویژگی «${code}» برای نوع کالای «${row.typeName}» تعریف نشده است.` });
        continue;
      }
      attributeValues[defId] = value;
    }
  }

  if (errors.length) return { rowIndex, status: 'REJECTED', errors, row };

  const payload = {
    productTypeId: productType.id,
    brandId,
    weightProfileType: row.weightProfileType || 'MANUAL_ACTUAL',
    weightProfileCoefficients: {},
    attributeValues,
    confirmDuplicate: true, // bulk import treats resolved rows as reviewed; exact-duplicate rows are skipped (idempotent), not blocked
  };
  if (row.displayNameOverride) payload.displayNameOverride = row.displayNameOverride;
  if (row.unitWeight !== undefined) payload.unitWeight = row.unitWeight;
  if (row.customLengthAllowed !== undefined) payload.customLengthAllowed = row.customLengthAllowed;
  if (row.baseUomCode) payload.baseUomId = baseUomId;
  if (row.salesUomCode) payload.salesUomId = salesUomId;
  if (row.purchaseUomCode) payload.purchaseUomId = purchaseUomId;

  // Run the SAME backend-authoritative validation createProduct would run
  // (required/range/enum/type checks, canonical identity) WITHOUT writing —
  // a DRY_RUN preview that skips this would say "WOULD_ACCEPT" for a row
  // that is actually missing a required attribute or out of range.
  try {
    const prep = await productService.prepareProductCreate(payload);
    if (prep.exactDuplicate || seenIdentityKeys.has(prep.canonicalIdentityKey)) {
      seenIdentityKeys.add(prep.canonicalIdentityKey);
      return {
        rowIndex, status: 'DUPLICATE_SKIPPED', row,
        message: 'محصول با همین شناسه ساختاری قبلاً وجود دارد یا در همین فایل تکرار شده است — رد شد (idempotent).',
        details: prep.exactDuplicate ? { existingProductId: prep.exactDuplicate.id, existingSku: prep.exactDuplicate.sku } : { duplicateWithinFile: true },
      };
    }
    seenIdentityKeys.add(prep.canonicalIdentityKey);
  } catch (err) {
    return { rowIndex, status: 'REJECTED', errors: [{ code: err.code || 'UNKNOWN_ERROR', message: err.message, details: err.details }], row };
  }

  return { rowIndex, status: 'PENDING', row, payload };
}

export async function runBulkImport(body, actorUserId) {
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های ورودی دسته‌ای نامعتبر است.');
  const { mode, rows } = parsed.data;

  // Sequential (not Promise.all) so `seenIdentityKeys` correctly accumulates
  // across rows — required for same-file duplicate detection above.
  const cache = await buildBatchLookupCache();
  const seenIdentityKeys = new Set();
  const resolved = [];
  for (let idx = 0; idx < rows.length; idx += 1) {
    resolved.push(await resolveRow(rows[idx], idx, seenIdentityKeys, cache));
  }

  const results = [];
  for (const item of resolved) {
    if (item.status === 'REJECTED' || item.status === 'DUPLICATE_SKIPPED') {
      results.push(item);
      continue;
    }
    if (mode === 'DRY_RUN') {
      results.push({ rowIndex: item.rowIndex, status: 'WOULD_ACCEPT', preview: item.payload });
      continue;
    }
    try {
      const created = await productService.createProduct(item.payload, actorUserId);
      results.push({ rowIndex: item.rowIndex, status: 'ACCEPTED', productId: created.id, sku: created.sku });
    } catch (err) {
      if (err?.code === 'PRODUCT_DUPLICATE_EXACT') {
        results.push({ rowIndex: item.rowIndex, status: 'DUPLICATE_SKIPPED', message: 'محصول با همین شناسه ساختاری قبلاً وجود دارد — رد شد (idempotent).', details: err.details });
      } else {
        results.push({ rowIndex: item.rowIndex, status: 'REJECTED', errors: [{ code: err.code || 'UNKNOWN_ERROR', message: err.message, details: err.details }] });
      }
    }
  }

  const acceptedCount = results.filter((r) => r.status === 'ACCEPTED' || r.status === 'WOULD_ACCEPT').length;
  const rejectedCount = results.length - acceptedCount;

  const batch = await batchRepo.create({
    id: newEntityId('bulk'), mode, totalRows: rows.length, acceptedRows: acceptedCount, rejectedRows: rejectedCount,
    rowResults: results, actorUserId,
  });
  await writeAudit({ actorUserId, action: 'product_bulk_import.run', entityType: 'product_bulk_import_batch', entityId: batch.id, detail: { mode, totalRows: rows.length, acceptedCount, rejectedCount } });

  return batch;
}

export async function getBatch(id) {
  return batchRepo.findById(id);
}

export async function listBatches() {
  return batchRepo.list();
}

export default { runBulkImport, getBatch, listBatches };
