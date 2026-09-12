/**
 * Hard-delete guards for Product Master (DDL-24n). Unused nodes may be
 * removed so mnemonic sku_code can be reused; anything with direct
 * dependents is blocked with an itemized 409.
 *
 * Cascade policy (Docs/ARCHITECTURE.md §۴): master rows must not wipe other
 * master rows via ON DELETE CASCADE. Owned child rows of a Product
 * (attribute values) may cascade after the Product itself passes the
 * in-use (Order) guard.
 */
import { appError } from '../../../../lib/errors.js';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** Parents that must never appear as `REFERENCES … ON DELETE CASCADE`. */
export const MASTER_NO_CASCADE_PARENTS = Object.freeze([
  'product_groups',
  'product_categories',
  'product_types',
  'brands',
  'uom_registry',
  'attribute_definitions',
]);

/** Owned children of Product — CASCADE from `products` is allowed. */
export const PRODUCT_OWNED_CHILD_TABLES = Object.freeze([
  'product_attribute_values',
  'product_allowed_attribute_values',
]);

/**
 * Scan SQL (usually a migration file) for forbidden master-data CASCADE.
 * @param {string} sql
 * @returns {string[]} parent table names that illegally CASCADE
 */
export function findForbiddenMasterCascades(sql) {
  const text = String(sql || '');
  return MASTER_NO_CASCADE_PARENTS.filter((table) => {
    const pattern = new RegExp(
      `REFERENCES\\s+${table}\\s*\\([^)]*\\)\\s+ON\\s+DELETE\\s+CASCADE`,
      'i',
    );
    return pattern.test(text);
  });
}

export function toPersianCount(n) {
  return String(n).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

const SAMPLE_LIMIT = 12;

/**
 * @param {{
 *   code: string,
 *   entityLabel: string,
 *   dependencyLabel: string,
 *   items: Array<{ id?: string, name?: string, sku?: string, code?: string, skuCode?: string }>,
 *   verb?: string,
 * }} args
 */
/**
 * Same as {@link throwInUse} when `items` is non-empty; no-op otherwise.
 * Use at every master hard-delete site so an empty check cannot be skipped
 * by forgetting the `if (items.length)` wrapper.
 */
export function assertUnused(args) {
  if (args?.items?.length) throwInUse(args);
}

export function throwInUse({
  code,
  entityLabel,
  dependencyLabel,
  items,
  verb = 'فراخوانی',
}) {
  const count = items.length;
  const labels = items.slice(0, SAMPLE_LIMIT).map((item) => {
    const name = item.name || '';
    const code = item.sku || item.code || item.skuCode || '';
    if (name && code && name !== code) return `${name} (${code})`;
    return name || code || item.id;
  });
  const more = count > SAMPLE_LIMIT ? ` و ${toPersianCount(count - SAMPLE_LIMIT)} مورد دیگر` : '';
  const sample = labels.length ? ` شامل: ${labels.join('، ')}${more}` : '';
  throw appError(
    code,
    `این ${entityLabel} در ${toPersianCount(count)} ${dependencyLabel} ${verb} شده است و امکان حذف نیست.${sample}`,
    409,
    {
      count,
      dependencyKind: dependencyLabel,
      items: items.slice(0, 20).map((item) => ({
        id: item.id,
        name: item.name || null,
        sku: item.sku || null,
        code: item.code || item.skuCode || null,
      })),
    },
  );
}
